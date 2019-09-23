require('chai').should();

const { initKubeClient } = require('../util/init');
const getMobileClientCr = require('../templates/mobile-client');
const getKeycloakRealmCr = require('../templates/keycloak-realm');
const getMssAppCr = require('../templates/mss-app');
const getPushAppCr = require('../templates/push-app');
const getAndroidVariantCr = require('../templates/android-variant');
const getIosVariantCr = require('../templates/ios-variant');
const getSyncConfigMap = require('../templates/data-sync');

const SLEEP_MS = 10000;

describe('Bindings', async function() {
  this.timeout(0);

  let client;
  let mobileApp;
  let keycloakRealm;
  let mssApp;
  let pushApp;
  let androidVariant;
  let iosVariant;
  let dataSync;

  const getMobileApp = async () => {
    return (await client
      .apis['mdc.aerogear.org']
      .v1alpha1
      .namespaces(process.env.MDC_NAMESPACE)
      .mobileclients(mobileApp.metadata.name)
      .get()).body;
  };

  before('init kube client', async function() {
    client = await initKubeClient();
  });

  it('should create mobile app', async function() {
    const cr = getMobileClientCr('test');

    mobileApp = (await client
      .apis['mdc.aerogear.org']
      .v1alpha1
      .namespaces(process.env.MDC_NAMESPACE)
      .mobileclients
      .post({ body: cr })).body;
  });

  it('should create keycloak binding', async function() {
    const cr = getKeycloakRealmCr(mobileApp.metadata.name, mobileApp.metadata.uid);

    keycloakRealm = (await client
      .apis['aerogear.org']
      .v1alpha1
      .namespaces(process.env.MDC_NAMESPACE)
      .keycloakrealms
      .post({ body: cr })).body;

    await new Promise(resolve => setTimeout(resolve, SLEEP_MS));

    const app = await getMobileApp();

    app.status.services.length.should.equal(1);
    app.status.services[0].type.should.equal('keycloak');
  });

  it('should delete keycloak binding', async function() {
    await client
      .apis['aerogear.org']
      .v1alpha1
      .namespaces(process.env.MDC_NAMESPACE)
      .keycloakrealms(keycloakRealm.metadata.name)
      .delete();

    await new Promise(resolve => setTimeout(resolve, SLEEP_MS));

    const app = await getMobileApp();

    app.status.services.length.should.equal(0);
  });

  it('should create mss binding', async function() {
    const cr = getMssAppCr(mobileApp.metadata.name, mobileApp.metadata.uid);

    mssApp = (await client
      .apis['mobile-security-service.aerogear.org']
      .v1alpha1
      .namespaces(process.env.MDC_NAMESPACE)
      .mobilesecurityserviceapps
      .post({ body: cr })).body;

    await new Promise(resolve => setTimeout(resolve, SLEEP_MS));

    const app = await getMobileApp();

    app.status.services.length.should.equal(1);
    app.status.services[0].type.should.equal('security');
  });

  it('should delete mss binding', async function() {
    await client
      .apis['mobile-security-service.aerogear.org']
      .v1alpha1
      .namespaces(process.env.MDC_NAMESPACE)
      .mobilesecurityserviceapps(mssApp.metadata.name)
      .delete();

    await new Promise(resolve => setTimeout(resolve, SLEEP_MS));

    const app = await getMobileApp();

    app.status.services.length.should.equal(0);
  });

  it('should create push app', async function() {
    const pushAppCr = getPushAppCr('test');

    pushApp = (await client
      .apis['push.aerogear.org']
      .v1alpha1
      .namespaces(process.env.MDC_NAMESPACE)
      .pushapplications
      .post({ body: pushAppCr })).body;

    await new Promise(resolve => setTimeout(resolve, SLEEP_MS));

    pushApp = (await client
      .apis['push.aerogear.org']
      .v1alpha1
      .namespaces(process.env.MDC_NAMESPACE)
      .pushapplications(pushApp.metadata.name)
      .get()).body;
  });

  it('should create push android binding', async function() {
    const variantCr = getAndroidVariantCr(
      mobileApp.metadata.name,
      mobileApp.metadata.uid,
      pushApp.status.pushApplicationId,
      process.env.FIREBASE_SERVER_KEY
    );

    androidVariant = (await client
      .apis['push.aerogear.org']
      .v1alpha1
      .namespaces(process.env.MDC_NAMESPACE)
      .androidvariants
      .post({ body: variantCr })).body;

    await new Promise(resolve => setTimeout(resolve, SLEEP_MS));

    const app = await getMobileApp();

    app.status.services.length.should.equal(1);
    app.status.services[0].type.should.equal('push');
  });

  it('should delete push android binding', async function() {
    await client
      .apis['push.aerogear.org']
      .v1alpha1
      .namespaces(process.env.MDC_NAMESPACE)
      .androidvariants(androidVariant.metadata.name)
      .delete();

    await new Promise(resolve => setTimeout(resolve, SLEEP_MS));

    const app = await getMobileApp();

    app.status.services.length.should.equal(0);
  });

  it('should create push ios binding', async function() {
    const variantCr = getIosVariantCr(
      mobileApp.metadata.name,
      mobileApp.metadata.uid,
      pushApp.status.pushApplicationId,
      process.env.IOS_CERTIFICATE,
      process.env.IOS_PASSPHRASE
    );

    iosVariant = (await client
      .apis['push.aerogear.org']
      .v1alpha1
      .namespaces(process.env.MDC_NAMESPACE)
      .iosvariants
      .post({ body: variantCr })).body;

    await new Promise(resolve => setTimeout(resolve, SLEEP_MS));

    const app = await getMobileApp();

    app.status.services.length.should.equal(1);
    app.status.services[0].type.should.equal('push');
  });

  it('should delete push ios binding', async function() {
    await client
      .apis['push.aerogear.org']
      .v1alpha1
      .namespaces(process.env.MDC_NAMESPACE)
      .iosvariants(iosVariant.metadata.name)
      .delete();

    await new Promise(resolve => setTimeout(resolve, SLEEP_MS));

    const app = await getMobileApp();

    app.status.services.length.should.equal(0);
  });

  it('should create sync binding', async function() {
    const configMap = getSyncConfigMap(
      mobileApp.metadata.name,
      mobileApp.metadata.uid,
      process.env.SYNC_URL
    );

    dataSync = (await client.api.v1
      .namespaces(process.env.MDC_NAMESPACE)
      .configmaps
      .post({ body: configMap })).body;

    await new Promise(resolve => setTimeout(resolve, SLEEP_MS));

    const app = await getMobileApp();

    app.status.services.length.should.equal(1);
    app.status.services[0].type.should.equal('sync-app');
  });

  it('should delete sync binding', async function() {
    await client.api.v1
      .namespaces(process.env.MDC_NAMESPACE)
      .configmaps(dataSync.metadata.name)
      .delete();

    await new Promise(resolve => setTimeout(resolve, SLEEP_MS));

    const app = await getMobileApp();

    app.status.services.length.should.equal(0);
  });
});