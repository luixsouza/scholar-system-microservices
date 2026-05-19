# Demo de Resiliência — Cluster K3s em 2 Computadores

Roteiro completo para a apresentação que demonstra:

1. **Execução em dois computadores** via Kubernetes (k3s nativo, não k3d).
2. **Desligamento físico** de uma das máquinas.
3. **Continuidade operacional** evidenciando resiliência e tolerância a falhas.

> Este documento é o roteiro de apresentação. As mudanças nos manifests e scripts necessárias estão listadas na seção 7 e ainda **não foram aplicadas** — aplicar após revisão.

---

## 1. Visão geral da topologia

```
                              host LAN (mesmo Wi-Fi)
                              ┌──────────────────────┐
                              │   acesso pela banca  │
                              │  http://<IP-PC1>     │
                              └──────────┬───────────┘
                                         │
        ┌────────────────────────────────┴──────────────────────────────┐
        │                                                                │
        ▼                                                                ▼
┌─────────────────────────────────────┐                ┌─────────────────────────────────┐
│ PC-1  (k3s SERVER + AGENT)          │                │ PC-2  (k3s AGENT)               │
│ Windows + WSL2 Ubuntu                │  ←k3s join→   │ Windows + WSL2 Ubuntu            │
│ Hostname k8s: pc1                    │                │ Hostname k8s: pc2                │
│ Label: role=infra                    │                │ (sem label especial)             │
│                                      │                │                                  │
│ Pods FIXADOS (nodeSelector):         │                │ Pods DISTRIBUÍDOS:               │
│  • postgres-0      (StatefulSet)     │                │  • servico-aluno      ×1         │
│  • kafka-0         (StatefulSet)     │                │  • servico-professor  ×1         │
│  • discovery-server                  │                │  • servico-disciplina ×1         │
│  • api-gateway                       │                │  • servico-matricula  ×1         │
│  • escolar-ui                        │                │                                  │
│  • zipkin                            │                │                                  │
│  • traefik (ingress)                 │                │                                  │
│                                      │                │                                  │
│ + 1 réplica de cada serviço          │                │                                  │
│   de negócio (topologySpread)        │                │                                  │
└─────────────────────────────────────┘                └─────────────────────────────────┘
```

**Por que essa divisão:**

- O provisioner padrão do k3s é `local-path` — PVs ficam presos ao nó onde foram criados. Postgres e Kafka **não podem migrar** entre nós sem perder dados.
- Soluções de storage distribuído (Longhorn, Rook) resolveriam isso, mas adicionam complexidade que não é o ponto da disciplina.
- Decisão consciente: **stateful infra fica no PC-1; serviços de negócio são distribuídos**. A demo é desligar o PC-2.

**Resposta para "e se desligar o PC-1?":** o sistema fica indisponível até o PC-1 voltar, mas os dados persistem no disco. É a mesma limitação documentada na seção 9 do `ARQUITETURA-DISTRIBUIDA.md` ("PostgreSQL com 1 réplica — sem alta disponibilidade no banco"). Para resolver isso seria preciso replicação de banco (Patroni) e Kafka multi-broker — fora do escopo.

---

## 2. Pré-requisitos em cada PC

### PC-1 e PC-2 — comum

- Windows 10 22H2+ ou Windows 11 (idealmente 24H2 para `mirrored` networking do WSL).
- WSL2 instalado com Ubuntu 22.04 ou 24.04.
- Mesma rede local (Wi-Fi ou cabo).
- Imagens Docker do projeto buildadas (`bash scripts/build-images.sh` precisa ter rodado pelo menos uma vez em cada máquina, OU usar o método de export/import descrito na seção 5).

### Configuração de rede WSL2 (CRÍTICO)

Por padrão o WSL2 fica em uma subnet NAT'd invisível para a LAN. Há duas soluções; escolha uma:

#### Opção A — `networkingMode=mirrored` (Windows 11 24H2+, recomendado)

Em **ambos** os PCs, edite `C:\Users\<user>\.wslconfig`:

```ini
[wsl2]
networkingMode=mirrored
```

Reinicie o WSL: `wsl --shutdown` (PowerShell) e abra o terminal Ubuntu de novo. Agora o WSL enxerga e é enxergado na LAN com o mesmo IP do Windows. Verifique: `ip addr` dentro do WSL deve mostrar o IP da LAN (`192.168.x.y`).

