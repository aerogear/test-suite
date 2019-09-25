import { MOBILE_PLATFORM, MobilePlatform } from "./config";
import { device } from "./device";
import { log } from "./log";

const MAIN_WINDOW_URL = /(http|ionic):\/\/localhost\/?/;
const BLANK_WINDOW_URL = "about:blank";

async function switchWindow() {
  const handles = await device.getWindowHandles();
  if (handles.length === 1) {
    await device.switchToWindow(handles[0]);
  } else if (handles.length === 2) {
    const current = await device.getWindowHandle();
    const switchTo = handles.find(h => h !== current);
    await device.switchToWindow(switchTo);
  } else {
    throw new Error(
      `in order to switch windows there must be one or two windows` +
        `but there are ${handles.length} windows`
    );
  }
}

async function isMainWindow(): Promise<boolean> {
  return MAIN_WINDOW_URL.test(await device.getUrl());
}

async function waitForLoggedIn(timeout?: number, timeoutMsg?: string) {
  await device.waitUntil(
    async () => {
      switch (MOBILE_PLATFORM) {
        case MobilePlatform.ANDROID:
          return (await device.getUrl()) === BLANK_WINDOW_URL;
        case MobilePlatform.IOS:
          return (await device.getWindowHandles()).length === 1;
      }
    },
    timeout,
    timeoutMsg
  );
}

export async function login(username: string, password: string) {
  log.info("start login");

  if (await isMainWindow()) {
    // when the window url is localhost the current window is
    // the app window so we have to switch to the login window
    // otherwise we are already in the login window
    await switchWindow();

    log.info("switched to login window");
  }

  // even if we don't print it it will remain stored in
  // the Appium logs
  await device.getTitle();

  // Login
  const usernameEl = await device.$("#username");
  await usernameEl.waitForDisplayed();
  await usernameEl.setValue(username);

  const passwordEl = await device.$("#password");
  await passwordEl.waitForDisplayed();
  await passwordEl.setValue(password);

  const loginEl = await device.$("#kc-login");
  await loginEl.waitForDisplayed();
  await loginEl.click();

  try {
    await waitForLoggedIn(undefined, "timeout");
  } catch (e) {
    if (e.message === "timeout") {
      log.warning("retry to login");

      await loginEl.click();

      await waitForLoggedIn();
    } else {
      throw e;
    }
  }

  // switch back to the main window
  await switchWindow();
  await device.waitUntil(isMainWindow);
}
