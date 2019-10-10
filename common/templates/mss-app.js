const getCr = (appName, appUid) => ({
  "apiVersion": "mobile-security-service.aerogear.org/v1alpha1",
  "kind": "MobileSecurityServiceApp",
  "metadata": {
    "name": `${appName}-security`,
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
    "appId": "org.aerogear.integrationtests",
    "appName": appName
  }
});

module.exports = getCr;