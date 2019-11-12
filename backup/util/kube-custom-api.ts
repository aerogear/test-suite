import { V1ObjectMeta, V1ListMeta, KubeConfig } from "@kubernetes/client-node";
import { ParsedUrlQueryInput } from "querystring";
import querystring from "querystring";
import { trace } from "./error";
import request, { Options, Response } from "request";

export class RequestError extends Error {
  public response: Response;

  constructor(response: Response) {
    super(
      `request failed with error: '${response.statusCode} - ${response.statusMessage}'\n` +
        JSON.stringify(response.toJSON())
    );

    this.response = response;
  }
}

function localRequest<T>(options: Options): Promise<T> {
  return new Promise((resolve, reject) => {
    request(options, (error: unknown, response: Response, body: string) => {
      if (error) {
        reject(error);
      } else {
        if (
          response.statusCode &&
          response.statusCode >= 200 &&
          response.statusCode <= 299
        ) {
          resolve(JSON.parse(body));
        } else {
          reject(new RequestError(response));
        }
      }
    });
  });
}

function createEndpoint(
  apiVersion: string,
  kind: string,
  namespace?: string
): string {
  if (kind === "List") {
    throw new Error("can not create endpoint for kind 'List'");
  }

  const chain: string[] = [];

  // chain the version
  // https://kubernetes.io/docs/concepts/overview/kubernetes-api/#api-groups
  const [group, version] = apiVersion.split("/");
  if (version) {
    // group api
    chain.push("apis", encodeURI(group), encodeURI(version));
  } else {
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

export interface Resource {
  apiVersion?: string;
  kind?: string;
  metadata?: V1ObjectMeta;
}

export interface ResourceList<T extends Resource = Resource> {
  apiVersion: "v1";
  kind: "List";
  metadata: V1ListMeta;
  items: Array<T>;
}

export function resourceToString(resource: Resource): string {
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

export function isResourceList(resource: Resource): resource is ResourceList {
  return resource.kind === "List";
}

export class KubeCustomApi<T extends Resource> {
  private config: KubeConfig;
  private apiVersion: string;
  private kind: string;

  constructor(config: KubeConfig, apiVersion: string, kind: string) {
    this.config = config;
    this.apiVersion = apiVersion;
    this.kind = kind;
  }

  public async read(name: string, namespace?: string): Promise<T> {
    return await this.request({
      method: "GET",
      url: this.createEndpoint(namespace, name)
    });
  }

  public async list(namespace?: string): Promise<ResourceList<T>> {
    return await this.request({
      method: "GET",
      url: this.createEndpoint(namespace)
    });
  }

  public async create(body: T, namespace?: string): Promise<T> {
    return await this.request({
      method: "POST",
      url: this.createEndpoint(namespace),
      body: JSON.stringify(body)
    });
  }

  public async patch(
    name: string,
    body: object,
    namespace?: string
  ): Promise<T> {
    return await this.request({
      method: "PATCH",
      headers: {
        "Content-Type": "application/merge-patch+json"
      },
      url: this.createEndpoint(namespace, name),
      body: JSON.stringify(body)
    });
  }

  public async deleteCollection(
    namespace?: string,
    parameters?: ParsedUrlQueryInput
  ): Promise<ResourceList<T>> {
    return await this.request({
      method: "DELETE",
      url: this.createEndpoint(namespace, undefined, parameters)
    });
  }

  private createEndpoint(
    namespace?: string,
    name?: string,
    params?: ParsedUrlQueryInput
  ): string {
    let url = createEndpoint(this.apiVersion, this.kind, namespace);

    if (name) {
      url += "/" + name;
    }

    if (params) {
      url += "?" + querystring.stringify(params);
    }

    return url;
  }

  private async request<U>(options: Options): Promise<U> {
    options.baseUrl = this.config.getCurrentCluster().server;
    this.config.applyToRequest(options);
    return await trace(() => localRequest(options));
  }
}
