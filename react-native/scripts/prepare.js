#!/usr/bin/env node

const axios = require("axios");

const util = require("util");
const exec = util.promisify(require("child_process").exec);
const fs = require("fs");

(async () => {
  const project = "redhat-rhmi-ups";

  const routeOutput = await exec(
    `oc get routes -n ${project} | grep push | awk '{print $2}'`
  );

  let upsUrl = `http://${routeOutput.stdout.trim()}`;

  const serverKey = process.env.FIREBASE_SERVER_KEY;
  const senderId = process.env.FIREBASE_SENDER_ID;

  if (serverKey === undefined || senderId == undefined) {
    throw new Error(
      "FIREBASE_SERVER_KEY and/or FIREBASE_SENDER_ID are not defined"
    );
  }

  let upsConfig = {
    pushServerURL: upsUrl,
    android: {
      senderID: senderId,
      variantID: null,
      variantSecret: null,
    },
  };

  // delete any leftover test applications

  const response = await axios({
    method: "GET",
    url: `${upsUrl}/rest/applications`,
  });

  let applications = response.data.filter((app) => app.name === "test");

  applications.forEach(async (element) => {
    await axios({
      method: "delete",
      url: `${upsUrl}/rest/applications/${element.pushApplicationID}`,
    });
    console.log("delete app: " + element.pushApplicationID);
  });

  // create test application
  const application = await axios({
    method: "post",
    url: `${upsUrl}/rest/applications`,
    data: {
      name: "test",
    },
  });
  let pushApplicationID = application.data.pushApplicationID;

  // create android variant
  const variant = await axios({
    method: "post",
    url: `${upsUrl}/rest/applications/${pushApplicationID}/android`,
    data: {
      name: "android",
      googleKey: serverKey,
      projectNumber: senderId,
    },
  });

  // set variant and secret in config
  upsConfig.android.variantID = variant.data.variantID;
  upsConfig.android.variantSecret = variant.data.secret;

  fs.writeFileSync("./fixtures/push-config.json", JSON.stringify(upsConfig));

  console.log("Setup successful");
})();
