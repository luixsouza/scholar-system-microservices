# Sistema Escolar — Arquitetura Distribuída e Clusterização

Este documento descreve a evolução do projeto **sistema-escolar-microsservicos** para uma arquitetura distribuída clusterizada em Kubernetes (k3d), aplicando os principais padrões de sistemas distribuídos abordados na disciplina.

## 1. Visão geral

O sistema original era composto por 4 microsserviços Spring Boot (`aluno`, `professor`, `disciplina`, `matricula`) + `discovery-server` (Eureka) + `api-gateway` + UI Angular, executados via **Docker Compose** com **H2 em memória**.

A nova arquitetura mantém o domínio mas adiciona:

| Padrão de sistemas distribuídos | Implementação |
|---------------------------------|---------------|
| **Clustering / replicação** | Cada serviço de negócio executa com `replicas: 2` em Kubernetes |
| **Container orchestration** | k3d (k3s in Docker), 1 server + 1 agent |
| **Service Discovery** | Netflix Eureka (Spring Cloud) |
| **API Gateway / single entry point** | Spring Cloud Gateway |
| **Database-per-service** | PostgreSQL com 1 *database* por serviço (`aluno_db`, `professor_db`, `disciplina_db`, `matricula_db`) |
| **Resiliência (Circuit Breaker + Retry)** | Resilience4j + fallbacks nos clientes Feign |
| **Mensageria assíncrona / Event-driven** | Apache Kafka 3.7 (modo KRaft) com tópico `matricula.criada` |
| **Dead Letter Queue (DLQ)** | `matricula.criada.dlq` + `DefaultErrorHandler` com 3 tentativas e backoff fixo |
| **Tracing distribuído** | Micrometer Tracing + Brave + Zipkin |
| **Observabilidade básica** | Spring Boot Actuator + endpoints `/health`, `/metrics`, `/prometheus` |
| **Health checks (liveness/readiness)** | Probes Kubernetes pontilhando `/actuator/health/liveness` e `/actuator/health/readiness` |
| **Configuração externalizada** | ConfigMaps + Secrets do Kubernetes |
| **Ingress / roteamento HTTP** | Traefik (built-in do k3s) com hosts `*.localhost` |

## 2. Topologia física

```
                                 host (Windows)
                                 :8088 ──┐
                                         ▼
                                ┌─────────────────┐
                                │  Traefik LB     │  (k3d loadbalancer)
                                │  ingress :80    │
                                └────────┬────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                                                  │
        ▼                                                                  ▼
  escolar.localhost                                              api.escolar.localhost
   eureka.localhost                                                       │
                                                                          │
                       ┌──────── k3d cluster (1 server + 1 agent) ───────┐
                       │                                                 │
                       │  Namespace: escolar                              │
                       │  ┌───────────────────────────────────────────┐  │
                       │  │ infra                                     │  │
                       │  │  • discovery-server  (1 pod)               │  │
                       │  │  • api-gateway       (1 pod)               │  │
                       │  │  • postgres          (StatefulSet, 1 pod)  │  │
                       │  │  • kafka             (StatefulSet, 1 pod)  │  │
                       │  └───────────────────────────────────────────┘  │
                       │  ┌───────────────────────────────────────────┐  │
                       │  │ negócio (replicas: 2)                     │  │
                       │  │  • servico-aluno      ×2                  │  │
                       │  │  • servico-professor  ×2                  │  │
                       │  │  • servico-disciplina ×2                  │  │
                       │  │  • servico-matricula  ×2                  │  │
                       │  └───────────────────────────────────────────┘  │
                       │  ┌───────────────────────────────────────────┐  │
                       │  │ ui                                        │  │
                       │  │  • escolar-ui (Angular, nginx, 1 pod)      │  │
                       │  └───────────────────────────────────────────┘  │
                       │                                                 │
                       │  Namespace: observability                       │
                       │  ┌───────────────────────────────────────────┐  │
                       │  │  • zipkin (1 pod)                          │  │
                       │  └───────────────────────────────────────────┘  │
                       └─────────────────────────────────────────────────┘
```

## 3. Componentes em detalhe

