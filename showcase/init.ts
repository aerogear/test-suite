import { browser } from "protractor";

before("Wait for Angular", async () => {
  // Sometimes protractor is faster than angular.
  // By making Appium sleep for 1s before injecting protractor
  // we ensure that angular get loaded correctly.
  await browser.sleep(1000);
});
