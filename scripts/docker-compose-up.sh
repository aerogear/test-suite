#!/usr/bin/env bash

set -e

KEYCLOAK_VERSION="${KEYCLOAK_VERSION:-latest}"
METRICS_VERSION="${METRICS_VERSION:-latest}"
UPS_VERSION="${UPS_VERSION:-latest}"
DATASYNC_VERSION="${DATASYNC_VERSION:-latest}"

sed -e "s/\${KEYCLOAK_VERSION}/$KEYCLOAK_VERSION/" \
  -e "s/\${METRICS_VERSION}/$METRICS_VERSION/" \
  -e "s/\${UPS_VERSION}/$UPS_VERSION/" \
  -e "s/\${DATASYNC_VERSION}/$DATASYNC_VERSION/" \
  templates/docker-compose.yml >docker-compose.yml

docker-compose up -d
