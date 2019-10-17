# AeroGear Browser Tests

## How to run the tests

```
# Username & Password you can use to login to MDC via oAuth Proxy
export OPENSHIFT_USERNAME=<REPLACE_ME>
export OPENSHIFT_PASSWORD=<REPLACE_ME>
# URL to MDC instance
export MDC_URL="https://<REPLACE_ME>"
# URL to OpenShift Console
export OPENSHIFT_URL="https://<REPLACE_ME>/console"
npm test
```

If you want to see the tests executed in a browser, export this variable:

```
export HEADLESS=false
```

## Debug tests in VS Code

1. Open to the _Debug_ tab in the Activity Bar (`Ctrl + Shift + D`)
2. Click on the gear icon (_open launch.json_) in the top right corner of the tab
3. In the `launch.json` configuration file add the following configuration to the `configurations` section.

   > The below configuration assume that you have opened the whole test-suite repo using VS Code, if you have only opened the `browser` subdirectory remove `browsers/` from `program` and remove the `cwd` line.

   > You can also choose a different `name`

   ```json
   {
     "configurations": [
       {
         "type": "node",
         "request": "launch",
         "name": "test:browser",
         "program": "${workspaceFolder}/browser/node_modules/.bin/mocha",
         "cwd": "${workspaceFolder}/browser",
         "env": {
           "OPENSHIFT_URL": "REPLACE_ME",
           "HEADLESS": "false",
           "MDC_URL": "REPLACE_ME",
           "OPENSHIFT_USERNAME": "REPLACE_ME",
           "OPENSHIFT_PASSWORD": "REPLACE_ME"
         }
       }
     ]
   }
   ```
