const {
    createApp,
    deleteApp,
    openApp,
    bindServiceToApp,
    login,
    unbindServiceFromApp,
    parseMobileServicesConfig
} = require('../utils/mdc')

const { 
    appName,
    syncServiceName,
    syncUrl,
    idmServiceName,
    idmUser,
    idmPassword,
    idmRealmName,
    mssServiceName,
    mssAppId,
    upsServiceName,
    upsAndroidSenderId,
    upsAndroidServerKey,
    upsIosCertificate,
    upsIosPassword
} = require('../config')

describe('Test binding of all services', () => {

    before(async () => {
        await login()
    })
    after(async () => {
        await page.close()
    })

    it('should successfully create an app in MDC', async () => {
        await createApp(appName)
    })

    it('mobile-services.json configuration should not contain config of any service', async () => {
        await openApp(appName)
        const parsedMobileConfig = await parseMobileServicesConfig()
        // Make sure the list of services in the config is empty
        expect(parsedMobileConfig.services).to.be.empty
    })

    it('binding Data Sync service should complete successfully', async () => {
        await bindServiceToApp(appName, syncServiceName, { syncUrl })
    })
    it('binding Identity Management service should complete successfully', async () => {
        await bindServiceToApp(appName, idmServiceName, { idmRealmName, idmUser, idmPassword })
    })
    it('binding Mobile Security Service service should complete successfully', async () => {
        await bindServiceToApp(appName, mssServiceName, { mssAppId })
    })
    it('binding Unified Push Server should complete successfully', async () => {
        await bindServiceToApp(appName, upsServiceName, { upsAndroidSenderId, upsAndroidServerKey, upsIosCertificate, upsIosPassword })
    })
    it('mobile-services.json configuration should be updated with configuration from all services', async () => {
        await Promise.all([
            page.click('a[href="#configuration"]'),
            page.waitForNavigation({ waitUntil: ['domcontentloaded', 'networkidle0'] })
        ]);
        // Wait for mobile-services.json to be updated so it contains config for all services (4)
        await page.waitForFunction(() =>
            JSON.parse(document.querySelector('.mobile-client-config pre').textContent).services.length === 4
        );

        const parsedMobileConfig = await parseMobileServicesConfig()
        const { services } = parsedMobileConfig
        // Make sure the config contains all required services' properties
        for (service of services) {
            switch (service.name) {
                case 'keycloak':
                    expect(service).to.be.an('object')
                    expect(service).to.include.all.keys('config', 'id', 'name', 'type', 'url')
                    expect(service.config).to.have.keys('auth-server-url', 'confidential-port', 'public-client', 'realm', 'resource', 'ssl-required')
                    expect(service.config.resource).to.eql(`${appName}-client`)
                    expect(service.config.realm).to.eql(idmRealmName)
                    break
                case 'push':
                    expect(service).to.be.an('object')
                    expect(service).to.include.all.keys('config', 'id', 'name', 'type', 'url')
                    expect(service.config).to.have.keys('android')
                    expect(service.config.android).to.include.all.keys('variantId', 'variantSecret')
                    break
                case 'security':
                    expect(service).to.be.an('object')
                    expect(service).to.have.keys('id', 'name', 'type', 'url')
                    break
                case 'sync-app':
                    expect(service).to.be.an('object')
                    expect(service).to.include.all.keys('config', 'id', 'name', 'type', 'url')
                    expect(service).to.have.property('url', `https://${syncUrl}/graphql`)
                    expect(service).to.have.deep.property('config', { websocketUrl: `wss://${syncUrl}/graphql` })
                    break
            }

        }
    })
    it('unbinding all services should complete successfully', async () => {
        await unbindServiceFromApp(appName, syncServiceName)
        await unbindServiceFromApp(appName, idmServiceName)
        await unbindServiceFromApp(appName, mssServiceName)
        await unbindServiceFromApp(appName, upsServiceName)
    })
    it('deleting app should work', async () => {
        await deleteApp(appName)
    })
})