import { getAutomationSession } from "./browserstack";
import { device, init } from "./device";
import { log } from "./log";

before("Initialize device", async function() {
  this.timeout(0);

  await init();

  const session = await getAutomationSession(device.sessionId);
  log.success(session.browser_url);
});

after("Close device", async () => {
  await device.deleteSession();
});
