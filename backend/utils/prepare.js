const {
  init,
  redeployShowcase,
  resource,
  TYPE,
  ACTION
} = require("../../common/util/rhmds-api");

const name = "backend-test-suite";
process.env["APP_NAME"] = name;

before("redeploy showcase server", async function() {
  this.timeout(0);
  await init();
  await resource(TYPE.MOBILE_APP, ACTION.DELETE, name).catch(() => {});
  const namespace = await redeployShowcase(name);
  const routes = await resource(TYPE.ROUTE, ACTION.GET_ALL, null, namespace);
  process.env["SYNC_URL"] = `https://${routes.items[0].spec.host}`;
});
