const puppeteer = require("puppeteer");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { init, resource, TYPE, ACTION } = require("../../common/util/rhmds-api");
const FAILED_TESTS = {};

const opts = {
  ignoreHTTPSErrors: true,
  headless: process.env.HEADLESS !== "false",
  // Uncommenting the next line will slow down all actions
  // performed by the Puppeteer by <value> milliseconds.
  // Pretty useful when fixing/writing a test
  slowMo: 50,
  defaultViewport: null,
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
};

before(async () => {
  const openshiftClient = await init();
  global.browser = await puppeteer.launch(opts);
  global.page = null;
  global.context = null;
  global.seUrl = await getSEUrl();
  global.openshiftConsoleUrl = getOpenShiftConsoleUrl(openshiftClient);
});

after(() => {
  browser.close();
});

// Skip test if first test from folder failed
beforeEach(function() {
  if (FAILED_TESTS[this.currentTest.file]) {
    this.skip();
  }
});

afterEach(function() {
  if (this.currentTest.state === "failed") {
    FAILED_TESTS[this.currentTest.file] = true;
  }
});

async function getSEUrl() {
  let webappNs = "openshift-webapp";
  try {
    await exec(`oc get projects | grep ${webappNs}`);
  } catch (_) {
    webappNs = "webapp";
  }

  // MDC namespace is targeted by default
  const seRoute = await resource(TYPE.ROUTE, ACTION.GET_ALL, null, webappNs);
  return `https://${seRoute.items[0].spec.host}`;
}

function getOpenShiftConsoleUrl(openshiftClient) {
  return openshiftClient.backend.requestOptions.baseUrl;
}
