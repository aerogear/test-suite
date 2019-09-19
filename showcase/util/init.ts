import { login } from "./ login";
import { getAutomationSession } from "./browserstack";
import { device, init } from "./device";
import { log } from "./log";

before("Initialize device", async function() {
  this.timeout(0);

  await init();

  const session = await getAutomationSession(device.sessionId);
  log.success(`initialized browserstack device: ${session.browser_url}`);
});

before("Login", async () => {
  await login("admin", "admin");
});

after("Close device", async () => {
  await device.deleteSession();
});
