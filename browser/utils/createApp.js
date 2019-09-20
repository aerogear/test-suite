const mdcLoginPageUrl = process.env.MDC_URL

module.exports = async (appName) => {
    await page.goto(mdcLoginPageUrl, { waitUntil: ['domcontentloaded', 'networkidle0'] })
    await page.waitForSelector('.toolbar-pf-actions button')

    await page.click('.toolbar-pf-actions button')
    await page.waitForSelector('#name')
    await page.type('#name', appName)
    await page.click('.modal-footer .btn-primary')
    //Wait until a client with required name appears in MDC
    await page.waitForFunction(
    appName => [...document.querySelectorAll('.card-pf-title > h1')].find(el => el.innerText === appName),
        {},
        appName
    );
}