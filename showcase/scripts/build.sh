#!/usr/bin/env bash

set -e

SCRIPT="${0}"
IONIC_SHOWCASE="https://github.com/aerogear/ionic-showcase.git"
APPS_DIR="${PWD}/apps"
APP_NAME="ionic-showcase"
CLONE_ONLY="false"
WORKSPACE=
MOBILE_PLATFORM="${1:-$MOBILE_PLATFORM}"
CLEAN_UP="true"

help() { echo "Usage ${SCRIPT} MOBILE_PLATFORM [--clone-only] [--workspace PATH]"; }

POSITIONALS=()
while [[ $# -gt 0 ]]; do
    case "${1}" in
    -h | --help)
        help
        exit 0
        ;;
    --clone-only)
        CLONE_ONLY="true"
        shift
        ;;
    --workspace)
        WORKSPACE="${2}"
        CLEAN_UP="false"
        shift
        shift
        ;;
    *)
        POSITIONALS+=("${1}")
        shift
        ;;
    esac
done
MOBILE_PLATFORM="${POSITIONALS[0]:-$MOBILE_PLATFORM}"

function buildIOS() {

    # prepare ios using ionic and cordova
    ionic cordova platform add ios
    ionic cordova prepare ios

    # build ios using xcode without certificates
    cd platforms/ios

    # build using xcode
    xcodebuild \
        -workspace "AeroGear Ionic Showcase.xcworkspace" \
        -scheme "AeroGear Ionic Showcase" \
        -configuration Debug \
        -derivedDataPath ./derived \
        CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO

    # create the .ipa file
    mkdir -p package/Payload
    cp -r derived/Build/Products/Debug-iphoneos/AeroGear\ Ionic\ Showcase.app package/Payload/
    cd package/
    zip -r AeroGear\ Ionic\ Showcase.ipa Payload/

    # copy the app to the apps dir
    cp -f AeroGear\ Ionic\ Showcase.ipa "${APPS_DIR}/${APP_NAME}.ipa"

    echo "+ built \"${APPS_DIR}/${APP_NAME}.ipa\""
}

function buildAndroid() {

    # build android using ionic and cordova
    ionic cordova build android --device --debug

    # copy the app to the apps dir
    cp -f platforms/android/app/build/outputs/apk/debug/app-debug.apk "${APPS_DIR}/${APP_NAME}.apk"

    echo " - built \"${APPS_DIR}/${APP_NAME}.apk\""
}

if [[ -z "${MOBILE_PLATFORM}" ]]; then
    echo "error: MOBILE_PLATFORM is not defined"
    exit 1
fi

if [[ ! -f ./mobile-services.json ]]; then
    echo "error: mobile-services.json dosn't exists"
    exit 1
fi

mkdir -p "${APPS_DIR}"

WORKSPACE="${WORKSPACE:-$(mktemp -d)}"

mkdir -p "${WORKSPACE}"

if [[ ! -d "${WORKSPACE}/.git" ]]; then
    echo " - cloning ionic showcase in \"${WORKSPACE}\""

    git clone "${IONIC_SHOWCASE}" "${WORKSPACE}"
fi

if [[ "${CLONE_ONLY}" == "true" ]]; then
    exit 0
fi

echo " - copy mobile-services.json"

cp -f ./mobile-services.json ${WORKSPACE}/src/mobile-services.json

echo " - build ionic showcase"

cd "${WORKSPACE}"

npm install

case "${MOBILE_PLATFORM}" in
android)
    buildAndroid
    ;;
ios)
    buildIOS
    ;;
*)
    echo "error: \"${MOBILE_PLATFORM}\" is not a valid MOBILE_PLATFORM"
    exit 1
    ;;
esac

if [[ ${CLEAN_UP} == "true" ]]; then
    echo " - clean \"${WORKSPACE}\""
    rm -rf "${WORKSPACE}"
fi
