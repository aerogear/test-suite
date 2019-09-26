const openApp = require('./openApp')

module.exports = async (appName, serviceName, params) => {
    await openApp(appName)
    await Promise.all([
        page.click('a[href="#services"]'),
        page.waitForNavigation({ waitUntil: ['domcontentloaded', 'networkidle0'] })
    ])
    await page.waitForSelector('.unboundService button', {visible: true})
    // Find the service row index
    const serviceIndex = await page.$$eval(
        '.unboundService .service-name',
        (svcs, serviceName) =>
            svcs.findIndex(s => s.innerText.includes(serviceName)),
        serviceName
    )
    // Make sure the row with service name was found
    expect(serviceIndex).to.be.a('number')
    // Find service's "Bind App" button and click on it
    const bindButtons = await page.$$('.unboundService button')
    await bindButtons[serviceIndex].click()
    // // Click on "Next"
    await page.evaluate(() => {
        document.querySelector('.wizard-pf-footer .btn-primary').click();
    });

    switch (serviceName) {
        case 'Data Sync':
            await page.waitForSelector('#root_syncServerConfig_url')
            // Type in Data Sync URL
            await page.type('#root_syncServerConfig_url', params.syncUrl)
            break;
        default:
            break;
    }
    // Click on Create
    await page.click('.wizard-pf-footer .btn-primary')
    // Wait until the service appears in Bound services section
    await page.waitForFunction(
        serviceName => [...document.querySelectorAll('.boundService .service-name')].find(el => el.innerText.includes(serviceName)),
        {},
        serviceName
    )
}