#### Opção B — `netsh portproxy` (Windows 10 ou 11 sem 24H2)

Mais trabalhoso. No PowerShell **Admin** de cada PC, depois que o WSL estiver rodando:

```powershell
# Descobrir IP do WSL
$WSL_IP = (wsl hostname -I).Trim().Split(' ')[0]

# Encaminhar portas necessárias do Windows → WSL
foreach ($port in 6443, 80, 8088) {
    netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$WSL_IP
}

# Liberar firewall
foreach ($port in 6443, 80, 8088) {
    New-NetFirewallRule -DisplayName "WSL k3s $port" -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow | Out-Null
}
```

> Em qualquer das opções, teste antes da demo: do PC-2 faça `ping <IP-PC1>` e `curl http://<IP-PC1>:80` (ou a porta que o ingress usar). Se não responder, a demo não vai funcionar — resolva a rede antes de tudo.

---

## 3. Setup do cluster (passo a passo)

> Faça uma vez para o ensaio, deixe o cluster rodando, e refaça antes da apresentação se a rede mudar.

### 3.1 Configurar `.env.distributed` (uma unica vez, em CADA PC)

Toda a configuracao mora em `.env.distributed` na raiz do projeto. Editou esse arquivo, todos os scripts ja sabem os IPs. **Mude IP aqui, nao precisa mais editar nada.**

Em cada PC, dentro do WSL Ubuntu, descubra o IP da LAN:

```bash
hostname -I | awk '{print $1}'
```

Anote: `PC-1 = 192.168.x.y` e `PC-2 = 192.168.x.z`.

Crie o arquivo de configuracao **com os mesmos valores em ambos os PCs**:

```bash
cp .env.distributed.example .env.distributed
nano .env.distributed     # ou code, vim, etc
```

Preencha:

```bash
PC1_IP=192.168.x.y                       # IP da LAN do PC-1
PC2_IP=192.168.x.z                       # IP da LAN do PC-2
PC2_SSH_USER=usuario                     # seu usuario SSH no PC-2
K3S_TOKEN=escolar-demo-token-2026        # qualquer string, IGUAL nos dois PCs
```

> O arquivo esta no `.gitignore`, entao nao vaza no repositorio. Variaveis exportadas no shell (ex: `export PC1_IP=...`) tem precedencia sobre o arquivo — util para override pontual.

### 3.2 PC-1 — instalar k3s SERVER

Com `.env.distributed` preenchido, dentro do WSL Ubuntu do PC-1, na raiz do projeto:

```bash
bash scripts/cluster-up-server.sh
```

O script le `.env.distributed`, instala o k3s server, configura `~/.kube/config` apontando para o IP da LAN, e ja labela o no com `role=infra`. Saida esperada no fim:

```
==> k3s server pronto.
NAME   STATUS   ROLES                  AGE   VERSION
pc1    Ready    control-plane,master   25s   v1.30.x
```

### 3.3 PC-2 — instalar k3s AGENT

Copie o projeto para o PC-2 (`git clone` + criar `.env.distributed` com **os mesmos valores** do PC-1), e dentro do WSL Ubuntu do PC-2, na raiz do projeto:

```bash
bash scripts/cluster-join-agent.sh
```

O script testa primeiro o acesso a `https://${PC1_IP}:6443/ping` para falhar cedo se a rede estiver bloqueada.

### 3.4 Verificar do PC-1

```bash
kubectl get nodes -o wide
# pc1    Ready    control-plane,master   ...
# pc2    Ready    <none>                 ...
```

> Se o `pc2` nao aparecer, ver secao 8.1 (troubleshooting).

---

## 4. Mudanças já aplicadas nos manifests

As edições abaixo **já estão no repositório** — não precisa fazer nada manualmente, é só `kubectl apply -f k8s/` (via `scripts/deploy.sh`).

