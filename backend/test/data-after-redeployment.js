const should = require("chai").should();
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const axios = require("axios");
const {
  init,
  getNamespaces,
  ACTION,
  resource,
  TYPE
} = require("../../common/util/rhmds-api");

const { waitFor, getOAuthProxy } = require("../../common/util/utils");

describe("Data after redeployment", async function() {
  let headers;
  this.timeout(0);

  before("Init kube client", async function() {
    await init();
  });

  async function waitForPodsToBeReady(namespace) {
    await waitFor(
      async () => {
        const podsOutput = (await exec(
          `oc get pods -o jsonpath='{.items[*].status.containerStatuses[*].ready}' -n ${namespace}`
        )).stdout;
        console.log(
          `Waiting for all pods in ${namespace} namespace to be ready`
        );
        // until all pods have ready=true status
        return !podsOutput.includes("false");
      },
      200000,
      10000
    );
  }

  async function waitForApp(url, statusCode) {
    await waitFor(
      async () => {
        const res = await axios({ url, headers }).catch(() => {
          console.log(`Waiting for app (${url}) to be ready`);
        });
        return res ? res.status === statusCode : false;
      },
      200000,
      10000
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

  describe("UPS", async function() {
    let upsProjectName;
    let upsHostname;
    let pushAppEndpoint;
    let pushApp;
    const upsDcName = "unifiedpush";
    const upsDbDcName = `${upsDcName}-postgresql`;
    const pushAppName = `push-app-test-${Date.now()}`;
    const pushVariantName = `push-variant-test-${Date.now()}`;

    before("Get UPS resources", async function() {
      upsProjectName = await getNamespaces("mobile-unifiedpush");
      upsHostname = (await resource(
        TYPE.ROUTE,
        ACTION.GET_ALL,
        null,
        upsProjectName
      )).items
        .map(r => r.spec.host)
        .find(url => url.includes("mobile-unifiedpush"));
      pushAppEndpoint = `https://${upsHostname}/rest/applications`;
      headers = await getOAuthProxy(pushAppEndpoint);
    });

    after("Delete UPS app", async function() {
      await axios({
        method: "DELETE",
        headers,
        url: `${pushAppEndpoint}/${pushApp.pushApplicationID}`
      });
    });

    it("should create app and variant in UPS ", async () => {
      pushApp = await createPushApp(pushAppName);
      const variant = await createPushVariant(
        pushVariantName,
        pushApp.pushApplicationID
      );
      variant.name.should.equal(pushVariantName);
    });

    it("should successfully redeploy Postgres DB and UPS", async () => {
      await triggerRedeploy([
        {
          resourceType: "dc",
          resourceName: upsDbDcName,
          namespace: upsProjectName
        },
        {
          resourceType: "dc",
          resourceName: upsDcName,
          namespace: upsProjectName
        }
      ]);
      await waitForPodsToBeReady(upsProjectName);
      await waitForApp(pushAppEndpoint, 200);
    });

    it("previously created UPS app & variant should be still present after redeployment", async () => {
      const foundApp = await getPushApp(pushAppName);
      should.not.equal(
        foundApp,
        undefined,
        "Previously created app was not found"
      );
      const foundVariant = foundApp.variants.find(
        v => v.name === pushVariantName
      );
      should.not.equal(
        foundVariant,
        undefined,
        "Previously created variant was not found"
      );
    });

    const createPushApp = async name => {
      return (await axios({
        method: "POST",
        url: pushAppEndpoint,
        headers,
        data: { name }
      })).data;
    };

    const createPushVariant = async (name, appId) => {
      return (await axios({
        method: "POST",
        url: `${pushAppEndpoint}/${appId}/android`,
        headers,
        data: {
          name,
          projectNumber: "test",
          googleKey: "test"
        }
      })).data;
    };

    const getPushApp = async pushAppName => {
      return (await axios({
        method: "GET",
        headers,
        url: pushAppEndpoint
      })).data.find(app => app.name === pushAppName);
    };
  });

  describe("Mobile Security Service", async function() {
    let mssProjectName;
    let mssHostname;
    let mssApiEndpoint;
    let mssApp;
    let deployedApp;
    const mssDeploymentName = "mobile-security-service";
    const mssDbDeploymentName = `${mssDeploymentName}-db`;
    const mssAppId = `test.${Date.now()}.test`;

    before("Get MSS resources", async function() {
      mssProjectName = await getNamespaces("mobile-security-service");
      mssHostname = (await resource(
        TYPE.ROUTE,
        ACTION.GET_ALL,
        null,
        mssProjectName
      )).items
        .map(r => r.spec.host)
        .find(url => url.includes("mobile-security-service"));
      mssApiEndpoint = `https://${mssHostname}/api`;
      headers = await getOAuthProxy(`${mssApiEndpoint}/apps`);
    });

    after("Delete MSS app", async function() {
      await axios({
        method: "DELETE",
        headers,
        url: `${mssApiEndpoint}/apps/${mssApp.id}`
      });
    });

    it("should create and init app in MSS", async () => {
      let res = await createMssApp(mssAppId);
      should.not.equal(res, undefined);
      res.status.should.equal(201);
      mssApp = (await getMssApps()).find(app => app.appId === mssAppId);

      res = await initMssApp(mssAppId);
      res.status.should.equal(200);
      deployedApp = res.data;
    });

    it("should successfully redeploy Postgres DB and MSS", async () => {
      await triggerRedeploy([
        {
          resourceType: "deployment",
          resourceName: mssDbDeploymentName,
          namespace: mssProjectName
        },
        {
          resourceType: "deployment",
          resourceName: mssDeploymentName,
          namespace: mssProjectName
        }
      ]);
      await waitForPodsToBeReady(mssProjectName);
      await waitForApp(`${mssApiEndpoint}/apps`, 200);
    });

    it("previously created MSS app & deployed version should be still present after redeployment", async () => {
      const foundApp = await getMssAppById(mssApp.id);
      should.not.equal(
        foundApp,
        undefined,
        "Previously created app was not found"
      );
      const foundVariant = foundApp.deployedVersions.find(
        v => v.id === deployedApp.id
      );
      should.not.equal(
        foundVariant,
        undefined,
        "Previously deployed app was not found"
      );
    });

    const createMssApp = async appId => {
      return await axios({
        method: "POST",
        url: `${mssApiEndpoint}/apps`,
        headers,
        data: { appId }
      });
    };

    const initMssApp = async appId => {
      return await axios({
        method: "POST",
        url: `${mssApiEndpoint}/init`,
        headers,
        data: {
          appId,
          deviceId: "00000000-0000-0000-0000-000000000000",
          version: "1"
        }
      });
    };

    const getMssApps = async () => {
      return (await axios({
        method: "GET",
        url: `${mssApiEndpoint}/apps`,
        headers
      })).data;
    };

    const getMssAppById = async appId => {
      return (await axios({
        method: "GET",
        url: `${mssApiEndpoint}/apps/${appId}`,
        headers
      })).data;
    };
  });
});
