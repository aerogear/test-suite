const getCr = (appName, appUid) => ({
  apiVersion: "push.aerogear.org/v1alpha1",
  kind: "PushApplication",
  metadata: {
    name: appName,
    ownerReferences: [
      {
        apiVersion: "mdc.aerogear.org/v1alpha1",
        blockOwnerDeletion: false,
        kind: "MobileClient",
        name: appName,
        uid: appUid
      }
    ]
  },
  spec: {
    description: "MDC Push Application"
  }
});

module.exports = getCr;
