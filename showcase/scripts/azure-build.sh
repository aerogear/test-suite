#!/usr/bin/env bash

# build the showcase app using the azure pipeline

set -e

SCRIPT=${0}
ORGANIZATION=https://dev.azure.com/aerogear/
PROJECT=test-suite
PIPELINE=showcase.build
APPS_DIR=${PWD}/apps
APP_NAME=ionic-showcase
APP_EXT=
MOBILE_PLATFORM=${MOBILE_PLATFORM:-}
BUILD_ID=

help() { echo "Usage ${SCRIPT} MOBILE_PLATFORM [--build-id BUILD_ID]"; }

POSITIONALS=()
while [[ $# -gt 0 ]]; do
    case ${1} in
    -h | --help)
        help
        exit 0
        ;;
    --build-id)
        BUILD_ID=${2}
        shift
        shift
        ;;
    *)
        POSITIONALS+=(${1})
        shift
        ;;
    esac
done
MOBILE_PLATFORM=${POSITIONALS[0]:-$MOBILE_PLATFORM}

if [[ -z ${MOBILE_PLATFORM} ]]; then
    echo "error: MOBILE_PLATFORM is not defined"
    exit 1
fi

case ${MOBILE_PLATFORM} in
android)
    APP_EXT="apk"
    ;;
ios)
    APP_EXT="ipa"
    ;;

*)
    echo "error: \"${MOBILE_PLATFORM}\" is not a valid MOBILE_PLATFORM"
    exit 1
    ;;
esac

mkdir -p ${APPS_DIR}

az account show >/dev/null

if [[ -z ${BUILD_ID} ]]; then
    echo " - start ${MOBILE_PLATFORM} build"

    COMMIT_ID="$(git rev-parse HEAD)"

    out=$(az pipelines run \
        --commit-id ${COMMIT_ID} \
        --name ${PIPELINE}.${MOBILE_PLATFORM} \
        --organization ${ORGANIZATION} \
        --project ${PROJECT} \
        --output json)

    BUILD_ID=$(echo ${out} | jq -r ".id")

    echo -n " - build started: ${ORGANIZATION}${PROJECT}/_build/results?buildId=${BUILD_ID}"
else
    echo -n " - reusing build: ${ORGANIZATION}${PROJECT}/_build/results?buildId=${BUILD_ID}"
fi

STATUS=
while true; do

    out=$(az pipelines runs show \
        --id ${BUILD_ID} \
        --organization ${ORGANIZATION} \
        --project ${PROJECT} \
        --output json)

    status=$(echo ${out} | jq -r ".status")
    if [[ ${status} != ${STATUS} ]]; then
        echo
        echo -n " - build status: ${status} "
    fi
    STATUS=${status}

    if [[ ${status} == "completed" ]]; then
        break
    fi

    echo -n "."

    sleep 5
done

echo " - build completed"
echo " - download the ${MOBILE_PLATFORM} application"

out=$(az pipelines runs artifact list \
    --run-id ${BUILD_ID} \
    --organization ${ORGANIZATION} \
    --project ${PROJECT} \
    --output json)

DOWNLOAD_URL=$(echo ${out} | jq -r ".[0].resource.downloadUrl")

cd $(mktemp -d)
wget -O artifact.zip ${DOWNLOAD_URL}
unzip artifact.zip
cp -f drop/${APP_NAME}.${APP_EXT} ${APPS_DIR}/${APP_NAME}.${APP_EXT}

echo " - application downloaded: ${APPS_DIR}/${APP_NAME}.${APP_EXT}"
