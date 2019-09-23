const getKeycloakRealmCr = require('../templates/keycloak-realm');
const getMssAppCr = require('../templates/mss-app');
const getAndroidVariantCr = require('../templates/android-variant');
const getIosVariantCr = require('../templates/ios-variant');
const getSyncConfigMap = require('../templates/data-sync');

const bindKeycloak = async (client, appName, appUid) => {
  const cr = getKeycloakRealmCr(appName, appUid);

  return (await client
    .apis['aerogear.org']
    .v1alpha1
    .namespaces(process.env.MDC_NAMESPACE)
    .keycloakrealms
    .post({ body: cr })).body;
};

const unbindKeycloak = async (client, name) => {
  await client
    .apis['aerogear.org']
    .v1alpha1
    .namespaces(process.env.MDC_NAMESPACE)
    .keycloakrealms(name)
    .delete();
};

const bindMss = async (client, appName, appUid) => {
  const cr = getMssAppCr(appName, appUid);

  return (await client
    .apis['mobile-security-service.aerogear.org']
    .v1alpha1
    .namespaces(process.env.MDC_NAMESPACE)
    .mobilesecurityserviceapps
    .post({ body: cr })).body;
};

const unbindMss = async (client, name) => {
  await client
    .apis['mobile-security-service.aerogear.org']
    .v1alpha1
    .namespaces(process.env.MDC_NAMESPACE)
    .mobilesecurityserviceapps(name)
    .delete();
};

const bindPushAndroid = async (client, appName, appUid, pushAppId, serverKey) => {
  const variantCr = getAndroidVariantCr(appName, appUid, pushAppId, serverKey);

  return (await client
    .apis['push.aerogear.org']
    .v1alpha1
    .namespaces(process.env.MDC_NAMESPACE)
    .androidvariants
    .post({ body: variantCr })).body;
};

const unbindPushAndroid = async (client, name) => {
  await client
    .apis['push.aerogear.org']
    .v1alpha1
    .namespaces(process.env.MDC_NAMESPACE)
    .androidvariants(name)
    .delete();
};

const bindPushIos = async (client, appName, appUid, pushAppId, cert, pass) => {
  const variantCr = getIosVariantCr(appName, appUid, pushAppId, cert, pass);

  return (await client
    .apis['push.aerogear.org']
    .v1alpha1
    .namespaces(process.env.MDC_NAMESPACE)
    .iosvariants
    .post({ body: variantCr })).body;
};

const unbindPushIos = async (client, name) => {
  await client
    .apis['push.aerogear.org']
    .v1alpha1
    .namespaces(process.env.MDC_NAMESPACE)
    .iosvariants(name)
    .delete();
};

const bindSync = async (client, appName, appUid, syncUrl) => {
  const configMap = getSyncConfigMap(appName, appUid, syncUrl);

  return (await client.api.v1
    .namespaces(process.env.MDC_NAMESPACE)
    .configmaps
    .post({ body: configMap })).body;
};

const unbindSync = async (client, name) => {
  await client.api.v1
      .namespaces(process.env.MDC_NAMESPACE)
      .configmaps(name)
      .delete();
};

module.exports = {
  bindKeycloak,
  unbindKeycloak,
  bindMss,
  unbindMss,
  bindPushAndroid,
  unbindPushAndroid,
  bindPushIos,
  unbindPushIos,
  bindSync,
  unbindSync
};
