import { asyncFind, shadowClick } from "../util/commons";
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
    const menu = await device.$("ion-menu");
    const profileItem = await menu.$('ion-item[routerLink="/profile"]');
    await profileItem.waitForDisplayed();
    await profileItem.click();

    // It could happened that the click is faster than the js
    try {
      await menu.waitForDisplayed(undefined, true, "timeout");
    } catch (e) {
      if (e.message === "timeout") {
        log.warning("retry to click");

        // try to manually close the menu
        await profileItem.click();

        await menu.waitForDisplayed(undefined, true);
      } else {
        throw e;
      }
    }

    // Wait for profile page
    const profilePage = await device.$("app-profile");
    await profilePage.waitForDisplayed();

    // Find the Profile card
    const cards = await device.$$("app-profile ion-card");
    const profileCard = await asyncFind(cards, async card => {
      const title = await card.$("ion-item-divider h2");
      if (!(await title.isExisting())) {
        return false;
      }

      return (await title.getText()) === "Profile";
    });
    profileCard.waitForDisplayed();

    // Find username item
    const items = await profileCard.$$("ion-item");
    const usernameItem = await asyncFind(items, async item => {
      const title = await item.$("div.identity-header");
      if (!(await title.isExisting())) {
        return false;
      }

      return (await title.getText()).includes("Username");
    });
    usernameItem.waitForDisplayed();

    // Verify username
    const username = await usernameItem.$("div.identity-text");
    await device.waitUntil(async () => {
      return (await username.getText()) === KEYCLOAK_USERNAME;
    });
  });
});
