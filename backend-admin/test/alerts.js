const util = require('util');
const exec = util.promisify(require('child_process').exec);
const axios = require('axios');
const { waitFor, getHeaderWithOauthProxyCookie } = require('../../common/util/utils');
const { init, resource, getNamespaces, TYPE, ACTION } = require('../../common/util/rhmds-api');
let headers;
let alertUrl;
let monitoringNameSpace, mssNamespace, pushNamespace, mdcNamespace;
const openshiftAdminUser = process.env.OPENSHIFT_ADMIN_USERNAME;
const openshiftAdminPassword = process.env.OPENSHIFT_ADMIN_PASSWORD;
describe('MDC alerts test', function() {
    this.timeout(0);
    before('authenticate with oauth proxy', async() => {
        await init();
        mdcNamespace = await getNamespaces("mobile-developer-console");
        await getParam();
    });
    it('should check whether MDC alerts are already active', async ()=>{
        await waitFor(async() => {
            const result = await axios.request({
                url: alertUrl,
                headers,
                method: 'get'
            });
            const alertList =  result.data.data.alerts;
            for(const alert of alertList){
                if(alert.labels.alertname === 'MobileDeveloperConsoleContainerDown' || alert.labels.alertname === 'MobileDeveloperConsoleOperatorDown' || alert.labels.alertname === 'MobileDeveloperConsoleDown'){
                    return false;
                }
                else{
                    return true;
                }
            }
        }, 3 * 60000);
    })
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

        //check that the alerts are still active
        await waitFor(async() => {
            const result = await axios.request({
                url: alertUrl,
                headers,
                method: 'get'
            });
            if((result.data.data.alerts.findIndex(alert =>
                alert.labels.alertname === 'MobileDeveloperConsoleContainerDown'
            ))===-1){
                return true;
            }
        }, 3 * 60000);
    });
    it('should trigger mdc operator alert', async() => {
        await exec(`oc scale --replicas=0 deployment/mobile-developer-console-operator -n ${mdcNamespace}`)
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

        await exec(`oc scale --replicas=1 deployment/mobile-developer-console-operator -n ${mdcNamespace}`);


        //check that the alerts are still active
        await waitFor(async() => {
            const result = await axios.request({
                url: alertUrl,
                headers,
                method: 'get'
            });
            if((result.data.data.alerts.findIndex(alert =>
                alert.labels.alertname === 'MobileDeveloperConsoleOperatorDown'
            ))===-1){
                return true;
            }
        }, 3 * 60000);
    })
});
describe('MSS Alert test', function() {
    this.timeout(0);
    before("get the namespace", async() => {
        mssNamespace = await getNamespaces("mobile-security-service");
    });
    it('should check whether MSS alerts are already active', async ()=>{
        await waitFor(async() => {
            const result = await axios.request({
                url: alertUrl,
                headers,
                method: 'get'
            });
            const alertList =  result.data.data.alerts;
            for(const alert of alertList){
                if(alert.labels.alertname === 'MobileSecurityServiceOperatorDown' || alert.labels.alertname === 'MobileSecurityServiceDatabaseDown' || alert.labels.alertname === 'MobileSecurityServiceDown'){
                    return false;
                }
                else{
                    return true;
                }
            }
        }, 3 * 60000);
    })
    it('should trigger MSS operator down alert', async() => {
        await exec(`oc scale --replicas=0 deployment/mobile-security-service-operator -n ${mssNamespace}`)
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
        await exec(`oc scale --replicas=0 deployment/mobile-security-service -n ${mssNamespace}`)
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
        await exec(`oc scale --replicas=0 deployment/mobile-security-service-db -n ${mssNamespace}`)
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

        await exec(`oc scale --replicas=1 deployment/mobile-security-service-operator -n ${mssNamespace}`)

        //check that the alerts are still active
        await waitFor(async() => {
            const result = await axios.request({
                url: alertUrl,
                headers,
                method: 'get'
            });
            if((result.data.data.alerts.findIndex(alert =>
                alert.labels.alertname === 'MobileSecurityServiceOperatorDown'
            ))===-1){
                return true;
            }
        }, 3 * 60000);
    })
})
describe('UPS Alert test', function() {
    this.timeout(0);
    before("get the namespace", async() => {
        pushNamespace = await getNamespaces("mobile-unifiedpush");
    });
    it('should check whether UPS alerts are already active', async ()=>{
        await waitFor(async() => {
            const result = await axios.request({
                url: alertUrl,
                headers,
                method: 'get'
            });
            const alertList =  result.data.data.alerts;
            for(const alert of alertList){
                if(alert.labels.alertname === 'UnifiedPushConsoleDown' || alert.labels.alertname === 'UnifiedPushDatabaseDown' || alert.labels.alertname === 'UnifiedPushOperatorDown'){
                    return false;
                }
                else{
                    return true;
                }
            }
        }, 3 * 60000);
    })
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

        //check that the alerts are still active
        await waitFor(async() => {
        const result = await axios.request({
            url: alertUrl,
            headers,
            method: 'get'
        });
        if((result.data.data.alerts.findIndex(alert =>
            alert.labels.alertname === 'UnifiedPushConsoleDown'
        ))===-1){
            return true;
        }
    }, 3 * 60000);
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

        //check that the alerts are still active
        await waitFor(async() => {
        const result = await axios.request({
            url: alertUrl,
            headers,
            method: 'get'
        });
        if((result.data.data.alerts.findIndex(alert =>
            alert.labels.alertname === 'UnifiedPushDatabaseDown'
        ))===-1){
            return true;
        }
    }, 3 * 60000);
    })
    it('should trigger  UnifiedPushOperatorDown alert', async() => {
        await exec(`oc scale --replicas=0 deployments unifiedpush-operator -n ${pushNamespace}`);
        await waitFor(async() => {
            const result = await axios.request({
                url: alertUrl,
                headers,
                method: 'get'
            })
            return result.data.data.alerts.find(alert => alert.labels.alertname === "UnifiedPushOperatorDown");
        }, 7 * 60000);
        await exec(`oc scale --replicas=1 deployments unifiedpush-operator -n ${pushNamespace}`);

        //check that the alerts are still active
        await waitFor(async() => {
        const result = await axios.request({
            url: alertUrl,
            headers,
            method: 'get'
        });
        if((result.data.data.alerts.findIndex(alert =>
            alert.labels.alertname === 'UnifiedPushOperatorDown'
        ))===-1){
            return true;
        }
    }, 3 * 60000);
    })
})
const getParam = async() => {
    monitoringNameSpace = await getNamespaces("middleware-monitoring");
    const routes = await resource(TYPE.ROUTE, ACTION.GET_ALL, null, monitoringNameSpace);
    for (const route of routes.items) {
        if (route.spec.host.startsWith('prometheus-route-middleware-monitoring')) {
            alertUrl = `https://${route.spec.host}/api/v1/alerts`;
        }
    }
    headers = await getHeaderWithOauthProxyCookie(alertUrl,openshiftAdminUser,openshiftAdminPassword);
}
// const getNameSpaces = async nameSpaceType => {
//     const namespaces = await resource(TYPE.PROJECT, ACTION.GET_ALL);
//     for (const ns of namespaces.items) {
//         if (ns.metadata.name.endsWith(nameSpaceType)) {
//             return ns.metadata.name;
//         }
//     }
// }
