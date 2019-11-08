import path from "path";
import fs from "fs";
import yaml from "yaml";
function loadNamespacedResources(dir, namespace) {
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
function loadResource(file) {
    const a = fs.readFileSync(file);
    return yaml.parse(a.toString());
}
export async function restoreNamespace(helper, dir, namespace, priority = [], excluded = []) {
    // load all namespace resources from the dir
    const rs = loadNamespacedResources(dir, namespace);
    // restore the namespace itself
    await helper.create(loadResource(rs["namespace"]));
    delete rs["namespace"];
    // remove all excluded resources from the rs list
    excluded.forEach(e => delete rs[e]);
    // restore first the prioritized resources
    for (const n of priority) {
        await helper.create(loadResource(rs[n]));
        delete rs[n]; // remove the resource after importing it
    }
    // restore all reaming resources
    for (const n in rs) {
        await helper.create(loadResource(rs[n]));
    }
}
