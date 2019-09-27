const { Client, KubeConfig } = require('kubernetes-client');
const Request = require('kubernetes-client/backends/request');

const mobileClientCrd = require('../crds/mobile-client');
const keycloakRealmCrd = require('../crds/keycloak-realm');
const mssAppCrd = require('../crds/mss-app');
const pushAppCrd = require('../crds/push-app');
const androidVariantCrd = require('../crds/android-variant');
const iosVariantCrd = require('../crds/ios-variant');
const getPushAppCr = require('../templates/push-app');
const waitFor = require('./waitFor');

const TIMEOUT = 20000;

const MOBILE_APP = 'mobileclients';
const KEYCLOAK_REALM = 'keycloakrealms';
const MSS_APP = 'mobilesecurityserviceapps';
const ANDROID_VARIANT = 'androidvariants';
const IOS_VARIANT = 'iosvariants';
const CONFIG_MAP = 'configmaps';
const PUSH_APP = 'pushapplications';

const GET = 'get';
const CREATE = 'create';
const DELETE = 'delete';

let ns;
let client;

const initKubeClient = async namespace => {
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

  ns = namespace;
}

const resource = async (type, action, param) => {
  let api;

  switch (type) {
    case MOBILE_APP:
      api = client.apis['mdc.aerogear.org'].v1alpha1;
      break;

    case KEYCLOAK_REALM:
      api = client.apis['aerogear.org'].v1alpha1;
      break;

    case MSS_APP:
      api = client.apis['mobile-security-service.aerogear.org'].v1alpha1;
      break;

    case PUSH_APP:
      api = client.apis['push.aerogear.org'].v1alpha1;
      break;

    case ANDROID_VARIANT:
      api = client.apis['push.aerogear.org'].v1alpha1;
      break;

    case IOS_VARIANT:
      api = client.apis['push.aerogear.org'].v1alpha1;
      break;

    case CONFIG_MAP:
      api = client.api.v1;
      break;
  
    default:
      break;
  }

  const request = api.namespaces(ns)[type];

  switch (action) {
    case GET:
      return (await request(param).get()).body;

    case CREATE:
      return (await request.post({ body: param })).body;

    case DELETE:
      await request(param).delete();
      break;
  
    default:
      break;
  }
};

const createPushApp = async name => {
  let pushApp;
  
  try {
    pushApp = await resource(PUSH_APP, GET, name);
    return pushApp;
  } catch (_) {}

  const pushAppCr = getPushAppCr(name);
  pushApp = await resource(PUSH_APP, CREATE, pushAppCr);

  await waitFor(async () => {
      pushApp = await resource(PUSH_APP, GET, pushApp.metadata.name);
      return pushApp.status.pushApplicationId
    },
    TIMEOUT
  );

  return pushApp;
};


module.exports = {
  initKubeClient,
  TYPE: {
    MOBILE_APP,
    KEYCLOAK_REALM,
    MSS_APP,
    ANDROID_VARIANT,
    IOS_VARIANT,
    CONFIG_MAP,
    PUSH_APP
  },
  ACTION: {
    GET,
    CREATE,
    DELETE
  },
  resource,
  createPushApp
};
