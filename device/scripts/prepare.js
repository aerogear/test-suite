#!/usr/bin/env node

const path = require('path');

const {
  init,
  BINDING,
  bind,
  recreateMobileApp,
  redeployShowcase,
  outputAppConfig,
  outputPushConfig
} = require('../../common/util/rhmds-api');

const appName = 'device-test-suite';

(async () => {
  await init();

  console.log('Recreating mobile app...');
  const app = await recreateMobileApp(appName);

  console.log('Redeploying showcase server...');
  await redeployShowcase(appName);
  
  console.log('Binding with services...');
  await bind(app, [
    BINDING.DATA_SYNC,
    BINDING.KEYCLOAK,
    BINDING.MSS,
    BINDING.PUSH_ANDROID,
  ]);

  const folder = path.resolve(__dirname, '..');
  outputAppConfig(app, folder);
  outputPushConfig(app, folder);

  console.log('Setup successful');
})();
