const {
    createApp,
    openApp,
    bindServiceToApp,
    login,
    unbindServiceFromApp
} = require('../utils')
const appName = `test-${Date.now()}`
const syncServiceName = 'Data Sync'
const syncUrl = "https://sync-url.com"

describe('Basic MDC test', () => {

    before(async () => {
        await login()
    })
    after(async () => {
        await page.close()
    })

    it('should successfully create an app in MDC', async () => {
        await createApp(appName)
    })

    it('mobile-services.json configuration should not contain config of any service', async () => {
        await openApp(appName)
        // Get the content of mobile-services.json text area
        await page.waitForSelector('.mobile-client-config pre')
        const mobileServicesConfig = await page.$eval('.mobile-client-config pre', el => el.textContent);
        expect(mobileServicesConfig).to.be.a('string')
        const parsedMobileConfig = JSON.parse(mobileServicesConfig)
        // Make sure the list of services in the config is empty
        expect(parsedMobileConfig.services).to.be.empty
    })

    it('binding Data Sync service should complete successfully', async () => {
        await bindServiceToApp(appName, syncServiceName, { syncUrl })
    })
    it('mobile-services.json configuration should be updated with Data Sync config', async () => {
        await Promise.all([
            page.click('a[href="#configuration"]'),
            page.waitForNavigation({ waitUntil: ['domcontentloaded', 'networkidle0'] })
        ]);
        // Wait for mobile-services.json to be updated with Data Sync config (by checking its URL)
        await page.waitForFunction(
            syncUrl =>
                [...document.querySelectorAll('.mobile-client-config pre')].find(el =>
                    el.textContent.includes(syncUrl)),
            {},
            syncUrl
        );
    })
    it('unbinding Data Sync service should complete successfully', async () => {
        await unbindServiceFromApp(appName, syncServiceName)
    })
})