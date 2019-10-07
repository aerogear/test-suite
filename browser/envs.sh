#!/usr/bin/env bash

set -e

# Interactive script to prepare .env file

OPENSHIFT_USERNAME=
OPENSHIFT_PASSWORD=
MDC_URL="https://<REPLACE_ME>"
OPENSHIFT_URL="https://<REPLACE_ME>/console"
HEADLESS=

if [[ -f ./.env ]]; then
    source ./.env
fi

echo "OPENSHIFT_URL     the url to the openshift console (ex: https://replace.me/console)"
echo "[$OPENSHIFT_URL]:"
read openshift_url

