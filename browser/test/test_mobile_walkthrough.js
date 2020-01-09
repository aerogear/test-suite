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

    await page.waitForSelector(".login-pf-header");

    // SSO login page
    expect(await page.title()).to.eql("Log in to openshift");

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

  it("should redirect to Solution Explorer", async () => {
    await page.waitForSelector(
      "#mobile-walkthrough-walkthroughs-1-ionic-showcase article"
    );
  });
  it("should open the Mobile WT and verify the links", async () => {
    await page.click("button[aria-controls=solutionPatternsTabSection]");
    await Promise.all([
      page.click("#mobile-walkthrough-walkthroughs-1-ionic-showcase article"),
      page.waitForNavigation({ waitUntil: ["domcontentloaded"] })
    ]);
    await checkLinks(".integr8ly-c-card--content a");
  });
  it("should open the Task 01 and verify the links", async () => {
    page.click("#get-started-01");
    await checkLinks(".integr8ly-c-card--content a");
  });
  it("should open the Task 02 and verify the links", async () => {
    await clickOnElements('input[name*="Yes"]');
    await page.click("#nextPartWalkthrough");
    await checkLinks(".integr8ly-c-card--content a");
  });
  it("should open the Task 03 and verify the links", async () => {
    await clickOnElements('input[name*="Yes"]');
    await page.click("#nextPartWalkthrough");
    await checkLinks(".integr8ly-c-card--content a");
  });
  it("should open the Task 04 and verify the links", async () => {
    await clickOnElements('input[name*="Yes"]');
    await page.click("#nextPartWalkthrough");
  });
  it("should finish the walkthrough", async () => {
    await clickOnElements('input[name*="Yes"]');
    await page.click("#nextPartWalkthrough");
  });
});
