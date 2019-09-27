import { interact, shadowClick } from "../util/commons";
import { KEYCLOAK_USERNAME } from "../util/config";
import { device, reset } from "../util/device";
import { log } from "../util/log";
import { login } from "../util/login";

describe("Profile", function() {
  // always add a retries policy so that
  // we avoid to fail because of flaky tests
  this.retries(3);

  afterEach(async function() {
    if (!this.currentTest.isPassed()) {
      log.warning(`retry test: ${this.currentTest.title}`);

      // always reset the device if the test fails
      // so that we can retry the test from a predictable point
      await reset();
    }
  });

  it(`should be logged in as ${KEYCLOAK_USERNAME}`, async () => {
    // always try to login again
    await login();

    // Open Menu
    const menuButton = await device.$("ion-menu-button");
    await interact(menuButton, e => shadowClick(e, "button"));

    // Go to Profile
    const profileItem = await device.$("#e2e-menu-item-profile");
    await interact(profileItem, e => e.click());
    await profileItem.waitForDisplayed(undefined, true, "timeout");

    // Wait for profile page
    const profilePage = await device.$("app-profile");
    await profilePage.waitForDisplayed();

    // Verify the username
    const username = await device.$("#e2e-profile-username");
    await device.waitUntil(async () => {
      return (await username.getText()) === KEYCLOAK_USERNAME;
    });
  });
});
