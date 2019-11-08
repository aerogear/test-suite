const { expect } = require("chai");
const openApp = require("./openApp");
const config = require("../../config");

module.exports = async (appName, serviceName, params) => {
  const {
    syncServiceName,
    idmServiceName,
    mssServiceName,
    upsServiceName
  } = config;
  if (!params) {
    params = config;
  }
  await openApp(appName);
  await Promise.all([
    page.click('a[href="#services"]'),
    page.waitForNavigation({ waitUntil: ["domcontentloaded", "networkidle0"] })
  ]);
  await page.waitForSelector(".unboundService button", { visible: true });
  // Find the service row index
  const serviceIndex = await page.$$eval(
    ".unboundService .service-name",
    (svcs, serviceName) =>
      svcs.findIndex(s => s.innerText.includes(serviceName)),
    serviceName
  );
  // Make sure the row with service name was found
  expect(serviceIndex).to.be.a("number");
  // Find service's "Bind App" button and click on it
  const bindButtons = await page.$$(".unboundService button");
  await bindButtons[serviceIndex].click();
  // // Click on "Next"
  await page.evaluate(() => {
    document.querySelector(".wizard-pf-footer .btn-primary").click();
  });

  switch (serviceName) {
    case syncServiceName:
      expect(params).to.have.key("syncUrl");
      await page.waitForSelector("#root_syncServerConfig_url");
      // Type in Data Sync URL
      await page.type(
        "#root_syncServerConfig_url",
        `https://${params.syncUrl}`
      );
      break;
    case idmServiceName:
      expect(params).to.include.all.keys(
        "idmRealmName",
        "idmUser",
        "idmPassword"
      );
      await page.waitForSelector("#root_realmSettings_realmId");
      // Trigger mouse triple-click to select existing text in input field to delete it :)
      await page.click("#root_realmSettings_realmId", { clickCount: 3 });
      await page.type("#root_realmSettings_realmId", params.idmRealmName);
      await page.type("#root_realmSettings_adminUsername", params.idmUser);
      await page.type("#root_realmSettings_adminPassword", params.idmPassword);
      break;
    case mssServiceName:
      expect(params).to.have.key("mssAppId");
      await page.waitForSelector("#root_appConfig_appId");
      await page.type("#root_appConfig_appId", params.mssAppId);
      break;
    case upsServiceName:
      expect(params).to.include.all.keys(
        "upsAndroidServerKey",
        "upsAndroidSenderId"
      );
      await page.waitForSelector("#root_CLIENT_TYPE");
      await page.select("#root_CLIENT_TYPE", "Android");
      await page.type(
        "#root_platformConfig_googlekey",
        params.upsAndroidServerKey
      );
      await page.type(
        "#root_platformConfig_projectNumber",
        params.upsAndroidSenderId
      );
      break;
    default:
      throw new Error(`Unknown service name "${serviceName}"
            Valid services' names: ${syncServiceName}, ${idmServiceName}, ${mssServiceName}, ${upsServiceName}
            `);
  }
  // Click on Create
  await page.click(".wizard-pf-footer .btn-primary");
  // Wait until the service appears in Bound services section
  await page.waitForFunction(
    serviceName =>
      [...document.querySelectorAll(".boundService .service-name")].find(el =>
        el.innerText.includes(serviceName)
      ),
    {},
    serviceName
  );
};
