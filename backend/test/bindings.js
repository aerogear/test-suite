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

const TIMEOUT = 60000;

describe("Bindings", async function() {
  this.timeout(0);

  let mobileApp;
  let keycloakRealm;
  let mssApp;
  let pushApp;
  let androidVariant;
  let iosVariant;
  let dataSync;

  const getUpdatedServices = async expectedNumServices => {
    await waitFor(
      async () =>
        (await resource(TYPE.MOBILE_APP, ACTION.GET, mobileApp.metadata.name))
          .status.services.length === expectedNumServices,
      TIMEOUT
    );

    const app = await resource(
      TYPE.MOBILE_APP,
      ACTION.GET,
      mobileApp.metadata.name
    );

    return app.status.services;
  };

  before("init kube client", async function() {
    await init();
  });

  after("delete mobile app", async function() {
    await resource(TYPE.MOBILE_APP, ACTION.DELETE, mobileApp.metadata.name);
  });

  it("should create mobile app", async function() {
    const cr = getMobileClientCr(process.env["APP_NAME"]);
    mobileApp = await resource(TYPE.MOBILE_APP, ACTION.CREATE, cr);
  });

  it("should create keycloak binding", async function() {
    const cr = getKeycloakRealmCr(
      mobileApp.metadata.name,
      mobileApp.metadata.uid
    );
    keycloakRealm = await resource(TYPE.KEYCLOAK_REALM, ACTION.CREATE, cr);

    const services = await getUpdatedServices(1);

    services.length.should.equal(1);
    services[0].type.should.equal("keycloak");
  });

  it("should delete keycloak binding", async function() {
    await resource(
      TYPE.KEYCLOAK_REALM,
      ACTION.DELETE,
      keycloakRealm.metadata.name
    );

    const services = await getUpdatedServices(0);

    services.length.should.equal(0);
  });

  it("should create mss binding", async function() {
    const cr = getMssAppCr(mobileApp.metadata.name, mobileApp.metadata.uid);
    mssApp = await resource(TYPE.MSS_APP, ACTION.CREATE, cr);

    const services = await getUpdatedServices(1);

    services.length.should.equal(1);
    services[0].type.should.equal("security");
  });

  it("should delete mss binding", async function() {
    await resource(TYPE.MSS_APP, ACTION.DELETE, mssApp.metadata.name);

    const services = await getUpdatedServices(0);

    services.length.should.equal(0);
  });

  it("should create push app", async function() {
    pushApp = await createPushApp(
      mobileApp.metadata.name,
      mobileApp.metadata.uid
    );
  });

  it("should create push android binding", async function() {
    const cr = getAndroidVariantCr(
      mobileApp.metadata.name,
      mobileApp.metadata.uid,
      pushApp.status.pushApplicationId,
      process.env.FIREBASE_SERVER_KEY
    );
    androidVariant = await resource(TYPE.ANDROID_VARIANT, ACTION.CREATE, cr);

    const services = await getUpdatedServices(1);

    services.length.should.equal(1);
    services[0].type.should.equal("push");
  });

  it("should delete push android binding", async function() {
    await resource(
      TYPE.ANDROID_VARIANT,
      ACTION.DELETE,
      androidVariant.metadata.name
    );

    const services = await getUpdatedServices(0);

    services.length.should.equal(0);
  });

  it("should create push ios binding", async function() {
    const cr = getIosVariantCr(
      mobileApp.metadata.name,
      mobileApp.metadata.uid,
      pushApp.status.pushApplicationId,
      process.env.IOS_CERTIFICATE,
      process.env.IOS_PASSPHRASE
    );
    iosVariant = await resource(TYPE.IOS_VARIANT, ACTION.CREATE, cr);

    const services = await getUpdatedServices(1);

    services.length.should.equal(1);
    services[0].type.should.equal("push");
  });

  it("should delete push ios binding", async function() {
    await resource(TYPE.IOS_VARIANT, ACTION.DELETE, iosVariant.metadata.name);

    const services = await getUpdatedServices(0);

    services.length.should.equal(0);
  });

  it("should create sync binding", async function() {
    const res = getSyncConfigMap(
      mobileApp.metadata.name,
      mobileApp.metadata.uid,
      process.env.SYNC_URL
    );
    dataSync = await resource(TYPE.CONFIG_MAP, ACTION.CREATE, res);

    const services = await getUpdatedServices(1);

    services.length.should.equal(1);
    services[0].type.should.equal("sync-app");
  });

  it("should delete sync binding", async function() {
    await resource(TYPE.CONFIG_MAP, ACTION.DELETE, dataSync.metadata.name);

    const services = await getUpdatedServices(0);

    services.length.should.equal(0);
  });

  it("should bind all services", async function() {
    let cr = getKeycloakRealmCr(
      mobileApp.metadata.name,
      mobileApp.metadata.uid
    );
    keycloakRealm = await resource(TYPE.KEYCLOAK_REALM, ACTION.CREATE, cr);

    cr = getMssAppCr(mobileApp.metadata.name, mobileApp.metadata.uid);
    mssApp = await resource(TYPE.MSS_APP, ACTION.CREATE, cr);

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

  it("should unbind all services", async function() {
    await resource(
      TYPE.KEYCLOAK_REALM,
      ACTION.DELETE,
      keycloakRealm.metadata.name
    );
    await resource(TYPE.MSS_APP, ACTION.DELETE, mssApp.metadata.name);
    await resource(
      TYPE.ANDROID_VARIANT,
      ACTION.DELETE,
      androidVariant.metadata.name
    );
    await resource(TYPE.IOS_VARIANT, ACTION.DELETE, iosVariant.metadata.name);
    await resource(TYPE.CONFIG_MAP, ACTION.DELETE, dataSync.metadata.name);

    const services = await getUpdatedServices(0);

    services.length.should.equal(0);
  });
});