| Manifest | Mudança |
|---|---|
| `10-postgres.yaml` | `nodeSelector: role=infra` na StatefulSet |
| `20-kafka.yaml` | `nodeSelector: role=infra` na StatefulSet |
| `25-zipkin.yaml` | `nodeSelector: role=infra` no Deployment |
| `30-eureka.yaml` | `nodeSelector: role=infra` no Deployment |
| `40-services.yaml` | `topologySpreadConstraints` nos 4 Deployments + 4 `PodDisruptionBudget` (`minAvailable: 1`) |
| `50-gateway.yaml` | `nodeSelector: role=infra` no Deployment |
| `60-ui.yaml` | `nodeSelector: role=infra` no Deployment |
| `70-ingress.yaml` | Reescrito para path-based (sem host: `escolar.localhost`). Rotas: `/api` → gateway, `/` → UI |

### Por que Eureka e Zipkin nao estao no Ingress

Os dashboards do Eureka e Zipkin usam paths absolutos nos seus HTML/CSS — rotear via `/eureka` ou `/zipkin` quebra os assets. Para demo, expomos esses dashboards via `kubectl port-forward` no PC-1 (ver secao 7).

### Scripts adicionados

- `scripts/cluster-up-server.sh` — instala k3s server no PC-1 com label `role=infra`.
- `scripts/cluster-join-agent.sh` — instala k3s agent no PC-2 e registra no server.
- `scripts/cluster-down-distributed.sh` — desinstala k3s do node atual.
- `scripts/export-images.sh` — salva todas as imagens em `/tmp/escolar-images/` (rodar no PC-1).
- `scripts/import-images.sh` — importa `.tar` no containerd local (rodar em cada PC).
- `scripts/build-images.sh` (modificado) — pula `k3d image import` se k3d nao existe.

---

## 5. Distribuir as imagens Docker para os dois PCs

K3s **não usa o Docker do host** — ele tem seu próprio containerd. Precisamos importar as imagens em cada nó.

### No PC-1 (WSL Ubuntu):

```bash
# 1) Buildar todas as imagens (vai pular "k3d image import" porque k3d nao existe)
bash scripts/build-images.sh

# 2) Exportar para /tmp/escolar-images, importar no containerd local
#    E copiar via scp para o PC-2 (usa PC2_IP/PC2_SSH_USER do .env.distributed)
bash scripts/export-images.sh
```

### No PC-2 (WSL Ubuntu, depois do passo 2):

```bash
bash scripts/import-images.sh
```

### Sanity check em cada nó:

```bash
sudo k3s ctr images list | grep escolar
# deve listar todas as 7 imagens (alguma variacao em torno de "docker.io/escolar/<nome>:latest")
```

> `imagePullPolicy: IfNotPresent` (ja presente em todos os Deployments) faz o k3s usar a imagem local sem tentar puxar do registry.

---

## 6. Deploy e validação pré-demo

No **PC-1**, depois que o cluster está com 2 nós Ready e imagens importadas em ambos:

```bash
bash scripts/deploy.sh

# Aguardar tudo ficar Ready (pode demorar 2-3 min)
kubectl -n escolar get pods -o wide -w
```

**Verificações obrigatórias antes de declarar "pronto":**

```bash
# 1) Os 2 nós aparecem Ready
kubectl get nodes
# pc1   Ready    control-plane,master
# pc2   Ready    <none>

# 2) Cada serviço de negócio tem 1 pod em cada nó
kubectl -n escolar get pods -o wide -l 'app in (servico-aluno,servico-professor,servico-disciplina,servico-matricula)'
# deve mostrar pc1 e pc2 alternados nas linhas

# 3) Stateful tudo no pc1
kubectl -n escolar get pods -o wide -l 'app in (postgres,kafka)'
# todos com NODE=pc1

# 4) E2E funciona
bash scripts/test-e2e.sh

# 5) Acesso pela LAN funciona
source .env.distributed   # carrega PC1_IP
curl http://${PC1_IP}/api/alunos
# (e tentar do PC-2: curl http://${PC1_IP}/api/alunos)
```

Se algum item acima falhar, **não prossiga para a demo** — debugue antes.

---

## 7. Roteiro da apresentação (script para o dia)

### 7.1 Abertura (30s)

> "Vamos demonstrar a execução de um sistema de microsserviços distribuído em dois computadores via Kubernetes. Nosso cluster k3s tem um nó server no PC da esquerda e um nó agent no PC da direita, comunicando pela rede local."

```bash
# Tela 1: estado inicial dos nós
kubectl get nodes -o wide
```

> "Ambos Ready, ambos com seus IPs da LAN."

