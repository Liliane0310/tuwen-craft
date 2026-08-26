const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1560 }, deviceScaleFactor: 1 });
  const fileUrl = 'file:///' + path.resolve('我的封面设计.html').replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const el = await page.$('.cover');
  await el.screenshot({ path: '封面预览v1.png' });
  console.log('done');
  await browser.close();
})();
