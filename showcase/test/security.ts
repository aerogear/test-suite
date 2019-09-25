import { asyncFind, shadowClick } from "../util/commons";
import { device } from "../util/device";

describe("Security", () => {
  it("should display number of passed checks", async () => {
    // Open Menu
    const menuButton = await device.$("ion-menu-button");
    await menuButton.waitForDisplayed();
    shadowClick(menuButton, "button");

    // Find security tab
    const menu = await device.$("ion-menu");
    await menu.waitForDisplayed();

    const securityItem = await asyncFind(
      await menu.$$("ion-item"),
      async item => {
        const label = await item.$("ion-label");
        if (!(await label.isExisting())) {
          return false;
        }

        return (await label.getText()) === "Security";
      }
    );
    await securityItem.click();

    // Go to Device Trust
    const deviceTrustItem = await device.$(
      'ion-item-group ion-item[routerLink="/devicetrust"]'
    );
    await deviceTrustItem.waitForDisplayed();
    await deviceTrustItem.click();

    await menu.waitForDisplayed(undefined, true);

    // Device Trust
    const deviceTrust = await device.$("devicetrust");
    await deviceTrust.waitForDisplayed();

    // Wait for the checks to pass
    await device.waitUntil(async () => {
      return (
        (await asyncFind(
          await deviceTrust.$$("ion-grid ion-row"),
          async row => {
            const div = await row.$("div");
            if (!(await div.isExisting())) {
              return false;
            }

            return /\([0-9]+ out of [0-9]+ checks passing\)/.test(
              await div.getText()
            );
          }
        )) !== null
      );
    });
  });
});
