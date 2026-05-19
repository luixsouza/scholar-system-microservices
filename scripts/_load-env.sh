#!/usr/bin/env bash
# Loader compartilhado pelos scripts do cluster distribuido.
# NAO rode diretamente — apenas faca `source scripts/_load-env.sh` no inicio dos outros scripts.
#
# Comportamento:
#  1. Se existir .env.distributed na raiz do projeto, faz `source` dele.
#  2. As variaveis ja definidas no ambiente (export antes de chamar) TEM PRECEDENCIA
#     sobre o arquivo — facilita override pontual.
#  3. Valida quais variaveis sao requeridas (definidas em REQUIRED_VARS pelo script que chama).

# Descobrir a raiz do projeto (diretorio pai de onde este script vive).
# BASH_SOURCE[0] = path deste arquivo; precisa de ${BASH_SOURCE[0]} mesmo quando source'd.
__LOAD_ENV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
__ENV_FILE="${__LOAD_ENV_DIR}/.env.distributed"

# Snapshot de variaveis que ja estao no ambiente — depois de "source", elas tem precedencia
declare -A __PRE_SET
for var in PC1_IP PC2_IP PC2_SSH_USER K3S_TOKEN; do
  if [[ -n "${!var:-}" ]]; then
    __PRE_SET[$var]="${!var}"
  fi
done

if [[ -f "${__ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a; source "${__ENV_FILE}"; set +a
else
  echo "AVISO: ${__ENV_FILE} nao encontrado."
  echo "       Crie a partir do template: cp .env.distributed.example .env.distributed"
  echo "       (Ou exporte PC1_IP, PC2_IP, K3S_TOKEN manualmente antes de rodar este script.)"
fi

# Re-aplicar overrides do ambiente, pois eles ganham do arquivo
for var in "${!__PRE_SET[@]}"; do
  export "${var}=${__PRE_SET[$var]}"
done

# Validar variaveis obrigatorias.
# O script que chama pode definir REQUIRED_VARS=(VAR1 VAR2) ANTES de fazer source.
if [[ -n "${REQUIRED_VARS+x}" ]]; then
  missing=()
  for v in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!v:-}" ]]; then
      missing+=("$v")
    fi
  done
  if (( ${#missing[@]} > 0 )); then
    echo "ERRO: variaveis obrigatorias nao definidas: ${missing[*]}" >&2
    echo "       Edite .env.distributed ou exporte antes:" >&2
    for v in "${missing[@]}"; do
      echo "         export ${v}=..." >&2
    done
    exit 1
  fi
fi
