import { shadowClick } from "../util/commons";
import { KEYCLOAK_USERNAME } from "../util/config";
import { device } from "../util/device";
import { log } from "../util/log";

describe("Profile", () => {
  it(`should be logged in as ${KEYCLOAK_USERNAME}`, async () => {
    // Open Menu
    const menuButton = await device.$("ion-menu-button");
    await menuButton.waitForDisplayed();
    shadowClick(menuButton, "button");

    // Go to Profile
    const profileItem = await device.$("#e2e-menu-item-profile");
    await profileItem.waitForDisplayed();
    await profileItem.click();

    // It could happened that the click is faster than the js
    try {
      await profileItem.waitForDisplayed(undefined, true, "timeout");
    } catch (e) {
      if (e.message === "timeout") {
        log.warning("retry to click");

        // try to manually close the menu
        await profileItem.click();

        await profileItem.waitForDisplayed(undefined, true);
      } else {
        throw e;
      }
    }

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
