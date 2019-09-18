const login = require('../utils/login')
const openshift_username = process.env.OPENSHIFT_USERNAME

describe('Test MDC Login and Logout', () => {
  let page

  after(async () => {
    await page.close()
  })

  it('should successfully login to MDC via oAuth Proxy', async () => {
    page = await login()
  })

  it('should display correct username in top right corner', async () => {
    const username = await page.$eval('#app-user-dropdown > span.dropdown-title', el => el.textContent);
    expect(username).to.eql(openshift_username)
  })

  it('should successfully logout from MDC', async () => {
    await page.click('button[id=app-user-dropdown]')
    await page.waitForSelector('li.dropdown.open a')
    
    const logoutButton = await page.$('[href="/oauth/sign_in"]')
    await Promise.all([
      logoutButton.click(),
      page.waitForNavigation()
    ]);
    expect(await page.title()).to.eql('Log In')
    
  })
})