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

cd .. && npm install && cd showcase
./scripts/prepare.js
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

## Best Practice

When writing UI tests there are a few good practice that we can follow in order
to make the tests less flaky.

Try to use the `test/profile.ts` as example.

#### 1. Use the interact() method

When interact with an element (click, setValue, ...) try to use the `interact()` method
in `./util/common`, because it will ensure that the element exists and it's displayed,
that the element is into the view and it will slow down the interaction in order to
simulate a real user.

```ts
const profileItem = await device.$("#e2e-menu-item-profile");
await interact(profileItem, e => e.click());
```

#### 2. Prefers using IDs instant of complex selectors

In order to use IDs sometimes we will have to commit the IDs in the ionic-showcase app,
to do this you will have to open a PR in the aerogear/ionic-showcase project requesting
all the necessaries IDs. Also if the ID is used only from the tests prefix it
with `e2e-`.

PR Example: https://github.com/aerogear/ionic-showcase/pull/260

#### 3. Apply a retry policy and reset the device on each retry

There are to many variables that could make a UI test fails, for this reason is good to
set a retry policy in each tests (3 retry is always enough), but before retry the test we
have also to reset the device to a know state.

Example:

```ts
describe("My Test", function() {
  // always add a retries policy so that
  // we avoid to fail because of flaky tests
  this.retries(3);

  afterEach(async function() {
    // reset the device only if the test didn't passed (is retrying or has failed)
    if (!this.currentTest.isPassed()) {
      // prefers to print a warning message but it's not necessary
      log.warning(`retry test: ${this.currentTest.title}`);

      // reset the device so that we can retry form a know point
      await reset();
    }
  });

  it(`should do something`, async () => {
    // always try to login again
    await login();

    // your test logic
  });
});
```
