const puppeteer = require("puppeteer");

const waitFor = async (check, timeout, pause = 4000) => {
  const start = Date.now()

  while (true) {
    if (start + timeout < Date.now()) {
      throw new Error("Timed out")
    }

    if (await check()) {
      return;
    }

    await new Promise(r => setTimeout(r, pause));
  }
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

  let browser;
  let cookie;

  try {
    browser = await puppeteer.launch({ slowMo: 50 });
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
  } catch (_) {
    throw new Error(
      `Error occured when logging in to ${serviceURL} via oauth proxy`
    );
  } finally {
    await browser.close();
  }

  return { Cookie: `_oauth_proxy=${cookie}` };
};

module.exports = {
  waitFor,
  randomString,
  getHeaderWithOauthProxyCookie
};
