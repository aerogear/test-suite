import { getAutomationSession } from "./browserstack";
import { device, init } from "./device";
import { log } from "./log";
import { login } from "./login";

before("Initialize device", async function() {
  this.timeout(0);

  await init();

  const session = await getAutomationSession(device.sessionId);
  log.success(session.browser_url);
});

before("Login", async () => {
  await login();
});

after("Close device", async () => {
  await device.deleteSession();
});
