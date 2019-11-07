const axios = require("axios");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { waitFor } = require("../../common/util/utils");

async function waitForPodsToBeReady(namespace) {
  await waitFor(
    async () => {
      const podsOutput = (await exec(
        `oc get pods -o jsonpath='{.items[*].status.containerStatuses[*].ready}' -n ${namespace}`
      )).stdout;
      console.log(`Waiting for all pods in ${namespace} namespace to be ready`);
      // until all pods have ready=true status
      return !podsOutput.includes("false");
    },
    200000,
    10000
  );
}

async function waitForApp(url, headers, statusCode) {
  await waitFor(
    async () => {
      const res = await axios({ url, headers }).catch(() => {
        console.log(`Waiting for app (${url}) to be ready`);
      });
      return res ? res.status === statusCode : false;
    },
    30000,
    1000
  );
}

async function triggerRedeploy(resources) {
  for (const r of resources) {
    if (r.resourceType === "dc") {
      // For DC we can trigger redeploy easily by rolling out to latest config
      await exec(`oc rollout latest ${r.resourceName} -n ${r.namespace}`);
    } else {
      // Trigger redeploy of deployment by patching the template label
      await exec(
        `oc patch ${r.resourceType} ${r.resourceName} \
                -p '{"spec": {"template": {"metadata": { "labels": {  "test": "${Date.now()}"}}}}}' \
                -n ${r.namespace}`
      );
    }
  }
}

module.exports = {
  waitForPodsToBeReady,
  waitForApp,
  triggerRedeploy
};
