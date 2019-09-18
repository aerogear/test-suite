#!/usr/bin/env bash

set -e

IONIC_SHOWCASE="https://github.com/aerogear/ionic-showcase.git"

MOBILE_PLATFORM="${1:-$MOBILE_PLATFORM}"

APPS_DIR="$PWD/apps"
APP_NAME="ionic-showcase"

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
        CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO

    # create the .ipa file
    mkdir -p package/Payload
    cp -r derived/Build/Products/Debug-iphoneos/AeroGear\ Ionic\ Showcase.app package/Payload/
    cd package/
    zip -r AeroGear\ Ionic\ Showcase.ipa Payload/

    # copy the app to the apps dir
    cp -f AeroGear\ Ionic\ Showcase.ipa ${APPS_DIR}/${APP_NAME}.ipa

    echo "+ built \"${APPS_DIR}/${APP_NAME}.ipa\""
}

function buildAndroid() {

    # build android using ionic and cordova
    ionic cordova build android --device --debug

    # copy the app to the apps dir
    cp -f platforms/android/app/build/outputs/apk/debug/app-debug.apk ${APPS_DIR}/${APP_NAME}.apk

    echo "+ built \"${APPS_DIR}/${APP_NAME}.apk\""
}

if [[ -z "${MOBILE_PLATFORM}" ]]; then
    echo "error: MOBILE_PLATFORM is not defined"
    exit 1
fi

mkdir -p ${APPS_DIR}

WORKSPACE="$(mktemp -d)"

echo "+ cloning ionic showcase in \"${WORKSPACE}\""

git clone ${IONIC_SHOWCASE} ${WORKSPACE}

echo "+ build ionic showcase"

cd ${WORKSPACE}

npm install

case ${MOBILE_PLATFORM} in
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

echo "+ clean \"${WORKSPACE}\""

rm -rf ${WORKSPACE}
