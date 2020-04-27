import { BrowserObject, remote } from "webdriverio";
import {
  BROWSERSTACK_APP,
  BROWSERSTACK_KEY,
  BROWSERSTACK_USER,
  MOBILE_PLATFORM,
} from "./config";

const capabilities = {
  project: "AeroGear Test Suit",
  name: "Showcase",
  browserName: "",
  // eslint-disable-next-line @typescript-eslint/camelcase
  os_version: MOBILE_PLATFORM === "ios" ? "13" : "9.0",
  device: MOBILE_PLATFORM === "ios" ? "iPhone XS" : "Google Pixel 3",
  // eslint-disable-next-line @typescript-eslint/camelcase
  real_mobile: true,
  app: BROWSERSTACK_APP,
  autoWebview: true,
  "browserstack.user": BROWSERSTACK_USER,
  "browserstack.key": BROWSERSTACK_KEY,
  "browserstack.debug": true,
  "browserstack.networkLogs": true,
  "browserstack.appium_version": "1.14.0",
};

const options: WebdriverIO.RemoteOptions = {
  hostname: "hub-cloud.browserstack.com",
  logLevel: "error",
  waitforTimeout: 10 * 1000,
  capabilities,
};

export let device: BrowserObject;

export async function init(): Promise<void> {
  device = await remote(options);
}
