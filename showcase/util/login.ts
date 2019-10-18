import { interact, retry } from "./commons";
import {
  KEYCLOAK_PASSWORD,
  KEYCLOAK_USERNAME,
  MOBILE_PLATFORM,
  MobilePlatform
} from "./config";
import { device } from "./device";

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

async function switchToMainWindow() {
  await switchWindow();
  await device.waitUntil(isMainWindow);
}

async function isLoggedIn() {
  switch (MOBILE_PLATFORM) {
    case MobilePlatform.ANDROID:
      return (await device.getUrl()) === BLANK_WINDOW_URL;
    case MobilePlatform.IOS:
      return (await device.getWindowHandles()).length === 1;
  }
}

async function waitForLoggedIn() {
  await device.waitUntil(isLoggedIn);
}

export async function login() {
  // in iOS if there is only one windows it means we are already logged in
  if ((await device.getWindowHandles()).length === 1) {
    return;
  }

  if (await isMainWindow()) {
    // when the window url is localhost the current window is
    // the app window so we have to switch to the login window
    // otherwise we are already in the login window
    await switchWindow();
  }

  // if we are already logged in
  if (await isLoggedIn()) {
    // switch back to the main window and skip the login
    return await switchToMainWindow();
  }

  // even if we don't print it it will remain stored in
  // the Appium logs
  await device.getTitle();

  // Login
  await retry(async () => {
    await interact(await device.$("#username"), e =>
      e.setValue(KEYCLOAK_USERNAME)
    );

    await interact(await device.$("#password"), e =>
      e.setValue(KEYCLOAK_PASSWORD)
    );

    await interact(await device.$("#kc-login"), e => e.click());
    await waitForLoggedIn();
  });

  // switch back to the main window
  await switchToMainWindow();
}
