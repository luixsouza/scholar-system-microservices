#!/usr/bin/env bash
# Builda as imagens Docker dos serviços e importa pro cluster k3d "escolar".
# Uso: bash scripts/build-images.sh [servico1 servico2 ...]
#  Sem args: builda todos.

set -euo pipefail
CLUSTER_NAME="${CLUSTER_NAME:-escolar}"

# nome=Dockerfile-relativo
declare -A SERVICES=(
  [discovery-server]="discovery-server/Dockerfile"
  [api-gateway]="api-gateway/Dockerfile"
  [servico-aluno]="servico-aluno/Dockerfile"
  [servico-professor]="servico-professor/Dockerfile"
  [servico-disciplina]="servico-disciplina/Dockerfile"
  [servico-matricula]="servico-matricula/Dockerfile"
  [escolar-ui]="escolar-ui/Dockerfile"
)

# argumentos definem a lista; default = todos
TARGETS=("$@")
if [[ ${#TARGETS[@]} -eq 0 ]]; then
  TARGETS=("${!SERVICES[@]}")
fi

for svc in "${TARGETS[@]}"; do
  dockerfile="${SERVICES[$svc]:-}"
  if [[ -z "$dockerfile" ]]; then
    echo "Serviço desconhecido: $svc" >&2
    exit 1
  fi
  image="escolar/${svc}:latest"
  echo "==> Build $image (Dockerfile: $dockerfile)"
  if [[ "$svc" == "escolar-ui" ]]; then
    docker build -t "$image" -f "$dockerfile" ./escolar-ui
  else
    docker build -t "$image" -f "$dockerfile" .
  fi
  echo "==> Importando $image no k3d cluster $CLUSTER_NAME"
  k3d image import "$image" -c "$CLUSTER_NAME"
done

echo
echo "Imagens disponíveis no cluster:"
docker images | grep -E '^escolar/' || true
