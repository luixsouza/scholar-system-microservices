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
  # Importa no k3d se ele existir (modo single-host antigo). Para o modo
  # distribuido em 2 PCs (k3s nativo), rode scripts/export-images.sh apos
  # buildar para gerar os tarballs e distribuir.
  if command -v k3d >/dev/null 2>&1 && k3d cluster list "$CLUSTER_NAME" >/dev/null 2>&1; then
    echo "==> Importando $image no k3d cluster $CLUSTER_NAME"
    k3d image import "$image" -c "$CLUSTER_NAME"
  else
    echo "==> k3d nao detectado para cluster $CLUSTER_NAME. Pulando import."
    echo "    (para k3s distribuido, rode scripts/export-images.sh depois)"
  fi
done

echo
echo "Imagens disponíveis no cluster:"
docker images | grep -E '^escolar/' || true
