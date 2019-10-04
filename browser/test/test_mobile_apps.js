const {
    login,
    createApp,
    openApp,
    deleteApp
} = require('../utils/mdc')
const appName1 = `test-app-${Date.now()}`,
    appName2 = `new-test-app-${Date.now()}`
describe("Test MDC apps", () => {
    before(async() => {
        await login()
    })
    after(async() => {
        await page.close()
    })
    describe("test create app dialog basic functions", async() => {
        beforeEach(async() => {
            await page.waitForSelector('.toolbar-pf-actions button.btn-primary')
            await page.click('.toolbar-pf-actions button.btn-primary')
            await page.$eval('.modal-title', el => el.innerText === "Create Mobile App")
        })
        afterEach(async() => {
            await page.waitForSelector('.pficon-close')
            await page.click('.pficon-close')
            await page.waitForSelector('.modal-dialog', { hidden: true })
        })
        it("Should display error with invalid app name", async() => {
            await page.waitForSelector('#name')
            await page.keyboard.type("hhh!!!!www.")
            await page.waitForSelector(".help-block", { display: true })
        })
        it("Should not create App with name greater than 70 characters", async() => {
            await page.waitForSelector("#name")
            await page.keyboard.type("abcdefg12345678901234567890abcdefg789012345678901234567890123456saaaaaaa")
            await page.waitForSelector(".help-block", { display: true })
        })
    })
    describe("test mobile app creation", async() => {
        before(async() => {
            await createApp("my-test-app-1230045")
        })
        it("should not create multiple apps with same name", async() => {
            await createApp("my-test-app-1230045")
            await page.waitForSelector(".alert span.pficon ~ span", { display: true })
        })
        it("create second app and open both apps", async() => {
            await createApp(appName1)
            await createApp(appName2)
            await openApp(appName1)
            await openApp(appName2)
        })
        it("Delete apps", async() => {
            await deleteApp(appName1)
            await deleteApp(appName2)
        })
    })


})