const { init } = require("../../common/util/rhmds-api");

const name = "backend-test-suite";
process.env["APP_NAME"] = name;

before("redeploy showcase server", async function() {
  this.timeout(0);
  await init();
});
