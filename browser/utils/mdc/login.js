const username = process.env.OPENSHIFT_USERNAME
const password = process.env.OPENSHIFT_PASSWORD
const mdcLoginPageUrl = process.env.MDC_URL

module.exports = async () => {
    // Create anonymous browser window to keep tests isolated
    context = await browser.createIncognitoBrowserContext();
    page = await context.newPage();

    await page.goto(mdcLoginPageUrl)
    
    // oAuth proxy login page
    expect(await page.title()).to.eql('Log In')
    
    await Promise.all([
      page.click('button[type=submit'),
      page.waitForNavigation()
    ])
    
    // SSO login page
    expect(await page.title()).to.eql('Log in to openshift')
    
    await page.type('#username', username);
    await page.type('#password', password);
    await Promise.all([
      page.click('input[type=submit]'),
      page.waitForNavigation()
    ]);
    
    // MDC main page
    expect(await page.title()).to.eql('Mobile Client')
}