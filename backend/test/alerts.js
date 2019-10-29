// @ts-nocheck
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const axios = require('axios');
const { waitFor, getOAuthProxy } = require('../../common/util/utils');
const { init, resource, TYPE, ACTION } = require('../../common/util/rhmds-api');
let headers;
let alertUrl;
let monitoringNameSpace, mssNamespace, pushNamespace, mdcNamespace;

describe('MDC alerts test', function() {
    this.timeout(0);
    before('authenticate with oauth proxy', async() => {
        await init();
        mdcNamespace = await getNameSpaces("mobile-developer-console");
        await getParam();
    });

    it('should trigger mdc down alert', async() => {
        await exec(`oc scale --replicas=0 dc mdc -n ${mdcNamespace}`);
        await waitFor(async() => {
            const result = await axios.request({
                url: alertUrl,
                headers,
                method: 'get'
            });
            return result.data.data.alerts.find(alert =>
                alert.labels.alertname === 'MobileDeveloperConsoleContainerDown'
            );
        }, 7 * 60000);

        await exec(`oc scale --replicas=1 dc mdc -n ${mdcNamespace}`);
    });
    it('should trigger mdc operator alert', async() => {
        await exec(`kubectl scale --replicas=0 deployment/mobile-developer-console-operator -n ${mdcNamespace}`)
        await waitFor(async() => {
            const result = await axios.request({
                url: alertUrl,
                headers,
                method: 'get'
            })
            return result.data.data.alerts.find(alert =>
                alert.labels.alertname === "MobileDeveloperConsoleOperatorDown"
            )
        }, 7 * 60000)

        await exec(`kubectl scale --replicas=1 deployment/mobile-developer-console-operator -n ${mdcNamespace}`)
    })
});
describe('MSS Alert test', function() {
    this.timeout(0);
    before("get the namespace", async() => {
        mssNamespace = await getNameSpaces("mobile-security-service");
    });
    it('should trigger MSS operator down alert', async() => {
        await exec(`kubectl scale --replicas=0 deployment/mobile-security-service-operator -n ${mssNamespace}`)
        await waitFor(async() => {
            const result = await axios.request({
                url: alertUrl,
                headers,
                method: 'get'
            })
            return result.data.data.alerts.find(alert =>
                alert.labels.alertname === "MobileSecurityServiceOperatorDown"
            )
        }, 7 * 60000)
    })
    it("should trigger MobileSecurityServiceDown alert", async() => {
        await exec(`kubectl scale --replicas=0 deployment/mobile-security-service -n ${mssNamespace}`)
        await waitFor(async() => {
            const result = await axios.request({
                url: alertUrl,
                headers,
                method: 'get'
            })
            return result.data.data.alerts.find(alert =>
                alert.labels.alertname === "MobileSecurityServiceDown"
            )
        }, 7 * 60000)
    })
    it("should trigger MobileSecurityServiceDatabaseDown alert", async() => {
        await exec(`kubectl scale --replicas=0 deployment/mobile-security-service-db -n ${mssNamespace}`)
        await waitFor(async() => {
            const result = await axios.request({
                url: alertUrl,
                headers,
                method: 'get'
            })
            return result.data.data.alerts.find(alert =>
                alert.labels.alertname === "MobileSecurityServiceDatabaseDown"
            )
        }, 7 * 60000)

        await exec(`kubectl scale --replicas=1 deployment/mobile-security-service-operator -n ${mssNamespace}`)
    })
})
describe('UPS Alert test', function() {
    this.timeout(0);
    before("get the namespace", async() => {
        pushNamespace = await getNameSpaces("mobile-unifiedpush");
    });
    it('should trigger UnifiedPushConsoleDown alert', async() => {
        await exec(`oc scale --replicas=0 dc unifiedpush -n ${pushNamespace}`);
        await waitFor(async() => {
            const result = await axios.request({
                url: alertUrl,
                headers,
                method: 'get'
            });
            return result.data.data.alerts.find(
                alert =>
                alert.labels.alertname === 'UnifiedPushConsoleDown'
            );
        }, 7 * 60000);

        await exec(`oc scale --replicas=1 dc unifiedpush -n ${pushNamespace}`);
    })
    it('should trigger UnifiedPushDatabaseDown alert', async() => {
        await exec(`oc scale --replicas=0 dc unifiedpush-postgresql -n ${pushNamespace}`);
        await waitFor(async() => {
            const result = await axios.request({
                url: alertUrl,
                headers,
                method: 'get'
            });
            return result.data.data.alerts.find(
                alert =>
                alert.labels.alertname === 'UnifiedPushDatabaseDown'
            );
        }, 7 * 60000);

        await exec(`oc scale --replicas=1 dc unifiedpush-postgresql -n ${pushNamespace}`);
    })
    it('should trigger  UnifiedPushOperatorDown alert', async() => {
        await exec(`kubectl scale --replicas=0 deployments unifiedpush-operator -n ${pushNamespace}`);
        await waitFor(async() => {
            const result = await axios.request({
                url: alertUrl,
                headers,
                method: 'get'
            })
            return result.data.data.alerts.find(alert => alert.labels.alertname === "UnifiedPushOperatorDown");
        }, 7 * 60000);
        await exec(`kubectl scale --replicas=1 deployments unifiedpush-operator -n ${pushNamespace}`);
    })
})
const getParam = async() => {
    // const ns = await exec("oc projects -q | grep middleware-monitoring");
    // const monitoringNameSpace = ns.stdout.slice(0, ns.stdout.length - 1);
    monitoringNameSpace = await getNameSpaces("middleware-monitoring");
    const routes = await resource(TYPE.ROUTE, ACTION.GET_ALL, null, monitoringNameSpace);
    alertUrl = `https://${routes.items[2].spec.host}/api/v1/alerts`;
    headers = await getOAuthProxy(alertUrl);
}
const getNameSpaces = async nameSpaceType => {
    const namespaces = await resource(TYPE.PROJECT, ACTION.GET_ALL);
    for (const ns of namespaces.items) {
        if (ns.metadata.name.endsWith(nameSpaceType)) {
            return ns.metadata.name;
        }
    }
}