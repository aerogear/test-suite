# Ionic Showcase Tests

This are happy path tests to verify that the Ionic Showcase app is working correctly.

## Run the tests locally

Prepare the environment:

```bash
npm install
```

set the BrowserStack user and key:

```bash
export BROWSERSTACK_USER=myuser
export BROWSERSTACK_KEY=mykeybalblabla
```

build the app

> The **MOBILE_PLATFORM** can be `android` or `ios`, it's also possible to set it as global variable `export MOBILE_PLATFORM=ios/android`

```bash
./scripts/build.sh MOBILE_PLATFORM
```

alternative you can build the app using the [Azure Pipelines](https://dev.azure.com/aerogear/test-suite/_build)

> You will need to install the Azure CLI from [here](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest)

```bash
az login
./scripts/azure-build.sh MOBILE_PLATFORM
```

upload the testing app to BrowserStack:

```bash
export BROWSERSTACK_APP="$(./scripts/upload.sh MOBILE_PLATFORM)"
```

execute the tests:

```bash
npm test
```
