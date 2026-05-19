#!/usr/bin/env bash
# Importa todos os .tar de /tmp/escolar-images no containerd do k3s.
# Rodar em CADA node (PC-1 e PC-2) depois que as imagens estao no disco.

set -euo pipefail

SRC="${SRC:-/tmp/escolar-images}"

if [[ ! -d "$SRC" ]]; then
  echo "ERRO: diretorio $SRC nao existe. Copie os tars exportados primeiro."
  exit 1
fi

if ! command -v k3s >/dev/null 2>&1; then
  echo "ERRO: k3s nao instalado neste node."
  exit 1
fi

count=0
for tar in "${SRC}"/*.tar; do
  [[ -f "$tar" ]] || continue
  echo "==> Importando $(basename "$tar")..."
  sudo k3s ctr images import "$tar"
  count=$((count + 1))
done

echo
echo "==> $count imagens importadas. Verificando..."
sudo k3s ctr images list | grep -E 'escolar/' || echo "Nenhuma imagem escolar/ visivel."
