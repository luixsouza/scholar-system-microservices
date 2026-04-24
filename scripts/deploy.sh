#!/usr/bin/env bash
# Aplica os manifests Kubernetes na ordem correta e aguarda os pods ficarem Ready.
set -euo pipefail

apply() { echo "==> kubectl apply -f $1"; kubectl apply -f "$1"; }

apply k8s/00-namespace.yaml
apply k8s/10-postgres.yaml
apply k8s/20-kafka.yaml
apply k8s/25-zipkin.yaml

echo "==> Aguardando Postgres ficar Ready..."
kubectl -n escolar rollout status statefulset/postgres --timeout=180s

echo "==> Aguardando Kafka ficar Ready..."
kubectl -n escolar rollout status statefulset/kafka --timeout=180s

echo "==> Aguardando Zipkin ficar Ready..."
kubectl -n observability rollout status deployment/zipkin --timeout=120s

apply k8s/30-eureka.yaml
echo "==> Aguardando Eureka ficar Ready..."
kubectl -n escolar rollout status deployment/discovery-server --timeout=180s

apply k8s/40-services.yaml
apply k8s/50-gateway.yaml
apply k8s/60-ui.yaml
apply k8s/70-ingress.yaml

echo
echo "==> Aguardando rollouts dos microsserviços..."
for d in servico-aluno servico-professor servico-disciplina servico-matricula api-gateway escolar-ui; do
  kubectl -n escolar rollout status deployment/$d --timeout=240s || true
done

echo
echo "==> Estado final:"
kubectl -n escolar get pods -o wide
echo
kubectl -n observability get pods -o wide
echo
echo "Acesso:"
echo "  UI:      http://escolar.localhost:8088"
echo "  API:     http://api.escolar.localhost:8088"
echo "  Eureka:  http://eureka.localhost:8088"
echo "  Zipkin:  http://zipkin.localhost:8088"
