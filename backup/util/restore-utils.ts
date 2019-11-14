import { KubeHelper, GenericResource } from "./kube-helper";
import path from "path";
import fs from "fs";
import yaml from "yaml";
import { log } from "../../common/util/log";

function loadNamespacedResources(
  dir: string,
  namespace: string
): { [name: string]: string } {
  const re = new RegExp(`^${namespace}-(?<name>\\S+)\\.ya?ml$`);

  return fs
    .readdirSync(dir)
    .filter(f => re.test(f))
    .reduce((a, f) => {
      const match = re.exec(f);
      if (match.groups.name === undefined) {
        throw new Error(`name not matched in file: '${f}'`);
      }
      a[match.groups.name] = path.join(dir, f);
      return a;
    }, {});
}

function loadResource(file: string): GenericResource {
  const a = fs.readFileSync(file);
  return yaml.parse(a.toString());
}

async function restoreResource(
  helper: KubeHelper,
  file: string
): Promise<void> {
  const resource = loadResource(file);

  try {
    await helper.create(resource);
  } catch (e) {
    log.error("ignore error: ", e);
  }
}

export async function restoreNamespace(
  helper: KubeHelper,
  dir: string,
  namespace: string,
  priority: string[] = [],
  excluded: string[] = []
): Promise<void> {
  // load all namespace resources from the dir
  const rs = loadNamespacedResources(dir, namespace);

  // restore the namespace itself
  await restoreResource(helper, rs["namespace"]);
  delete rs["namespace"];

  // remove all excluded resources from the rs list
  excluded.forEach(e => delete rs[e]);

  // restore first the prioritized resources
  for (const n of priority) {
    await restoreResource(helper, rs[n]);
    delete rs[n]; // remove the resource after importing it
  }

  // restore all reaming resources
  for (const n in rs) {
    await restoreResource(helper, rs[n]);
  }
}
