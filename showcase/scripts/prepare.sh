#!/usr/bin/env bash

set -ex

APP_NAME="test"
SYNC_NAMESPACE="showcase-test-suite-sync"

# find mdc namespace
if oc get mobileclients -n openshift-mobile-developer-console &>/dev/null; then
  MDC_NAMESPACE=openshift-mobile-developer-console
else
  MDC_NAMESPACE=mobile-developer-console
fi

# cleanup
oc delete mobileclient $APP_NAME -n $MDC_NAMESPACE || true
oc delete project $SYNC_NAMESPACE || true

# create mobile app
mkdir -p tmp
sed -e "s/\${APP_NAME}/$APP_NAME/" templates/mobile-client.yaml >tmp/mobile-client.yaml
oc create -f tmp/mobile-client.yaml -n $MDC_NAMESPACE
APP_UID=$(node -pe 'JSON.parse(process.argv[1]).metadata.uid' \
  "$(oc get mobileclient $APP_NAME -n $MDC_NAMESPACE -o json)")

# deploy showcase server
oc new-project $SYNC_NAMESPACE
svcat provision $SYNC_NAMESPACE \
  --class datasync-showcase-server --plan default \
  -n $SYNC_NAMESPACE --wait
SYNC_URL="https:\/\/$(oc get route | grep ionic-showcase-server | awk '{print $2}')"

# bind with data sync
sed -e "s/\${APP_NAME}/$APP_NAME/" \
  -e "s/\${APP_UID}/$APP_UID/" \
  -e "s/\${SYNC_URL}/$SYNC_URL/" \
  templates/data-sync.yaml >tmp/data-sync.yaml
oc create -f tmp/data-sync.yaml -n $MDC_NAMESPACE

# bind with keycloak
sed -e "s/\${APP_NAME}/$APP_NAME/" \
  -e "s/\${APP_UID}/$APP_UID/" \
  templates/keycloak-realm.yaml >tmp/keycloak-realm.yaml
oc create -f tmp/keycloak-realm.yaml -n $MDC_NAMESPACE

# wait for bindings
sleep 10

# get mobile-services.json
node -pe 'JSON.stringify(JSON.parse(process.argv[1]).status, null, 2)' \
  "$(oc get mobileclient $APP_NAME -n $MDC_NAMESPACE -o json)" >mobile-services.json
