import chai = require("chai");
chai.should();

import { ApolloOfflineClient } from "offix-client-boost";
import { device } from "../../util/device";
import { GlobalUniverse } from "../../util/init";
import { setNetwork } from "../../util/network";
import axios from "axios";
import { DocumentNode } from "graphql";

interface Universe extends GlobalUniverse {
  getAllItemsQuery: DocumentNode;
  subscriptionUpdate: { data?: unknown[]; numberOfTasksBeforeUpdate?: number };
  apolloClient: ApolloOfflineClient;
  offlineChangePromise: Promise<unknown>;
}

describe("Data Sync", function () {
  let syncAppUrl;
  let syncConfig;

  this.timeout(0);

  it("should initialize voyager client", async () => {
    syncConfig = {
      serverUrl: `${process.env.SYNC_URL}/graphql`,
      wsServerUrl: `${process.env.SYNC_WS_URL}/graphql`,
    };
    syncAppUrl = syncConfig.serverUrl;

    await device.execute(async function (modules, universe: Universe, config) {
      const { createClient, CacheOperation, getUpdateFunction } = modules[
        "offix-client-boost"
      ];
      const { gql } = modules["graphql-tag"];

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
          updateQuery: getAllItemsQuery,
        }),
      };

      const options = {
        httpUrl: config.serverUrl,
        wsUrl: config.wsServerUrl,
        mutationCacheUpdates: cacheUpdates,
      };

      const offlineClient = await createClient(options);

      // eslint-disable-next-line require-atomic-updates
      universe.apolloClient = offlineClient;
    }, syncConfig);
  });

  it("should perform query", async () => {
    await device.execute(async (_, universe: Universe) => {
      const { apolloClient, getAllItemsQuery } = universe;

      await apolloClient.query({
        query: getAllItemsQuery,
        fetchPolicy: "network-only",
        errorPolicy: "none",
      });
    });
  });

  describe("Subscription test", function () {
    const subscriptionTestTaskTitle = `task received via websocket-${Date.now()}`;

    it("device should successfully subscribe to ws", async () => {
      await device.execute(async (modules, universe: Universe) => {
        const { apolloClient, getAllItemsQuery } = universe;
        const { CacheOperation, createSubscriptionOptions } = modules[
          "offix-client-boost"
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
          operationType: CacheOperation.ADD,
        };

        const subscriptionOptions = createSubscriptionOptions(options);
        const getTasks = await apolloClient.watchQuery({
          query: getAllItemsQuery,
          fetchPolicy: "network-only",
        });
        getTasks.subscribeToMore(subscriptionOptions);
        getTasks.subscribe((result) => {
          universe.subscriptionUpdate.data = result.data.allTasks;
        });
        // Wait until the client is successfully subscribed and the last update from subscription is received
        let lastUpdate = universe.subscriptionUpdate.data;
        while (
          !universe.subscriptionUpdate.data ||
          universe.subscriptionUpdate.data !== lastUpdate
        ) {
          lastUpdate = universe.subscriptionUpdate.data;
          await new Promise((res) => setTimeout(res, 1000));
        }
        // eslint-disable-next-line require-atomic-updates
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
          data: { query },
        });
        // Postpone sending the mutation. Otherwise the test is flaky.
      }, 5000);
    });

    it("device should receive a new task via ws", async () => {
      const updatedContent = await device.execute(
        async (_, universe: Universe) => {
          const {
            subscriptionUpdate: { numberOfTasksBeforeUpdate },
          } = universe;
          // Wait until the number of items changes since the new task was created
          while (
            universe.subscriptionUpdate.data.length ===
            numberOfTasksBeforeUpdate
          ) {
            await new Promise((res) => setTimeout(res, 1000));
          }
          return universe.subscriptionUpdate.data;
        }
      );
      const foundTitle = updatedContent.find(
        (task: { title: string }) => task.title === subscriptionTestTaskTitle
      );
      foundTitle.should.not.equal(undefined);
    });
  });

  // skip iOS tests for offline mutation (no easy way to set device offline)
  if (process.env.MOBILE_PLATFORM === "ios") {
    return;
  }

  describe("Offline mutation test", function () {
    let testTitleToCheck;

    it("should perform offline mutation", async () => {
      await setNetwork("airplane-mode");

      await new Promise((resolve) => setTimeout(resolve, 5000));

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
              returnType: "Task",
            });
          } catch (error) {
            if (error.offline) {
              // eslint-disable-next-line require-atomic-updates
              universe.offlineChangePromise = error.watchOfflineChange();
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
          query: getAllItemsQuery,
        });

        return { data: data.allTasks };
      });

      const foundTitle = result.data.find(
        (task) => task.title === testTitleToCheck
      );
      foundTitle.should.not.equal(undefined);
    });

    it("should sync changes when going online", async () => {
      await setNetwork("reset");

      const result = await device.execute(async (_, universe: Universe) => {
        const {
          apolloClient,
          getAllItemsQuery,
          offlineChangePromise,
        } = universe;

        await offlineChangePromise;

        await new Promise((resolve) => setTimeout(resolve, 1000));

        const { data } = await apolloClient.query({
          query: getAllItemsQuery,
        });

        return { data: data.allTasks };
      });

      const foundTitle = result.data.find(
        (task) => task.title === testTitleToCheck
      );
      foundTitle.should.not.equal(undefined);
    });
  });
});
