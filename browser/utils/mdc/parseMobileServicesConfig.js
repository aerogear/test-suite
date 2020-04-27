const { expect } = require("chai");
module.exports = async () => {
  // Get the content of mobile-services.json text area
  await page.waitForSelector(".mobile-client-config pre");
  const mobileServicesConfig = await page.$eval(
    ".mobile-client-config pre",
    (el) => el.textContent
  );
  expect(mobileServicesConfig).to.be.a("string");
  return JSON.parse(mobileServicesConfig);
};
