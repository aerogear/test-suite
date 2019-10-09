const getCr = (appName, appUid, pushAppId, certificate, passphrase) => ({
  "apiVersion": "push.aerogear.org/v1alpha1",
  "kind": "IOSVariant",
  "metadata": {
    "name": `${appName}-ios-ups-variant`,
    "ownerReferences": [
      {
        "apiVersion": "mdc.aerogear.org/v1alpha1",
        "blockOwnerDeletion": false,
        "kind": "MobileClient",
        "name": appName,
        "uid": appUid
      }
    ]
  },
  "spec": {
    "description": "UPS iOS Variant",
    "certificate": certificate,
    "passphrase": passphrase,
    "production": false,
    "pushApplicationId": pushAppId
  }
});

module.exports = getCr;