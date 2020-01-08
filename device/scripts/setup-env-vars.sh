if [ "$DOCKER_COMPOSE" = "true" ]; then
  if [ "$CI" = "true" ]; then
    export UPS_URL=http://ups:8080
  else
    export UPS_URL=http://bs-local.com:8089
  fi

  export SYNC_URL=http://bs-local.com:4000
  export SYNC_WS_URL=ws://bs-local.com:4000
else
  export SYNC_URL=https://$(cat ./sync-url.txt)
  export SYNC_WS_URL=wss://$(cat ./sync-url.txt)
fi

if [ -z "$BROWSERSTACK_APP" ]; then
  export BROWSERSTACK_APP=$(cat "./testing-app/bs-app-url.txt" | cut -d '"' -f 4)
fi

#DOCKER_COMPOSE