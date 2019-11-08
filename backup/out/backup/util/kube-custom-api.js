import querystring from "querystring";
import { trace } from "./error";
import request from "request";
export class RequestError extends Error {
    constructor(response) {
        super(`request failed with error: '${response.statusCode} - ${response.statusMessage}'\n` +
            JSON.stringify(response.toJSON()));
        this.response = response;
    }
}
function localRequest(options) {
    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (error) {
                reject(error);
            }
            else {
                if (response.statusCode &&
                    response.statusCode >= 200 &&
                    response.statusCode <= 299) {
                    resolve(JSON.parse(body));
                }
                else {
                    reject(new RequestError(response));
                }
            }
        });
    });
}
function createEndpoint(apiVersion, kind, namespace) {
    if (kind === "List") {
        throw new Error("can not create endpoint for kind 'List'");
    }
    const chain = [];
    // chain the version
    // https://kubernetes.io/docs/concepts/overview/kubernetes-api/#api-groups
    const [group, version] = apiVersion.split("/");
    if (version) {
        // group api
        chain.push("apis", encodeURI(group), encodeURI(version));
    }
    else {
        // core api
        chain.push("api", encodeURI(apiVersion));
    }
    // chain namespace if present
    if (namespace) {
        // namespaced
        chain.push("namespaces", encodeURI(namespace));
    }
    // chain kind
    chain.push(encodeURI(kind.toLowerCase() + "s"));
    return chain.join("/");
}
export function resourceToString(resource) {
    const r = {
        kind: resource.kind,
        version: resource.apiVersion,
        metadata: {
            name: resource.metadata.name,
            namespace: resource.metadata.namespace,
            uid: resource.metadata.uid
        }
    };
    return JSON.stringify(r);
}
export function isResourceList(resource) {
    return resource.kind === "List";
}
export class KubeCustomApi {
    constructor(config, apiVersion, kind) {
        this.config = config;
        this.apiVersion = apiVersion;
        this.kind = kind;
    }
    async read(name, namespace) {
        return await this.request({
            method: "GET",
            url: this.createEndpoint(namespace, name)
        });
    }
    async list(namespace) {
        return await this.request({
            method: "GET",
            url: this.createEndpoint(namespace)
        });
    }
    async create(body, namespace) {
        return await this.request({
            method: "POST",
            url: this.createEndpoint(namespace),
            body: JSON.stringify(body)
        });
    }
    async patch(name, body, namespace) {
        return await this.request({
            method: "PATCH",
            headers: {
                "Content-Type": "application/merge-patch+json"
            },
            url: this.createEndpoint(namespace, name),
            body: JSON.stringify(body)
        });
    }
    async deleteCollection(namespace, parameters) {
        return await this.request({
            method: "DELETE",
            url: this.createEndpoint(namespace, undefined, parameters)
        });
    }
    createEndpoint(namespace, name, params) {
        let url = createEndpoint(this.apiVersion, this.kind, namespace);
        if (name) {
            url += "/" + name;
        }
        if (params) {
            url += "?" + querystring.stringify(params);
        }
        return url;
    }
    async request(options) {
        options.baseUrl = this.config.getCurrentCluster().server;
        this.config.applyToRequest(options);
        return await trace(() => localRequest(options));
    }
}
