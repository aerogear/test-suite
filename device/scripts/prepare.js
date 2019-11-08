#!/usr/bin/env node

const path = require("path");

const {
  init,
  BINDING,
  bind,
  recreateMobileApp,
  redeployShowcase,
  outputAppConfig,
  outputPushConfig
} = require("../../common/util/rhmds-api");

const appName = "device-test-suite";

(async () => {
  await init();

  const app = await recreateMobileApp(appName);

  await redeployShowcase(appName);

  await bind(app, [
    BINDING.DATA_SYNC,
    BINDING.KEYCLOAK,
    BINDING.MSS,
    BINDING.PUSH_ANDROID
  ]);

  const folder = path.resolve(__dirname, "..");
  outputAppConfig(app, folder);
  outputPushConfig(app, folder);

  console.log("Setup successful");
})();
