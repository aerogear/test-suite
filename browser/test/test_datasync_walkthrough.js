const { expect } = require("chai");
const openshiftUsername = process.env.OPENSHIFT_USERNAME;
const openshiftPassword = process.env.OPENSHIFT_PASSWORD;
const { checkLinks, clickOnElements } = require("../utils/walkthrough");

describe("Test Mobile Walkthrough in Solution Explorer", () => {
  before(async () => {
    // Create anonymous browser window to keep tests isolated
    global.context = await browser.createIncognitoBrowserContext();
    page = await global.context.newPage();
    const seUrl = global.seUrl;

    await Promise.all([
      page.goto(seUrl),
      page.waitForNavigation({
        waitUntil: ["domcontentloaded", "networkidle0"]
      })
    ]);
    await page.click("#providers li:nth-child(3) a");
    await page.waitForSelector(".login-pf-header");

    // SSO login page
    expect(await page.title()).to.eql("Log in to Testing IDP");

    await page.type("#username", openshiftUsername);
    await page.type("#password", openshiftPassword);
    await Promise.all([
      page.click("input[type=submit]"),
      page.waitForNavigation()
    ]);
  });

  after(async () => {
    await page.close();
  });

  it("should redirect to Solution Patterns", async () => {
    await page.waitForSelector(
      "#datasync-starter\\.git-walkthroughs-1-exploring-datasync-codeready article"
    );
    await page.click("#pf-tab-1-solutionPatternsTab");
  });
  it("should open the Data Sync WT and verify the sidebar links", async () => {
    await Promise.all([
      page.click(
        "#datasync-starter\\.git-walkthroughs-1-exploring-datasync-codeready article"
      ),
      page.waitForNavigation({ waitUntil: ["domcontentloaded"] })
    ]);
    await checkLinks(".integr8ly-module-frame a");
  });
  it("should open the Task 01 and verify the links", async () => {
    await page.waitForSelector("#get-started-01");
    await page.click("#get-started-01");
    await checkLinks(".integr8ly-c-card--content a");
  });
  it("should open the Task 02 and verify the links", async () => {
    await clickOnElements('input[name*="Yes"]');
    await page.click("#nextPartWalkthrough");
  });
  it("should open the Task 03 and verify the links", async () => {
    await clickOnElements('input[name*="Yes"]');
    await page.click("#nextPartWalkthrough");
    await checkLinks(".integr8ly-c-card--content a");
  });
  it("should open the Task 04 and verify the links", async () => {
    await page.click("#nextPartWalkthrough");
  });
  it("should finish the walkthrough", async () => {
    await clickOnElements('input[name*="Yes"]');
    await page.click("#nextPartWalkthrough");
  });
});
