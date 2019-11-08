import axios from "axios";
import { expect } from "chai";
import sender = require("unifiedpush-node-sender");
import {
  config as mobileServices,
  dockerCompose
} from "../../config/mobile-services";
import { device } from "../../util/device";

describe("Push", function() {
  this.timeout(0);

  // skip push tests in ios
  if (process.env.MOBILE_PLATFORM === "ios") {
    return;
  }

  let upsUrl;
  let pushApplicationID;
  let masterSecret;

  if (dockerCompose) {
    before("create ups application", async () => {
      const serverKey = process.env.FIREBASE_SERVER_KEY;
      const senderId = process.env.FIREBASE_SENDER_ID;

      if (serverKey === undefined || senderId == undefined) {
        throw new Error(
          "FIREBASE_SERVER_KEY and/or FIREBASE_SENDER_ID are not defined"
        );
      }

      const config = mobileServices.services.find(
        service => service.name === "push"
      );

      upsUrl = config.url;

      // set sender id in config
      config.config.android.senderId = senderId;

      // create test application
      const application = await axios({
        method: "post",
        url: `${upsUrl}/rest/applications`,
        data: {
          name: "test"
        }
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
          projectNumber: senderId
        }
      });

      // set variant and secret in config
      config.config.android.variantId = variant.data.variantID;
      config.config.android.variantSecret = variant.data.secret;
    });

    after("delete ups application", async () => {
      // delete test application
      await axios({
        method: "delete",
        url: `${upsUrl}/rest/applications/${pushApplicationID}`
      });
    });
  } else {
    before("get push app config", async () => {
      pushApplicationID = require("../../push-app.json").status.pushApplicationId;
      masterSecret = require("../../push-app.json").status.masterSecret;
    });
  }

  it("send and receive test notification", async () => {
    // register the app to the UPS server
    await device.execute(async (modules, universe, config) => {
      const { init } = modules["@aerogear/app"];
      const { PushRegistration } = modules["@aerogear/push"];

      const app = init(config);

      await new PushRegistration(app.config).register({ alias: "alias" });
    }, mobileServices);

    // start listening for notifications
    const message = device.execute(async modules => {
      const { PushRegistration } = modules["@aerogear/push"];

      return await new Promise(resolve => {
        PushRegistration.onMessageReceived(notification =>
          resolve(notification.message)
        );
      });
    });

    const config = mobileServices.services.find(
      service => service.name === "push"
    );

    upsUrl = config.url;

    // send test notification
    sender({
      url: upsUrl,
      applicationId: pushApplicationID,
      masterSecret
    }).then(client => {
      client.sender.send({ alert: "test" }, { criteria: { alias: ["alias"] } });
    });

    // wait for the notification
    expect(await message).to.equal("test");
  });

  it("should not receive notification if unregistered", async () => {
    // unregister from the UPS server
    await device.execute(async (modules, universe, config) => {
      const { init } = modules["@aerogear/app"];
      const { PushRegistration } = modules["@aerogear/push"];

      const app = init(config);

      await new PushRegistration(app.config).unregister();
    }, mobileServices);

    // start listening for notifications
    // fail if notification received
    // pass if no message received in 5s
    const messageTimeout = device.execute(async modules => {
      const { PushRegistration } = modules["@aerogear/push"];

      return await new Promise((resolve, reject) => {
        setTimeout(resolve, 5000);
        PushRegistration.onMessageReceived(notification =>
          reject(notification)
        );
      });
    });

    const config = mobileServices.services.find(
      service => service.name === "push"
    );

    upsUrl = config.url;

    // send test notification
    sender({
      url: upsUrl,
      applicationId: pushApplicationID,
      masterSecret
    }).then(client => {
      client.sender.send({ alert: "test" }, { criteria: { alias: ["alias"] } });
    });

    // wait for the notification timeout
    await messageTimeout;
  });
});
