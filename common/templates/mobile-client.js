const getCr = appName => ({
  apiVersion: "mdc.aerogear.org/v1alpha1",
  kind: "MobileClient",
  metadata: {
    name: appName
  },
  spec: {
    name: appName
  },
  status: {
    clientId: appName,
    namespace: "openshift-mobile-developer-console",
    services: []
  }
});

module.exports = getCr;
