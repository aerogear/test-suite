const puppeteer = require('puppeteer');
let browser;
let headers;
const openshiftUser = process.env.OPENSHIFT_USERNAME;
const openshiftPass = process.env.OPENSHIFT_PASSWORD;
const waitFor = async (check, timeout, pause = 4000) => {
  return new Promise(async (resolve, reject) => {
    let timedout = false;
    let passed = false;

    const t = setTimeout(() => {
      timedout = true;
      reject(new Error('Timed out'));
    }, timeout);
    
    while (!timedout && !passed) {
      passed = await check();
      await new Promise(resolve => setTimeout(resolve, pause));
    }

    clearTimeout(t);
    resolve();
  });
};

const randomString = () => Math.random().toString(36).substring(7);
const getOAuthProxy = async serviceURL => {
    if (openshiftUser === undefined || openshiftPass === undefined) {
        throw new Error('OPENSHIFT_USERNAME and/or OPENSHIFT_PASSWORD are not defined');
    }

    browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(serviceURL);
    await Promise.all([
        page.waitForNavigation(), 
        page.click('button')
    ]);
    await page.type('#username', openshiftUser);
    await page.type('#password', openshiftPass);
    await Promise.all([
        page.waitForNavigation(), 
        page.click('#kc-login')
    ]);
    const approveButton = await page.$('input[name="approve"]');
    if (approveButton) {
        await Promise.all([
            page.waitForNavigation(), 
            approveButton.click()
        ]);
    }

    const cookies = await page.cookies();
    const cookie = cookies.find(c => c.name === '_oauth_proxy').value;
    headers = { Cookie: `_oauth_proxy=${cookie}` };
    await browser.close();
    return headers;
};

module.exports = {
  waitFor,
  randomString,
  getOAuthProxy
};

