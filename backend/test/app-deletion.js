require("chai").should();

const getMobileClientCr = require("../../common/templates/mobile-client");
const getKeycloakRealmCr = require("../../common/templates/keycloak-realm");
const getMssAppCr = require("../../common/templates/mss-app");
const getAndroidVariantCr = require("../../common/templates/android-variant");
const getIosVariantCr = require("../../common/templates/ios-variant");
const getSyncConfigMap = require("../../common/templates/data-sync");
const {
  init,
  TYPE,
  ACTION,
  resource,
  createPushApp
} = require("../../common/util/rhmds-api");
const { waitFor } = require("../../common/util/utils");

const TIMEOUT = 20000;

describe("App deletion", async function() {
  this.timeout(0);

  let mobileApp;
  let keycloakRealm;
  let mssApp;
  let pushApp;
  let androidVariant;
  let iosVariant;
  let dataSync;

  const checkResourcesDeleted = async (resourceType, res) => {
    await waitFor(async () => {
      try {
        await resource(resourceType, ACTION.GET, res.metadata.name);
        return false;
      } catch (_) {
        return true;
      }
    }, TIMEOUT);
  };

  before("init kube client", async function() {
    await init();
  });

  it("should create mobile app", async function() {
    const cr = getMobileClientCr(process.env["APP_NAME"]);
    mobileApp = await resource(TYPE.MOBILE_APP, ACTION.CREATE, cr);
  });

  it("should bind all services", async function() {
    let cr = getKeycloakRealmCr(
      mobileApp.metadata.name,
      mobileApp.metadata.uid
    );
    keycloakRealm = await resource(TYPE.KEYCLOAK_REALM, ACTION.CREATE, cr);

    cr = getMssAppCr(mobileApp.metadata.name, mobileApp.metadata.uid);
    mssApp = await resource(TYPE.MSS_APP, ACTION.CREATE, cr);

    pushApp = await createPushApp(mobileApp.metadata.name, mobileApp.metadata.uid);

    cr = getAndroidVariantCr(
      mobileApp.metadata.name,
      mobileApp.metadata.uid,
      pushApp.status.pushApplicationId,
      process.env.FIREBASE_SERVER_KEY
    );
    androidVariant = await resource(TYPE.ANDROID_VARIANT, ACTION.CREATE, cr);

    cr = getIosVariantCr(
      mobileApp.metadata.name,
      mobileApp.metadata.uid,
      pushApp.status.pushApplicationId,
      process.env.IOS_CERTIFICATE,
      process.env.IOS_PASSPHRASE
    );
    iosVariant = await resource(TYPE.IOS_VARIANT, ACTION.CREATE, cr);

    const res = getSyncConfigMap(
      mobileApp.metadata.name,
      mobileApp.metadata.uid,
      process.env.SYNC_URL
    );
    dataSync = await resource(TYPE.CONFIG_MAP, ACTION.CREATE, res);

    await waitFor(async () => {
      const app = await resource(
        TYPE.MOBILE_APP,
        ACTION.GET,
        mobileApp.metadata.name
      );
      if (app.status.services.length === 4) {
        const pushConfig = app.status.services.find(s => s.type === "push");
        return pushConfig && pushConfig.config.android && pushConfig.config.ios;
      }
    }, TIMEOUT);

    const app = await resource(
      TYPE.MOBILE_APP,
      ACTION.GET,
      mobileApp.metadata.name
    );

    app.status.services.length.should.equal(4);
    app.status.services.find(s => s.type === "keycloak").should.exist;
    app.status.services.find(s => s.type === "security").should.exist;
    const pushConfig = app.status.services.find(s => s.type === "push");
    pushConfig.should.exist;
    pushConfig.config.android.should.exist;
    pushConfig.config.ios.should.exist;
    app.status.services.find(s => s.type === "sync-app").should.exist;
  });

  it("should delete mobile app", async function() {
    await resource(TYPE.MOBILE_APP, ACTION.DELETE, mobileApp.metadata.name);
  });

  it("should delete all binding CRs", async function() {
    await checkResourcesDeleted(TYPE.KEYCLOAK_REALM, keycloakRealm);
    await checkResourcesDeleted(TYPE.MSS_APP, mssApp);
    await checkResourcesDeleted(TYPE.ANDROID_VARIANT, androidVariant);
    await checkResourcesDeleted(TYPE.IOS_VARIANT, iosVariant);
    await checkResourcesDeleted(TYPE.CONFIG_MAP, dataSync);
  });
});
