const getConfigMap = (appName, appUid, syncUrl) => ({
  apiVersion: "v1",
  data: {
    graphqlEndpoint: "/graphql",
    syncServerUrl: syncUrl
  },
  kind: "ConfigMap",
  metadata: {
    name: `${appName}-data-sync-binding`,
    ownerReferences: [
      {
        apiVersion: "mdc.aerogear.org/v1alpha1",
        blockOwnerDeletion: false,
        kind: "MobileClient",
        name: appName,
        uid: appUid
      }
    ]
  }
});

module.exports = getConfigMap;
