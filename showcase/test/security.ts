import { shadowClick, retry, interact } from "../util/commons";
import { device } from "../util/device";
import { expect } from "chai";

describe("Security", function() {
  it("should display number of passed checks", async () => {
    // Open Menu
    await retry(async () => {
      const e = await device.$("ion-menu-button");
      await interact(e, e => shadowClick(e, "button"));
      await (await device.$("ion-menu")).waitForDisplayed();
    });

    // Find security tab
    await retry(async () => {
      const e = await device.$(() => {
        return Array.from(document.querySelectorAll("ion-menu ion-item")).find(
          e => {
            const l = e.querySelector("ion-label");
            return l !== null && l.textContent === "Security";
          }
        );
      });
      await interact(e, e => e.click());
      await (await device.$(
        'ion-menu ion-item[routerLink="/devicetrust"]'
      )).waitForDisplayed();
    });

    // Go to Device Trust
    await retry(async () => {
      const e = await device.$('ion-menu ion-item[routerLink="/devicetrust"]');
      await interact(e, e => e.click());
      await e.waitForDisplayed(undefined, true);
    });

    // Device Trust
    await retry(async () => {
      const e = await device.$("devicetrust");
      await e.waitForDisplayed();
    });

    // Wait for the checks to pass
    await retry(async () => {
      const e = await device.$(() => {
        return document
          .querySelectorAll("devicetrust ion-grid ion-row")[2]
          .querySelector("div");
      });
      expect(await e.getText()).match(/\(\d+ out of \d+ checks passing\)/);
    }, 5000);
  });
});
