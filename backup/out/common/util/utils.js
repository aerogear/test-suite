const puppeteer = require("puppeteer");
/**
 * Wait until the condition became true
 *
 * @param {() => Promise<boolean>} condition Condition to evaluate
 * @param {number} timeout Amount of time in ms before going in timeout
 * @param {boolean} immediately If true run the condition imminently on the first time
 *                                else wait for the pause
 * @param {number} pause Amount of time in ms to wait before executing the condition again
 * @returns {Promise<void>}
 */
const waitFor = async (condition, timeout, immediately = true, pause = 4000) => {
    const start = Date.now();
    if (immediately) {
        if (await condition()) {
            return;
        }
    }
    while (Date.now() < start + timeout) {
        await new Promise(r => setTimeout(r, pause));
        if (await condition()) {
            return;
        }
    }
};
const randomString = () => Math.random()
    .toString(36)
    .substring(7);
const getHeaderWithOauthProxyCookie = async (serviceURL, openshiftUser, openshiftPass) => {
    if (openshiftUser === undefined || openshiftPass === undefined) {
        throw new Error("OPENSHIFT_USERNAME and/or OPENSHIFT_PASSWORD are not defined");
    }
    let browser;
    let cookie;
    try {
        const browser = await puppeteer.launch({ slowMo: 50 });
        const page = await browser.newPage();
        await page.goto(serviceURL);
        await Promise.all([page.waitForNavigation(), page.click("button")]);
        await page.type("#username", openshiftUser);
        await page.type("#password", openshiftPass);
        await Promise.all([page.waitForNavigation(), page.click("#kc-login")]);
        const approveButton = await page.$('input[name="approve"]');
        if (approveButton) {
            await Promise.all([page.waitForNavigation(), approveButton.click()]);
        }
        const cookies = await page.cookies();
        cookie = cookies.find(c => c.name === "_oauth_proxy").value;
    }
    catch (_) {
        throw new Error(`Error occured when logging in to ${serviceURL} via oauth proxy`);
    }
    finally {
        await browser.close();
    }
    return { Cookie: `_oauth_proxy=${cookie}` };
};
module.exports = {
    waitFor,
    randomString,
    getHeaderWithOauthProxyCookie
};
