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
  Exec,
  V1Namespace,
  V1beta1CronJob
} from "@kubernetes/client-node";
import { Readable } from "stream";
import {
  Resource,
  resourceToString,
  isResourceList,
  KubeCustomApi,
  RequestError
} from "./kube-custom-api";
import { waitFor } from "../../common/util/utils";
import { trace } from "./error";
import { writable } from "./utils";

type ApiConstructor<T extends ApiType> = new (server: string) => T;

export interface GenericResource extends Resource {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Convert kubernetes error response to a classic javascript error with stacktrace
 */
export async function map<T>(call: () => Promise<{ body: T }>): Promise<T> {
  return await trace(async () => {
    try {
      return (await call()).body;
    } catch (e) {
      // TODO: remove this solution once this PR will be released:
      // https://github.com/kubernetes-client/javascript/pull/366
      if (e.response === undefined) {
        throw e;
      } else {
        throw new RequestError(e.response);
      }
    }
  });
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
      const [stream, logs] = writable();
      l.log(namespace, pod, container, stream, e => {
        if (e) {
          reject(e);
        } else {
          resolve(logs.toString());
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
      const [stream, output] = writable();
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
            reject(new Error(`error: ${s.message}\n${output.toString()}`));
          } else if (s.status === "Success") {
            resolve(output.toString());
          }
          reject(new Error(`unknown status: '${s.status}'`));
        }
      ).then(
        socket => {
          socket.onclose = (): void => {
            resolve(output.toString());
          };
          socket.onerror = (e): void => {
            reject(new Error(`error: ${e}\n${output.toString()}`));
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
    await waitFor(
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
      timeout,
      false
    );
  }

  // Namespace
  //

  /**
   * oc get namespace NAMESPACE
   */
  public async readNamespace(namespace: string): Promise<V1Namespace> {
    return await map(() => this.api(CoreV1Api).readNamespace(namespace));
  }

  /**
   * oc get namespace
   */
  public async listNamespace(): Promise<V1Namespace[]> {
    const r = await map(() => this.api(CoreV1Api).listNamespace());
    return r.items;
  }

  /**
   * oc delete namespace NAMESPACE
   */
  public async deleteNamespace(namespace: string): Promise<V1Status> {
    return await map(() => this.api(CoreV1Api).deleteNamespace(namespace));
  }

  /**
   * Wait until the namespace has been deleted or throw an error
   */
  public async waitForNamespaceToBeDeleted(
    namespace: string,
    timeout = 5 * 60 * 1000
  ): Promise<void> {
    await waitFor(
      async () => {
        try {
          await this.readNamespace(namespace);
        } catch (e) {
          if (e instanceof RequestError && e.response.statusCode === 404) {
            return true;
          } else {
            throw e;
          }
        }
        return false;
      },
      timeout,
      false
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
    const r = await map(() =>
      this.api(CoreV1Api).listNamespacedPod(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        labelSelector
      )
    );
    return r.items;
  }

  // CronJob
  //

  /**
   * oc get cronjob NAME -n NAMESPACE
   */
  public async readCronJob(
    name: string,
    namespace: string
  ): Promise<V1beta1CronJob> {
    return await map(() =>
      this.api(BatchV1beta1Api).readNamespacedCronJob(name, namespace)
    );
  }

  // Job
  //

  public async readJob(name: string, namespace: string): Promise<V1Job> {
    return await map(() =>
      this.api(BatchV1Api).readNamespacedJob(name, namespace)
    );
  }

  /**
   * oc crate job -f BODY -n NAMESPACE
   */
  public async createJob(namespace: string, body: V1Job): Promise<V1Job> {
    return await map(() =>
      this.api(BatchV1Api).createNamespacedJob(namespace, body)
    );
  }

  /**
   * oc create job NAME --from=cronjob/FROM -n NAMESPACE
   */
  public async createJobFromCronJob(
    name: string,
    from: string,
    namespace: string
  ): Promise<V1Job> {
    // retrieve the cronjob
    const cronJob = await this.readCronJob(from, namespace);

    // create a job with the same spec as the cronjob
    return await this.createJob(namespace, {
      metadata: { name },
      spec: cronJob.spec.jobTemplate.spec
    });
  }

  /**
   * Wait until the job succeed or throw an error.
   */
  public async waitForJobToComplete(
    name: string,
    namespace: string,
    timeout = 15 * 60 * 1000
  ): Promise<void> {
    await waitFor(
      async () => {
        const job = await this.readJob(name, namespace);
        return job.status.completionTime !== undefined;
      },
      timeout,
      false
    );
  }

  // Secret
  //

  /**
   * oc get secret NAME -n NAMESPACE
   */
  public async readSecret(name: string, namespace: string): Promise<V1Secret> {
    return await map(() =>
      this.api(CoreV1Api).readNamespacedSecret(name, namespace)
    );
  }

  // Deployment
  //

  public async readDeployment(
    name: string,
    namespace: string
  ): Promise<V1Deployment> {
    return await map(() =>
      this.api(AppsV1Api).readNamespacedDeployment(name, namespace)
    );
  }

  public async patchDeployment(
    name: string,
    namespace: string,
    body: object
  ): Promise<V1Deployment> {
    return await map(() =>
      this.api(AppsV1Api).patchNamespacedDeployment(
        name,
        namespace,
        body,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          headers: {
            "Content-Type": "application/merge-patch+json"
          }
        }
      )
    );
  }
  /**
   * Wait until the deployment exists, it doesn't mean the deployment is ready
   */
  public async waitForDeployment(
    name: string,
    namespace: string,
    timeout = 5 * 60 * 1000
  ): Promise<void> {
    await waitFor(async () => {
      try {
        await this.readDeployment(name, namespace);
      } catch (e) {
        if (e instanceof RequestError && e.response.statusCode === 404) {
          return false;
        } else {
          throw e;
        }
      }
      return true;
    }, timeout);
  }

  /**
   * Scale the deployment up or down
   */
  public async scaleDeployment(
    name: string,
    namespace: string,
    replicas: number
  ): Promise<V1Deployment> {
    return await this.patchDeployment(name, namespace, {
      spec: { replicas: replicas }
    });
  }

  /**
   * Wait until all required replicas are ready or has been removed
   */
  public async waitForDeploymentToReconcile(
    name: string,
    namespace: string,
    timeout = 5 * 60 * 1000
  ): Promise<void> {
    await waitFor(async () => {
      const d = await this.readDeployment(name, namespace);
      if (d.spec.replicas === 0) {
        return d.status.readyReplicas === undefined;
      } else {
        return d.status.readyReplicas === d.spec.replicas;
      }
    }, timeout);
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

  public deploymentConfigApi(): KubeCustomApi<GenericResource> {
    return this.customApi("apps.openshift.io/v1", "DeploymentConfig");
  }

  public async readDeploymentConfig(
    name: string,
    namespace: string
  ): Promise<GenericResource> {
    return this.deploymentConfigApi().read(name, namespace);
  }

  public async pathDeploymentConfig(
    name: string,
    namespace: string,
    body: object
  ): Promise<GenericResource> {
    return this.deploymentConfigApi().patch(name, body, namespace);
  }

  /**
   * Wait for the openshift deploymentconfig to exists
   */
  public async waitForDeploymentConfig(
    name: string,
    namespace: string,
    timeout = 5 * 60 * 1000
  ): Promise<void> {
    await waitFor(async () => {
      try {
        await this.readDeploymentConfig(name, namespace);
      } catch (e) {
        if (e instanceof RequestError && e.response.statusCode === 404) {
          return false;
        } else {
          throw e;
        }
      }
      return true;
    }, timeout);
  }

  /**
   * Scale the openshift deploymentconfig up or down
   */
  public async scaleDeploymentConfig(
    name: string,
    namespace: string,
    replicas: number
  ): Promise<void> {
    await this.pathDeploymentConfig(name, namespace, {
      spec: { replicas: replicas }
    });
  }

  /**
   * Wait until all required replicas are ready or has been removed
   */
  public async waitForDeploymentConfigToReconcile(
    name: string,
    namespace: string,
    timeout = 5 * 60 * 1000
  ): Promise<void> {
    await waitFor(async () => {
      const d = await this.readDeploymentConfig(name, namespace);
      if (d.spec.replicas === 0) {
        return d.status.readyReplicas === undefined;
      } else {
        return d.status.readyReplicas === d.spec.replicas;
      }
    }, timeout);
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
