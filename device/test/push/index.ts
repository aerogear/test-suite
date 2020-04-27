import axios from "axios";
import { expect } from "chai";
import sender = require("unifiedpush-node-sender");
import { device } from "../../util/device";

import { promisify } from "util";
import { exec as execAsync } from "child_process";
const exec = promisify(execAsync);

describe("Push", function () {
  this.timeout(0);

  // skip push tests in ios
  if (process.env.MOBILE_PLATFORM === "ios") {
    return;
  }

  let upsNamespace;
  let upsUrl;
  let upsConfigUrl;
  let pushApplicationID;
  let masterSecret;
  let upsConfig;

  if (process.env.DOCKER_COMPOSE !== "true") {
    before("expose ups", async () => {
      const output = await exec(
        "oc get projects | grep mobile-unifiedpush | awk '{print $1}'"
      );
      upsNamespace = output.stdout.trim();
      await exec(
        `oc expose service unifiedpush-unifiedpush -n ${upsNamespace}`
      );
      const routeOutput = await exec(
        `oc get routes -n ${upsNamespace} | grep web | awk '{print $2}'`
      );
      upsUrl = `http://${routeOutput.stdout.trim()}`;
      const routeProxyOutput = await exec(
        `oc get routes -n ${upsNamespace} | grep unifiedpush-unifiedpush-proxy | awk '{print $2}'`
      );
      upsConfigUrl = `https://${routeProxyOutput.stdout.trim()}`;
    });
  } else {
    upsUrl = process.env.UPS_URL;
    upsConfigUrl = upsUrl;
  }

  before("create ups application", async () => {
    const serverKey = process.env.FIREBASE_SERVER_KEY;
    const senderId = process.env.FIREBASE_SENDER_ID;

    if (serverKey === undefined || senderId == undefined) {
      throw new Error(
        "FIREBASE_SERVER_KEY and/or FIREBASE_SENDER_ID are not defined"
      );
    }

    upsConfig = {
      url: upsConfigUrl + "/",
      android: {
        senderID: senderId,
        variantID: null,
        variantSecret: null,
      },
    };

    // create test application
    const application = await axios({
      method: "post",
      url: `${upsUrl}/rest/applications`,
      data: {
        name: "test",
      },
    });
    pushApplicationID = application.data.pushApplicationID;
    masterSecret = application.data.masterSecret;

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
  });

  after("delete ups application", async () => {
    // delete test application
    await axios({
      method: "delete",
      url: `${upsUrl}/rest/applications/${pushApplicationID}`,
    });
  });

  if (process.env.DOCKER_COMPOSE !== "true") {
    after("delete exposed route", async () => {
      await exec(`oc delete route unifiedpush-unifiedpush -n ${upsNamespace}`);
    });
  }

  it("send and receive test notification", async () => {
    // register the app to the UPS server
    await device.execute(async (modules, universe, config) => {
      const { PushRegistration } = modules["@aerogear/push"];

      await new PushRegistration(config).register({ alias: "alias" });
    }, upsConfig);

    // start listening for notifications
    const message = device.execute(async (modules) => {
      const { PushRegistration } = modules["@aerogear/push"];

      return await new Promise((resolve) => {
        PushRegistration.onMessageReceived((notification) =>
          resolve(notification.message)
        );
      });
    });

    // send test notification
    sender({
      url: upsUrl,
      applicationId: pushApplicationID,
      masterSecret,
    }).then((client) => {
      client.sender.send({ alert: "test" }, { criteria: { alias: ["alias"] } });
    });

    // wait for the notification
    expect(await message).to.equal("test");
  });

  it("should not receive notification if unregistered", async () => {
    // unregister from the UPS server
    await device.execute(async (modules, universe, config) => {
      const { PushRegistration } = modules["@aerogear/push"];

      await new PushRegistration(config).unregister();
    }, upsConfig);

    // start listening for notifications
    // fail if notification received
    // pass if no message received in 5s
    const messageTimeout = device.execute(async (modules) => {
      const { PushRegistration } = modules["@aerogear/push"];

      return await new Promise((resolve, reject) => {
        setTimeout(resolve, 5000);
        PushRegistration.onMessageReceived((notification) =>
          reject(notification)
        );
      });
    });

    // send test notification
    sender({
      url: upsUrl,
      applicationId: pushApplicationID,
      masterSecret,
    }).then((client) => {
      client.sender.send({ alert: "test" }, { criteria: { alias: ["alias"] } });
    });

    // wait for the notification timeout
    await messageTimeout;
  });
});
