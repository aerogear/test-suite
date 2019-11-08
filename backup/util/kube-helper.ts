import {
  V1Job,
  KubeConfig,
  BatchV1beta1Api,
  BatchV1Api,
  CoreV1Api,
  V1Secret,
  V1Status,
  Log,
  ApiType,
  AppsV1Api,
  V1Deployment,
  V1Pod,
  Exec
} from "@kubernetes/client-node";
import { Writable, Readable } from "stream";
import {
  Resource,
  resourceToString,
  isResourceList,
  KubeCustomApi
} from "./kube-custom-api";
import { waitUntil } from "./utils";

type ApiConstructor<T extends ApiType> = new (server: string) => T;

export interface GenericResource extends Resource {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export class KubeHelper {
  public config: KubeConfig;

  constructor(config?: KubeConfig) {
    if (config === undefined) {
      config = new KubeConfig();
      config.loadFromDefault();
    }

    this.config = config;
  }

  public api<T extends ApiType>(apiClientType: ApiConstructor<T>): T {
    return this.config.makeApiClient(apiClientType);
  }

  public customApi<T extends Resource = GenericResource>(
    apiVersion: string,
    kind: string
  ): KubeCustomApi<T> {
    return new KubeCustomApi(this.config, apiVersion, kind);
  }

  /**
   * oc create -f RESOURCE
   */
  public async create(resource: Resource): Promise<void> {
    // Create each resource of a list separately
    if (isResourceList(resource)) {
      for (const item of resource.items) {
        await this.create(item);
      }
      return;
    }

    // strip resourceVersion because it should not be set
    // on objects to be created
    resource.metadata.resourceVersion = "";

    const client = this.customApi(resource.apiVersion, resource.kind);

    // create the resource
    try {
      await client.create(resource, resource.metadata.namespace);
      return;
    } catch (e) {
      const r = resourceToString(resource);
      throw new Error(`failed to create resource: ${r} with error: ${e}`);
    }
  }

  /**
   * oc logs POD -c CONTAINER -n NAMESPACE
   */
  public async log(
    namespace: string,
    pod: string,
    container: string
  ): Promise<string> {
    const l = new Log(this.config);
    return await new Promise((resolve, reject) => {
      const logs: string[] = [];
      const stream = new Writable({
        write: (chunk, encoding, callback): void => {
          if (Buffer.isBuffer(chunk)) {
            logs.push(chunk.toString());
            callback();
          } else {
            callback(new Error(`can not process encoding: ${encoding}`));
          }
        }
      });
      l.log(namespace, pod, container, stream, e => {
        if (e) {
          reject(e);
        } else {
          resolve(logs.join());
        }
      });
    });
  }

  /**
   * STDIN | oc POD -c CONTAINER -n NAMESPACE -- COMMAND
   */
  public async exec(
    namespace: string,
    pod: string,
    container: string,
    command: string | string[],
    stdin: Readable
  ): Promise<string> {
    const l = new Exec(this.config);
    return await new Promise((resolve, reject) => {
      const output: string[] = [];
      const stream = new Writable({
        write: (chunk, encoding, callback): void => {
          if (Buffer.isBuffer(chunk)) {
            output.push(chunk.toString());
            callback();
          } else {
            callback(new Error(`can not process encoding: ${encoding}`));
          }
        }
      });

      l.exec(
        namespace,
        pod,
        container,
        command,
        stream,
        stream,
        stdin,
        false,
        s => {
          if (s.status === "Failure") {
            reject(new Error(`error: ${s.message}\n${output.join("")}`));
          } else if (s.status === "Success") {
            resolve(output.join(""));
          }
          reject(new Error(`unknown status: '${s.status}'`));
        }
      ).then(
        socket => {
          socket.onclose = (): void => resolve(output.join(""));
          socket.onerror = (e): void => {
            reject(new Error(`error: ${e}\n${output.join("")}`));
          };
        },
        e => reject(e)
      );
    });
  }

  /**
   * Delete all resources, in the namespace of the specified resource types,
   * and wait for the resources to be deleted, if the resource is held by
   * one or more finalizers, patch the resource and remove the finalizers.
   */
  public async forceDeleteCollectionAndWait(
    apiVersion: string,
    kind: string,
    namespace?: string,
    timeout = 5 * 60 * 1000
  ): Promise<void> {
    const client = this.customApi(apiVersion, kind);

    // gracefully delete all resources
    await client.deleteCollection(namespace);

    // wait and force
    await waitUntil(
      async () => {
        const list = await client.list(namespace);
        for (const r of list.items) {
          await client.patch(
            r.metadata.name,
            { metadata: { finalizers: null } },
            namespace
          );
        }
        return list.items.length === 0;
      },
      false,
      timeout
    );
  }

  // Namespace
  //

  /**
   * oc delete namespace NAMESPACE
   */
  public async deleteNamespace(namespace: string): Promise<V1Status> {
    const v1 = this.config.makeApiClient(CoreV1Api);
    const r = await v1.deleteNamespace(namespace);
    return r.body;
  }

  /**
   * Wait until the namespace has been deleted or throw an error
   */
  public async waitForNamespaceToBeDeleted(
    namespace: string,
    timeout = 15 * 60 * 1000
  ): Promise<void> {
    const v1 = this.config.makeApiClient(CoreV1Api);

    await waitUntil(
      async () => {
        try {
          await v1.readNamespace(namespace);
        } catch (e) {
          if (e.response.body.code === 404) {
            return true;
          } else {
            throw e;
          }
        }
        return false;
      },
      false,
      timeout
    );
  }

