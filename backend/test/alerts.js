// @ts-nocheck
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const axios = require('axios');
const { waitFor, getOAuthProxy } = require('../../common/util/utils');
const puppeteer = require('puppeteer');
const { init, getMdcNamespace } = require('../../common/util/rhmds-api');
describe('Alerts test', function() {
    this.timeout(0);
    let headers;
    let browser;
    before('authenticate with oauth proxy', async() => {
        headers = await getOAuthProxy(process.env['ALERT_URL']);
    });

    it('should trigger mdc down alert', async() => {
        await init();
        const mdcNamespace = getMdcNamespace();
        await exec(`oc scale --replicas=0 dc mdc -n ${mdcNamespace}`);
        await waitFor(async() => {
            const result = await axios.request({
                url: process.env['ALERT_URL'],
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