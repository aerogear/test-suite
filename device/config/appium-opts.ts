import path = require("path");
import { Options } from "webdriver";

let opts: Options & { capabilities: { [key: string]: unknown } };
if (process.env.LOCAL_APPIUM === "true") {
  opts = {
    port: 4723,
    logLevel: "error",
    capabilities: {
      platformName: "Android",
      platformVersion: "9",
      deviceName: "Android Emulator",
      app: path.join(
        __dirname,
        "../testing-app/platforms/android/app/build/outputs/apk/debug/app-debug.apk"
      ),
      automationName: "UiAutomator2",
      autoWebview: true,
    },
  };
} else {
  opts = {
    hostname: "hub-cloud.browserstack.com",
    logLevel: "error",
    capabilities: {
      // eslint-disable-next-line @typescript-eslint/camelcase
      os_version: process.env.MOBILE_PLATFORM === "ios" ? "13" : "10.0",
      device:
        process.env.MOBILE_PLATFORM === "ios" ? "iPhone XS" : "Google Pixel 4",
      // eslint-disable-next-line @typescript-eslint/camelcase
      real_mobile: "true",
      project: "AeroGear Test Suite",
      name: "Device",
      "browserstack.local": "true",
      "browserstack.user": process.env.BROWSERSTACK_USER,
      "browserstack.key": process.env.BROWSERSTACK_KEY,
      app: process.env.BROWSERSTACK_APP,
      autoWebview: true,
      "browserstack.appium_version": "1.14.0",
      "browserstack.networkLogs": true,
      "browserstack.debug": true,
    },
  };
}

export { opts };
