import axios from "axios";

import realmToImport = require("../fixtures/realm-export.json");

const config = {
  appRealmName: "integration",
  adminRealmName: "master",
  resource: "admin-cli",
  username: "admin",
  password: "admin",
  token: null,
  authServerUrl: null,
  testUser: "admin",
  testPass: "admin"
};

async function authenticateKeycloak(): Promise<string> {
  const res = await axios({
    method: "POST",
    url: `${config.authServerUrl}/realms/${config.adminRealmName}/protocol/openid-connect/token`,
    data: `client_id=${config.resource}&username=${config.username}&password=${config.password}&grant_type=password`
  });
  return `Bearer ${res.data["access_token"]}`;
}

async function importRealm(): Promise<void> {
  await axios({
    method: "POST",
    url: `${config.authServerUrl}/admin/realms`,
    data: realmToImport,
    headers: {
      Authorization: config.token,
      "Content-Type": "application/json"
    }
  });
}

async function createUser(name: string): Promise<void> {
  await axios({
    method: "post",
    url: `${config.authServerUrl}/admin/realms/${config.appRealmName}/users`,
    data: {
      username: name,
      credentials: [
        { type: "password", value: config.testPass, temporary: false }
      ],
      enabled: true
    },
    headers: {
      Authorization: config.token,
      "Content-Type": "application/json"
    }
  });
}

async function prepareKeycloak(authServerUrl: string): Promise<void> {
  config.authServerUrl = authServerUrl;
  config.token = await authenticateKeycloak();
  await importRealm();
  await createUser(config.testUser);
}

async function resetKeycloakConfiguration(): Promise<void> {
  await axios({
    method: "DELETE",
    url: `${config.authServerUrl}/admin/realms/${config.appRealmName}`,
    headers: { Authorization: config.token }
  });
}

export { prepareKeycloak, resetKeycloakConfiguration };
