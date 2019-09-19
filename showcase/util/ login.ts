import { device } from "./device";
import { log } from "./log";

const MAIN_WINDOW_URL = "http://localhost/";
const BLANK_WINDOW_URL = "about:blank";

async function switchWindow() {
  const handles = await device.getWindowHandles();
  if (handles.length !== 2) {
    throw new Error(
      `in order to switch windows there must be two windows` +
        `but there are ${handles.length} windows`
    );
  }
  const current = await device.getWindowHandle();
  const switchTo = handles.find(h => h !== current);
  await device.switchToWindow(switchTo);
}

async function isMainWindow(): Promise<boolean> {
  return (await device.getUrl()) === MAIN_WINDOW_URL;
}

async function isBlankWindow(): Promise<boolean> {
  return (await device.getUrl()) === BLANK_WINDOW_URL;
}

async function waitUntilLoggedIn(): Promise<boolean> {
  try {
    // wait for the window to be redirected to nothing
    await device.waitUntil(isBlankWindow, undefined, "timeout");
  } catch (e) {
    if (e.message === "timeout") {
      return false;
    }
    throw e;
  }

  return true;
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

  if (!(await waitUntilLoggedIn())) {
    // if the login fill up and submit is to fast it could happened
    // that when clicking login nothing happened for this reason
    // we want to try to login again
    log.warning("failed to login, retry again");

    await loginEl.click();
    if (!(await waitUntilLoggedIn())) {
      throw new Error(`failed to login with username: "${username}"`);
    }
  }

  // switch back to the main window
  await switchWindow();

  await device.waitUntil(isMainWindow);

  log.success("logged in");
}
