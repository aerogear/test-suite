# Ionic Showcase Tests

This are happy path tests to verify that the Ionic Showcase app is working correctly.

## Test

Prepare the environment:

```bash
npm install
```

set the BrowserStack user and key:

```bash
export BROWSERSTACK_USER=myuser
export BROWSERSTACK_KEY=mykeybalblabla
```

prepare the cluster and generate the `mobile-services.json`

```bash
oc login ...
./scripts/prepare.sh
```

build and upload the testing app to BrowserStack:

> The **MOBILE_PLATFORM** can be `android` or `ios`, it's also possible to set it as global variable `export MOBILE_PLATFORM=ios/android`

```bash
./scripts/build.sh MOBILE_PLATFORM
export BROWSERSTACK_APP="$(./scripts/upload.sh MOBILE_PLATFORM)"
```

execute the tests:

```bash
npm test
```
