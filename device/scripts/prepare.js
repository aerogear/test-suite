#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const {
  deployShowcaseServer,
  init,
  resource,
  TYPE,
  ACTION,
  newProject,
  deleteProject,
  createPushApp
} = require('../../common/util/rhmds-api');
const getMobileClientCr = require('../../common/templates/mobile-client');
const getSyncConfigMap = require('../../common/templates/data-sync');
const getKeycloakRealmCr = require('../../common/templates/keycloak-realm');
const getAndroidVariantCr = require('../../common/templates/android-variant');
const getMssAppCr = require('../../common/templates/mss-app');
const { waitFor, randomString } = require('../../common/util/utils');

const appName = 'test-suite-app';
const syncNamespacePrefix = 'test-suite-sync-';
const syncNamespace = syncNamespacePrefix + randomString();

(async () => {
  await init();
  
  // cleanup
  console.log('Cleanup...');
  await resource(TYPE.MOBILE_APP, ACTION.DELETE, appName).catch(() => {});
  await resource(TYPE.PUSH_APP, ACTION.DELETE, appName).catch(() => {});
  const namespaces = await resource(TYPE.PROJECT, ACTION.GET_ALL);
  for (const ns of namespaces.items) {
    if (ns.metadata.name.startsWith(syncNamespacePrefix)) {
      await deleteProject(ns.metadata.name);
    }
  }

  // create mobile app
  console.log('Creating mobile app...');
  const mobileClientCr = getMobileClientCr(appName);
  mobileApp = await resource(TYPE.MOBILE_APP, ACTION.CREATE, mobileClientCr);

  // deploy showcase server
  console.log('Deploying showcase server...');
  await newProject(syncNamespace);
  await deployShowcaseServer(syncNamespace, syncNamespace);
  const routes = await resource(TYPE.ROUTE, ACTION.GET_ALL, null, syncNamespace);
  const syncUrl = `https://${routes.items[0].spec.host}`;

  // bind with data sync
  console.log('Binding with data sync...');
  const syncConfigMap = getSyncConfigMap(
    mobileApp.metadata.name,
    mobileApp.metadata.uid,
    syncUrl
  );
  dataSync = await resource(TYPE.CONFIG_MAP, ACTION.CREATE, syncConfigMap);

  // bind with keycloak
  console.log('Binding with keycloak...');
  const keycloakRealmCr = getKeycloakRealmCr(mobileApp.metadata.name, mobileApp.metadata.uid);
  keycloakRealm = await resource(TYPE.KEYCLOAK_REALM, ACTION.CREATE, keycloakRealmCr);

  // create push application
  console.log('Creating push application...');
  const pushApp = await createPushApp(appName);

  // bind with push - android
  console.log('Binding with push - android...');
  const androidVariantCr = getAndroidVariantCr(
    mobileApp.metadata.name,
    mobileApp.metadata.uid,
    pushApp.status.pushApplicationId,
    process.env.FIREBASE_SERVER_KEY
  );
  androidVariant = await resource(TYPE.ANDROID_VARIANT, ACTION.CREATE, androidVariantCr);

  // bind with mss
  console.log('Binding with mss...');
  const mssAppCr = getMssAppCr(mobileApp.metadata.name, mobileApp.metadata.uid);
  mssApp = await resource(TYPE.MSS_APP, ACTION.CREATE, mssAppCr);

  // wait for bindings
  console.log('Waiting for bindings...');
  let app;
  await waitFor(async () => {
    app = await resource(TYPE.MOBILE_APP, ACTION.GET, mobileApp.metadata.name);
    return app.status.services.length === 4;
  }, 30 * 1000);

  // get mobile-services.json
  console.log('Getting mobile-services.json...');
  fs.writeFileSync(path.resolve(__dirname, '../mobile-services.json'), JSON.stringify(app.status, null, 2));

  // get push app config
  console.log('Getting push app config...');
  fs.writeFileSync(path.resolve(__dirname, '../push-app.json'), JSON.stringify(pushApp, null, 2));

  console.log('Setup successful');
})();
