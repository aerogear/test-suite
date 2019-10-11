const puppeteer = require('puppeteer')
const { expect } = require('chai')
const { init, resource, TYPE, ACTION } = require('../../common/util/rhmds-api')
const FAILED_TESTS = {};

const opts = {
    ignoreHTTPSErrors: true,
    headless: process.env.HEADLESS !== 'false',
    // Uncommenting the next line will slow down all actions
    // performed by the Puppeteer by <value> milliseconds.
    // Pretty useful when fixing/writing a test
    slowMo: 50,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
}

before(async () => {
    const { openshiftClient, mdcNamespace } = await init()
    global.expect = expect
    global.browser = await puppeteer.launch(opts)
    global.page
    global.context
    global.mdcUrl = await getMdcUrl(mdcNamespace)
    global.openshiftConsoleUrl = getOpenShiftConsoleUrl(openshiftClient)
})

after(() => {
    browser.close()
})

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

async function getMdcUrl(ns) {
  const mdcRoutes = await resource(TYPE.ROUTE, ACTION.GET_ALL, '', ns)
  return `https://${mdcRoutes.items[0].spec.host}`
}

function getOpenShiftConsoleUrl(openshiftClient) {
  return openshiftClient.backend.requestOptions.baseUrl
}