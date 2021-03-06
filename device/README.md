# AeroGear Integration Tests

## Prerequisites

#### BrowserStack Account

Login to the BrowserStack and export the username and key.

```bash
export BROWSERSTACK_USER=[..]
export BROWSERSTACK_KEY=[..]
```

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

Tests can either target locally running services or OpenShift instance with RHMI. To start services locally run:

```
export DOCKER_COMPOSE=true
./scripts/docker-compose-up.sh
```

By default latest version of services will be installed. Version of each service can be specified via environment variables before running above script:

```
export UPS_VERSION="..."
export DATASYNC_VERSION="..."
```

To target OpenShift instance run:

```
oc login ... (kubeadmin user)

export OPENSHIFT_URL= (cluster URL)
export OPENSHIFT_USERNAME= (customer-admin user)
export OPENSHIFT_PASSWORD= (customer-admin password)

cd .. && npm install && cd device
./scripts/prepare.js

oc login ... (kubeadmin user)
```

## Setup testing app

```
./scripts/build-testing-app.sh
```

By default testing app will be installed with latest version of js-sdk. To use `dev` version (master) export this environment variable before building the app:

```
export SDK_VERSION=dev
```

## Run the tests

```
npm start -- test/**/*.ts
```

or to run specific test:

```
npm start -- test/<SERVICE>/index.ts
```
