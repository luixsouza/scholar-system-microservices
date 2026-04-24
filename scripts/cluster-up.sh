#!/usr/bin/env bash
# Cria o cluster k3d "escolar" (1 server + 1 agent) e expõe Traefik na porta 8088 do host.
# Uso: bash scripts/cluster-up.sh

set -euo pipefail

CLUSTER_NAME="${CLUSTER_NAME:-escolar}"
HOST_PORT="${HOST_PORT:-8088}"

if k3d cluster list "$CLUSTER_NAME" >/dev/null 2>&1; then
  echo "Cluster '$CLUSTER_NAME' já existe. Pulando criação."
else
  echo "Criando cluster k3d '$CLUSTER_NAME' (1 server + 1 agent)..."
  k3d cluster create "$CLUSTER_NAME" \
    --servers 1 --agents 1 \
    --port "${HOST_PORT}:80@loadbalancer" \
    --api-port 6550 \
    --wait
fi

# O kubeconfig escrito por k3d aponta para host.docker.internal:6550, mas no Windows
# isso pode resolver para o IP da rede e bloquear na firewall. Forçamos localhost.
kubectl config set-cluster "k3d-${CLUSTER_NAME}" --server="https://localhost:6550" >/dev/null

echo
echo "Cluster pronto. Nodes:"
kubectl get nodes -o wide