### 3.1 Service Discovery — Eureka (`discovery-server`)
- Spring Cloud Netflix Eureka Server.
- Cada serviço se registra automaticamente via `spring-cloud-starter-netflix-eureka-client`.
- O `instance-id` inclui um UUID aleatório, permitindo múltiplas réplicas distinguíveis.
- O Gateway usa `lb://servico-xxx` com `Spring Cloud LoadBalancer` para distribuir entre as réplicas registradas.
- Acesso UI: http://eureka.localhost:8088

### 3.2 API Gateway (`api-gateway`)
- Spring Cloud Gateway (reativo, baseado em Webflux/Netty).
- Roteamento por path:
  - `/api/alunos/**` → `lb://servico-aluno`
  - `/api/professores/**` → `lb://servico-professor`
  - `/api/disciplinas/**` → `lb://servico-disciplina`
  - `/api/matriculas/**` → `lb://servico-matricula`
- Acesso: http://api.escolar.localhost:8088

### 3.3 Persistência — PostgreSQL
- 1 StatefulSet com **4 databases** (database-per-service na lógica).
- Volume persistente (PVC `local-path` do k3s).
- Credenciais em `Secret` (`postgres-credentials`).
- Inicialização via `ConfigMap` `postgres-init` montado em `/docker-entrypoint-initdb.d/`.
- `ddl-auto: update` no Hibernate cria/atualiza schemas no primeiro start.

### 3.4 Mensageria — Kafka (modo KRaft)
- Apache Kafka 3.7 (imagem `bitnami/kafka`) em **KRaft mode** (sem ZooKeeper).
- 1 broker, `replication-factor=1`, auto-criação de tópicos habilitada.
- Tópicos:
  - `matricula.criada` — evento publicado por `servico-matricula` quando uma matrícula é criada.
  - `matricula.criada.dlq` — Dead Letter Queue para mensagens que falharam após esgotar as tentativas.

### 3.5 Resiliência — Resilience4j (em `servico-matricula`)
Os clientes Feign de `aluno` e `disciplina` são chamados via fachadas (`AlunoFacade`, `DisciplinaFacade`) que aplicam:

- **`@CircuitBreaker(name = "alunoClient" | "disciplinaClient", fallbackMethod = "fallback...")`**
  - `slidingWindowSize: 10`, `failureRateThreshold: 50%`
  - Estado *open* por 10s antes de tentar *half-open*
- **`@Retry(name = ...)`**
  - 3 tentativas com `waitDuration: 500ms`
  - Apenas para `feign.RetryableException` e `IOException`
- **Fallback**: lança `ServicoIndisponivelException` (HTTP 503) — propaga falha controlada ao cliente em vez de timeout opaco.
- **Health endpoint**: estado dos circuit breakers exposto em `/actuator/health` quando `circuitbreakers.enabled: true`.

### 3.6 Mensageria — Producer (`servico-matricula`)
- `MatriculaProducer` publica `EventoMatricula(matriculaId, alunoId, disciplinaId, ocorridoEm)` em `matricula.criada` ao final de `MatriculaService.criar(...)`.
- Serialização JSON sem cabeçalhos de tipo (`spring.json.add.type.headers=false`) — desacopla os pacotes Java entre serviços.

### 3.7 Mensageria — Consumer (`servico-disciplina`) com DLQ
- `MatriculaConsumer` ouve `matricula.criada` (`group-id: servico-disciplina`) e incrementa o campo `qtdMatriculas` da disciplina correspondente.
- `KafkaConsumerConfig.errorHandler(...)` configura `DefaultErrorHandler`:
  - 3 tentativas com `FixedBackOff(2000ms)`.
  - Após esgotar, `DeadLetterPublishingRecoverer` envia para `matricula.criada.dlq`.
- Deserialização com tipo padrão configurado: `spring.json.value.default.type=disciplina.evento.EventoMatricula`.

### 3.8 Tracing distribuído — Zipkin
- Cada serviço Spring Boot inclui:
  - `spring-boot-starter-actuator`
  - `micrometer-tracing-bridge-brave`
  - `zipkin-reporter-brave`
