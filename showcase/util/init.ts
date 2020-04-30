import { getAutomationSession } from "./browserstack";
import { device, init } from "./device";
import { login } from "./login";

before("Initialize device", async function () {
  this.timeout(0);

  await init();

  const session = await getAutomationSession(device.sessionId);
  console.log("BrowserStack Session:");
  console.log(session.browser_url);
  console.log();
});

before("Login", async () => {
  await login();
});

after("Close device", async () => {
  await device.deleteSession();
});
