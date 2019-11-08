#!/bin/bash

set -e
set -x

DIR="$1"
NAMESPACE="$2"

# Log into the namespace
oc project "$NAMESPACE"

# Patch the mdc deployment config based on this task: https://github.com/integr8ly/installation/blob/master/roles/mdc/tasks/patch-manifest.yml
oc set env deploymentconfig mdc MOBILE_SERVICES_CONFIG_FILE=/etc/mdc/servicesConfig.json

oc patch deploymentconfig mdc -p '{"spec": {"template": {"spec": {"volumes":[{"name":"manifest","secret":{"defaultMode": 420, "items":[{"key": "generated_manifest", "path": "servicesConfig.json"}], "secretName":"manifest"}}]}}}}'
oc patch deploymentconfig mdc -p '{"spec": {"template": {"spec": {"containers": [{"name": "mdc","volumeMounts": [{"mountPath": "/etc/mdc", "name": "manifest", "readOnly": true}]}]}}}}'

# Patch keycloack Realm spec.status.phase to empty string
# It's due to this switch statement: https://github.com/integr8ly/keycloak-operator/blob/master/pkg/keycloak/keycloak.go#L134
KEYCLOAKREALMS=$(yq r "$DIR/$NAMESPACE-keycloakrealms.yaml" "items[*].spec.users[0].outputSecret" | cut -c 3-)
COUNTER=0
for KEYCLOAK_SECRET in $KEYCLOAKREALMS; do
    yq w -i "$DIR/$NAMESPACE-keycloakrealms.yaml" "items[$COUNTER].status.phase" ""
    PASS=$(oc get secret "$KEYCLOAK_SECRET" -o template --template '{{.data.password|base64decode}}{{"\n"}}')
    yq w -i "$DIR/$NAMESPACE-keycloakrealms.yaml" "items[$COUNTER].spec.users[0].password" "$PASS"
    ((COUNTER = COUNTER + 1))
done

# set list of services
CR_NAMES=(
    mobilesecurityserviceapps
    keycloakrealms
    configmaps
    pushapplications
    androidvariants
    iosvariants
)

# Patch the uid for the ownerReferences and create the crs
for NAME in "${CR_NAMES[@]}"; do
    FILE="$DIR/$NAMESPACE-$NAME.yaml"
    if test -f "$FILE"; then
        echo "Patching metadata.ownerReferences and creating '$NAME' custom resources in the '$NAMESPACE' namespace"

        CRS=$(yq r "$FILE" "items[*].metadata.ownerReferences[0].name" | cut -c 3-)
        COUNTER=0
        for CR in $CRS; do
            OWNER_KIND=$(yq r "$FILE" "items[$COUNTER].metadata.ownerReferences[0].kind")
            if [[ "$OWNER_KIND" == 'MobileClient' ]]; then
                NEW_UID=$(oc get mobileclients "$CR" -o jsonpath='{.metadata.uid}')
                yq w -i "$FILE" "items[$COUNTER].metadata.ownerReferences[0].uid" "$NEW_UID"

                if [[ "$NAME" == "androidvariants" ]] || [[ "$NAME" == "iosvariants" ]]; then
                    NEW_PUSH_APP_ID=$(oc get pushapplications "$CR" -o jsonpath='{.status.pushApplicationId}')
                    yq w -i "$FILE" "items[$COUNTER].spec.pushApplicationId" "$NEW_PUSH_APP_ID"
                fi
            fi
            ((COUNTER = COUNTER + 1))
        done

        oc create -f "$FILE" || true
    fi
done
