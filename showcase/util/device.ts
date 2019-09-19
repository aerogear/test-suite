import { BrowserObject, remote } from "webdriverio";
import {
  BROWSERSTACK_APP,
  BROWSERSTACK_KEY,
  BROWSERSTACK_USER,
  MOBILE_PLATFORM
} from "./config";

const capabilities = {
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
  "browserstack.networkLogs": true,
  "browserstack.appium_version": "1.9.1"
};

const options: WebdriverIO.RemoteOptions = {
  hostname: "hub-cloud.browserstack.com",
  logLevel: "error",
  waitforTimeout: 10 * 1000,
  capabilities
};

export let device: BrowserObject;

export async function init() {
  device = await remote(options as any);
}
