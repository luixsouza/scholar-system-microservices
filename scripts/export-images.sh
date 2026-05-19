#!/usr/bin/env bash
# Exporta todas as imagens Docker do projeto para /tmp/escolar-images/*.tar,
# importa no containerd local do k3s e ja copia para o PC-2 via scp.
#
# Configuracao: edite .env.distributed na raiz do projeto.
# Uso (no PC-1, depois do docker build): bash scripts/export-images.sh

set -euo pipefail

REQUIRED_VARS=(PC2_IP PC2_SSH_USER)
# shellcheck source=_load-env.sh
source "$(dirname "$0")/_load-env.sh"

DEST="${DEST:-/tmp/escolar-images}"
IMAGES=(
  escolar/discovery-server:latest
  escolar/api-gateway:latest
  escolar/servico-aluno:latest
  escolar/servico-professor:latest
  escolar/servico-disciplina:latest
  escolar/servico-matricula:latest
  escolar/escolar-ui:latest
)

mkdir -p "${DEST}"

echo "==> Exportando ${#IMAGES[@]} imagens para ${DEST}"
for img in "${IMAGES[@]}"; do
  name=$(echo "$img" | sed 's|escolar/||;s|:latest||')
  out="${DEST}/${name}.tar"
  if ! docker image inspect "$img" >/dev/null 2>&1; then
    echo "AVISO: imagem $img nao existe localmente. Rode 'bash scripts/build-images.sh' primeiro."
    continue
  fi
  echo "  docker save $img -> $out"
  docker save "$img" -o "$out"
done

echo
echo "==> Importando no containerd do k3s local (PC-1)..."
if command -v k3s >/dev/null 2>&1; then
  for tar in "${DEST}"/*.tar; do
    [[ -f "$tar" ]] || continue
    echo "  k3s ctr images import $tar"
    sudo k3s ctr images import "$tar"
  done
else
  echo "k3s nao encontrado neste node. Pulando import local."
fi

echo
echo "==> Copiando tars para ${PC2_SSH_USER}@${PC2_IP}:${DEST}/"
ssh "${PC2_SSH_USER}@${PC2_IP}" "mkdir -p ${DEST}"
scp "${DEST}"/*.tar "${PC2_SSH_USER}@${PC2_IP}:${DEST}/"

echo
echo "==> Done. No PC-2 (mesmo .env.distributed) rode:"
echo "   bash scripts/import-images.sh"
