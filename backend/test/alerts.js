const util = require('util')
const exec = util.promisify(require('child_process').exec);
const axios = require('axios');
const { waitFor } = require('../../common/util/utils');
const puppeteer = require('puppeteer')
const { init, getMdcNamespace } = require('../../common/util/rhmds-api');

describe('Alerts test', function() {
    this.timeout(0);
    let headers;
    let browser;
    before("authenticate with oauth proxy", async() => {
        const openshiftUser = process.env.OPENSHIFT_USER;
        const openshiftPass = process.env.OPENSHIFT_PASS;
        if (openshiftUser === undefined || openshiftPass === undefined) {
            throw new Error(
                "OPENSHIFT_USER and/or OPENSHIFT_PASS are not defined"
            );
        }
        browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(process.env['ALERT_URL']);
        await Promise.all([page.waitForNavigation(), page.click("button")]);
        await page.type("#username", openshiftUser);
        await page.type("#password", openshiftPass);
        await Promise.all([
            page.waitForNavigation(),
            page.click("#kc-login"),
        ]);
        const approveButton = await page.$('input[name="approve"]');
        if (approveButton) {
            await Promise.all([
                page.waitForNavigation(),
                approveButton.click(),
            ]);
        }
        const cookies = await page.cookies();
        const cookie = cookies.find(c => c.name === "_oauth_proxy").value;
        headers = { Cookie: `_oauth_proxy=${cookie}` };
    });

    after("close browser", async() => {
        await browser.close();
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
            return result.data.data.alerts.find(alert => alert.labels.alertname === 'MobileDeveloperConsoleContainerDown');
        }, 5 * 60000);

        await exec(`oc scale --replicas=1 dc mdc -n ${mdcNamespace}`);

    });
});