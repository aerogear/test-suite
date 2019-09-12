
const path = require("path");

exports.config = {
  seleniumAddress: 'http://hub.browserstack.com/wd/hub',
  allScriptsTimeout: 30000,
  specs: [
    './test/**/*.ts'
  ],
  capabilities: {
    project: "AeroGear Test Suit",
    name: "Showcase",
    browserName: "",
    os_version: process.env.MOBILE_PLATFORM === "ios" ? "12" : "9.0",
    device: process.env.MOBILE_PLATFORM === "ios" ? "iPhone XS" : "Google Pixel 3",
    real_mobile: true,
    app: process.env.BROWSERSTACK_APP,
    autoWebview: true,
    // "browserstack.local": "true",
    'browserstack.user': process.env.BROWSERSTACK_USER,
    'browserstack.key': process.env.BROWSERSTACK_KEY,
    'browserstack.debug': true,
    'browserstack.networkLogs': true,
  },
  framework: 'mocha',
  mochaOptions: {
    file: path.join(__dirname, "./init.ts"),
  },
  onPrepare() {
    // Register ts-node
    require('ts-node').register({
      project: path.join(__dirname, "./tsconfig.json"),
    });
  },
};
