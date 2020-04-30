import { AeroGearConfiguration } from "@aerogear/core";

const syncUrl = `${process.env.SYNC_HOST}:${process.env.SYNC_PORT}/graphql`;
const upsUrl = `http://${process.env.UPS_HOST}:${process.env.UPS_PORT}`;

let mobileServices;

export const dockerCompose = process.env.DOCKER_COMPOSE;

export const config: AeroGearConfiguration = mobileServices || {
  clientId: "test",
  namespace: "openshift-mobile-developer-console",
  testType: "docker-compose",
  services: [
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