  /**
   * Delete the namespace and wait for it to be deleted
   */
  public async deleteNamespaceAndWait(namespace: string): Promise<void> {
    await this.deleteNamespace(namespace);
    await this.waitForNamespaceToBeDeleted(namespace);
  }

  // Pod
  //

  /**
   * oc get pods --fieldSelector LABEL_SELECTOR -n NAMESPACE
   */
  public async listPod(
    namespace: string,
    labelSelector?: string
  ): Promise<V1Pod[]> {
    const r = await this.api(CoreV1Api).listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector
    );
    return r.body.items;
  }

  // Job
  //

  /**
   * oc create job NAME --from=cronjob/FROM -n NAMESPACE
   */
  public async createJobFromCronJob(
    name: string,
    from: string,
    namespace: string
  ): Promise<V1Job> {
    // retrieve the cronjob
    const batchV1Beta1 = this.config.makeApiClient(BatchV1beta1Api);
    const cronJob = await batchV1Beta1.readNamespacedCronJob(from, namespace);

    // create a job with the same spec as the cronjob
    const batchV1 = this.config.makeApiClient(BatchV1Api);
    const job = await batchV1.createNamespacedJob(namespace, {
      metadata: { name },
      spec: cronJob.body.spec.jobTemplate.spec
    });

    return job.body;
  }

  /**
   * Wait until the job succeed or throw an error.
   */
  public async waitForJobToComplete(
    name: string,
    namespace: string,
    timeout = 15 * 60 * 1000
  ): Promise<void> {
    const batchV1 = this.config.makeApiClient(BatchV1Api);
    await waitUntil(
      async () => {
        const r = await batchV1.readNamespacedJob(name, namespace);
        return r.body.status.completionTime !== undefined;
      },
      false,
      timeout
    );
  }

  // Secret
  //

  /**
   * oc get secret NAME -n NAMESPACE
   */
  public async readSecret(name: string, namespace: string): Promise<V1Secret> {
    const v1 = this.config.makeApiClient(CoreV1Api);
    const r = await v1.readNamespacedSecret(name, namespace);
    return r.body;
  }

  public async readDeployment(
    name: string,
    namespace: string
  ): Promise<V1Deployment> {
    const r = await this.api(AppsV1Api).readNamespacedDeployment(
      name,
      namespace
    );
    return r.body;
  }

  // Deployment
  //

  /**
   * Wait until the deployment exists, it doesn't mean the deployment is ready
   */
  public async waitForDeployment(
    name: string,
    namespace: string
  ): Promise<void> {
    await waitUntil(async () => {
      try {
        await this.readDeployment(name, namespace);
      } catch (e) {
        if (e.response.body.code === 404) {
          return false;
        } else {
          throw e;
        }
      }
      return true;
    });
  }

  /**
   * Scale the deployment up or down
   */
  public async scaleDeployment(
    name: string,
    namespace: string,
    replicas: number
  ): Promise<void> {
    await this.api(AppsV1Api).patchNamespacedDeployment(
      name,
      namespace,
      {
        spec: { replicas: replicas }
      },
      undefined,
      undefined,
      undefined,
      undefined,
      {
        headers: {
          "Content-Type": "application/merge-patch+json"
        }
      }
    );
  }

  /**
   * Wait until all required replicas are ready or has been removed
   */
  public async waitForDeploymentToReconcile(
    name: string,
    namespace: string
  ): Promise<void> {
    await waitUntil(async () => {
      const d = await this.readDeployment(name, namespace);
      if (d.spec.replicas === 0) {
        return d.status.readyReplicas === undefined;
      } else {
        return d.status.readyReplicas === d.spec.replicas;
      }
    });
  }

  /**
   * Scale the deployment up or down and wait for it to be ready
   */
  public async scaleDeploymentAndWait(
    name: string,
    namespace: string,
    replicas: number
  ): Promise<void> {
    await this.scaleDeployment(name, namespace, replicas);
    await this.waitForDeploymentToReconcile(name, namespace);
  }

  // DeploymentConfig
  //

  /**
   * Wait for the openshift deploymentconfig to exists
   */
  public async waitForDeploymentConfig(
    name: string,
    namespace: string
  ): Promise<void> {
    const client = this.customApi("apps.openshift.io/v1", "DeploymentConfig");
    await waitUntil(async () => {
      try {
        await client.read(name, namespace);
      } catch (e) {
        if (JSON.parse(e.response.body).code === 404) {
          return false;
        } else {
          throw e;
        }
      }
      return true;
    });
  }

  /**
   * Scale the openshift deploymentconfig up or down
   */
  public async scaleDeploymentConfig(
    name: string,
    namespace: string,
    replicas: number
  ): Promise<void> {
    await this.customApi("apps.openshift.io/v1", "DeploymentConfig").patch(
      name,
      {
        spec: { replicas: replicas }
      },
      namespace
    );
  }

  /**
   * Wait until all required replicas are ready or has been removed
   */
  public async waitForDeploymentConfigToReconcile(
    name: string,
    namespace: string
  ): Promise<void> {
    const client = this.customApi("apps.openshift.io/v1", "DeploymentConfig");
    await waitUntil(async () => {
      const d = await client.read(name, namespace);
      if (d.spec.replicas === 0) {
        return d.status.readyReplicas === undefined;
      } else {
        return d.status.readyReplicas === d.spec.replicas;
      }
    });
  }

  /**
   * Scale the openshift deploymentconfig up or down and wait for it to be ready
   */
  public async scaleDeploymentConfigAndWait(
    name: string,
    namespace: string,
    replicas: number
  ): Promise<void> {
    await this.scaleDeploymentConfig(name, namespace, replicas);
    await this.waitForDeploymentConfigToReconcile(name, namespace);
  }
}
