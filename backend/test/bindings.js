require('chai').should();

const { initKubeClient } = require('../util/init');
const getMobileClientCr = require('../templates/mobile-client');
const {
  getMobileApp,
  bindKeycloak,
  unbindKeycloak,
  bindMss,
  unbindMss,
  bindPushAndroid,
  unbindPushAndroid,
  bindPushIos,
  unbindPushIos,
  bindSync,
  unbindSync,
  createPushApp
} = require('../util/kubernetes');
const waitFor = require('../util/waitFor');

const TIMEOUT = 20000;

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

  before('init kube client', async function() {
    client = await initKubeClient();
  });

  after('delete mobile app', async function() {
    await client
      .apis['mdc.aerogear.org']
      .v1alpha1
      .namespaces(process.env.MDC_NAMESPACE)
      .mobileclients(mobileApp.metadata.name)
      .delete();
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
    keycloakRealm = await bindKeycloak(
      client,
      mobileApp.metadata.name,
      mobileApp.metadata.uid
    );

    await waitFor(async () =>
      (await getMobileApp(client, mobileApp.metadata.name)).status.services.length === 1,
      TIMEOUT
    );

    const app = await getMobileApp(client, mobileApp.metadata.name);

    app.status.services.length.should.equal(1);
    app.status.services[0].type.should.equal('keycloak');
  });

  it('should delete keycloak binding', async function() {
    await unbindKeycloak(client, keycloakRealm.metadata.name);

    await waitFor(async () =>
      (await getMobileApp(client, mobileApp.metadata.name)).status.services.length === 0,
      TIMEOUT
    );

    const app = await getMobileApp(client, mobileApp.metadata.name);

    app.status.services.length.should.equal(0);
  });

  it('should create mss binding', async function() {
    mssApp = await bindMss(
      client,
      mobileApp.metadata.name,
      mobileApp.metadata.uid
    );

    await waitFor(async () =>
      (await getMobileApp(client, mobileApp.metadata.name)).status.services.length === 1,
      TIMEOUT
    );

    const app = await getMobileApp(client, mobileApp.metadata.name);

    app.status.services.length.should.equal(1);
    app.status.services[0].type.should.equal('security');
  });

  it('should delete mss binding', async function() {
    await unbindMss(client, mssApp.metadata.name);

    await waitFor(async () =>
      (await getMobileApp(client, mobileApp.metadata.name)).status.services.length === 0,
      TIMEOUT
    );

    const app = await getMobileApp(client, mobileApp.metadata.name);

    app.status.services.length.should.equal(0);
  });

  it('should create push app', async function() {
    pushApp = await createPushApp(client);
  });

  it('should create push android binding', async function() {
    androidVariant = await bindPushAndroid(
      client,
      mobileApp.metadata.name,
      mobileApp.metadata.uid,
      pushApp.status.pushApplicationId,
      process.env.FIREBASE_SERVER_KEY
    );

    await waitFor(async () =>
      (await getMobileApp(client, mobileApp.metadata.name)).status.services.length === 1,
      TIMEOUT
    );

    const app = await getMobileApp(client, mobileApp.metadata.name);

    app.status.services.length.should.equal(1);
    app.status.services[0].type.should.equal('push');
  });

  it('should delete push android binding', async function() {
    await unbindPushAndroid(client, androidVariant.metadata.name);

    await waitFor(async () =>
      (await getMobileApp(client, mobileApp.metadata.name)).status.services.length === 0,
      TIMEOUT
    );

    const app = await getMobileApp(client, mobileApp.metadata.name);

    app.status.services.length.should.equal(0);
  });

  it('should create push ios binding', async function() {
    iosVariant = await bindPushIos(
      client,
      mobileApp.metadata.name,
      mobileApp.metadata.uid,
      pushApp.status.pushApplicationId,
      process.env.IOS_CERTIFICATE,
      process.env.IOS_PASSPHRASE
    );

    await waitFor(async () =>
      (await getMobileApp(client, mobileApp.metadata.name)).status.services.length === 1,
      TIMEOUT
    );

    const app = await getMobileApp(client, mobileApp.metadata.name);

    app.status.services.length.should.equal(1);
    app.status.services[0].type.should.equal('push');
  });

  it('should delete push ios binding', async function() {
    await unbindPushIos(client, iosVariant.metadata.name);

    await waitFor(async () =>
      (await getMobileApp(client, mobileApp.metadata.name)).status.services.length === 0,
      TIMEOUT
    );

    const app = await getMobileApp(client, mobileApp.metadata.name);

    app.status.services.length.should.equal(0);
  });

  it('should create sync binding', async function() {
    dataSync = await bindSync(
      client,
      mobileApp.metadata.name,
      mobileApp.metadata.uid,
      process.env.SYNC_URL
    );

    await waitFor(async () =>
      (await getMobileApp(client, mobileApp.metadata.name)).status.services.length === 1,
      TIMEOUT
    );

    const app = await getMobileApp(client, mobileApp.metadata.name);

    app.status.services.length.should.equal(1);
    app.status.services[0].type.should.equal('sync-app');
  });

  it('should delete sync binding', async function() {
    await unbindSync(client, dataSync.metadata.name);

    await waitFor(async () =>
      (await getMobileApp(client, mobileApp.metadata.name)).status.services.length === 0,
      TIMEOUT
    );

    const app = await getMobileApp(client, mobileApp.metadata.name);

    app.status.services.length.should.equal(0);
  });

  it('should bind all services', async function() {
    keycloakRealm = await bindKeycloak(
      client,
      mobileApp.metadata.name,
      mobileApp.metadata.uid
    );
    mssApp = await bindMss(
      client,
      mobileApp.metadata.name,
      mobileApp.metadata.uid
    );
    androidVariant = await bindPushAndroid(
      client,
      mobileApp.metadata.name,
      mobileApp.metadata.uid,
      pushApp.status.pushApplicationId,
      process.env.FIREBASE_SERVER_KEY
    );
    iosVariant = await bindPushIos(
      client,
      mobileApp.metadata.name,
      mobileApp.metadata.uid,
      pushApp.status.pushApplicationId,
      process.env.IOS_CERTIFICATE,
      process.env.IOS_PASSPHRASE
    );
    dataSync = await bindSync(
      client,
      mobileApp.metadata.name,
      mobileApp.metadata.uid,
      process.env.SYNC_URL
    );

    await waitFor(async () => {
        const app = await getMobileApp(client, mobileApp.metadata.name);
        if (app.status.services.length === 4) {
          const pushConfig = app.status.services.find(s => s.type === 'push');
          return pushConfig && pushConfig.config.android && pushConfig.config.ios;
        }
      },
      TIMEOUT
    );

    const app = await getMobileApp(client, mobileApp.metadata.name);

    app.status.services.length.should.equal(4);
    app.status.services.find(s => s.type === 'keycloak').should.exist;
    app.status.services.find(s => s.type === 'security').should.exist;
    const pushConfig = app.status.services.find(s => s.type === 'push');
    pushConfig.should.exist;
    pushConfig.config.android.should.exist;
    pushConfig.config.ios.should.exist;
    app.status.services.find(s => s.type === 'sync-app').should.exist;
  });

  it('should unbind all services', async function() {
    await unbindKeycloak(client, keycloakRealm.metadata.name);
    await unbindMss(client, mssApp.metadata.name);
    await unbindPushAndroid(client, androidVariant.metadata.name);
    await unbindPushIos(client, iosVariant.metadata.name);
    await unbindSync(client, dataSync.metadata.name);

    await waitFor(async () =>
      (await getMobileApp(client, mobileApp.metadata.name)).status.services.length === 0,
      TIMEOUT
    );

    const app = await getMobileApp(client, mobileApp.metadata.name);

    app.status.services.length.should.equal(0);
  });
});