const util = require('util');
const exec = util.promisify(require('child_process').exec);
const axios = require('axios');
const { waitFor, getOAuthProxy } = require('../../common/util/utils');
const { init, getMdcNamespace, resource, TYPE, ACTION } = require('../../common/util/rhmds-api');
describe('Alerts test', function() {
    this.timeout(0);
    let headers;
    let alertUrl;

    before('authenticate with oauth proxy', async() => {
        await init();
        const ns = await exec("oc projects -q | grep middleware-monitoring");
        const monitoringNameSpace = ns.stdout.slice(0, ns.stdout.length - 1);
        const routes = await resource(TYPE.ROUTE, ACTION.GET_ALL, null, monitoringNameSpace);
        alertUrl = `https://${routes.items[2].spec.host}/api/v1/alerts`;
        headers = await getOAuthProxy(alertUrl);
    });

    it('should trigger mdc down alert', async() => {
        const mdcNamespace = getMdcNamespace();
        await exec(`oc scale --replicas=0 dc mdc -n ${mdcNamespace}`);
        await waitFor(async() => {
            const result = await axios.request({
                url: alertUrl,
                headers,
                method: 'get'
            });
            return result.data.data.alerts.find(
                alert =>
                alert.labels.alertname === 'MobileDeveloperConsoleContainerDown'
            );
        }, 5 * 60000);

        await exec(`oc scale --replicas=1 dc mdc -n ${mdcNamespace}`);
    });
});