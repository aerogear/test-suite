const {
    login,
    createApp,
    deleteApp
} = require('../utils/mdc')
const appName1 = `test-${Math.ceil(Math.random()*1000)}`,
    appName2 = `test-${Math.ceil(Math.random()*1000)}`,
    appName3 = `verification-${Math.ceil(Math.random()*1000)}`,
    appName4 = `testing-${Math.ceil(Math.random()*1000)}`,
    filter1 = "test",
    filter2 = "verif",
    filter3 = "testin"


describe('Testing MDC Apps filtering', () => {

    before(async() => {
        await login()
        await createApp(appName1)
        await createApp(appName2)
        await createApp(appName3)
    })
    after(async() => {
        await deleteApp(appName2)
        await deleteApp(appName3)
        await deleteApp(appName4)
        await page.close()
    })
    afterEach(async() => {
        await page.$eval('.toolbar-pf-filter input.toolbarFilter', el => el.value = "")
    })

    it("MDC overview page should display only test* apps", async() => {
        await page.waitForSelector('.toolbar-pf-filter input.toolbarFilter')
        await page.type('input.toolbarFilter', "test")
        await page.waitForFunction(
            filter1 => [...document.querySelectorAll('.card-pf-title > h1')].every(el => (el.innerText).includes(filter1)), {},
            filter1
        )
    })
    it("MDC Overview page should display only Verification* App", async() => {
        await page.waitForSelector('.toolbar-pf-filter input.toolbarFilter')
        await page.type('input.toolbarFilter', "verif", { delay: 100 })
        await page.waitForFunction(
            filter2 => [...document.querySelectorAll('.card-pf-title > h1')].every(el => (el.innerText).includes(filter2)), {},
            filter2
        )
    })
    it("Delete test* app and add testing* app", async() => {
        await deleteApp(appName1)
        await createApp(appName4)
    })
    it("MDC Overview page should display only testing* App", async() => {
        await page.waitForSelector('.toolbar-pf-filter input.toolbarFilter')
        await page.type('input.toolbarFilter', "testin", { delay: 100 })
        await page.waitForFunction(
            filter3 => [...document.querySelectorAll('.card-pf-title > h1')].every(el => (el.innerText).includes(filter3)), {},
            filter3
        )
    })
})