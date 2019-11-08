const puppeteer = require("puppeteer");

const waitFor = async (check, timeout, pause = 4000) => {
  return new Promise(async (resolve, reject) => {
    let timedout = false;
    let passed = false;

    const t = setTimeout(() => {
      timedout = true;
      reject(new Error("Timed out"));
    }, timeout);

    passed = await check();
    while (!timedout && !passed) {
      await new Promise(resolve => setTimeout(resolve, pause));
      passed = await check();
    }

    clearTimeout(t);
    resolve();
  });
};

const randomString = () =>
  Math.random()
    .toString(36)
    .substring(7);

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
  const cookie = cookies.find(c => c.name === "_oauth_proxy").value;
  await browser.close();

  return { Cookie: `_oauth_proxy=${cookie}` };
};

module.exports = {
  waitFor,
  randomString,
  getHeaderWithOauthProxyCookie
};
