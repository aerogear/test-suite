const mdcLoginPageUrl = process.env.MDC_URL

module.exports = async (appName) => {
    await page.goto(mdcLoginPageUrl, { waitUntil: ['domcontentloaded', 'networkidle0'] })
    await page.waitForSelector('.toolbar-pf-actions button')
    // Find app's "Dropdown" button and click on it
    await page.click(`#${appName}`)
    await page.waitForSelector('.dropdown.open a')
    // Click on Delete
    await page.evaluate(() => {
        document.querySelector('.dropdown.open a').click();
    });
    await page.waitForFunction(
        appName => document.querySelector(`#${appName}`) === null
    );
}