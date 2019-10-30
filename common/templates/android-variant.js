const getCr = (appName, appUid, pushAppId, firebaseServerKey) => ({
  apiVersion: "push.aerogear.org/v1alpha1",
  kind: "AndroidVariant",
  metadata: {
    name: `${appName}-android-ups-variant`,
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
    description: "UPS Android Variant",
    pushApplicationId: pushAppId,
    senderId: "",
    serverKey: firebaseServerKey
  }
});

module.exports = getCr;
