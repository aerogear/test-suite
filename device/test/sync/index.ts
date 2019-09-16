import chai = require("chai");
chai.should();

import { ApolloOfflineClient } from "@aerogear/voyager-client";
import { CordovaNetworkStatus } from "@aerogear/voyager-client";
import { ToggleNetworkStatus } from "../../fixtures/ToggleNetworkStatus";
import { device } from "../../util/device";
import { GlobalUniverse } from "../../util/init";
import { setNetwork } from "../../util/network";

interface Universe extends GlobalUniverse {
    networkStatus: ToggleNetworkStatus | CordovaNetworkStatus;
    itemsQuery: any;
    apolloClient: ApolloOfflineClient;
    offlineChangePromise: Promise<any>;
}

describe("Data Sync", function() {
    this.timeout(0);

    let numItems;

    it("should initialize voyager client", async () => {
        await device.execute(async (modules, universe: Universe, platform) => {
            const {
                OfflineClient,
                CordovaNetworkStatus,
                CacheOperation,
                getUpdateFunction,
            } = modules["@aerogear/voyager-client"];
            const { gql } = modules["graphql-tag"];
            const { ToggleNetworkStatus } = modules["./ToggleNetworkStatus"];

            const { app } = universe;

            let networkStatus;

            if (platform === "ios") {
                // this is workaround for iOS as BrowserStack does not support
                // putting iOS devices offline
                networkStatus = new ToggleNetworkStatus();
            } else {
                networkStatus = new CordovaNetworkStatus();
            }

            universe.networkStatus = networkStatus;

            const itemsQuery = gql(`
                query allTasks {
                    allTasks {
                        id
                        title
                    }
                }
            `);
            universe.itemsQuery = itemsQuery;

            const cacheUpdates = {
                createTask: getUpdateFunction({
                    mutationName: "createTask",
                    idField: "id",
                    operationType: CacheOperation.ADD,
                    updateQuery: itemsQuery,
                }),
            };

            const options = {
                openShiftConfig: app.config,
                networkStatus,
                mutationCacheUpdates: cacheUpdates,
            };

            const offlineClient = new OfflineClient(options);

            const apolloClient = await offlineClient.init();

            universe.apolloClient = apolloClient;
        }, process.env.MOBILE_PLATFORM);
    });

    it("should perform query", async () => {
        const result = await device.execute(async (_, universe: Universe) => {
            const { apolloClient, itemsQuery } = universe;

            const { data } = await apolloClient.query({
                query: itemsQuery,
                fetchPolicy: "network-only",
                errorPolicy: "none",
            });

            return { data: data.allTasks };
        });

        numItems = result.data.length;
    });

    it("should perform offline mutation", async () => {
        if (process.env.MOBILE_PLATFORM === "ios") {
            await device.execute(async (_, universe: Universe) => {
                const { networkStatus } = universe;
                (networkStatus as ToggleNetworkStatus).setOnline(false);
            });
        } else {
            await setNetwork("no-network");
        }

        await new Promise(resolve => setTimeout(resolve, 5000));

        await device.execute(async (modules, universe: Universe) => {
            try {
                const { gql } = modules["graphql-tag"];
                const { apolloClient, itemsQuery } = universe;

                await apolloClient.offlineMutate({
                    mutation: gql(`
                        mutation createTask($title: String!, $description: String!) {
                            createTask(title: $title, description: $description) {
                                id
                                title
                            }
                        }
                    `),
                    variables: { title: "test", description: "test" },
                    updateQuery: itemsQuery,
                    returnType: "Task",
                });
            } catch (error) {
                if (error.networkError && error.networkError.offline) {
                    const offlineError = error.networkError;
                    universe.offlineChangePromise = offlineError.watchOfflineChange();
                    return;
                }

                throw error;
            }

            throw new Error("network error offline was not thrown");
        });
    });

    it("should see updated cache", async () => {
        const result = await device.execute(async (_, universe: Universe) => {
            const { apolloClient, itemsQuery } = universe;

            const { data } = await apolloClient.query({
                query: itemsQuery
            });

            return { data: data.allTasks };
        });

        result.data.length.should.equal(numItems + 1);
        result.data[numItems].title.should.equal("test");
    });

    it("should sync changes when going online", async () => {
        if (process.env.MOBILE_PLATFORM === "ios") {
            await device.execute(async (_, universe: Universe) => {
                const { networkStatus } = universe;
                (networkStatus as ToggleNetworkStatus).setOnline(true);
            });
        } else {
            await setNetwork("reset");
        }

        const result = await device.execute(async (_, universe: Universe) => {
            const { apolloClient, itemsQuery, offlineChangePromise } = universe;

            await offlineChangePromise;

            await new Promise(resolve => setTimeout(resolve, 1000));

            const { data } = await apolloClient.query({
                query: itemsQuery,
            });

            return { data: data.allTasks };
        });

        result.data.length.should.equal(numItems + 1);
        result.data[numItems].title.should.equal("test");
    });
});
