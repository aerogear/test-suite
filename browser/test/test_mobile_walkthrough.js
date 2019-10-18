const openshiftUsername = process.env.OPENSHIFT_USERNAME;
const openshiftPassword = process.env.OPENSHIFT_PASSWORD;
const { checkLinks, clickOnElements } = require("../utils/walkthrough");

describe("Test Mobile Walkthrough in Solution Explorer", () => {
  before(async () => {
    // Create anonymous browser window to keep tests isolated
    context = await browser.createIncognitoBrowserContext();
    page = await context.newPage();
    const openshiftConsoleUrl = global.openshiftConsoleUrl;

    await Promise.all([
      page.goto(openshiftConsoleUrl),
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

    // OpenShift Console main page
    expect(await page.title()).to.eql("OpenShift Web Console");
  });

  after(async () => {
    await page.close();
  });

  it("should redirect to Solution Explorer", async () => {
    await page.waitForSelector(".card a", { visible: true });
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".card a")].find(header =>
        header.textContent.includes("Solution Explorer")
      )
    );
    const solutionExplorerUrl = await page.$$eval(".card a", cards =>
      cards
        .map(card => card.href)
        .find(href => href.includes("tutorial-web-app"))
    );

    await page.evaluate(
      link => document.querySelector(`a[href="${link}"]`).click(),
      solutionExplorerUrl
    );

    const newTarget = await browser.waitForTarget(
      target => target.url() === solutionExplorerUrl
    );
    page = await newTarget.page();
    await page.waitForSelector(
      "#mobile-walkthrough-walkthroughs-1-ionic-showcase article"
    );
  });
  it("should open the Mobile WT and verify the links", async () => {
    await Promise.all([
      page.click("#mobile-walkthrough-walkthroughs-1-ionic-showcase article"),
      page.waitForNavigation({ waitUntil: ["domcontentloaded"] })
    ]);
    await checkLinks(".integr8ly-c-card--content a");
  });
  it("should open the Task 01 and verify the links", async () => {
    await page.click("#get-started-01");
    await checkLinks(".integr8ly-c-card--content a");
  });
  it("should open the Task 02 and verify the links", async () => {
    await clickOnElements('input[label="Yes"]');
    await page.click("#nextPartWalkthrough");
    await checkLinks(".integr8ly-c-card--content a");
  });
  it("should open the Task 03 and verify the links", async () => {
    await page.click("#nextPartWalkthrough");
    await checkLinks(".integr8ly-c-card--content a");
  });
  it("should open the Task 04 and verify the links", async () => {
    await clickOnElements('input[label="Yes"]');
    await page.click("#nextPartWalkthrough");
    await checkLinks(".integr8ly-c-card--content a");
  });
  it("should open the Task 05 and verify the links", async () => {
    await clickOnElements('input[label="Yes"]');
    await page.click("#nextPartWalkthrough");
  });
  it("should finish the walkthrough", async () => {
    await clickOnElements('input[label="Yes"]');
    await page.click("#nextPartWalkthrough");
  });
});