```bash
# Tela 2: distribuição dos pods
kubectl -n escolar get pods -o wide
```

> "Os serviços de infraestrutura (Postgres, Kafka, Eureka, Gateway) estão fixados no PC-1 porque usam armazenamento local. Os serviços de negócio — aluno, professor, disciplina, matrícula — têm uma réplica em cada PC, garantindo redundância."

### 7.2 Validar funcionamento inicial (40s)

Antes da apresentacao, em terminais separados no PC-1 (rode em background):

```bash
# Port-forward para Eureka e Zipkin ficarem acessiveis no navegador do PC-1
kubectl -n escolar port-forward svc/discovery-server 8761:8761 &
kubectl -n observability port-forward svc/zipkin 9411:9411 &
```

Durante a demo:

```bash
# Carrega PC1_IP do .env.distributed e gera carga continua
source .env.distributed
while true; do
  curl -s -o /dev/null -w "%{http_code} -> $(date +%H:%M:%S)\n" http://${PC1_IP}/api/alunos
  sleep 1
done
```

> "Aqui estamos chamando o endpoint de alunos a cada segundo, retornando HTTP 200. Vou abrir o Eureka para mostrar todas as instâncias registradas."

Abrir navegador em `http://localhost:8761` (no PC-1, via port-forward) — mostrar 2 instancias de cada servico, cada uma com hostname diferente (pod-IDs).

### 7.3 Falha simulada (60s)

> "Agora vamos simular uma falha catastrófica: vou desligar fisicamente o PC-2 puxando o cabo de energia."

**[Puxar cabo do PC-2]**

> "Observem a tela do `curl` à esquerda. Por alguns segundos, algumas requisições podem falhar — porque ainda há tráfego sendo roteado para os pods do PC-2 que o Kubernetes ainda não declarou mortos. O `node-monitor-grace-period` é de 40 segundos."

Mostrar:

```bash
# Em outro terminal, acompanhar status do nó
kubectl get nodes -w
# pc2 vai para NotReady em ~40s
```

> "Lá vai. PC-2 marcado como NotReady. Agora o Kubernetes vai reagendar os pods perdidos no PC-1."

```bash
kubectl -n escolar get pods -o wide -w
# pods do pc2 ficam Terminating
# novos pods são criados no pc1
```

### 7.4 Continuidade comprovada (30s)

> "Enquanto isso, a aplicação continua respondendo — porque sempre existiu uma réplica de cada serviço no PC-1. Vejam o `curl`: HTTP 200 ininterrupto (ou voltando ao 200 após uma janela curta de instabilidade)."

```bash
# Mostrar que os 4 serviços agora têm 2 réplicas no pc1
kubectl -n escolar get pods -o wide | grep -E 'aluno|professor|disciplina|matricula'
# todas com NODE=pc1
```

> "O sistema está rodando em uma única máquina, mas todos os pods estão Running. Resiliência demonstrada."

### 7.5 Bonus — Resilience4j (opcional, +30s)

> "Além da resiliência de infraestrutura via Kubernetes, temos resiliência de aplicação via Circuit Breaker. Se eu derrubasse o `servico-aluno` completamente..."

```bash
source .env.distributed
kubectl -n escolar scale deployment/servico-aluno --replicas=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST \
    -H 'Content-Type: application/json' -d '{"alunoId":1,"disciplinaId":1}' \
    http://${PC1_IP}/api/matriculas
done
# várias 503 conforme o circuit breaker abre
kubectl -n escolar scale deployment/servico-aluno --replicas=2
```

> "...o circuit breaker abre e o gateway retorna 503 imediatamente, em vez de timeout."

### 7.6 Fechamento (15s)

> "Em resumo: cluster Kubernetes distribuído entre duas máquinas, falha física de um nó simulada, e o sistema continuou operacional em um único nó. Padrões aplicados: replicação, service discovery, ingress, circuit breaker e probes de saúde."

---

## 8. Plano B — se algo der errado na hora

### 8.1 PC-2 não consegue se juntar ao cluster

**Sintoma:** `kubectl get nodes` só mostra `pc1`.

**Diagnóstico rápido (do PC-2):**

```bash
sudo journalctl -u k3s-agent -n 50 --no-pager
ping 192.168.1.10
curl -k https://192.168.1.10:6443/ping
```

