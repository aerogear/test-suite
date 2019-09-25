# AeroGear Backend Tests

## Install dependencies

```
npm install
```

## Setup environment variables

Tests can target OpenShift instance with RHMI. Export these variables:

```
export OPENSHIFT_HOST=<OPENSHIFT_HOST_URL>
export OPENSHIFT_USER=<EVALS_USERNAME>
export OPENSHIFT_PASS=<EVALS_PASSWORD>
```

These additional variables for testing UPS are required:

```
export FIREBASE_SERVER_KEY=...
export IOS_CERTIFICATE=...
export IOS_PASSPHRASE=...
```

## Run the tests

```
npm start
```
