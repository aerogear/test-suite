const { Client, KubeConfig } = require("kubernetes-client");
const Request = require("kubernetes-client/backends/request");
const { OpenshiftClient } = require("openshift-rest-client");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const { waitFor, randomString } = require("./utils");

const CONFIG_MAP = "configmaps";
const ROUTE = "routes";
const PROJECT = "projects";

const GET = "get";
const CREATE = "create";
const DELETE = "delete";
const GET_ALL = "getAll";

let mdcNamespace;
let kubeClient;
let openshiftClient;
let allNamespaces;

const getNamespaces = async namespaceName => {
  if (!allNamespaces) {
    // eslint-disable-next-line require-atomic-updates
    allNamespaces = await resource(PROJECT, GET_ALL);
  }
  if (namespaceName) {
    return allNamespaces.items
      .map(ns => ns.metadata.name)
      .find(name => name.includes(namespaceName));
  }
  return allNamespaces;
};

const init = async () => {
  const kubeconfig = new KubeConfig();

  kubeconfig.loadFromDefault();

  const backend = new Request({ kubeconfig });
  kubeClient = new Client({ backend });

  await kubeClient.loadSpec();

  openshiftClient = await OpenshiftClient();

  return openshiftClient;
};

const resource = async (type, action, param, namespace = null) => {
  let api;

  switch (type) {
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

const cleanupNamespaces = async nsPrefix => {
  const namespaces = await getNamespaces();

  for (const ns of namespaces.items) {
    if (ns.metadata.name.startsWith(nsPrefix)) {
      await deleteProject(ns.metadata.name);
    }
  }
};

const redeployShowcase = async namePrefix => {
  // Creating namespace with random string suffix is a workaround
  // for some reason when deleting then creating namespace with
  // same name in script, no matter how long it waits before
  // creation, the creation always fails, saying that namespace
  // with the name already exists.
  await cleanupNamespaces(namePrefix);

  const projectName = `${namePrefix}-${randomString()}`;
  await newProject(projectName);
  console.log("Redeploying showcase server...");
  await deployShowcaseServer(projectName);

  return projectName;
};

module.exports = {
  init,
  TYPE: {
    CONFIG_MAP,
    ROUTE,
    PROJECT
  },
  ACTION: {
    GET,
    CREATE,
    DELETE,
    GET_ALL
  },
  resource,
  deployShowcaseServer,
  newProject,
  deleteProject,
  redeployShowcase,
  getNamespaces,
  cleanupNamespaces
};