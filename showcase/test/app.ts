import { device } from "../util/device";

describe("App", () => {
  it("AeroGear logo should be visible", async () => {
    const logoEl = await device.$("ion-img.logo");
    await logoEl.waitForDisplayed();
  });
});
