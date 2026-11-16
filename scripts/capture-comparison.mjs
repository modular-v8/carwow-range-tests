// Start the root dashboard launcher before running npm run screenshots.
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const output = new URL('../docs/images/', import.meta.url);
await mkdir(output, {recursive:true});
const browser = await chromium.launch({
  headless:true,
  ...(process.env.DASHBOARD_BROWSER_CHANNEL ? {channel:process.env.DASHBOARD_BROWSER_CHANNEL} : {})
});
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000}, deviceScaleFactor:1});
  for (const version of ['before','after']) {
    await page.goto(`http://127.0.0.1:8775/${version}/#overview`);
    await page.waitForSelector('.stats');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({path:fileURLToPath(new URL(`${version}-overview.png`, output)),fullPage:true});
  }
} finally {
  await browser.close();
}
console.log('Saved before and after overview screenshots in docs/images/.');
