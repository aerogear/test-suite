const puppeteer = require('puppeteer')
const { expect } = require('chai')

const opts = {
    ignoreHTTPSErrors: true,
    headless: process.env.HEADLESS !== 'false',
    // Uncommenting the next line will slow down all actions
    // performed by the Puppeteer by <value> milliseconds.
    // Pretty useful when fixing/writing a test
    slowMo: 10,
    defaultViewport: null
}

before(async () => {
    global.expect = expect
    global.browser = await puppeteer.launch(opts)
    global.page
})

after(() => {
    browser.close()
})