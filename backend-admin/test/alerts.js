const util = require('util');
const { expect } = require('chai')
const exec = util.promisify(require('child_process').exec);
const axios = require('axios');
const { waitFor, getHeaderWithOauthProxyCookie } = require('../../common/util/utils');
const { init, resource, getNamespaces, TYPE, ACTION } = require('../../common/util/rhmds-api');
let headers;
let alertUrl;
let alertList = [];
let monitoringNameSpace, pushNamespace
const openshiftAdminUser = process.env.OPENSHIFT_ADMIN_USERNAME;
const openshiftAdminPassword = process.env.OPENSHIFT_ADMIN_PASSWORD;

describe('UPS Alert test', function() {
    this.timeout(0);
    before("get push namespace and oauth token", async() => {
        await init();
        pushNamespace = await getNamespaces("mobile-unifiedpush");
        await getParam();
    });
    it('Should check whether UPS alerts are not active before test', async ()=>{
        let checkAlertList;
        const activeAlerts = await getActiveAlertNames(alertUrl,headers);
        activeAlerts.forEach(alert => {
            checkAlertList =  checkAlertName(alert.labels.alertname);
    });
        expect(checkAlertList).to.be.an('array').that.is.empty;
    })
    it('Should trigger UnifiedPushConsoleDown alert', async() => {
        await scaleDownPod('dc','unifiedpush',pushNamespace);
        await waitFor(async() => {
            const result = await getActiveAlertNames(alertUrl,headers);
            return result.find( alert => alert.labels.alertname ===  'UnifiedPushConsoleDown');
        }, 8 * 60000);
        await scaleUpPod('dc','unifiedpush',pushNamespace);
        //make sure alert disappears after scaling up the pod
        await waitFor(async() => {
            const result = await getActiveAlertNames(alertUrl,headers);
            return result.findIndex( alert => alert.labels.alertname ===  'UnifiedPushConsoleDown')=== -1;
        }, 3 * 60000);
    })
    it('Should trigger UnifiedPushDatabaseDown alert', async() => {
        await scaleDownPod('dc','unifiedpush-postgresql',pushNamespace);
        await waitFor(async() => {
            const result = await getActiveAlertNames(alertUrl,headers);
            return result.find( alert => alert.labels.alertname ===  'UnifiedPushDatabaseDown');
        }, 8 * 60000);
        await scaleUpPod('dc','unifiedpush-postgresql',pushNamespace);
        //make sure alert disappears after scaling up the pod
        await waitFor(async() => {
            const result = await getActiveAlertNames(alertUrl,headers);
            return result.findIndex( alert => alert.labels.alertname ===  'UnifiedPushDatabaseDown')=== -1;
        }, 3 * 60000);
    })
    it('Should trigger UnifiedPushOperatorDown alert', async() => {
        await scaleDownPod('deployments','unifiedpush-operator',pushNamespace);
        await waitFor(async() => {
            const result = await getActiveAlertNames(alertUrl,headers);
            return result.find( alert => alert.labels.alertname ===  'UnifiedPushOperatorDown');
        }, 8 * 60000);
        await scaleUpPod('deployments','unifiedpush-operator',pushNamespace);;
        //make sure alert disappears after scaling up the pod
        await waitFor(async() => {
            const result = await getActiveAlertNames(alertUrl,headers);
            return result.findIndex( alert => alert.labels.alertname ===  'UnifiedPushOperatorDown')=== -1;
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
function checkAlertName(alertName){
    if(alertName=== 'UnifiedPushConsoleDown' || alertName=== 'UnifiedPushOperatorDown' || alertName === 'UnifiedPushDatabaseDown' || alertName === 'UnifiedPushDown'){
        alertList.push(alertName);
    }
    return alertList;
}
async function getActiveAlertNames(alertUrl, headers){
        const result = await axios.request({
            url: alertUrl,
            headers,
            method: 'get'
        });
        return result.data.data.alerts;
}
async function scaleDownPod(resourceType, resource, namespace){
    await exec(`oc scale --replicas=0 ${resourceType} ${resource} -n ${namespace}`);
};
async function scaleUpPod(resourceType, resource, namespace){
    await exec(`oc scale --replicas=1 ${resourceType} ${resource} -n ${namespace}`);
}