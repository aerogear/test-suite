import chai = require("chai");
chai.should();

import {
  ApolloOfflineClient,
  CordovaNetworkStatus
} from "@aerogear/voyager-client";
import { ToggleNetworkStatus } from "../../fixtures/ToggleNetworkStatus";
import { device } from "../../util/device";
import { GlobalUniverse } from "../../util/init";
import { setNetwork } from "../../util/network";
import gql from "graphql-tag";
import axios from "axios";

interface Universe extends GlobalUniverse {
  networkStatus: ToggleNetworkStatus | CordovaNetworkStatus;
  getAllItemsQuery: any;
  subscriptionUpdate: any;
  apolloClient: ApolloOfflineClient;
  offlineChangePromise: Promise<any>;
}

describe("Data Sync", function() {
  let syncAppUrl;

  this.timeout(0);

  it("should initialize voyager client", async () => {
    const appConfig = await device.execute(
      async (modules, universe: Universe, platform) => {
        const {
          OfflineClient,
          CordovaNetworkStatus,
          CacheOperation,
          getUpdateFunction
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

        const getAllItemsQuery = gql(`
        query allTasks {
            allTasks {
                  id
                    title
                }
            }
          `);
        universe.getAllItemsQuery = getAllItemsQuery;

        const cacheUpdates = {
          createTask: getUpdateFunction({
            mutationName: "createTask",
            idField: "id",
            operationType: CacheOperation.ADD,
            updateQuery: getAllItemsQuery
          })
        };

        const options = {
          openShiftConfig: app.config,
          networkStatus,
          mutationCacheUpdates: cacheUpdates
        };

        const offlineClient = new OfflineClient(options);

        const apolloClient = await offlineClient.init();

        universe.apolloClient = apolloClient;
        return app.config;
      },
      process.env.MOBILE_PLATFORM
    );
    syncAppUrl = appConfig.configurations.find(s => s.type === "sync-app").url;
  });

  it("should perform query", async () => {
    await device.execute(async (_, universe: Universe) => {
      const { apolloClient, getAllItemsQuery } = universe;

      await apolloClient.query({
        query: getAllItemsQuery,
        fetchPolicy: "network-only",
        errorPolicy: "none"
      });
    });
  });

  describe("Subscription test", function() {
    const subscriptionTestTaskTitle = `task received via websocket-${Date.now()}`;

    it("device should successfully subscribe to ws", async () => {
      await device.execute(async (modules, universe: Universe) => {
        const { apolloClient, getAllItemsQuery } = universe;
        const { CacheOperation, createSubscriptionOptions } = modules[
          "@aerogear/voyager-client"
        ];
        const { gql } = modules["graphql-tag"];
        universe.subscriptionUpdate = {};

        const taskAddedSubscription = gql(`
            subscription {
                taskAdded {
                    id
                    title
                }
            }
          `);

        const options = {
          subscriptionQuery: taskAddedSubscription,
          cacheUpdateQuery: getAllItemsQuery,
          operationType: CacheOperation.ADD
        };

        const subscriptionOptions = createSubscriptionOptions(options);
        const getTasks = await apolloClient.watchQuery({
          query: getAllItemsQuery,
          fetchPolicy: "network-only"
        });
        getTasks.subscribeToMore(subscriptionOptions);
        getTasks.subscribe(result => {
          universe.subscriptionUpdate.data = result.data.allTasks;
        });
        // Wait until the client is successfully subscribed and the last update from subscription is received
        let lastUpdate = universe.subscriptionUpdate.data;
        while (
          !universe.subscriptionUpdate.data ||
          universe.subscriptionUpdate.data !== lastUpdate
        ) {
          lastUpdate = universe.subscriptionUpdate.data;
          await new Promise(res => setTimeout(res, 1000));
        }
        universe.subscriptionUpdate.numberOfTasksBeforeUpdate =
          universe.subscriptionUpdate.data.length;
      });
    });

    it("should initiate a mutation for creating a new task", async () => {
      const query = `mutation{createTask(title:"${subscriptionTestTaskTitle}", description:"subscription test"){id, title}}`;
      setTimeout(async () => {
        await axios({
          method: "POST",
          url: syncAppUrl,
          data: { query }
        });
        // Postpone sending the mutation. Otherwise the test is flaky.
      }, 5000);
    });

    it("device should receive a new task via ws", async () => {
      const updatedContent = await device.execute(
        async (_, universe: Universe) => {
          const {
            subscriptionUpdate: { numberOfTasksBeforeUpdate }
          } = universe;
          // Wait until the number of items changes since the new task was created
          while (
            universe.subscriptionUpdate.data.length ===
            numberOfTasksBeforeUpdate
          ) {
            await new Promise(res => setTimeout(res, 1000));
          }
          return universe.subscriptionUpdate.data;
        }
      );
      const foundTitle = updatedContent.find(
        task => task.title === subscriptionTestTaskTitle
      );
      foundTitle.should.not.equal(undefined);
    });
  });

  describe("Offline mutation test", function() {
    let testTitleToCheck;

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

      testTitleToCheck = await device.execute(
        async (modules, universe: Universe) => {
          const testTitle = `offline-test-title-${Date.now()}`;
          const { apolloClient, getAllItemsQuery } = universe;
          const { gql } = modules["graphql-tag"];
          const createTaskMutation = gql(`
          mutation createTask($title: String!, $description: String!) {
              createTask(title: $title, description: $description) {
                  id
                  title
              }
          }
        `);
          try {
            await apolloClient.offlineMutate({
              mutation: createTaskMutation,
              variables: { title: testTitle, description: "test" },
              updateQuery: getAllItemsQuery,
              returnType: "Task"
            });
          } catch (error) {
            if (error.networkError && error.networkError.offline) {
              const offlineError = error.networkError;
              universe.offlineChangePromise = offlineError.watchOfflineChange();
              return testTitle;
            }

            throw error;
          }

          throw new Error("network error offline was not thrown");
        }
      );
    });

    it("should see updated cache", async () => {
      const result = await device.execute(async (_, universe: Universe) => {
        const { apolloClient, getAllItemsQuery } = universe;

        const { data } = await apolloClient.query({
          query: getAllItemsQuery
        });

        return { data: data.allTasks };
      });

      const foundTitle = result.data.find(
        task => task.title === testTitleToCheck
      );
      foundTitle.should.not.equal(undefined);
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
        const {
          apolloClient,
          getAllItemsQuery,
          offlineChangePromise
        } = universe;

        await offlineChangePromise;

        await new Promise(resolve => setTimeout(resolve, 1000));

        const { data } = await apolloClient.query({
          query: getAllItemsQuery
        });

        return { data: data.allTasks };
      });

      const foundTitle = result.data.find(
        task => task.title === testTitleToCheck
      );
      foundTitle.should.not.equal(undefined);
    });
  });
});
