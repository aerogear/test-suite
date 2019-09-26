import { interact, shadowClick } from "../util/commons";
import { KEYCLOAK_USERNAME } from "../util/config";
import { device, reset } from "../util/device";
import { login } from "../util/login";

describe("Profile", function() {
  // always add a retries policy so that
  // we avoid to fail because of flaky tests
  this.retries(3);

  afterEach(async () => {
    // always reset the device after each tests
    // - if the test fail we can retry from a predictable point
    // - other tests will not influence this test
    await reset();
  });

  it.only(`should be logged in as ${KEYCLOAK_USERNAME}`, async () => {
    // always login before start testing
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
