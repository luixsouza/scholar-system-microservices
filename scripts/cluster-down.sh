#!/usr/bin/env bash
# Destrói o cluster k3d "escolar".
set -euo pipefail
CLUSTER_NAME="${CLUSTER_NAME:-escolar}"
k3d cluster delete "$CLUSTER_NAME"
