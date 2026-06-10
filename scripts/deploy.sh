#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <container-image> <django-secret-key>"
  echo "Example: $0 us.icr.io/my-namespace/cars-dealership:latest 'replace-me'"
  exit 1
fi

image="$1"
secret_key="$2"

kubectl create secret generic cars-dealership-secrets \
  --from-literal=django-secret-key="$secret_key" \
  --dry-run=client \
  -o yaml | kubectl apply -f -

kubectl apply -f deployment.yaml
kubectl set image deployment/cars-dealership cars-dealership="$image"
kubectl rollout status deployment/cars-dealership

external_ip=""
for _ in {1..30}; do
  external_ip="$(kubectl get service cars-dealership-service \
    -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)"
  if [[ -z "$external_ip" ]]; then
    external_ip="$(kubectl get service cars-dealership-service \
      -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || true)"
  fi
  [[ -n "$external_ip" ]] && break
  sleep 5
done

if [[ -z "$external_ip" ]]; then
  echo "Deployment succeeded, but the load balancer URL is not ready."
  echo "Run: kubectl get service cars-dealership-service"
  exit 1
fi

deployment_url="http://$external_ip"
printf '%s\n' "$deployment_url" > evidence/deploymentURL
echo "Deployment URL: $deployment_url"