- `management.tracing.sampling.probability: 1.0` (100% em demo).
- Spans são exportados para `http://zipkin.observability.svc.cluster.local:9411/api/v2/spans`.
- Acesso UI: http://zipkin.localhost:8088 — buscar por `serviceName`, `spanName`, ou `traceId`.

### 3.9 Health checks e probes
- Cada Deployment define:
  - `readinessProbe: /actuator/health/readiness` — só recebe tráfego quando dependências (Eureka, BD, Kafka) estão OK.
  - `livenessProbe: /actuator/health/liveness` — pod é reiniciado se travar.

### 3.10 Configuração externalizada
- `ConfigMap escolar-app-config`: URLs de Eureka, Zipkin, Kafka, Postgres host.
- `Secret postgres-credentials`: usuário/senha.
- Cada Deployment importa via `envFrom` + `valueFrom: secretKeyRef`.
- Aplicação lê via Spring placeholder: `${EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE:http://localhost:8761/eureka/}` (com default para dev local).

## 4. Como executar (passo a passo)

### Pré-requisitos
- Docker Desktop em execução
- `k3d` v5.x (via `winget install k3d.k3d`)
- `kubectl` v1.28+
- Bash (Git Bash no Windows)

### Subir o cluster e o sistema
```bash
# 1) Criar cluster k3d (1 server + 1 agent), Traefik exposto em :8088
bash scripts/cluster-up.sh

# 2) Buildar todas as imagens e importar no k3d
bash scripts/build-images.sh

# 3) Aplicar manifests na ordem correta
bash scripts/deploy.sh

# 4) Rodar testes ponta-a-ponta
bash scripts/test-e2e.sh
```

### Acessos (via Traefik no host)
| Serviço | URL |
|---------|-----|
| UI Angular | http://escolar.localhost:8088 |
| API Gateway | http://api.escolar.localhost:8088 |
| Eureka Dashboard | http://eureka.localhost:8088 |
| Zipkin UI | http://zipkin.localhost:8088 |
| Swagger (via Gateway) | http://api.escolar.localhost:8088/swagger-ui.html (cada serviço tem o seu) |

### Encerrar
```bash
bash scripts/cluster-down.sh
```

## 5. Demonstração dos padrões

### 5.1 Clustering / Load Balancing
```bash
# 5 chamadas — observe que pods diferentes atendem (round-robin via Eureka)
for i in 1 2 3 4 5; do curl -s http://api.escolar.localhost:8088/api/alunos > /dev/null; done
kubectl -n escolar logs -l app=servico-aluno --tail=5 --prefix=true
```

### 5.2 Tolerância a falha de pod
```bash
# Listar pods de aluno
kubectl -n escolar get pods -l app=servico-aluno
# Matar um pod manualmente
kubectl -n escolar delete pod -l app=servico-aluno --field-selector=status.phase=Running --grace-period=0 --force | head -1
# O Service continua respondendo via réplica restante; Kubernetes recria o pod
curl -s http://api.escolar.localhost:8088/api/alunos
```

### 5.3 Circuit Breaker em ação
```bash
# Derrubar todas réplicas do aluno
kubectl -n escolar scale deployment/servico-aluno --replicas=0
# 5 tentativas — após o limiar, circuit breaker abre e devolve 503 imediatamente
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST -H 'Content-Type: application/json' \
    -d '{"alunoId":1,"disciplinaId":1}' \
    http://api.escolar.localhost:8088/api/matriculas
done
# Voltar ao normal
kubectl -n escolar scale deployment/servico-aluno --replicas=2
```

### 5.4 Evento Kafka + atualização eventual do contador de matrículas
```bash
# Criar disciplina
DID=$(curl -s -X POST http://api.escolar.localhost:8088/api/disciplinas \
  -H 'Content-Type: application/json' \
  -d '{"nome":"SD","cargaHoraria":80}' | python -c 'import sys,json; print(json.load(sys.stdin)["id"])')

# Criar aluno
AID=$(curl -s -X POST http://api.escolar.localhost:8088/api/alunos \
  -H 'Content-Type: application/json' \
  -d '{"nome":"X","matricula":"2026001","email":"x@y"}' | python -c 'import sys,json; print(json.load(sys.stdin)["id"])')

# Matricular
curl -s -X POST http://api.escolar.localhost:8088/api/matriculas \
  -H 'Content-Type: application/json' \
  -d "{\"alunoId\":$AID,\"disciplinaId\":$DID}"

# Aguardar 2s e verificar contador (atualizado pelo consumer Kafka)
sleep 2
curl -s http://api.escolar.localhost:8088/api/disciplinas/$DID
# Deve retornar qtdMatriculas: 1
```

