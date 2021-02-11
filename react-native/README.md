# AeroGear Integration Tests

## Prerequisites

#### Firebase Account

Login to Firebase, create a new project and app, download the `google-services.json` and copy it to `fixtures/`, and export the server key and sender id.

```
cp ~/Downloads/google-services.json fixtures/
```

```bash
export FIREBASE_SERVER_KEY=[..]
export FIREBASE_SENDER_ID=[..]
```

## Install dependencies

```
npm install
```

## Services

Tests can target OpenShift instance with RHMI.

To target OpenShift instance run:

```
oc login ... (kubeadmin user)

export OPENSHIFT_URL= (cluster URL)
export OPENSHIFT_USERNAME= (customer-admin user)
export OPENSHIFT_PASSWORD= (customer-admin password)

cd .. && npm install && cd react-native
./scripts/prepare.js

oc login ... (kubeadmin user)
```

## Setup push config

```
./scripts/prepare.js
```

## Run the tests

You can run the app in debug or release mode. For CI, it's recommended to use release mode,
because of problems with running js server for react-native in the background.
Configuration names are `android.debug` or `android.release`.

```
detox build --configuration <configuration-name>
```

To run the tests in headless mode, add `-H` argument.
