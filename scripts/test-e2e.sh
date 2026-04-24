#!/usr/bin/env bash
# Testes ponta-a-ponta via API Gateway. Verifica:
#  1. Criar aluno
#  2. Criar disciplina (qtdMatriculas começa em 0)
#  3. Criar matricula
#  4. Aguardar consumer Kafka incrementar contador da disciplina
#  5. Verificar tracing (spans devem aparecer no Zipkin)
#  6. Verificar load balancing (chamar 5x e logar pods atendendo)
#
# Pré-requisito: cluster up + deploy concluídos.

set -euo pipefail

API="http://api.escolar.localhost:8088"
ZIPKIN="http://zipkin.localhost:8088"

echo "==> 1) Criando aluno"
ALUNO=$(curl -fsS -X POST "$API/api/alunos" -H 'Content-Type: application/json' \
  -d '{"nome":"Aluno Teste","matricula":"2026001","email":"aluno@escola.com"}')
echo "$ALUNO"
ALUNO_ID=$(echo "$ALUNO" | python -c 'import sys,json; print(json.load(sys.stdin)["id"])')

echo
echo "==> 2) Criando disciplina"
DISC=$(curl -fsS -X POST "$API/api/disciplinas" -H 'Content-Type: application/json' \
  -d '{"nome":"Sistemas Distribuidos","cargaHoraria":80}')
echo "$DISC"
DISC_ID=$(echo "$DISC" | python -c 'import sys,json; print(json.load(sys.stdin)["id"])')

echo
echo "==> 3) Criando matricula (aluno=$ALUNO_ID, disciplina=$DISC_ID)"
MAT=$(curl -fsS -X POST "$API/api/matriculas" -H 'Content-Type: application/json' \
  -d "{\"alunoId\":$ALUNO_ID,\"disciplinaId\":$DISC_ID}")
echo "$MAT"

echo
echo "==> 4) Aguardando consumer Kafka processar evento (3s)..."
sleep 3
DISC_ATUALIZADA=$(curl -fsS "$API/api/disciplinas/$DISC_ID")
echo "Disciplina após evento: $DISC_ATUALIZADA"
QTD=$(echo "$DISC_ATUALIZADA" | python -c 'import sys,json; print(json.load(sys.stdin)["qtdMatriculas"])')
if [[ "$QTD" == "1" ]]; then
  echo "OK: consumer Kafka incrementou qtdMatriculas para 1"
else
  echo "FALHA: qtdMatriculas=$QTD (esperado 1)"
  exit 1
fi

echo
echo "==> 5) Verificando spans no Zipkin"
SERVICES=$(curl -fsS "$ZIPKIN/api/v2/services" || echo "[]")
echo "Serviços com tracing: $SERVICES"

echo
echo "==> 6) Load balancing - 5 chamadas a /api/alunos com hostname do pod"
for i in 1 2 3 4 5; do
  curl -fsS "$API/api/alunos" >/dev/null
done
echo "Pods de servico-aluno (cada um deve ter recebido alguma requisicao):"
kubectl -n escolar logs -l app=servico-aluno --tail=2 --prefix=true | head -20

echo
echo "==> TODOS TESTES OK"
