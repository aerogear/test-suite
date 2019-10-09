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
  deleteProject
} = require('../../common/util/rhmds-api');
const getMobileClientCr = require('../../common/templates/mobile-client');
const getSyncConfigMap = require('../../common/templates/data-sync');
const getKeycloakRealmCr = require('../../common/templates/keycloak-realm');
const { waitFor, randomString } = require('../../common/util/utils');

const appName = 'test-suite-app';
const syncNamespacePrefix = 'test-suite-sync-';
const syncNamespace = syncNamespacePrefix + randomString();

(async () => {
  await init();
  
  // cleanup
  console.log('Cleanup...');
  await resource(TYPE.MOBILE_APP, ACTION.DELETE, appName).catch(() => {});
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

  // wait for bindings
  console.log('Waiting for bindings...');
  let app;
  await waitFor(async () => {
    app = await resource(TYPE.MOBILE_APP, ACTION.GET, mobileApp.metadata.name);
    return app.status.services.length === 2;
  }, 30 * 1000);

  // get mobile-services.json
  console.log('Getting mobile-services.json...');
  fs.writeFileSync(path.resolve(__dirname, '../mobile-services.json'), JSON.stringify(app.status, null, 2));

  console.log('Setup successful');
})();
