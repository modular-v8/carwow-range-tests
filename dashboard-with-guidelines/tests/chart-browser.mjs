import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const outputDir = new URL('../verification/', import.meta.url);
await fs.mkdir(outputDir, {recursive:true});
const output = name => fileURLToPath(new URL(name, outputDir));
const b=await chromium.launch({headless:true,...(process.env.DASHBOARD_BROWSER_CHANNEL ? {channel:process.env.DASHBOARD_BROWSER_CHANNEL} : {})}),p=await b.newPage({acceptDownloads:true});
for(const width of [320,768,1440]){
 await p.setViewportSize({width,height:1000});await p.goto('http://127.0.0.1:8775/after');await p.waitForSelector('.stats');
 for(const route of ['overview','range','reserve','battery','explore']){
  await p.goto('http://127.0.0.1:8775/after/#'+route);await p.waitForTimeout(250);
  const min=await p.evaluate(()=>Math.min(...[...document.querySelectorAll('svg text')].map(e=>parseFloat(getComputedStyle(e).fontSize)*Math.hypot(e.getScreenCTM().a,e.getScreenCTM().b))));
  if(min<13.9)console.log(await p.locator("svg").evaluateAll(es=>es.map(e=>({box:e.getBoundingClientRect().toJSON(),view:e.getAttribute("viewBox"),parent:e.parentElement.getBoundingClientRect().toJSON()}))));if(min<13.9)throw Error(`${width} ${route}: font ${min}`);
 }
}
await p.setViewportSize({width:390,height:900});await p.goto('http://127.0.0.1:8775/after/#overview');await p.waitForTimeout(300);
await p.locator('#comparison').screenshot({path:output('chart-mobile.png')});
const pending=p.waitForEvent('download');await p.locator('[data-download="comparison"]').click();const dl=await pending;await dl.saveAs(output('comparison.svg'));
const svg=await fs.readFile(output('comparison.svg'),'utf8');if(!svg.includes('font-size:14px'))throw Error('Export text mismatch');
await p.setContent(svg);await p.screenshot({path:output('export-preview.png')});
await p.goto('http://127.0.0.1:8775/after/');await p.reload();await p.goto('http://127.0.0.1:8775/after/#explore');await p.waitForSelector('#x-axis');await p.locator('#x-axis').selectOption('efficiency');await p.locator('[data-unit="km"]').click();await p.locator('#make').selectOption('Tesla');
await p.evaluate(()=>document.body.style.zoom='2');await p.waitForTimeout(300);await p.screenshot({path:output('zoom-preview.png'),fullPage:true});
await b.close();console.log('PASS: rendered text >=14px at mobile/tablet/desktop; export typography; unit/measure/filter changes; zoom screenshot.');



