#!/usr/bin/env bash

set -e

APP_NAME="test"
SYNC_NAMESPACE_PREFIX="test"
SYNC_NAMESPACE="$SYNC_NAMESPACE_PREFIX-$RANDOM"
TEST_APP_NAME="test-$RANDOM"

# login to cluster as evals user
oc login $OPENSHIFT_HOST -u $OPENSHIFT_USER -p $OPENSHIFT_PASS

# find mdc namespace
mkdir -p tmp
sed -e "s/\${APP_NAME}/$TEST_APP_NAME/" templates/mobile-client.yaml >tmp/test-mobile-client.yaml
if oc create -f tmp/test-mobile-client.yaml -n openshift-mobile-developer-console &>/dev/null; then
  MDC_NAMESPACE=openshift-mobile-developer-console
  oc delete mobileclient $TEST_APP_NAME -n $MDC_NAMESPACE
else
  MDC_NAMESPACE=mobile-developer-console
fi

# cleanup
oc delete mobileclient $APP_NAME -n $MDC_NAMESPACE || true
oc delete pushapplication $APP_NAME -n $MDC_NAMESPACE || true
oc get projects | grep "$SYNC_NAMESPACE_PREFIX-" | awk '{print $1}' | xargs -L1 oc delete project

# create mobile app
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

# create push application
sed -e "s/\${PUSH_APP_NAME}/$APP_NAME/" \
  templates/push-app.yaml >tmp/push-app.yaml
oc create -f tmp/push-app.yaml -n $MDC_NAMESPACE
sleep 5
PUSH_APP_ID=$(node -pe 'JSON.parse(process.argv[1]).status.pushApplicationId' \
  "$(oc get pushapplication $APP_NAME -n $MDC_NAMESPACE -o json)")

# bind with push - android
sed -e "s/\${APP_NAME}/$APP_NAME/" \
  -e "s/\${APP_UID}/$APP_UID/" \
  -e "s/\${PUSH_APP_ID}/$PUSH_APP_ID/" \
  -e "s/\${FIREBASE_SERVER_KEY}/$FIREBASE_SERVER_KEY/" \
  templates/android-variant.yaml >tmp/android-variant.yaml
oc create -f tmp/android-variant.yaml -n $MDC_NAMESPACE

# bind with mss
sed -e "s/\${APP_NAME}/$APP_NAME/" \
  -e "s/\${APP_UID}/$APP_UID/" \
  templates/mss-app.yaml >tmp/mss-app.yaml
oc create -f tmp/mss-app.yaml -n $MDC_NAMESPACE

# wait for bindings
sleep 10

# get mobile-services.json
node -pe 'JSON.stringify(JSON.parse(process.argv[1]).status, null, 2)' \
  "$(oc get mobileclient $APP_NAME -n $MDC_NAMESPACE -o json)" >mobile-services.json

# get push app config
oc get pushapplication $APP_NAME -n $MDC_NAMESPACE -o json >push-app.json

echo "Setup successful"