### 5.5 Tracing distribuído
1. Faça 1 chamada a `POST /api/matriculas` (envolve gateway → matricula → aluno → disciplina → kafka → consumer).
2. Abra http://zipkin.localhost:8088
3. Selecione `servico-matricula` em "Service Name", clique em "Run Query".
4. Clique no trace mais recente — verá os spans encadeados pelos 4+ serviços.

### 5.6 Inspecionar tópicos Kafka
```bash
# Listar tópicos
kubectl -n escolar exec -it kafka-0 -- kafka-topics.sh --bootstrap-server localhost:9092 --list

# Consumir últimas mensagens do tópico principal
kubectl -n escolar exec -it kafka-0 -- kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic matricula.criada --from-beginning --max-messages 5

# Verificar DLQ (deve estar vazia em fluxo normal)
kubectl -n escolar exec -it kafka-0 -- kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic matricula.criada.dlq --from-beginning --max-messages 5 --timeout-ms 3000
```

## 6. Estrutura de arquivos
```
.
├── api-gateway/               # Spring Cloud Gateway
├── discovery-server/          # Eureka Server
├── escolar-ui/                # Angular + nginx
├── servico-aluno/             # CRUD aluno (Postgres + Eureka + tracing)
├── servico-professor/         # CRUD professor (Postgres + Eureka + tracing)
├── servico-disciplina/        # CRUD disciplina + Kafka consumer + DLQ
├── servico-matricula/         # CRUD matrícula + Feign + Resilience4j + Kafka producer
├── k8s/                       # Manifests Kubernetes
│   ├── 00-namespace.yaml
│   ├── 10-postgres.yaml       # StatefulSet + Secret + ConfigMap init
│   ├── 20-kafka.yaml          # StatefulSet KRaft mode
│   ├── 25-zipkin.yaml
│   ├── 30-eureka.yaml
│   ├── 40-services.yaml       # Deployments dos 4 serviços (replicas: 2)
│   ├── 50-gateway.yaml
│   ├── 60-ui.yaml
│   └── 70-ingress.yaml        # Traefik IngressRoutes
├── scripts/
│   ├── cluster-up.sh
│   ├── cluster-down.sh
│   ├── build-images.sh
│   ├── deploy.sh
│   └── test-e2e.sh
├── docker-compose.yml         # (legado — modo desenvolvimento sem k8s)
└── ARQUITETURA-DISTRIBUIDA.md # este documento
```

## 7. Mapeamento conceito ↔ código/manifest

| Conceito | Onde está |
|---|---|
| Service Registry | `discovery-server/`, `k8s/30-eureka.yaml` |
| Client-side load balancing | `api-gateway/src/main/resources/application.yml` (`lb://...`) |
| Database-per-service | `k8s/10-postgres.yaml` (4 databases) + datasource único por serviço em `application.yml` |
| Circuit Breaker + Retry | `servico-matricula/src/main/java/matricula/cliente/AlunoFacade.java` & `DisciplinaFacade.java` |
| Configuração de Resilience4j | `servico-matricula/src/main/resources/application.yml` (bloco `resilience4j:`) |
| Producer Kafka | `servico-matricula/src/main/java/matricula/evento/MatriculaProducer.java` |
| Consumer Kafka + DLQ | `servico-disciplina/src/main/java/disciplina/evento/MatriculaConsumer.java` + `config/KafkaConsumerConfig.java` |
| Tracing distribuído | `pom.xml` (`micrometer-tracing-bridge-brave`, `zipkin-reporter-brave`) + `application.yml` (`management.zipkin.tracing.endpoint`) |
| Probes Kubernetes | `k8s/40-services.yaml` (`readinessProbe`, `livenessProbe`) |
| Replicação de pods | `k8s/40-services.yaml` (`spec.replicas: 2`) |
| Ingress / single entry | `k8s/70-ingress.yaml` |

