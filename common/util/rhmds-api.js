const { Client, KubeConfig } = require("kubernetes-client");
const Request = require("kubernetes-client/backends/request");
const { OpenshiftClient } = require("openshift-rest-client");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const fs = require("fs");
const path = require("path");

const mobileClientCrd = require("../crds/mobile-client");
const keycloakRealmCrd = require("../crds/keycloak-realm");
const mssAppCrd = require("../crds/mss-app");
const pushAppCrd = require("../crds/push-app");
const androidVariantCrd = require("../crds/android-variant");
const iosVariantCrd = require("../crds/ios-variant");
const getPushAppCr = require("../templates/push-app");
const getMobileClientCr = require("../templates/mobile-client");
const getKeycloakRealmCr = require("../templates/keycloak-realm");
const getAndroidVariantCr = require("../templates/android-variant");
const getIosVariantCr = require("../templates/ios-variant");
const getMssAppCr = require("../templates/mss-app");
const getSyncConfigMap = require("../templates/data-sync");
const { waitFor, randomString } = require("./utils");

const TIMEOUT = 20000;

const MOBILE_APP = "mobileclients";
const KEYCLOAK_REALM = "keycloakrealms";
const MSS_APP = "mobilesecurityserviceapps";
const ANDROID_VARIANT = "androidvariants";
const IOS_VARIANT = "iosvariants";
const CONFIG_MAP = "configmaps";
const ROUTE = "routes";
const PUSH_APP = "pushapplications";
const PROJECT = "projects";

const GET = "get";
const CREATE = "create";
const DELETE = "delete";
const GET_ALL = "getAll";

const DATA_SYNC = "sync-app";
const KEYCLOAK = "keycloak";
const PUSH_ANDROID = "android";
const PUSH_IOS = "ios";
const MSS = "security";

let mdcNamespace;
let kubeClient;
let openshiftClient;
let allNamespaces;

const determineMdcNamespace = async () => {
  const testAppName = `test-${randomString()}`;
  const cr = getMobileClientCr(testAppName);

  try {
    mdcNamespace = "openshift-mobile-developer-console";
    await resource(MOBILE_APP, CREATE, cr);
    await resource(MOBILE_APP, DELETE, testAppName);
  } catch (_) {
    mdcNamespace = "mobile-developer-console";
  }
};

const getNamespaces = async namespaceName => {
  if (!allNamespaces) {
    // eslint-disable-next-line require-atomic-updates
    allNamespaces = await resource(PROJECT, GET_ALL);
  }
  return allNamespaces.items
    .map(ns => ns.metadata.name)
    .find(name => name.includes(namespaceName));
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

  return openshiftClient;
};

