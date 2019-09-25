require('chai').should();

const { initKubeClient } = require('../util/init');
const getMobileClientCr = require('../templates/mobile-client');
const {
  getMobileApp,
  bindKeycloak,
  bindMss,
  bindPushAndroid,
  bindPushIos,
  bindSync,
  createPushApp
} = require('../util/kubernetes');
const waitFor = require('../util/waitFor');

const TIMEOUT = 20000;

describe('App deletion', async function() {
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

  it('should create mobile app', async function() {
    const cr = getMobileClientCr('test');

    mobileApp = (await client
      .apis['mdc.aerogear.org']
      .v1alpha1
      .namespaces(process.env.MDC_NAMESPACE)
      .mobileclients
      .post({ body: cr })).body;
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
    pushApp = await createPushApp(client);
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

  it('should delete mobile app', async function() {
    await client
      .apis['mdc.aerogear.org']
      .v1alpha1
      .namespaces(process.env.MDC_NAMESPACE)
      .mobileclients(mobileApp.metadata.name)
      .delete();
  });

  it('should delete all binding CRs', async function() {
    await waitFor(async () => {
        try {
          await client
            .apis['aerogear.org']
            .v1alpha1
            .namespaces(process.env.MDC_NAMESPACE)
            .keycloakrealms(keycloakRealm.metadata.name)
            .get();
          return false;
        } catch (_) {
          return true;
        }
      }, TIMEOUT
    );

    await waitFor(async () => {
        try {
          await client
            .apis['mobile-security-service.aerogear.org']
            .v1alpha1
            .namespaces(process.env.MDC_NAMESPACE)
            .mobilesecurityserviceapps(mssApp.metadata.name)
            .get();
          return false;
        } catch (_) {
          return true;
        }
      }, TIMEOUT
    );

    await waitFor(async () => {
        try {
          await client
            .apis['push.aerogear.org']
            .v1alpha1
            .namespaces(process.env.MDC_NAMESPACE)
            .androidvariants(androidVariant.metadata.name)
            .get();
          return false;
        } catch (_) {
          return true;
        }
      }, TIMEOUT
    );
    
    await waitFor(async () => {
        try {
          await client
            .apis['push.aerogear.org']
            .v1alpha1
            .namespaces(process.env.MDC_NAMESPACE)
            .iosvariants(iosVariant.metadata.name)
            .get();
          return false;
        } catch (_) {
          return true;
        }
      }, TIMEOUT
    );

    await waitFor(async () => {
        try {
          await client.api.v1
            .namespaces(process.env.MDC_NAMESPACE)
            .configmaps(dataSync.metadata.name)
            .get();
          return false;
        } catch (_) {
          return true;
        }
      }, TIMEOUT
    );
  });
});
