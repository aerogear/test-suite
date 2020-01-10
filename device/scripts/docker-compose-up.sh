#!/usr/bin/env bash

set -e

if [ -f "docker-compose.yml" ]; then
    docker-compose down
fi

UPS_VERSION="${UPS_VERSION:-latest}"
DATASYNC_VERSION="${DATASYNC_VERSION:-latest}"

sed -e "s/\${UPS_VERSION}/$UPS_VERSION/" \
  -e "s/\${DATASYNC_VERSION}/$DATASYNC_VERSION/" \
  templates/docker-compose.yml >docker-compose.yml

docker-compose up -d

sleep 10
