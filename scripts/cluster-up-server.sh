#!/usr/bin/env bash
# Instala k3s SERVER no PC-1 (no WSL2 Ubuntu).
# Pre-requisitos: WSL2 com networkingMode=mirrored (Win11 24H2+) ou
# portproxy configurado (ver DEMO-RESILIENCIA.md secao 2).
#
# Configuracao: edite .env.distributed na raiz do projeto.
# Uso: bash scripts/cluster-up-server.sh

set -euo pipefail

REQUIRED_VARS=(PC1_IP K3S_TOKEN)
# shellcheck source=_load-env.sh
source "$(dirname "$0")/_load-env.sh"

NODE_IP="${PC1_IP}"
NODE_NAME="${NODE_NAME:-pc1}"

echo "==> Instalando k3s server em ${NODE_IP} (node-name=${NODE_NAME})..."
curl -sfL https://get.k3s.io | sh -s - \
  --node-ip "${NODE_IP}" \
  --advertise-address "${NODE_IP}" \
  --bind-address "${NODE_IP}" \
  --tls-san "${NODE_IP}" \
  --node-name "${NODE_NAME}" \
  --token "${K3S_TOKEN}" \
  --disable-network-policy \
  --write-kubeconfig-mode 644

echo "==> Configurando kubectl para usuario nao-root..."
mkdir -p "${HOME}/.kube"
sudo cp /etc/rancher/k3s/k3s.yaml "${HOME}/.kube/config"
sudo chown "$(id -u):$(id -g)" "${HOME}/.kube/config"
sed -i "s|127.0.0.1|${NODE_IP}|g" "${HOME}/.kube/config"

echo "==> Labelando ${NODE_NAME} com role=infra..."
for i in {1..30}; do
  if kubectl get node "${NODE_NAME}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
kubectl label node "${NODE_NAME}" role=infra --overwrite

echo
echo "==> k3s server pronto."
kubectl get nodes -o wide
echo
echo "==> Proximo passo: no PC-2, com o mesmo .env.distributed presente, rode:"
echo "    bash scripts/cluster-join-agent.sh"
