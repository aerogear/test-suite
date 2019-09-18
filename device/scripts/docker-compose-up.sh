#!/usr/bin/env bash

set -e

if [ -f "docker-compose.yml" ]; then
    docker-compose down
fi

KEYCLOAK_VERSION="${KEYCLOAK_VERSION:-latest}"
METRICS_VERSION="${METRICS_VERSION:-latest}"
UPS_VERSION="${UPS_VERSION:-latest}"
DATASYNC_VERSION="${DATASYNC_VERSION:-latest}"
MSS_VERSION="${MSS_VERSION:-latest}"

sed -e "s/\${KEYCLOAK_VERSION}/$KEYCLOAK_VERSION/" \
  -e "s/\${METRICS_VERSION}/$METRICS_VERSION/" \
  -e "s/\${UPS_VERSION}/$UPS_VERSION/" \
  -e "s/\${DATASYNC_VERSION}/$DATASYNC_VERSION/" \
  -e "s/\${MSS_VERSION}/$MSS_VERSION/" \
  templates/docker-compose.yml >docker-compose.yml

docker-compose up -d

sleep 10

echo "require('axios').post('http://localhost:3001/api/apps', {
  appID: 'org.aerogear.integrationtests',
  appName: 'org.aerogear.integrationtests'
})" | node
