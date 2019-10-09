SYNC_NAMESPACE_PREFIX="test"
SYNC_NAMESPACE="$SYNC_NAMESPACE_PREFIX-$RANDOM"

# cleanup
oc get projects | grep "$SYNC_NAMESPACE_PREFIX-" | awk '{print $1}' | xargs -L1 oc delete project

# deploy showcase server
oc new-project $SYNC_NAMESPACE
svcat provision $SYNC_NAMESPACE \
  --class datasync-showcase-server --plan default \
  -n $SYNC_NAMESPACE --wait
export SYNC_URL="https:\/\/$(oc get route | grep ionic-showcase-server | awk '{print $2}')"
