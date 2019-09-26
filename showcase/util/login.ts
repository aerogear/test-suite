import { interact } from "./commons";
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

async function waitForLoggedIn() {
  await device.waitUntil(async () => {
    switch (MOBILE_PLATFORM) {
      case MobilePlatform.ANDROID:
        return (await device.getUrl()) === BLANK_WINDOW_URL;
      case MobilePlatform.IOS:
        return (await device.getWindowHandles()).length === 1;
    }
  });
}

export async function login() {
  if (await isMainWindow()) {
    // when the window url is localhost the current window is
    // the app window so we have to switch to the login window
    // otherwise we are already in the login window
    await switchWindow();
  }

  // even if we don't print it it will remain stored in
  // the Appium logs
  await device.getTitle();

  // Login
  const username = await device.$("#username");
  await interact(username, e => e.setValue(KEYCLOAK_USERNAME));

  const password = await device.$("#password");
  await interact(password, e => e.setValue(KEYCLOAK_PASSWORD));

  const login = await device.$("#kc-login");
  await interact(login, e => e.click());
  await waitForLoggedIn();

  // switch back to the main window
  await switchWindow();
  await device.waitUntil(isMainWindow);
}