## 8. Resultado da execução de teste

Saída de `bash scripts/test-e2e.sh` em uma execução real do cluster:

```
==> 1) Criando aluno
{"id":2,"nome":"Aluno Teste","email":"aluno@escola.com","matricula":"2026001"}

==> 2) Criando disciplina
{"id":1,"nome":"Sistemas Distribuidos","cargaHoraria":80,"qtdMatriculas":0}

==> 3) Criando matricula (aluno=2, disciplina=1)
{"id":1,"alunoId":2,"disciplinaId":1}

==> 4) Aguardando consumer Kafka processar evento (3s)...
Disciplina após evento: {"id":1,"nome":"Sistemas Distribuidos","cargaHoraria":80,"qtdMatriculas":1}
OK: consumer Kafka incrementou qtdMatriculas para 1

==> 5) Verificando spans no Zipkin
Serviços com tracing: ["api-gateway","servico-aluno","servico-disciplina","servico-matricula","servico-professor"]

==> 6) Load balancing - 5 chamadas a /api/alunos com hostname do pod
Pods de servico-aluno (cada um deve ter recebido alguma requisicao):
[pod/servico-aluno-5bd7449d5f-l69hc/app] ...
[pod/servico-aluno-5bd7449d5f-vkr9h/app] ...

==> TODOS TESTES OK
```

E o estado dos pods imediatamente após o teste:

```
NAME                                  READY   STATUS    RESTARTS   AGE
api-gateway-6fb99d6858-7sd88          1/1     Running   0          14m
discovery-server-6b7bf6588c-qskg9     1/1     Running   1          25m
escolar-ui-569dbb65df-bpxk4           1/1     Running   0          38m
kafka-0                               1/1     Running   0          47m
postgres-0                            1/1     Running   0          65m
servico-aluno-5bd7449d5f-l69hc        1/1     Running   0          14m
servico-aluno-5bd7449d5f-vkr9h        1/1     Running   0          10m
servico-disciplina-67bdd69486-q9xwt   1/1     Running   0          10m
servico-disciplina-67bdd69486-qp2vc   1/1     Running   0          14m
servico-matricula-5b89cc846d-m6x7p    1/1     Running   0          14m
servico-matricula-5b89cc846d-mhlcf    1/1     Running   0          9m41s
servico-professor-6776dc4487-2wg6h    1/1     Running   0          14m
servico-professor-6776dc4487-77m9z    1/1     Running   0          11m
```

13 pods Running, 4 dos serviços de negócio com 2 réplicas cada (clustering ativo).

Tópicos Kafka pós-execução (`kafka-topics.sh --list`):

```
__consumer_offsets
matricula.criada           # tópico de eventos de domínio
matricula.criada.dlq       # Dead Letter Queue (vazia em fluxo normal)
```

Eureka registry (apps registradas):

```
API-GATEWAY
SERVICO-ALUNO
SERVICO-DISCIPLINA
SERVICO-MATRICULA
SERVICO-PROFESSOR
```

## 9. Limitações conhecidas (para projeto acadêmico)

- **Kafka com 1 broker** — não há replicação; perda do broker = perda de mensagens não consumidas.
- **PostgreSQL com 1 réplica** — sem alta disponibilidade no banco.
- **Eureka com 1 nó** — sem cluster peer-aware (fácil de evoluir trocando por StatefulSet de 2 réplicas).
- **Sem Spring Cloud Config** — configuração via ConfigMap nativo do k8s (mais simples nesse contexto).
- **Sem ELK** — logs via `kubectl logs`.
- **Sem Prometheus/Grafana** — métricas via Actuator (`/actuator/prometheus`), prontas para coleta se quisermos adicionar depois.

Cada um dos itens acima foi cortado conscientemente para manter o sistema executável em ~2-3GB de RAM em um notebook típico.