**Causas comuns:**
- Firewall do Windows bloqueando porta 6443 no PC-1 → ver Opção B da seção 2.
- Token errado → desinstalar com `/usr/local/bin/k3s-agent-uninstall.sh` e refazer.
- WSL networking quebrado → conferir `ip addr` dentro do WSL.

### 8.2 Cluster sobe mas pods ficam em `Pending`

**Sintoma:** `kubectl get pods` mostra Pending por mais de 1min.

**Diagnóstico:**

```bash
kubectl -n escolar describe pod <pod-name> | tail -20
```

**Causas comuns:**
- Imagem não importada no nó (`ErrImagePull` ou `ImagePullBackOff`) → reexecutar `k3s ctr images import` na seção 5.
- `topologySpreadConstraints` insatisfatível porque um dos nós está NotReady — temporariamente baixar para `replicas: 1` ou remover `topologySpreadConstraints`.

### 8.3 Fallback final — rodar tudo no PC-1 só

Se nada funcionar até 10 minutos antes da apresentação:

```bash
# Remover label do pc1 para tirar o nodeSelector
kubectl label node pc1 role- --overwrite

# Editar k8s/40-services.yaml para replicas: 1 e remover topologySpreadConstraints
# Reaplicar
kubectl apply -f k8s/

# Demo vira: cluster com 1 nó, sem demo distribuída
```

Apresentar mostrando o cluster e os padrões aplicados, justificando que a configuração distribuída está implementada no código mas houve problema de infra no dia. Não é ideal, mas é melhor que travar.

### 8.4 Reinicializar o cluster do zero (último recurso)

No **PC-1**: `/usr/local/bin/k3s-uninstall.sh`
No **PC-2**: `/usr/local/bin/k3s-agent-uninstall.sh`

E refazer a seção 3.

---

## 9. Checklist final (imprimir e levar)

**No dia da apresentação, 30 min antes** (com `source .env.distributed` carregado no shell):

- [ ] Ambos PCs ligados, na mesma rede
- [ ] `wsl --shutdown` em ambos, reabrir Ubuntu
- [ ] IPs reais conferem com `.env.distributed` em ambos PCs (`hostname -I` vs `cat .env.distributed`)
- [ ] `kubectl get nodes` no PC-1 mostra `pc1 Ready` e `pc2 Ready`
- [ ] `kubectl -n escolar get pods -o wide` mostra ≥10 pods Running distribuídos
- [ ] `curl http://${PC1_IP}/api/alunos` retorna 200 do PC-1
- [ ] `curl http://${PC1_IP}/api/alunos` retorna 200 do **celular** (testa LAN)
- [ ] Navegador no PC-1: `http://${PC1_IP}/` (UI) abre
- [ ] `kubectl -n escolar port-forward svc/discovery-server 8761:8761` rodando em background, `http://localhost:8761` abre o Eureka
- [ ] (opcional) `kubectl -n observability port-forward svc/zipkin 9411:9411` rodando, `http://localhost:9411` abre o Zipkin
- [ ] Cabo de força do PC-2 acessível (não embaixo da mesa)
- [ ] Janelas de terminal organizadas: 1 com `curl` em loop, 1 com `kubectl get nodes -w`, 1 com `kubectl -n escolar get pods -o wide -w`
- [ ] Slide ou diagrama da topologia aberto em segundo monitor (caso a banca queira ver no meio)

---

## 10. Mapeamento conceito → demo

| Conceito de Sistemas Distribuídos | Onde aparece na demo |
|---|---|
| Cluster com múltiplos nós | Seção 7.1: `kubectl get nodes -o wide` |
| Replicação | Seção 7.1: cada serviço com 2 réplicas |
| Distribuição de carga | Seção 7.2: Eureka com instâncias em IPs diferentes |
| Detecção de falha | Seção 7.3: nó vai para NotReady |
| Auto-healing / Self-healing | Seção 7.3: pods reagendados automaticamente |
| Tolerância a falhas | Seção 7.4: serviço continua respondendo |
| Circuit Breaker (Resilience4j) | Seção 7.5 (bonus) |
| Health checks / Probes | Manifest: `livenessProbe`, `readinessProbe` |
| Service Discovery | Eureka dashboard mostrando registro em tempo real |
| Single entry point | API Gateway + Ingress (Traefik) |
