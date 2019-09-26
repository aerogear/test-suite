# AeroGear Backend Tests

## Install dependencies

```
npm install
```

## Target OpenShift

Tests need to target OpenShift instance with RHMI. For this use:

```
oc login ...
```

## Setup environment variables

These variables for testing UPS are required:

```
export FIREBASE_SERVER_KEY=...
export IOS_CERTIFICATE=...
export IOS_PASSPHRASE=...
```

## Run the tests

```
npm start
```
