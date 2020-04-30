const should = require("chai").should();
const axios = require("axios");
const openshiftAdminUser = process.env.OPENSHIFT_ADMIN_USERNAME;
const openshiftAdminPassword = process.env.OPENSHIFT_ADMIN_PASSWORD;
const {
  init,
  getNamespaces,
  ACTION,
  resource,
  TYPE,
} = require("../../common/util/rhmds-api");
const { getHeaderWithOauthProxyCookie } = require("../../common/util/utils");
const {
  waitForApp,
  waitForPodsToBeReady,
  waitForPodsToBeDeleted,
  triggerRedeploy,
} = require("../utils");

describe("Data after redeployment", async function () {
  let headers;
  this.timeout(0);

  before("Init kube client", async function () {
    await init();
  });

  describe("UPS", async function () {
    let upsProjectName;
    let upsHostname;
    let pushAppEndpoint;
    let pushApp;
    const upsDcName = "ups";
    const pushAppName = `push-app-test-${Date.now()}`;
    const pushVariantName = `push-variant-test-${Date.now()}`;

    before("Get UPS resources", async function () {
      upsProjectName = await getNamespaces("redhat-rhmi-ups");
      upsHostname = (
        await resource(TYPE.ROUTE, ACTION.GET_ALL, null, upsProjectName)
      ).items
        .map((r) => r.spec.host)
        .find((url) => url.includes("ups-unifiedpush"));
      pushAppEndpoint = `https://${upsHostname}/rest/applications`;
      headers = await getHeaderWithOauthProxyCookie(
        pushAppEndpoint,
        openshiftAdminUser,
        openshiftAdminPassword
      );
    });

    after("Delete UPS app", async function () {
      await axios({
        method: "DELETE",
        headers,
        url: `${pushAppEndpoint}/${pushApp.pushApplicationID}`,
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

    it("should successfully redeploy UPS", async () => {
      await triggerRedeploy([
        {
          resourceType: "deployment.extensions",
          resourceName: upsDcName,
          namespace: upsProjectName,
        },
      ]);
      await waitForPodsToBeDeleted(upsProjectName);
      await waitForPodsToBeReady(upsProjectName);
      await waitForApp(pushAppEndpoint, headers, 200);
    });

    it("previously created UPS app & variant should be still present after redeployment", async () => {
      const foundApp = await getPushApp(pushAppName);
      should.not.equal(
        foundApp,
        undefined,
        "Previously created app was not found"
      );
      const foundVariant = foundApp.variants.find(
        (v) => v.name === pushVariantName
      );
      should.not.equal(
        foundVariant,
        undefined,
        "Previously created variant was not found"
      );
    });

    const createPushApp = async (name) => {
      return (
        await axios({
          method: "POST",
          url: pushAppEndpoint,
          headers,
          data: { name },
        })
      ).data;
    };

    const createPushVariant = async (name, appId) => {
      return (
        await axios({
          method: "POST",
          url: `${pushAppEndpoint}/${appId}/android`,
          headers,
          data: {
            name,
            projectNumber: "test",
            googleKey: "test",
          },
        })
      ).data;
    };

    const getPushApp = async (pushAppName) => {
      return (
        await axios({
          method: "GET",
          headers,
          url: pushAppEndpoint,
        })
      ).data.find((app) => app.name === pushAppName);
    };
  });
});
