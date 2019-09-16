set -e

MOBILE_PLATFORM="${1:-$MOBILE_PLATFORM}"

APPS_DIR="$PWD/apps"
APP=

case ${MOBILE_PLATFORM} in
android)
    APP="$APPS_DIR/ionic-showcase.apk"
    ;;
ios)
    APP="$APPS_DIR/ionic-showcase.ipa"
    ;;
*)
    echo "error: MOBILE_PLATFORM is not defined or not valid" >&2
    exit 1
    ;;
esac

if [[ -z "$BROWSERSTACK_USER" ]] || [[ -z "$BROWSERSTACK_KEY" ]]; then
    echo "error: BROWSERSTACK_USER or BROWSERSTACK_KEY is not defined" >&2
    exit 1
fi

curl \
    -u "$BROWSERSTACK_USER:$BROWSERSTACK_KEY" \
    -X POST https://api-cloud.browserstack.com/app-automate/upload \
    -F "file=@$APP" | jq -r ".app_url"
