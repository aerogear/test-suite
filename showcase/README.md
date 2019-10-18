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

Use the `test/profile.ts` as an example.

#### 1. Use the interact() method

When interact with an element (click, setValue, ...) try to use the `interact()` method
in `./util/common`, because it will ensure that the element exists and it's displayed,
that the element is into the view and it will slow down the interaction in order to
simulate a real user.

```ts
const e = await device.$("#e2e-menu-item-profile");
await interact(e, e => e.click());
```

#### 1. Use the retry() method

When interact with an element (click, setValue, ...) it can happened that the interaction
doesn't trigger any action making the next step failing, it's also normal for a real user to
click a couple of time on the same button before giving up, so to simulate this behavior
and make the tests more stable we should use the `retry()` method in `./util/commons`.

To correctly use the `retry()` method you should first find the button, then use the
`interact()` method to wait for the button to be visible and click on it, and then wait
for the consequence (the button should disappear, a new page should appear, ...), if the
consequence isn't satisfied throw an Error and the `retry()` method will try again.

```ts
await retry(async () => {
  const e = await device.$("#e2e-menu-item-profile");
  await interact(e, e => e.click());
  await e.waitForDisplayed(undefined, true);
});
```

#### 2. Prefers using IDs instant of complex selectors

In order to use IDs sometimes we will have to commit the IDs in the ionic-showcase app,
to do this you will have to open a PR in the aerogear/ionic-showcase project requesting
all the necessaries IDs. Also if the ID is used only from the tests prefix it
with `e2e-`.

PR Example: https://github.com/aerogear/ionic-showcase/pull/260
