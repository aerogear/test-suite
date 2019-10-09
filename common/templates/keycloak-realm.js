const getCr = (appName, appUid) => ({
  "apiVersion": "aerogear.org/v1alpha1",
  "kind": "KeycloakRealm",
  "metadata": {
    "name": `${appName}-realm`,
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
    "clients": [
      {
        "bearerOnly": false,
        "clientAuthenticatorType": "client-secret",
        "clientId": `${appName}-client`,
        "enabled": true,
        "fullScopeAllowed": true,
        "name": `${appName}-client`,
        "nodeReRegistrationTimeout": -1,
        "outputSecret": `${appName}-client-install-config`,
        "publicClient": true,
        "redirectUris": [
          "http://localhost*"
        ],
        "standardFlowEnabled": true,
        "webOrigins": [
          "http://localhost:8100",
          "*"
        ]
      }
    ],
    "createOnly": true,
    "displayName": `Realm for mobile app ${appName}`,
    "enabled": true,
    "id": `${appName}-realm`,
    "realm": `${appName}-realm`,
    "users": [
      {
        "clientRoles": {
          "account": [
            "manage-account",
            "view-profile"
          ],
          "realm-management": [
            "realm-admin"
          ]
        },
        "emailVerified": false,
        "enabled": true,
        "firstName": "",
        "lastName": "",
        "outputSecret": `${appName}-admin-pass`,
        "password": "admin",
        "realmRoles": [
          "offline_access",
          "uma_authorization"
        ],
        "username": "admin"
      }
    ]
  }
});

module.exports = getCr;