import { interact, shadowClick, retry } from "../util/commons";
import { KEYCLOAK_USERNAME } from "../util/config";
import { device } from "../util/device";
import { expect } from "chai";

describe("Profile", function() {
  it("should be logged in", async () => {
    // Open Menu
    await retry(async () => {
      const e = await device.$("ion-menu-button");
      await interact(e, e => shadowClick(e, "button"));
      await (await device.$("ion-menu")).waitForDisplayed();
    });

    // Go to Profile
    await retry(async () => {
      const e = await device.$('ion-menu ion-item[routerLink="/profile"]');
      await interact(e, e => e.click());
      await e.waitForDisplayed(undefined, true);
    });

    // Wait for profile page
    await retry(async () => {
      const e = await device.$("app-profile");
      await e.waitForDisplayed();
    });

    // Verify the username
    await retry(async () => {
      const e = await device.$(() => {
        return document
          .querySelectorAll("app-profile ion-card")[0]
          .querySelectorAll("ion-item")[2]
          .querySelector(".identity-text");
      });
      expect(await e.getText()).equal(KEYCLOAK_USERNAME);
    }, 5000);
  });
});
