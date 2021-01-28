#!/usr/bin/env bash

set -e

if [ ! -d "./unifiedpush-cookbook" ]; then
  git clone https://github.com/mmusil/unifiedpush-cookbook.git
  git ch -b E2E_testing origin/E2E_testing
fi

cp fixtures/push-config.json unifiedpush-cookbook/react-native/push

# cp -R fixtures/fastlane/* unifiedpush-cookbook/react-native/push

if [ "$MOBILE_PLATFORM" != "ios" ]; then
  cp fixtures/google-services.json unifiedpush-cookbook/react-native/push/android/app
fi

cd unifiedpush-cookbook/react-native/push

yarn install

if [ "$MOBILE_PLATFORM" = "ios" ]; then

# build ios using xcode without certificates

else

  # push tests works only on android
  detox build --configuration android.release

#  curl \
#    -u "$BROWSERSTACK_USER:$BROWSERSTACK_KEY" \
#    -X POST https://api-cloud.browserstack.com/app-automate/upload \
#    -F "file=@$PWD/platforms/android/app/build/outputs/apk/debug/app-debug.apk" \
#    >bs-app-url.txt
fi
