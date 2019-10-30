module.exports = async appName => {
  const mdcLoginPageUrl = global.mdcUrl;
  await page.goto(mdcLoginPageUrl, {
    waitUntil: ["domcontentloaded", "networkidle0"]
  });
  await page.waitForSelector(".mobile-client-card");
  await Promise.all([
    page.click(`[href='/mobileclient/${appName}']`),
    page.waitForNavigation({ waitUntil: ["domcontentloaded", "networkidle0"] })
  ]);
};
