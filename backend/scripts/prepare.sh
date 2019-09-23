SYNC_NAMESPACE_PREFIX="test"
SYNC_NAMESPACE="$SYNC_NAMESPACE_PREFIX-$RANDOM"

oc login $OPENSHIFT_HOST -u $OPENSHIFT_USER -p $OPENSHIFT_PASS

# determine MDC namespace
if oc get mobileclients -n openshift-mobile-developer-console &>/dev/null; then
  export MDC_NAMESPACE=openshift-mobile-developer-console
else
  export MDC_NAMESPACE=mobile-developer-console
fi

# cleanup
oc delete mobileclient test -n $MDC_NAMESPACE || true
oc delete pushapplication test -n $MDC_NAMESPACE || true
oc get projects | grep "$SYNC_NAMESPACE_PREFIX-" | awk '{print $1}' | xargs -L1 oc delete project

# deploy showcase server
oc new-project $SYNC_NAMESPACE
svcat provision $SYNC_NAMESPACE \
  --class datasync-showcase-server --plan default \
  -n $SYNC_NAMESPACE --wait
export SYNC_URL="https:\/\/$(oc get route | grep ionic-showcase-server | awk '{print $2}')"