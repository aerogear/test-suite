module.exports = async selector => {
  await page.waitForSelector(selector);
  const elements = await page.$$(selector);
  for (const element of elements) {
    await element.click();
  }
};
