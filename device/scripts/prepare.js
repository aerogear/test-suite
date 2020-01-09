#!/usr/bin/env node

const util = require("util");
const exec = util.promisify(require("child_process").exec);
const fs = require("fs");

const { redeployShowcase, init } = require("../../common/util/rhmds-api");

const appName = "device-test-suite";

(async () => {
  await init();

  const project = await redeployShowcase(appName);

  const output = await exec(
    `oc get routes -n ${project} | grep ionic-showcase-server | awk '{print $2}'`
  );

  fs.writeFileSync("sync-url.txt", output.stdout.trim());

  console.log("Setup successful");
})();
