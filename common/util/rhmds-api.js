const util = require("util");
const exec = util.promisify(require("child_process").exec);

const { waitFor, randomString } = require("./utils");

const getNamespaces = async () => {
  const output = await exec(`oc get projects -o name`);
  return output.stdout
    .split("project.project.openshift.io/")
    .join("")
    .trim()
    .split("\n");
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

  for (const ns of namespaces) {
    if (ns.startsWith(nsPrefix)) {
      await deleteProject(ns);
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
  redeployShowcase
};
