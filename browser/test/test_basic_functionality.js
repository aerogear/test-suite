const {
  createApp,
  deleteApp,
  openApp,
  bindServiceToApp,
  login,
  unbindServiceFromApp,
  parseMobileServicesConfig
} = require("../utils/mdc");
const { appName, syncServiceName, syncUrl } = require("../config");

describe("Basic MDC test", () => {
  before(async () => {
    await login();
  });
  after(async () => {
    await page.close();
  });

  it("should successfully create an app in MDC", async () => {
    await createApp(appName);
  });

  it("mobile-services.json configuration should not contain config of any service", async () => {
    await openApp(appName);
    const parsedMobileConfig = await parseMobileServicesConfig();
    // Make sure the list of services in the config is empty
    expect(parsedMobileConfig.services).to.be.empty;
  });

  it("binding Data Sync service should complete successfully", async () => {
    await bindServiceToApp(appName, syncServiceName, { syncUrl });
  });
  it("mobile-services.json configuration should be updated with Data Sync config", async () => {
    await Promise.all([
      page.click('a[href="#configuration"]'),
      page.waitForNavigation({
        waitUntil: ["domcontentloaded", "networkidle0"]
      })
    ]);
    // Wait for mobile-services.json to be updated with Data Sync config (by checking its URL)
    await page.waitForFunction(
      syncUrl =>
        [...document.querySelectorAll(".mobile-client-config pre")].find(el =>
          el.textContent.includes(syncUrl)
        ),
      {},
      syncUrl
    );
    const parsedMobileConfig = await parseMobileServicesConfig();
    // Make sure the config contains all required Data Sync properties
    expect(parsedMobileConfig.services[0]).to.be.an("object");
    expect(parsedMobileConfig.services[0]).to.include.all.keys(
      "config",
      "id",
      "name",
      "type",
      "url"
    );
    expect(parsedMobileConfig.services[0]).to.have.property(
      "url",
      `https://${syncUrl}/graphql`
    );
    expect(parsedMobileConfig.services[0]).to.have.deep.property("config", {
      websocketUrl: `wss://${syncUrl}/graphql`
    });
  });
  it("unbinding Data Sync service should complete successfully", async () => {
    await unbindServiceFromApp(appName, syncServiceName);
  });
  it("deleting app should work", async () => {
    await deleteApp(appName);
  });
});
