import { AeroGearConfiguration } from "@aerogear/core";
import * as fs from 'fs';
import * as path from 'path';

const keycloakUrl = `http://${process.env.KEYCLOAK_HOST}:${process.env.KEYCLOAK_PORT}/auth`;
const syncUrl = `${process.env.SYNC_HOST}:${process.env.SYNC_PORT}/graphql`;
const metricsUrl = `http://${process.env.METRICS_HOST}:${process.env.METRICS_PORT}/metrics`;
const upsUrl = `http://${process.env.UPS_HOST}:${process.env.UPS_PORT}`;

let mobileServices;
let dockerComposeConfig = true;

if (fs.existsSync(path.resolve(__dirname, '../mobile-services.json'))) {
    mobileServices = require('../mobile-services.json');
    dockerComposeConfig = false;
}

export const dockerCompose = dockerComposeConfig;

export const config: AeroGearConfiguration = mobileServices || {
    clientId: "test",
    namespace: "openshift-mobile-developer-console",
    testType: "docker-compose",
    services: [
        {
            id: "be432368-44b1-4e3a-9750-5ac43c9fcd78",
            name: "keycloak",
            type: "keycloak",
            url: keycloakUrl,
            config: {
                realm: "integration",
                "auth-server-url": keycloakUrl,
                "ssl-required": "none",
                resource: "cordova-testing-app",
                "public-client": true,
                "confidential-port": 0,
            },
        },
        {
            id: "81f67bae-7d40-11e9-afde-06799ee5f0b0",
            name: "sync-app",
            type: "sync-app",
            url: `http://${syncUrl}`,
            config: {
                websocketUrl: `ws://${syncUrl}`,
            },
        },
        {
            id: "d3776cbe-7c83-11e9-afde-06799ee5f0b0",
            name: "metrics",
            type: "metrics",
            url: metricsUrl,
            config: {},
        },
        {
            id: "fb8ebb60-83b1-11e9-9805-e86a640057de",
            name: "push",
            type: "push",
            url: upsUrl,
            config: {
                android: {
                    senderId: null,
                    variantId: null,
                    variantSecret: null,
                },
            },
        },
    ],
};
