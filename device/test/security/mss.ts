import chai = require("chai");
chai.should();

import axios from 'axios';
import * as puppeteer from 'puppeteer';

import { device } from "../../util/device";
import { GlobalUniverse } from "../../util/init";
import { config as mobileServices, dockerCompose } from "../../config/mobile-services";
import { getOAuthProxy } from "../../../common/util/utils";

describe('Mobile Security Service', function () {
    this.timeout(0);

    let numOfAppLaunches;
    let appId;
    let app;
    let headers;

    const config = mobileServices.services.find(
        service => service.name === "security"
    );

    const mssUrl = config.url;

    if (!dockerCompose) {
        
        before('authenticate with oauth proxy', async () => {
              headers = getOAuthProxy(mssUrl);
              console.log(headers);
    }

    it('should have no apps registered', async () => {
        const result = await axios.request({
            url: `${mssUrl}/api/apps`,
            headers,
            method: 'get'
        });

        result.data.length.should.equal(1);
        
        appId = result.data[0].id;

        numOfAppLaunches = result.data[0].numOfAppLaunches;
    });

    it('should check that app is enabled', async () => {
        const result = await device.execute(async (modules, universe: GlobalUniverse) => {
            const { AppSecurity } = modules['@aerogear/security'];
            const { app } = universe;

            const security = new AppSecurity(app.config);
            return await security.clientInit();
        });

        numOfAppLaunches++;

        result.data.disabled.should.equal(false);
    });

    it('should have app registered', async () => {
        const result = await axios.request({
            url: `${mssUrl}/api/apps/${appId}`,
            headers,
            method: 'get'
        });
        
        result.data.deployedVersions.length.should.equal(1);
        result.data.deployedVersions[0].numOfAppLaunches.should.equal(numOfAppLaunches);

        app = result.data.deployedVersions[0];
    });

    it('should be possible to disable app', async () => {
        await axios.request({
            url: `${mssUrl}/api/apps/${appId}/versions/disable`,
            headers,
            method: 'post',
            data: { id: appId }
        });

        const result = await device.execute(async (modules, universe: GlobalUniverse) => {
            const { AppSecurity } = modules['@aerogear/security'];
            const { app } = universe;

            const security = new AppSecurity(app.config);
            return await security.clientInit();
        });

        result.data.disabled.should.equal(true);
    });

    it('should be possible to enable app', async () => {
        app.disabled = false;

        await axios.request({
            url: `${mssUrl}/api/apps/${appId}/versions`,
            headers,
            method: 'put',
            data: [app]
        });

        const result = await device.execute(async (modules, universe: GlobalUniverse) => {
            const { AppSecurity } = modules['@aerogear/security'];
            const { app } = universe;

            const security = new AppSecurity(app.config);
            return await security.clientInit();
        });

        result.data.disabled.should.equal(false);
    });
});
