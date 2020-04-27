import { device } from "./device";

interface Universe {
  app: string;
}

before("Initialize appium", async function () {
  this.timeout(0);

  // wait for the device to be initialized
  await device.init();
});

before("Wait for cordova device ready", async function () {
  this.timeout(0);

  await device.execute(async () => {
    await new Promise((resolve) => {
      document.addEventListener("deviceready", resolve, false);
    });
  });
});

after("Close appium session", async () => {
  await device.close();
});

export { Universe as GlobalUniverse };
