# AeroGear Browser Tests


## How to run the tests

```
# Login with oc client
oc login <AUTH_URL> --token <TOKEN>
# Username & Password you can use to login to MDC/OpenShift via oAuth Proxy
export OPENSHIFT_USERNAME=<REPLACE_ME>
export OPENSHIFT_PASSWORD=<REPLACE_ME>
npm test
```

If you want to see the tests executed in a browser, export this variable:
```
export HEADLESS=false
```