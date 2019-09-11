import { expect } from "chai";
import { by, element } from "protractor";

describe("App", () => {
  it("AeroGear logo should be visible", async () => {
    expect(await element(by.css("ion-img.logo")).isDisplayed()).to.be.true;
  });
});
