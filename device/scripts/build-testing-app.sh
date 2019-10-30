#!/usr/bin/env bash

set -e

if [ ! -d "./testing-app" ]; then
  cordova create testing-app
  cp fixtures/config.xml testing-app/
fi

cp fixtures/index.html testing-app/www/
cp fixtures/webpack.config.js testing-app/
cp fixtures/index.ts testing-app/
cp fixtures/modules.ts testing-app/
cp fixtures/ToggleNetworkStatus.ts testing-app/
cp fixtures/tsconfig.json testing-app/
cp -R fixtures/fastlane/* testing-app/

if [ "$MOBILE_PLATFORM" != "ios" ]; then
  cp fixtures/google-services.json testing-app/
fi

cd testing-app

SDK_VERSION="${SDK_VERSION:-latest}"

npm install --save \
  @aerogear/security@$SDK_VERSION \
  @aerogear/app@$SDK_VERSION \
  @aerogear/auth@$SDK_VERSION \
  @aerogear/voyager-client@$SDK_VERSION \
  @aerogear/push@$SDK_VERSION \
  webpack \
  webpack-cli \
  typescript \
  ts-loader \
  graphql \
  graphql-tag

cordova plugin add @aerogear/cordova-plugin-aerogear-metrics@$SDK_VERSION
cordova plugin add @aerogear/cordova-plugin-aerogear-security@$SDK_VERSION
cordova plugin add @aerogear/cordova-plugin-aerogear-sync@$SDK_VERSION
cordova plugin add cordova-plugin-inappbrowser

npx webpack

if [ "$MOBILE_PLATFORM" = "ios" ]; then
  cordova platform add ios
  cordova prepare ios

  # build ios using xcode without certificates
  cd platforms/ios
  xcodebuild \
      -workspace "HelloCordova.xcworkspace" \
      -scheme "HelloCordova" \
      -configuration Debug \
      -derivedDataPath ./derived \
      CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO

  # create the .ipa file
  mkdir -p package/Payload
  cp -r derived/Build/Products/Debug-iphoneos/HelloCordova.app package/Payload/
  cd package/
  zip -r HelloCordova.ipa Payload/
  cd ../../..

  curl \
    -u "$BROWSERSTACK_USER:$BROWSERSTACK_KEY" \
    -X POST https://api-cloud.browserstack.com/app-automate/upload \
    -F "file=@$PWD/platforms/ios/package/HelloCordova.ipa" \
    >bs-app-url.txt
else

  # push tests works only in android
  cordova plugin add @aerogear/cordova-plugin-aerogear-push@$SDK_VERSION

  cordova platform add android || true
  cordova build android

  curl \
    -u "$BROWSERSTACK_USER:$BROWSERSTACK_KEY" \
    -X POST https://api-cloud.browserstack.com/app-automate/upload \
    -F "file=@$PWD/platforms/android/app/build/outputs/apk/debug/app-debug.apk" \
    >bs-app-url.txt
fi
