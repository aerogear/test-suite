const path = require("path");

/**
 * Read and return the {name} environment variable or
 * if undefined return {fallback} and if also {fallback}
 * is undefined throw an Error
 *
 * @param {string} name of the env var to return
 * @param {string} fallback value to use if the env var is undefined
 * @throws {Error} when env var and fallback is undefined
 */
function getEnv(name, fallback = undefined) {
  const value = process.env[name];
  if (value === undefined) {
    if (fallback === undefined) {
      throw new Error(`\'${name}\' environment variable is not defined`);
    } else {
      return fallback;
    }
  }
  return value;
}

const BROWSERSTACK_USER = getEnv("BROWSERSTACK_USER");
const BROWSERSTACK_KEY = getEnv("BROWSERSTACK_KEY");
const BROWSERSTACK_APP = getEnv("BROWSERSTACK_APP");
const MOBILE_PLATFORM = getEnv("MOBILE_PLATFORM", "android");

exports.config = {
  seleniumAddress: "http://hub.browserstack.com/wd/hub",
  allScriptsTimeout: 30000,
  specs: ["./test/**/*.ts"],
  capabilities: {
    project: "AeroGear Test Suit",
    name: "Showcase",
    browserName: "",
    os_version: MOBILE_PLATFORM === "ios" ? "12" : "9.0",
    device: MOBILE_PLATFORM === "ios" ? "iPhone XS" : "Google Pixel 3",
    real_mobile: true,
    app: BROWSERSTACK_APP,
    autoWebview: true,
    // "browserstack.local": "true",
    "browserstack.user": BROWSERSTACK_USER,
    "browserstack.key": BROWSERSTACK_KEY,
    "browserstack.debug": true,
    "browserstack.networkLogs": true
  },
  framework: "mocha",
  mochaOptions: {
    file: path.join(__dirname, "./init.ts")
  },
  onPrepare() {
    // Register ts-node
    require("ts-node").register({
      project: path.join(__dirname, "./tsconfig.json")
    });
  }
};
