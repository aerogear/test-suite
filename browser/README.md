# AeroGear Browser Tests


## How to run the tests

```
# Username & Password you can use to login to MDC via oAuth Proxy
export OPENSHIFT_USERNAME=<REPLACE_ME>
export OPENSHIFT_PASSWORD=<REPLACE_ME>
# URL to MDC instance
export MDC_URL="https://<REPLACE_ME>"
npm test
```

If you want to see the tests executed in a browser, export this variable:
```
export HEADLESS=false
```