import { KubeConfig, BatchV1beta1Api, BatchV1Api, CoreV1Api, Log, AppsV1Api, Exec } from "@kubernetes/client-node";
import { resourceToString, isResourceList, KubeCustomApi, RequestError } from "./kube-custom-api";
import { waitFor } from "../../common/util/utils";
import { trace } from "./error";
import { writable } from "./utils";
/**
 * Convert kubernetes error response to a classic javascript error with stacktrace
 */
export async function map(call) {
    return await trace(async () => {
        try {
            return (await call()).body;
        }
        catch (e) {
            if (e.response === undefined) {
                throw e;
            }
            else {
                throw new RequestError(e.response);
            }
        }
    });
}
export class KubeHelper {
    constructor(config) {
        if (config === undefined) {
            config = new KubeConfig();
            config.loadFromDefault();
        }
        this.config = config;
    }
    api(apiClientType) {
        return this.config.makeApiClient(apiClientType);
    }
    customApi(apiVersion, kind) {
        return new KubeCustomApi(this.config, apiVersion, kind);
    }
    /**
     * oc create -f RESOURCE
     */
    async create(resource) {
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
        }
        catch (e) {
            const r = resourceToString(resource);
            throw new Error(`failed to create resource: ${r} with error: ${e}`);
        }
    }
    /**
     * oc logs POD -c CONTAINER -n NAMESPACE
     */
    async log(namespace, pod, container) {
        const l = new Log(this.config);
        return await new Promise((resolve, reject) => {
            const [stream, logs] = writable();
            l.log(namespace, pod, container, stream, e => {
                if (e) {
                    reject(e);
                }
                else {
                    resolve(logs.toString());
                }
            });
        });
    }
    /**
     * STDIN | oc POD -c CONTAINER -n NAMESPACE -- COMMAND
     */
    async exec(namespace, pod, container, command, stdin) {
        const l = new Exec(this.config);
        return await new Promise((resolve, reject) => {
            const [stream, output] = writable();
            l.exec(namespace, pod, container, command, stream, stream, stdin, false, s => {
                if (s.status === "Failure") {
                    reject(new Error(`error: ${s.message}\n${output.toString()}`));
                }
                else if (s.status === "Success") {
                    resolve(output.toString());
                }
                reject(new Error(`unknown status: '${s.status}'`));
            }).then(socket => {
                socket.onclose = () => {
                    resolve(output.toString());
                };
                socket.onerror = (e) => {
                    reject(new Error(`error: ${e}\n${output.toString()}`));
                };
            }, e => reject(e));
        });
    }
    /**
     * Delete all resources, in the namespace of the specified resource types,
     * and wait for the resources to be deleted, if the resource is held by
     * one or more finalizers, patch the resource and remove the finalizers.
     */
    async forceDeleteCollectionAndWait(apiVersion, kind, namespace, timeout = 5 * 60 * 1000) {
        const client = this.customApi(apiVersion, kind);
        // gracefully delete all resources
        await client.deleteCollection(namespace);
        // wait and force
        await waitFor(async () => {
            const list = await client.list(namespace);
            for (const r of list.items) {
                await client.patch(r.metadata.name, { metadata: { finalizers: null } }, namespace);
            }
            return list.items.length === 0;
        }, timeout, false);
    }
    // Namespace
    //
    /**
     * oc get namespace NAMESPACE
     */
    async readNamespace(namespace) {
        return await map(() => this.api(CoreV1Api).readNamespace(namespace));
    }
    /**
     * oc get namespace
     */
    async listNamespace() {
        const r = await map(() => this.api(CoreV1Api).listNamespace());
        return r.items;
    }
    /**
     * oc delete namespace NAMESPACE
     */
    async deleteNamespace(namespace) {
        return await map(() => this.api(CoreV1Api).deleteNamespace(namespace));
    }
    /**
     * Wait until the namespace has been deleted or throw an error
     */
    async waitForNamespaceToBeDeleted(namespace, timeout = 5 * 60 * 1000) {
        await waitFor(async () => {
            try {
                await this.readNamespace(namespace);
            }
            catch (e) {
                if (e instanceof RequestError && e.response.statusCode === 404) {
                    return true;
                }
                else {
                    throw e;
                }
            }
            return false;
        }, timeout, false);
    }
    /**
     * Delete the namespace and wait for it to be deleted
     */
    async deleteNamespaceAndWait(namespace) {
        await this.deleteNamespace(namespace);
        await this.waitForNamespaceToBeDeleted(namespace);
    }
    // Pod
    //
    /**
     * oc get pods --fieldSelector LABEL_SELECTOR -n NAMESPACE
     */
    async listPod(namespace, labelSelector) {
        const r = await map(() => this.api(CoreV1Api).listNamespacedPod(namespace, undefined, undefined, undefined, undefined, labelSelector));
        return r.items;
    }
    // CronJob
    //
    /**
     * oc get cronjob NAME -n NAMESPACE
     */
    async readCronJob(name, namespace) {
        return await map(() => this.api(BatchV1beta1Api).readNamespacedCronJob(name, namespace));
    }
    // Job
    //
    async readJob(name, namespace) {
        return await map(() => this.api(BatchV1Api).readNamespacedJob(name, namespace));
    }
    /**
     * oc crate job -f BODY -n NAMESPACE
     */
    async createJob(namespace, body) {
        return await map(() => this.api(BatchV1Api).createNamespacedJob(namespace, body));
    }
    /**
     * oc create job NAME --from=cronjob/FROM -n NAMESPACE
     */
    async createJobFromCronJob(name, from, namespace) {
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
    async waitForJobToComplete(name, namespace, timeout = 15 * 60 * 1000) {
        await waitFor(async () => {
            const job = await this.readJob(name, namespace);
            return job.status.completionTime !== undefined;
        }, timeout, false);
    }
    // Secret
    //
    /**
     * oc get secret NAME -n NAMESPACE
     */
    async readSecret(name, namespace) {
        return await map(() => this.api(CoreV1Api).readNamespacedSecret(name, namespace));
    }
    // Deployment
    //
    async readDeployment(name, namespace) {
        return await map(() => this.api(AppsV1Api).readNamespacedDeployment(name, namespace));
    }
    async patchDeployment(name, namespace, body) {
        return await map(() => this.api(AppsV1Api).patchNamespacedDeployment(name, namespace, body, undefined, undefined, undefined, undefined, {
            headers: {
                "Content-Type": "application/merge-patch+json"
            }
        }));
    }
    /**
     * Wait until the deployment exists, it doesn't mean the deployment is ready
     */
    async waitForDeployment(name, namespace, timeout = 5 * 60 * 1000) {
        await waitFor(async () => {
            try {
                await this.readDeployment(name, namespace);
            }
            catch (e) {
                if (e instanceof RequestError && e.response.statusCode === 404) {
                    return false;
                }
                else {
                    throw e;
                }
            }
            return true;
        }, timeout);
    }
    /**
     * Scale the deployment up or down
     */
    async scaleDeployment(name, namespace, replicas) {
        return await this.patchDeployment(name, namespace, {
            spec: { replicas: replicas }
        });
    }
    /**
     * Wait until all required replicas are ready or has been removed
     */
    async waitForDeploymentToReconcile(name, namespace, timeout = 5 * 60 * 1000) {
        await waitFor(async () => {
            const d = await this.readDeployment(name, namespace);
            if (d.spec.replicas === 0) {
                return d.status.readyReplicas === undefined;
            }
            else {
                return d.status.readyReplicas === d.spec.replicas;
            }
        }, timeout);
    }
    /**
     * Scale the deployment up or down and wait for it to be ready
     */
    async scaleDeploymentAndWait(name, namespace, replicas) {
        await this.scaleDeployment(name, namespace, replicas);
        await this.waitForDeploymentToReconcile(name, namespace);
    }
    // DeploymentConfig
    //
    deploymentConfigApi() {
        return this.customApi("apps.openshift.io/v1", "DeploymentConfig");
    }
    async readDeploymentConfig(name, namespace) {
        return this.deploymentConfigApi().read(name, namespace);
    }
    async pathDeploymentConfig(name, namespace, body) {
        return this.deploymentConfigApi().patch(name, body, namespace);
    }
    /**
     * Wait for the openshift deploymentconfig to exists
     */
    async waitForDeploymentConfig(name, namespace, timeout = 5 * 60 * 1000) {
        await waitFor(async () => {
            try {
                await this.readDeploymentConfig(name, namespace);
            }
            catch (e) {
                if (e instanceof RequestError && e.response.statusCode === 404) {
                    return false;
                }
                else {
                    throw e;
                }
            }
            return true;
        }, timeout);
    }
    /**
     * Scale the openshift deploymentconfig up or down
     */
    async scaleDeploymentConfig(name, namespace, replicas) {
        await this.pathDeploymentConfig(name, namespace, {
            spec: { replicas: replicas }
        });
    }
    /**
     * Wait until all required replicas are ready or has been removed
     */
    async waitForDeploymentConfigToReconcile(name, namespace, timeout = 5 * 60 * 1000) {
        await waitFor(async () => {
            const d = await this.readDeploymentConfig(name, namespace);
            if (d.spec.replicas === 0) {
                return d.status.readyReplicas === undefined;
            }
            else {
                return d.status.readyReplicas === d.spec.replicas;
            }
        }, timeout);
    }
    /**
     * Scale the openshift deploymentconfig up or down and wait for it to be ready
     */
    async scaleDeploymentConfigAndWait(name, namespace, replicas) {
        await this.scaleDeploymentConfig(name, namespace, replicas);
        await this.waitForDeploymentConfigToReconcile(name, namespace);
    }
}
