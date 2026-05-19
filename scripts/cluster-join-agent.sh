#!/usr/bin/env bash
# Instala k3s AGENT no PC-2 e o registra no server do PC-1.
#
# Configuracao: edite .env.distributed na raiz do projeto.
# Uso: bash scripts/cluster-join-agent.sh

set -euo pipefail

REQUIRED_VARS=(PC1_IP PC2_IP K3S_TOKEN)
# shellcheck source=_load-env.sh
source "$(dirname "$0")/_load-env.sh"

SERVER_IP="${PC1_IP}"
NODE_IP="${PC2_IP}"
NODE_NAME="${NODE_NAME:-pc2}"

echo "==> Conectando ao server em https://${SERVER_IP}:6443 ..."
if ! curl -sfk "https://${SERVER_IP}:6443/ping" -o /dev/null; then
  echo "ERRO: nao consigo alcancar o k3s server em ${SERVER_IP}:6443"
  echo "Verifique:"
  echo "  - PC-1 com k3s server rodando (kubectl get nodes)"
  echo "  - Firewall do Windows liberado para porta 6443"
  echo "  - Mesma rede LAN, IPs corretos em .env.distributed"
  exit 1
fi

echo "==> Instalando k3s agent (node-ip=${NODE_IP}, node-name=${NODE_NAME})..."
curl -sfL https://get.k3s.io \
  | K3S_URL="https://${SERVER_IP}:6443" \
    K3S_TOKEN="${K3S_TOKEN}" \
    sh -s - agent \
      --node-ip "${NODE_IP}" \
      --node-name "${NODE_NAME}"

echo
echo "==> Agent instalado. Verifique no PC-1 com: kubectl get nodes -o wide"
echo "    Deve aparecer ${NODE_NAME} Ready em alguns segundos."
echo
echo "==> Logs do agent (Ctrl+C para sair):"
echo "    sudo journalctl -u k3s-agent -f"
