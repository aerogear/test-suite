#!/usr/bin/env bash

set -e

IONIC_SHOWCASE="https://github.com/aerogear/ionic-showcase.git"

MOBILE_PLATFORM="${1:-$MOBILE_PLATFORM}"

APPS_DIR="$PWD/apps"
APP_SRC=
APP_DST=

case ${MOBILE_PLATFORM} in
android)
    APP_SRC="platforms/android/app/build/outputs/apk/debug/app-debug.apk"
    APP_DST="$APPS_DIR/ionic-showcase.apk"
    ;;
ios)
    APP_SRC="platforms/ios/build/device/HelloCordova.ipa"
    APP_DST="$APPS_DIR/ionic-showcase.ipa"
    ;;
*)
    echo "error: MOBILE_PLATFORM is not defined or not valid"
    exit 1
    ;;
esac

TMPDIR="$(mktemp -d)"

echo "+ cloning ionic showcase in \"${TMPDIR}\""

git clone ${IONIC_SHOWCASE} ${TMPDIR}

cd ${TMPDIR}/

echo "+ build ionic showcase"

npm install

ionic cordova build ${MOBILE_PLATFORM}

echo "+ copy app to apps/"

mkdir -p ${APPS_DIR}
cp -f ${APP_SRC} ${APP_DST}

echo "+ clean \"${TMPDIR}\""

rm -rf ${TMPDIR}/
