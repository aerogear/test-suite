import { shadowClick, retry, interact } from "../util/commons";
import { device } from "../util/device";
import { expect } from "chai";

describe("Security", function() {
  it("should display number of passed checks", async () => {
    // Open Menu
    retry(async () => {
      const e = await device.$("ion-menu-button");
      await interact(e, e => shadowClick(e, "button"));
      await (await $("ion-menu")).waitForDisplayed();
    });

    // Find security tab
    retry(async () => {
      const e = await device.$("#e2e-menu-item-security");
      await interact(e, e => e.click());
      await (await device.$("#e2e-menu-item-devicetrust")).waitForDisplayed();
    });

    // Go to Device Trust
    retry(async () => {
      const e = await device.$("#e2e-menu-item-devicetrust");
      await interact(e, e => e.click());
      await e.waitForDisplayed(undefined, true);
    });

    // Device Trust
    retry(async () => {
      const e = await device.$("devicetrust");
      await e.waitForDisplayed();
    });

    // Wait for the checks to pass
    retry(async () => {
      const e = await device.$("#e2e-devicetrust-passed");
      expect(await e.getText()).match(/\(\d+ out of \d+ checks passing\)/);
    }, 5000);
  });
});
