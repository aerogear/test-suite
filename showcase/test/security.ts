import { shadowClick } from "../util/commons";
import { device, reset } from "../util/device";
import { log } from "../util/log";
import { login } from "../util/login";

describe("Security", function() {
  this.retries(3);

  afterEach(async function() {
    if (!this.currentTest.isPassed()) {
      log.warning(`retry test: ${this.currentTest.title}`);
      await reset();
    }
  });

  it("should display number of passed checks", async () => {
    await login();

    // Open Menu
    const menuButton = await device.$("ion-menu-button");
    await menuButton.waitForDisplayed();
    shadowClick(menuButton, "button");

    // Find security tab
    const securityItem = await device.$("#e2e-menu-item-security");
    await securityItem.waitForDisplayed();
    await securityItem.click();

    // Go to Device Trust
    const deviceTrustItem = await device.$("#e2e-menu-item-devicetrust");
    await deviceTrustItem.waitForDisplayed();
    await deviceTrustItem.click();

    await deviceTrustItem.waitForDisplayed(undefined, true);

    // Device Trust
    const deviceTrust = await device.$("devicetrust");
    await deviceTrust.waitForDisplayed();

    // Wait for the checks to pass
    const passed = await device.$("#e2e-devicetrust-passed");
    await device.waitUntil(async () =>
      /\(\d+ out of \d+ checks passing\)/.test(await passed.getText())
    );
  });
});
