require("chai").should();
const axios = require("axios");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const {
  init,
  cleanupNamespaces,
  resource,
  TYPE,
  ACTION,
  newProject,
  deleteProject,
} = require("../../common/util/rhmds-api");
const { waitFor } = require("../../common/util/utils");

describe("Data Sync App deploy test", async function () {
  this.timeout(0);
  const projectPrefix = "backend-test-data-sync-app";
  const projectName = `${projectPrefix}-${Date.now()}`;
  let syncAppHostname;

  before("Initialize kube client", async () => {
    await init();
    await cleanupNamespaces(projectPrefix);
    await newProject(projectName);
  });

  after("Delete Data Sync App project", async () => {
    await deleteProject(projectName);
  });

  it("Data Sync App should successfully deploy", async () => {
    await exec(`oc new-app --template datasync-server-app -n ${projectName}`);
    await waitFor(
      async () => {
        const replicasReady = (
          await exec(
            `oc get dc -o jsonpath='{.items[*].status.readyReplicas}' -n ${projectName} | wc -w`
          )
        ).stdout.replace(/\s/g, "");
        console.log(
          `Waiting for Data Sync Server App to deploy: ${replicasReady}/1`
        );
        return replicasReady.includes("1");
      },
      200000,
      10000
    );
  });

  it("Data Sync App URL should return valid response", async () => {
    syncAppHostname = (
      await resource(TYPE.ROUTE, ACTION.GET_ALL, null, projectName)
    ).items
      .map((r) => r.spec.host)
      .find((url) => url.includes("data-sync-app"));
    const response = await axios.get(`http://${syncAppHostname}`);
    response.status.should.equal(200);
  });

  it("Data Sync App GraphQL endpoint should work and should respond to hello query", async () => {
    const response = await axios.post(`http://${syncAppHostname}/graphql`, {
      query: "query{hello}",
    });
    response.status.should.equal(200);
    response.data.should.be.an("object");
  });
});
