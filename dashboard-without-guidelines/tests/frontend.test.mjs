// DOM-independent render/interaction smoke checks. These do not replace visual QA.
// Start the root dashboard launcher before running: node tests/frontend.test.mjs
import assert from 'node:assert/strict';

let payload=await (await fetch('http://127.0.0.1:8775/before/api/data')).json();
assert.equal(payload.status,'connected');
const nodes=new Map(),windowListeners=new Map(),timers=[];
class Element {
  constructor(){this.innerHTML='';this.textContent='';this.value='';this.dataset={};this.style={};this.listeners=new Map();this.classList={toggle(){}};this.hidden=false;}
  addEventListener(type,fn){this.listeners.set(type,fn);}
  setAttribute(){}
  removeAttribute(){}
  insertAdjacentHTML(_where,text){this.innerHTML+=text;}
}
const node=key=>{if(!nodes.has(key))nodes.set(key,new Element());return nodes.get(key);};
const mi=new Element(),km=new Element();mi.dataset.unit='mi';km.dataset.unit='km';
globalThis.document={querySelector:node,querySelectorAll:selector=>selector==='[data-unit]'?[mi,km]:[],addEventListener(){}};
globalThis.location={hash:'#overview'};
globalThis.window={addEventListener:(type,fn)=>windowListeners.set(type,fn),scrollTo(){}};
globalThis.fetch=async()=>({ok:true,json:async()=>payload});
globalThis.setTimeout=(fn)=>{timers.push(fn);return timers.length;};
await import('../static/app.mjs');
await new Promise(resolve=>setImmediate(resolve));
const html=()=>node('#content').innerHTML;
const route=page=>{location.hash='#'+page;windowListeners.get('hashchange')();assert.ok(!/NaN|undefined|Infinity/.test(html()),`Invalid output on ${page}`);};
const click=b=>node('#content').listeners.get('click')({target:{closest:()=>b}});
const change=(id,value)=>node('#content').listeners.get('change')({target:{id,value,matches:()=>false}});

assert.equal(node('#filter-count').textContent,'62 / 62 EV tests');
assert.match(html(),/85\.2/);
assert.match(html(),/Skoda Superb 2.0 Diesel/);
assert.match(html(),/Audi RSQ8 V8 Petrol/);
assert.equal((html().match(/class="stat /g)||[]).length,4);
route('range');
assert.equal((html().match(/<rect class="point"/g)||[]).length,62*2+27);
change('range-sort','achievement');
assert.match(html(),/value="achievement" selected/);
route('reserve');
assert.match(html(),/12 of 62 tests/);
click({dataset:{group:'manufacturer'}});
assert.match(html(),/Distance after 0% by manufacturer/);
route('battery');
assert.equal((html().match(/type="checkbox"/g)||[]).length,54);
assert.equal((html().match(/<polyline/g)||[]).length,5);
click({dataset:{battery:'none'}});
assert.match(html(),/Select a vehicle/);
click({dataset:{battery:'all'}});
assert.equal((html().match(/<polyline/g)||[]).length,54);
route('explore');
assert.equal((html().match(/<circle class="point"/g)||[]).length,62);
change('x-axis','weight');
assert.match(html(),/61 plotted tests · 1 excluded/);
click({dataset:{},id:'swap'});
assert.match(html(),/Vehicle weight versus Achieved range scatter plot/);
route('data');
assert.equal((html().match(/<tr>/g)||[]).length,63);
click({dataset:{sort:'name'}});
assert.match(html(),/Vehicle ↑|Vehicle ↓/);
route('method');
assert.match(html(),/Battery_Depletion row 415/);

node('#make').listeners.get('change')({target:{value:'Tesla'}});
route('overview');
assert.match(node('#filter-count').textContent,/^\d+ \/ 62 EV tests$/);
const filtered=node('#filter-count').textContent;
km.listeners.get('click')();
assert.match(html(),/km\/kWh/);
assert.equal(node('#filter-count').textContent,filtered);
node('#search').listeners.get('input')({target:{value:'no-such-car'}});
assert.match(html(),/No tests in this selection/);
node('#reset').listeners.get('click')();
assert.equal(node('#filter-count').textContent,'62 / 62 EV tests');

// Saving a new workbook version triggers a rerender, retaining the active filters.
node('#make').listeners.get('change')({target:{value:'Mini'}});
payload=structuredClone(payload);
payload.data.ev[0].actual=999;
payload.data.ev[0].achievement=999/145*100;
payload.version='test-new-version';
await timers.at(-1)();
assert.equal(node('#make').value,'Mini');
assert.match(html(),/689\.0/);
assert.match(node('#filter-count').textContent,/^\d+ \/ 62 EV tests$/);
payload.status='stale';payload.message='Workbook is still being saved';
await timers.at(-1)();
assert.equal(node('#notice').hidden,false);
assert.match(node('#notice').textContent,/last successful workbook read/);
console.log('PASS: all 7 views, chart counts, filters, units, axes, battery selection, sorting, version refresh and stale warnings.');
