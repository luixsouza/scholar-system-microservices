#!/usr/bin/env bash
# Desinstala k3s (server ou agent) do node atual.
# Rode em cada PC para limpar tudo.

set -euo pipefail

if [[ -x /usr/local/bin/k3s-uninstall.sh ]]; then
  echo "==> Desinstalando k3s server..."
  sudo /usr/local/bin/k3s-uninstall.sh
elif [[ -x /usr/local/bin/k3s-agent-uninstall.sh ]]; then
  echo "==> Desinstalando k3s agent..."
  sudo /usr/local/bin/k3s-agent-uninstall.sh
else
  echo "Nenhum k3s instalado neste node."
fi

echo "==> Limpando imagens em /tmp/escolar-images (se existir)..."
rm -rf /tmp/escolar-images || true

echo "==> Done."
