# AeroGear Alert Tests

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
export OPENSHIFT_USERNAME=<ADMIN_USERNAME>
export OPENSHIFT_PASSWORD=<ADMIN_PASSWORD>

```

## Run the tests

```
npm start
```
