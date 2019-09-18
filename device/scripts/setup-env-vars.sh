if [ "$CI" = "true" ]; then
  export KEYCLOAK_HOST=keycloak
  export METRICS_HOST=metrics
  
  export UPS_HOST=ups
  export UPS_PORT=8080

  export MSS_HOST=mss
  export MSS_PORT=3000

  export PGHOST=metricsdb
else
  export KEYCLOAK_HOST=bs-local.com
  export METRICS_HOST=bs-local.com
  
  export UPS_HOST=bs-local.com
  export UPS_PORT=8089

  export MSS_HOST=bs-local.com
  export MSS_PORT=3001
  
  export PGHOST=localhost
fi

export KEYCLOAK_PORT=8080
export METRICS_PORT=3000

export PGUSER=metrics
export PGPASSWORD=metrics
export PGDATABASE=metrics

export SYNC_HOST=bs-local.com
export SYNC_PORT=4000

if [ -z "$BROWSERSTACK_APP" ]; then
  export BROWSERSTACK_APP=$(cat "./testing-app/bs-app-url.txt" | cut -d '"' -f 4)
fi
