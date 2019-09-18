const puppeteer = require('puppeteer')
const { expect } = require('chai')

const opts = {
    ignoreHTTPSErrors: true,
    headless: process.env.HEADLESS !== 'false'
}

before(async () => {
    global.expect = expect
    global.browser = await puppeteer.launch(opts)
})

after(() => {
    browser.close()
})