# AeroGear Backend-Admin Tests

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

These variables are required:

```
export OPENSHIFT_ADMIN_USERNAME=...
export OPENSHIFT_ADMIN_PASSWORD=...
```

## Run the tests

```
npm start
```
