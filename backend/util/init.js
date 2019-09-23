const { Client, KubeConfig } = require('kubernetes-client');
const Request = require('kubernetes-client/backends/request');

const mobileClientCrd = require('../crds/mobile-client');
const keycloakRealmCrd = require('../crds/keycloak-realm');
const mssAppCrd = require('../crds/mss-app');
const pushAppCrd = require('../crds/push-app');
const androidVariantCrd = require('../crds/android-variant');
const iosVariantCrd = require('../crds/ios-variant');

const initKubeClient = async () => {
  const kubeconfig = new KubeConfig();

  kubeconfig.loadFromDefault();

  const backend = new Request({ kubeconfig });
  client = new Client({ backend });

  await client.loadSpec();

  client.addCustomResourceDefinition(mobileClientCrd);
  client.addCustomResourceDefinition(keycloakRealmCrd);
  client.addCustomResourceDefinition(mssAppCrd);
  client.addCustomResourceDefinition(pushAppCrd);
  client.addCustomResourceDefinition(androidVariantCrd);
  client.addCustomResourceDefinition(iosVariantCrd);

  return client;
}

module.exports = {
  initKubeClient
};
