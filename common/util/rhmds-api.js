const { Client, KubeConfig } = require('kubernetes-client');
const Request = require('kubernetes-client/backends/request');
const { OpenshiftClient } = require('openshift-rest-client');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const mobileClientCrd = require('../crds/mobile-client');
const keycloakRealmCrd = require('../crds/keycloak-realm');
const mssAppCrd = require('../crds/mss-app');
const pushAppCrd = require('../crds/push-app');
const androidVariantCrd = require('../crds/android-variant');
const iosVariantCrd = require('../crds/ios-variant');
const getPushAppCr = require('../templates/push-app');
const getMobileClientCr = require('../templates/mobile-client');
const { waitFor, randomString } = require('./utils');

const TIMEOUT = 20000;

const MOBILE_APP = 'mobileclients';
const KEYCLOAK_REALM = 'keycloakrealms';
const MSS_APP = 'mobilesecurityserviceapps';
const ANDROID_VARIANT = 'androidvariants';
const IOS_VARIANT = 'iosvariants';
const CONFIG_MAP = 'configmaps';
const ROUTE = 'routes';
const PUSH_APP = 'pushapplications';
const PROJECT = 'projects';

const GET = 'get';
const CREATE = 'create';
const DELETE = 'delete';
const GET_ALL = 'getAll';

let mdcNamespace;
let kubeClient;
let openshiftClient;

const determineMdcNamespace = async () => {
  const testAppName = `test-${randomString()}`;
  const cr = getMobileClientCr(testAppName);

  try {
    mdcNamespace = 'openshift-mobile-developer-console';
    await resource(MOBILE_APP, CREATE, cr);
    await resource(MOBILE_APP, DELETE, testAppName);
  } catch (_) {
    mdcNamespace = 'mobile-developer-console';
  }
};

const init = async () => {
  const kubeconfig = new KubeConfig();

  kubeconfig.loadFromDefault();

  const backend = new Request({ kubeconfig });
  kubeClient = new Client({ backend });

  await kubeClient.loadSpec();

  kubeClient.addCustomResourceDefinition(mobileClientCrd);
  kubeClient.addCustomResourceDefinition(keycloakRealmCrd);
  kubeClient.addCustomResourceDefinition(mssAppCrd);
  kubeClient.addCustomResourceDefinition(pushAppCrd);
  kubeClient.addCustomResourceDefinition(androidVariantCrd);
  kubeClient.addCustomResourceDefinition(iosVariantCrd);

  await determineMdcNamespace();

  openshiftClient = await OpenshiftClient();
}

const resource = async (type, action, param, namespace = null) => {
  let api;

  switch (type) {
    case MOBILE_APP:
      api = kubeClient.apis['mdc.aerogear.org'].v1alpha1;
      break;

    case KEYCLOAK_REALM:
      api = kubeClient.apis['aerogear.org'].v1alpha1;
      break;

    case MSS_APP:
      api = kubeClient.apis['mobile-security-service.aerogear.org'].v1alpha1;
      break;

    case PUSH_APP:
      api = kubeClient.apis['push.aerogear.org'].v1alpha1;
      break;

    case ANDROID_VARIANT:
      api = kubeClient.apis['push.aerogear.org'].v1alpha1;
      break;

    case IOS_VARIANT:
      api = kubeClient.apis['push.aerogear.org'].v1alpha1;
      break;

    case CONFIG_MAP:
      api = kubeClient.api.v1;
      break;

    case ROUTE:
      api = openshiftClient.apis.route.v1;
      break;

    case PROJECT:
      api = openshiftClient.apis.project.v1;
      break;
  
    default:
      break;
  }

  const request = (type === PROJECT ? api : api.namespaces(namespace || mdcNamespace))[type];

  switch (action) {
    case GET:
      return (await request(param).get()).body;

    case CREATE:
      return (await request.post({ body: param })).body;

    case DELETE:
      await request(param).delete();
      break;

    case GET_ALL:
      return (await request.get()).body;
  
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

const deployShowcaseServer = async (name, namespace) => {
  await exec(`svcat provision ${name} \
    --class datasync-showcase-server \
    --plan default -n ${namespace} --wait \
  `);
};

const newProject = async name => {
  await exec(`oc new-project ${name}`);
};

const deleteProject = async name => {
  await exec(`oc delete project ${name}`);
};

module.exports = {
  init,
  TYPE: {
    MOBILE_APP,
    KEYCLOAK_REALM,
    MSS_APP,
    ANDROID_VARIANT,
    IOS_VARIANT,
    CONFIG_MAP,
    ROUTE,
    PUSH_APP,
    PROJECT
  },
  ACTION: {
    GET,
    CREATE,
    DELETE,
    GET_ALL
  },
  resource,
  createPushApp,
  deployShowcaseServer,
  newProject,
  deleteProject
};