const resource = async (type, action, param, namespace = null) => {
  let api;

  switch (type) {
    case MOBILE_APP:
      api = kubeClient.apis["mdc.aerogear.org"].v1alpha1;
      break;

    case KEYCLOAK_REALM:
      api = kubeClient.apis["aerogear.org"].v1alpha1;
      break;

    case MSS_APP:
      api = kubeClient.apis["mobile-security-service.aerogear.org"].v1alpha1;
      break;

    case PUSH_APP:
      api = kubeClient.apis["push.aerogear.org"].v1alpha1;
      break;

    case ANDROID_VARIANT:
      api = kubeClient.apis["push.aerogear.org"].v1alpha1;
      break;

    case IOS_VARIANT:
      api = kubeClient.apis["push.aerogear.org"].v1alpha1;
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

  const request = (type === PROJECT
    ? api
    : api.namespaces(namespace || mdcNamespace))[type];

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

const createPushApp = async (name, uid) => {
  let pushApp;

  try {
    pushApp = await resource(PUSH_APP, GET, name);
    return pushApp;
  } catch (_) {
    console.log("No push application found. Creating a new one.");
  }

  const pushAppCr = getPushAppCr(name, uid);
  pushApp = await resource(PUSH_APP, CREATE, pushAppCr);

  await waitFor(async () => {
    // eslint-disable-next-line require-atomic-updates
    pushApp = await resource(PUSH_APP, GET, pushApp.metadata.name);
    return pushApp.status && pushApp.status.pushApplicationId;
  }, TIMEOUT);

  return pushApp;
};

const deployShowcaseServer = async namespace => {
  await exec(`oc new-app --template datasync-showcase-server -n ${namespace}`);
  await waitFor(
    async () => {
      const replicasReady = (await exec(
        `oc get dc -o jsonpath='{.items[*].status.readyReplicas}' -n ${namespace} | wc -w`
      )).stdout.replace(/\s/g, "");
      console.log(`Waiting for showcase server: ${replicasReady}/3`);
      // until postgresql, mqtt and showcase-server are ready
      return replicasReady.includes("3");
    },
    200000,
    10000
  );
};

const newProject = async name => {
  await exec(`oc new-project ${name}`);
};

const deleteProject = async name => {
  await exec(`oc delete project ${name}`);
};

const recreateMobileApp = async name => {
  console.log("Recreating mobile app...");
  await resource(MOBILE_APP, DELETE, name).catch(() => {});
  await resource(PUSH_APP, DELETE, name).catch(() => {});

  const mobileClientCr = getMobileClientCr(name);
  return await resource(MOBILE_APP, CREATE, mobileClientCr);
};

const redeployShowcase = async namePrefix => {
  // Creating namespace with random string suffix is a workaround
  // for some reason when deleting then creating namespace with
  // same name in script, no matter how long it waits before
  // creation, the creation always fails, saying that namespace
  // with the name already exists.
  const namespaces = await resource(PROJECT, GET_ALL);
  for (const ns of namespaces.items) {
    if (ns.metadata.name.startsWith(namePrefix)) {
      await deleteProject(ns.metadata.name);
    }
  }

  const projectName = `${namePrefix}-${randomString()}`;
  await newProject(projectName);
  console.log("Redeploying showcase server...");
  await deployShowcaseServer(projectName);

  return projectName;
};

const bind = async (app, services) => {
  console.log("Binding with services...");
  const bindings = [...services];

  while (bindings.length > 0) {
    const service = bindings.pop();

    let pushApp;

    switch (service) {
      case DATA_SYNC: {
        const namespaces = await resource(PROJECT, GET_ALL);
        const namespace = namespaces.items.find(ns =>
          ns.metadata.name.startsWith(app.metadata.name)
        );
        const routes = await resource(
          ROUTE,
          GET_ALL,
          null,
          namespace.metadata.name
        );
        const syncConfigMap = getSyncConfigMap(
          app.metadata.name,
          app.metadata.uid,
          `https://${routes.items[0].spec.host}`
        );
        await resource(CONFIG_MAP, CREATE, syncConfigMap);
        break;
      }
      case KEYCLOAK: {
        const keycloakRealmCr = getKeycloakRealmCr(
          app.metadata.name,
          app.metadata.uid
        );
        await resource(KEYCLOAK_REALM, CREATE, keycloakRealmCr);
        break;
      }

      case PUSH_ANDROID: {
        pushApp = await createPushApp(app.metadata.name, app.metadata.uid);
        const androidVariantCr = getAndroidVariantCr(
          app.metadata.name,
          app.metadata.uid,
          pushApp.status.pushApplicationId,
          process.env.FIREBASE_SERVER_KEY
        );
        await resource(ANDROID_VARIANT, CREATE, androidVariantCr);
        break;
      }
      case PUSH_IOS: {
        pushApp = await createPushApp(app.metadata.name, app.metadata.uid);
        const iosVariantCr = getIosVariantCr(
          app.metadata.name,
          app.metadata.uid,
          pushApp.status.pushApplicationId,
          process.env.IOS_CERTIFICATE,
          process.env.IOS_PASSPHRASE
        );
        await resource(IOS_VARIANT, CREATE, iosVariantCr);
        break;
      }
      case MSS: {
        const mssAppCr = getMssAppCr(app.metadata.name, app.metadata.uid);
        await resource(MSS_APP, CREATE, mssAppCr);
        break;
      }
      default:
        break;
    }
  }

  for (const service of services) {
    await waitFor(async () => {
      const mobileApp = await resource(MOBILE_APP, GET, app.metadata.name);
      if (service === PUSH_ANDROID || service === PUSH_IOS) {
        const pushService = mobileApp.status.services.find(
          s => s.name === "push"
        );
        return pushService && pushService.config[service];
      }
      return mobileApp.status.services.find(s => s.name === service);
    }, 30 * 1000);
  }
};

const outputAppConfig = async (app, folder) => {
  const mobileApp = await resource(MOBILE_APP, GET, app.metadata.name);
  fs.writeFileSync(
    path.resolve(folder, "mobile-services.json"),
    JSON.stringify(mobileApp.status, null, 2)
  );
};

const outputPushConfig = async (app, folder) => {
  const pushApp = await resource(PUSH_APP, GET, app.metadata.name);
  fs.writeFileSync(
    path.resolve(folder, "push-app.json"),
    JSON.stringify(pushApp, null, 2)
  );
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
  BINDING: {
    DATA_SYNC,
    KEYCLOAK,
    PUSH_ANDROID,
    PUSH_IOS,
    MSS
  },
  resource,
  createPushApp,
  deployShowcaseServer,
  newProject,
  deleteProject,
  recreateMobileApp,
  redeployShowcase,
  bind,
  outputAppConfig,
  outputPushConfig,
  getNamespaces
};
