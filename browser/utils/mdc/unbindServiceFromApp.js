const openApp = require("./openApp");

module.exports = async (appName, serviceName) => {
  await openApp(appName);
  await Promise.all([
    page.click("a[href='#services']"),
    page.waitForNavigation({ waitUntil: ["domcontentloaded", "networkidle0"] })
  ]);
  await page.waitForSelector(".boundService button", { visible: true });
  // Find the Service's row index
  const serviceIndex = await page.$$eval(
    ".boundService .service-name",
    (svcs, serviceName) =>
      svcs.findIndex(s => s.innerText.includes(serviceName)),
    serviceName
  );
  // Make sure the row with required Service was found
  expect(serviceIndex).to.be.a("number");
  // Find Service's "Dropdown" button and click on it
  const unboundDropdownButtons = await page.$$(
    ".boundService button#delete-binding-id"
  );
  await unboundDropdownButtons[serviceIndex].click();
  // Wait until the "dropdown" will expand
  await page.waitForSelector('.boundService button[aria-expanded="true"]');
  const deleteBindButtons = await page.$$(".boundService ul a");
  // Click on Delete (binding) button
  await deleteBindButtons[serviceIndex].click();
  // // Click on Delete
  await page.evaluate(() => {
    document.querySelector(".modal-footer .btn-danger").click();
  });
  // Wait until the service appears back in Unbound services section
  await page.waitForFunction(
    serviceName =>
      [...document.querySelectorAll(".unboundService .service-name")].find(el =>
        el.innerText.includes(serviceName)
      ),
    {},
    serviceName
  );
};
