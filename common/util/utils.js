const puppeteer = require("puppeteer");

const waitFor = async (check, timeout, pause = 4000) => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    let timedout = false;
    let passed = false;

    const t = setTimeout(() => {
      timedout = true;
      reject(new Error("Timed out"));
    }, timeout);

    passed = await check();
    while (!timedout && !passed) {
      await new Promise((resolve) => setTimeout(resolve, pause));
      passed = await check();
    }

    clearTimeout(t);
    resolve();
  });
};

const randomString = () => Math.random().toString(36).substring(7);

const getHeaderWithOauthProxyCookie = async (
  serviceURL,
  openshiftUser,
  openshiftPass
) => {
  if (openshiftUser === undefined || openshiftPass === undefined) {
    throw new Error(
      "OPENSHIFT_USERNAME and/or OPENSHIFT_PASSWORD are not defined"
    );
  }

  let browser;
  let cookie;

  try {
    browser = await puppeteer.launch({
      slowMo: 50,
      executablePath: "google-chrome",
    });
    const page = await browser.newPage();

    await page.goto(serviceURL);
    await page.$('input[name="rd"]');
    await Promise.all([page.waitForNavigation(), page.click("button.btn")]);
    const idp = await page.$("#providers > li:nth-child(3) > a:nth-child(1)");
    if (idp) {
      await Promise.all([page.waitForNavigation(), idp.click()]);
    }
    await page.type("#username", openshiftUser);
    await page.type("#password", openshiftPass);
    await Promise.all([page.waitForNavigation(), page.click("#kc-login")]);
    const approveButton = await page.$('input[name="approve"]');
    if (approveButton) {
      await Promise.all([page.waitForNavigation(), approveButton.click()]);
    }
    const cookies = await page.cookies();
    cookie = cookies.find((c) => c.name === "_oauth_proxy").value;
  } catch (err) {
    throw new Error(
      `Error occured when logging in to ${serviceURL} via oauth proxy`
    );
  } finally {
    await browser.close();
  }

  return { Cookie: `_oauth_proxy=${cookie}` };
};

const getOpenshiftAPItoken = async (
  serviceURL,
  openshiftUser,
  openshiftPass
) => {
  if (openshiftUser === undefined || openshiftPass === undefined) {
    throw new Error(
      "OPENSHIFT_USERNAME and/or OPENSHIFT_PASSWORD are not defined"
    );
  }

  let browser;
  let token;

  try {
    browser = await puppeteer.launch({
      slowMo: 50,
      executablePath: "google-chrome"
    });
    const page = await browser.newPage();

    await page.goto(serviceURL);
    await page.$('input[name="rd"]');
    const idp = await page.$("#providers > li:nth-child(3) > a:nth-child(1)");
    if (idp) {
      await Promise.all([page.waitForNavigation(), idp.click()]);
    }
    await page.type("#username", openshiftUser);
    await page.type("#password", openshiftPass);
    await Promise.all([page.waitForNavigation(), page.click("#kc-login")]);
    const approveButton = await page.$('input[name="approve"]');
    if (approveButton) {
      await Promise.all([page.waitForNavigation(), approveButton.click()]);
    }

    const displayButton = await page.$("button");
    if (displayButton) {
      await Promise.all([page.waitForNavigation(), displayButton.click()]);
    }

    let codeElement = await page.$("code");
    token = await (await codeElement.getProperty("textContent")).jsonValue();
  } catch (err) {
    throw new Error(
      `Error occured when logging in to ${serviceURL} via oauth proxy`
    );
  } finally {
    await browser.close();
  }

  return { token };
};

module.exports = {
  waitFor,
  randomString,
  getHeaderWithOauthProxyCookie,
  getOpenshiftAPItoken
};
