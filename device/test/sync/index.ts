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

interface Universe extends GlobalUniverse {
  networkStatus: ToggleNetworkStatus | CordovaNetworkStatus;
  getAllItemsQuery: any;
  createTaskMutation: any;
  apolloClient: ApolloOfflineClient;
  offlineChangePromise: Promise<any>;
}

describe("Data Sync", function() {
  this.timeout(0);

  it("should initialize voyager client", async () => {
    await device.execute(async (modules, universe: Universe, platform) => {
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
    }, process.env.MOBILE_PLATFORM);
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
    it("device should subscribe to ws and receive updates once new content is available", async () => {
      const result = await device.execute(
        async (modules, universe: Universe) => {
          const { apolloClient, getAllItemsQuery } = universe;
          const { CacheOperation, createSubscriptionOptions } = modules[
            "@aerogear/voyager-client"
          ];
          const { gql } = modules["graphql-tag"];
          const testTaskTitle = `task received via websocket-${Date.now()}`;
          let receivedUpdate;

          const taskAddedSubscription = gql(`
          subscription {
              taskAdded {
                  id
                  title
              }
          }
        `);
          const createTaskMutation = gql(`
          mutation createTask($title: String!, $description: String!) {
              createTask(title: $title, description: $description) {
                  id
                  title
              }
          }
        `);
          universe.createTaskMutation = createTaskMutation;

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
            receivedUpdate = result.data.allTasks;
          });
          // Wait until the client is successfully subscribed
          while (!receivedUpdate) {
            await new Promise(res => setTimeout(res, 100));
          }
          // Get current number of items on the server
          const numberOfItems = receivedUpdate.length;

          await apolloClient.mutate({
            mutation: createTaskMutation,
            variables: { title: testTaskTitle, description: "test" }
          });

          // Wait until the number of items changes since the new task was created
          while (receivedUpdate.length === numberOfItems) {
            await new Promise(res => setTimeout(res, 100));
          }

          return { data: receivedUpdate, testTaskTitle };
        }
      );

      const foundTitle = result.data.find(
        task => task.title === result.testTaskTitle
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

      testTitleToCheck = await device.execute(async (_, universe: Universe) => {
        const testTitle = `offline-test-title-${Date.now()}`;
        try {
          const {
            apolloClient,
            getAllItemsQuery,
            createTaskMutation
          } = universe;
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
      });
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
