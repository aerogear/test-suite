#!/usr/bin/env node

const util = require("util");
const exec = util.promisify(require("child_process").exec);
const fs = require("fs");
const openshiftUser = process.env.OPENSHIFT_USERNAME;
const openshiftPassword = process.env.OPENSHIFT_PASSWORD;
const openshiftURL = process.env.OPENSHIFT_URL;

const {
  redeployShowcase,
  init,
  getNamespaces,
  resource,
  TYPE,
  ACTION,
  userLogin,
} = require("../../common/util/rhmds-api");
const { getOpenshiftAPItoken } = require("../../common/util/utils");

const appName = "device-test-suite";

(async () => {
  await init();
  let authProject = await getNamespaces("openshift-authentication");
  let authHostname = (
    await resource(TYPE.ROUTE, ACTION.GET_ALL, null, authProject)
  ).items
    .map((r) => r.spec.host)
    .find((url) => url.includes("oauth-openshift"));
  let authEndpoint = `https://${authHostname}/oauth/token/request`;
  let token = await getOpenshiftAPItoken(
    authEndpoint,
    openshiftUser,
    openshiftPassword
  );
  await userLogin(openshiftURL, token.token);
  const project = await redeployShowcase(appName);

  const output = await exec(
    `oc get routes -n ${project} | grep ionic-showcase-server | awk '{print $2}'`
  );

  fs.writeFileSync("sync-url.txt", output.stdout.trim());

  console.log("Setup successful");
})();
