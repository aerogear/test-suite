const { expect } = require("chai");

module.exports = async (selector) => {
  await page.waitForSelector(selector);
  const linksToCheck = await page.$$eval(selector, (els) =>
    els.map((a) => a.href)
  );

  for (const link of linksToCheck) {
    const newPage = await context.newPage();
    let response;
    try {
      response = await newPage.goto(link, {
        waitUntil: ["domcontentloaded", "networkidle0"],
      });
      while (response === null) {
        console.log(
          `Got response: null for link ${link}. Reloading the page...`
        );
        await page.waitFor(1000);
        response = await newPage.reload({
          waitUntil: ["domcontentloaded", "networkidle0"],
        });
      }
    } catch (error) {
      console.log(`Error occured when loading page: ${error}`);
    } finally {
      let expectedStatus = 200;
      const cookieHeader = response._headers["set-cookie"];
      if (cookieHeader && cookieHeader.includes("oauth_proxy")) {
        // oAuth Proxy login page returns 403
        expectedStatus = 403;
      } else if (response._url.includes("codeready")) {
        // codeready console returns 304
        expectedStatus = 304;
      }
      await newPage.close();
      expect(response).to.be.an(
        "object",
        `Did not get a valid reponse after loading ${link}`
      );
      expect(response).to.have.property(
        "_status",
        expectedStatus,
        `Invalid link: ${link}`
      );
    }
  }
};
