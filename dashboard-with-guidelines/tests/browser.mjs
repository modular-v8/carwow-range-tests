import {chromium} from 'playwright';
import fs from 'node:fs/promises'; import {fileURLToPath} from 'node:url';
const browser=await chromium.launch({headless:true,...(process.env.DASHBOARD_BROWSER_CHANNEL ? {channel:process.env.DASHBOARD_BROWSER_CHANNEL} : {})});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await fs.mkdir(new URL('../verification/',import.meta.url),{recursive:true});
for(const width of [1440,320]){
 await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:8775/after');await page.waitForSelector('.stats');
 for(const route of ['overview','range','reserve','battery','explore','data','method']){
  await page.goto('http://127.0.0.1:8775/after/#'+route);await page.waitForTimeout(150);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow)console.log(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth&&!e.closest('.chart-scroll,.scatter-wrap,.table-wrap,.panel-body')).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right})))); if(overflow)throw new Error('Page overflow '+width+' '+route);
  await page.screenshot({path:fileURLToPath(new URL('../verification/'+route+'-'+width+'.png',import.meta.url)),fullPage:true});
 }
}
console.log(JSON.stringify({errors,views:14}));await browser.close();if(errors.length)process.exit(1);


