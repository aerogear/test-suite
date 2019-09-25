import { getAutomationSession } from "./browserstack";
import { KEYCLOAK_PASSWORD, KEYCLOAK_USERNAME } from "./config";
import { device, init } from "./device";
import { log } from "./log";
import { login } from "./login";

before("Initialize device", async function() {
  this.timeout(0);

  await init();

  const session = await getAutomationSession(device.sessionId);
  log.success(`initialized browserstack device: ${session.browser_url}`);
});

before("Login", async () => {
  await login(KEYCLOAK_USERNAME, KEYCLOAK_PASSWORD);
});

after("Close device", async () => {
  await device.deleteSession();
});
