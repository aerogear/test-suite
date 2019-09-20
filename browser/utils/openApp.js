const mdcLoginPageUrl = process.env.MDC_URL

module.exports = async (appName) => {
    await page.goto(mdcLoginPageUrl, { waitUntil: ['domcontentloaded', 'networkidle0'] })
    await page.waitForSelector('.mobile-client-card')
    await Promise.all([
        page.click(`[href='/mobileclient/${appName}']`),
        page.waitForNavigation({ waitUntil: ['domcontentloaded', 'networkidle0'] })
    ]);
}