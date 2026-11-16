import {chartStyle,formatNumber,niceAxis} from './chart-rules.mjs';
import {numeric,mean,factor,extremes,byMake,filterRows,csv,quadraticTrend} from './analysis.mjs';

const $ = s => document.querySelector(s);
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = formatNumber;
const prettyDate = d => d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : 'Date not recorded';
const short = (s,n=37) => s.length>n?s.slice(0,n-1)+'…':s;
const colors=['#003B8E', '#C8102E', '#111111', '#6689BB', '#DE7082', '#555555', '#002455', '#780A1C', '#A6BBD7', '#E9A0AC', '#888888', '#333333'];
const state={data:null,version:null,unit:'mi',make:'',date:'',query:'',page:'overview',reserveBy:'vehicle',rangeSort:'actual',x:'capacity',y:'actual',selected:null,tableSort:'actual',tableDirection:-1};
const titles={overview:['Overview','EV range-test overview','Summary of the selected Carwow EV tests.'],range:['Range performance','Claimed and achieved range','Vehicle results and manufacturer averages for the selected tests.'],reserve:['Range after 0%','Range before and after 0%','Measured distance after the battery display reached 0%.'],battery:['Battery measurements','Battery remaining and distance driven','Select vehicle tests to compare recorded battery readings.'],explore:['Compare measures','Compare test measurements','Choose the horizontal and vertical axes. Each point represents one EV test.'],data:['Test data','EV test records','Sort the selected records or download them as a CSV file.'],method:['Methodology','Sources and methods','Measurement definitions, calculations and data limitations.']};
const distanceFields=new Set(['actual','claimed','reserve','beforeZero','shortfall']);
const fields={actual:'Achieved range',claimed:'Claimed range',achievement:'Claimed range achieved',capacity:'Battery capacity',efficiency:'Calculated efficiency',reportedEfficiency:'Video-reported efficiency',weight:'Vehicle weight',reserve:'Distance after 0%',beforeZero:'Range before 0%',shortfall:'Range shortfall'};
const unitFor = field => distanceFields.has(field)?state.unit:field==='achievement'?'%':field==='capacity'?'kWh':field==='weight'?'kg':`${state.unit}/kWh`;
const convert = (n,field) => numeric(n) ? n*(distanceFields.has(field)||field.toLowerCase().includes('efficiency')?factor(state.unit):1) : null;
const value = (n,field,d=1) => `${fmt(convert(n,field),d)} ${unitFor(field)}`;
const rows = () => filterRows(state.data?.ev||[],state);
const label = r => `${r.name} (${r.year})`;
const tip = text => `data-tip="${esc(text)}" tabindex="0"`;
const chartWidth = () => Math.max(260, Math.floor($('#content').clientWidth || 1020));
const svg = (body,w,h,description) => `<svg class="chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(description)}"><title>${esc(description)}</title><desc>${esc(description)}. ${esc(state.make || "All manufacturers")}; ${esc(state.date ? prettyDate(state.date) : "all test dates")}${state.query ? "; search: " + esc(state.query) : ""}. Distance units: ${state.unit}. Source: Carwow range tests, stored in Data.xlsx. Each vehicle result represents a test; manufacturer and EV averages give each valid test equal weight. Missing measurements are excluded. Values and test identifiers are included in chart labels and mark titles.</desc><style>${chartStyle}</style>${body}</svg>`;
const empty = (message='Try resetting the filters to see more vehicles.') => `<div class="empty"><strong>No tests in this selection.</strong>${message}<br><button class="secondary" data-action="reset" style="margin-top:18px">Reset filters</button></div>`;
const chartEmpty = text => `<div class="svg-placeholder">${text}</div>`;
function download(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function panel(title,subtitle,body,foot='',id=''){return `<section class="panel" ${id?`id="${id}"`:''}><div class="panel-head"><div><h2>${title}</h2><p class="panel-subtitle">${subtitle}</p></div>${id?`<button class="download-chart" data-download="${id}" title="Download chart as SVG" aria-label="Download ${esc(title)} chart">↗</button>`:''}</div><div class="panel-body">${body}</div>${foot?`<div class="panel-foot">${foot}</div>`:''}</section>`;}
function legend(items){return `<div class="legend">${items.map(([text,color])=>`<span><i style="background:${color}"></i>${esc(text)}</span>`).join('')}</div>`;}

function bars(items,{title='',unit=state.unit,series=[['Value','#003B8E']],stack=false,reference=null,compact=false}={}){
 if(!items.length)return chartEmpty('No measurements available for this selection.');
 const w=chartWidth(),mobile=w<650,L=mobile?0:280,R=64,T=48,row=mobile?(items.some(r=>r.sub)?108:88):64,B=40,h=T+row*items.length+B,plot=w-L-R;
 const axis=niceAxis(0,Math.max(1,reference||0,...items.map(r=>stack?r.values.reduce((a,b)=>a+(b||0),0):Math.max(0,...r.values.filter(numeric)))),mobile?3:5);
 const x=n=>L+n/axis.max*plot;
 let body='';
 for(const v of axis.ticks){let px=x(v);body+=`<line class="gridline" x1="${px}" y1="${T-8}" x2="${px}" y2="${h-B}"/><text x="${px}" y="24" text-anchor="${v===0?'start':'middle'}">${axis.format(v)}</text><text x="${px}" y="${h-12}" text-anchor="${v===0?'start':'middle'}">${axis.format(v)}</text>`;}
 if(reference!==null)body+=`<line x1="${x(reference)}" x2="${x(reference)}" y1="${T}" y2="${h-B}" stroke="#C8102E" stroke-dasharray="4 4"/>`;
 items.forEach((item,i)=>{const y=T+i*row,barY=y+(mobile?(item.sub?48:28):0);body+=`<text class="chart-label" x="${mobile?0:L-16}" y="${y+16}" text-anchor="${mobile?'start':'end'}" ${tip(item.full||item.name)}>${esc(short(item.name,mobile?Math.floor(w/8):32))}</text>`;
 if(item.sub)body+=`<text x="${mobile?0:L-16}" y="${y+36}" text-anchor="${mobile?'start':'end'}">${esc(item.sub)}</text>`;
 let offset=0;item.values.forEach((v,j)=>{if(!numeric(v))return;const bh=stack||item.values.length===1?20:16,by=barY+(stack?0:j*24),detail=`${item.full||item.name}\n${item.date||item.sub||''}\n${series[j]?.[0]||'Range'}: ${fmt(v)} ${unit}`;
 body+=`<rect class="point" x="${x(stack?offset:0)}" y="${by}" width="${v/axis.max*plot}" height="${bh}" fill="${item.color||series[j]?.[1]||colors[j%colors.length]}" ${tip(detail)}><title>${esc(detail)}</title></rect>`;
 if(!stack)body+=`<text x="${x(v)+8}" y="${by+14}">${fmt(v)}</text>`;offset+=v;});
 if(stack)body+=`<text x="${x(offset)+8}" y="${barY+16}">${fmt(offset)}</text>`;
 });
 body+=`<text x="${w}" y="24" text-anchor="end">${esc(unit)}</text>`;
 return svg(body,w,h,title);
}

function stat(title,amount,suffix,note,accent=false,icon='↗'){return `<div class="stat ${accent?'accent':''}"><span class="stat-label">${title}</span><span class="stat-icon" aria-hidden="true">${icon}</span><div class="stat-value">${amount}<small>${suffix}</small></div><div class="stat-note">${note}</div></div>`;}
function recordCard(title,field,highLabel,lowLabel,ev){const ex=extremes(ev,field);return `<div class="record-card"><div class="record-header">${title}<span>↕</span></div>${[['max',highLabel],['min',lowLabel]].map(([kind,text])=>{const group=ex[kind],first=group[0];return `<div class="record-entry ${kind==='min'?'low':''}"><div><div class="label">${text}</div><div class="record-name">${first?group.map(r=>esc(r.name)).join('<br>'):'Not recorded'}</div><div class="record-date">${first?group.map(r=>`${esc(r.year)} model`).join('<br>'):''}</div></div><div class="record-value">${fmt(convert(first?.[field],field),field==='efficiency'?1:0)}<small>${esc(unitFor(field))}</small></div></div>`;}).join('')}</div>`;}
function overview(ev){
  if(!ev.length)return empty();
  const achievement=mean(ev.map(r=>r.achievement)),actual=mean(ev.map(r=>r.actual)),eff=mean(ev.map(r=>r.efficiency)),manufacturers=new Set(ev.map(r=>r.make)).size;
  const compare=[{name:'Average electric vehicle',sub:`${ev.filter(r=>numeric(r.actual)).length} EV tests in this selection`,values:[convert(actual,'actual')],color:'#003B8E'},...state.data.ice.map(r=>({name:r.name,date:prettyDate(r.date),sub:`Combustion vehicle`,values:[convert(r.actual,'actual')],color:r.trim.toLowerCase().includes('diesel')?'#111111':'#C8102E'}))];
  const top=byMake(ev,'achievement').filter(r=>numeric(r.value)).slice(0,5);
  return `<div class="stats">${stat('EV test records',ev.length,'',`${manufacturers} manufacturers in this selection`,false,'▦')}${stat('Average claimed range achieved',fmt(achievement,0),'%',`${ev.filter(r=>numeric(r.achievement)).length} tests with both range measures`,true,'↗')}${stat('Average achieved range',fmt(convert(actual,'actual'),0),state.unit,'Measured distance to a stop',false,'↔')}${stat('Average calculated efficiency',fmt(convert(eff,'efficiency'),1),`${state.unit}/kWh`,'Achieved range ÷ battery capacity',false,'ϟ')}</div>
  <div class="section-title"><h2>Highest and lowest test results</h2><span>Individual EV test results · current selection</span></div>
  <div class="records">${recordCard('Claimed range achieved','achievement','Highest percentage','Lowest percentage',ev)}${recordCard('Achieved range','actual','Longest distance','Shortest distance',ev)}${recordCard('Calculated efficiency','efficiency','Highest calculated efficiency','Lowest calculated efficiency',ev)}</div>
  <div class="grid-two">${panel('EV and combustion range','Selected EV average and individual combustion test results.',bars(compare,{title:'Combustion vehicles versus the average EV highway range',compact:true,series:[['Achieved range','#003B8E']]}),'Combustion results stay fixed when EV filters change. These vehicles were tested separately, under different conditions.','comparison')}
  ${panel('Highest average range percentages','Up to five manufacturers, ranked by mean claimed range achieved.',`<div class="top-list">${top.map((r,i)=>`<div class="rank"><em>0${i+1}</em><div><strong>${esc(r.name)}</strong> <span style="color:#666666;font-size:9px">${r.count} tests</span><div class="rank-track"><i style="width:${Math.min(100,r.value/120*100)}%"></i></div></div><span>${fmt(r.value)}%</span></div>`).join('')}</div><a class="text-button" href="#range">Compare every manufacturer →</a>`,'Each test has equal weight. Test counts are shown beside each manufacturer. Conditions differ between tests.')}</div>
  <div class="insight"><span>◎</span><p><strong>Workbook updates.</strong> Save changes in Data.xlsx and these results refresh automatically, usually within 1–3 seconds. Manufacturer, date and vehicle filters apply to all EV charts.</p></div>`;
}
function rangePage(ev){
  if(!ev.length)return empty();
  const order=[...ev].filter(r=>numeric(r.actual)||numeric(r.claimed)).sort((a,b)=>(b[state.rangeSort]??-Infinity)-(a[state.rangeSort]??-Infinity));
  const items=order.map(r=>({name:label(r),full:r.name,date:prettyDate(r.date),values:[convert(r.claimed,'claimed'),convert(r.actual,'actual')]}));
  const brands=byMake(ev,'achievement').filter(r=>numeric(r.value));
  return panel('Claimed vs achieved range','Every selected vehicle test. Test dates are available in the bar details.',`<div class="chart-controls"><label>Sort vehicles by<select id="range-sort">${['actual','claimed','achievement'].map(f=>`<option value="${f}" ${state.rangeSort===f?'selected':''}>${fields[f]}</option>`).join('')}</select></label></div>${legend([['Claimed range','#bbbbbb'],['Achieved range','#003B8E']])}<div class="chart-scroll">${bars(items,{title:'Claimed versus achieved range by vehicle',series:[['Claimed range','#bbbbbb'],['Achieved range','#003B8E']]})}</div>`,'Hover or focus a bar to inspect a result. Scroll within the chart to see every test.','range-chart')+
  panel('Claimed range achieved by manufacturer','Average percentage by manufacturer. The dashed line marks 100%.',`<div class="chart-scroll">${bars(brands.map(r=>({name:r.name,sub:`${r.count} valid test${r.count===1?'':'s'} of ${r.total}`,values:[r.value]})),{title:'Percentage of claimed range achieved by manufacturer',unit:'%',reference:100,series:[['Mean claimed range achieved','#003B8E']]})}</div>`,'Calculated per vehicle as achieved ÷ claimed × 100, then averaged within each manufacturer. Each valid test has equal weight.','manufacturer-chart');
}
function reservePage(ev){
  if(!ev.length)return empty();
  const measured=ev.filter(r=>numeric(r.reserve)),missing=ev.length-measured.length;
  const items=state.reserveBy==='vehicle'?[...measured].sort((a,b)=>b.reserve-a.reserve).map(r=>({name:label(r),full:r.name,date:prettyDate(r.date),values:[convert(r.reserve,'reserve')]})):byMake(ev,'reserve').filter(r=>numeric(r.value)).map(r=>({name:r.name,sub:`${r.count} measured of ${r.total} tests`,values:[convert(r.value,'reserve')]}));
  const split=measured.filter(r=>numeric(r.beforeZero)).sort((a,b)=>b.actual-a.actual).map(r=>({name:label(r),full:r.name,date:prettyDate(r.date),values:[convert(r.beforeZero,'beforeZero'),convert(r.reserve,'reserve')]}));
  return `<div class="stats">${stat('Tests with reserve measurements',measured.length,'',`${missing} missing measurements`,false,'▤')}${stat('Average distance after 0%',fmt(convert(mean(measured.map(r=>r.reserve)),'reserve'),0),state.unit,'Mean of measured tests only',true,'↗')}${stat('Longest distance after 0%',fmt(convert(Math.max(...measured.map(r=>r.reserve)),'reserve'),0),state.unit,'Distance after displayed 0%',false,'↔')}${stat('Average distance before 0%',fmt(convert(mean(measured.map(r=>r.beforeZero)),'beforeZero'),0),state.unit,'Total distance minus reserve',false,'ϟ')}</div>`+
  panel('Distance travelled after 0%','How far vehicles travelled after the battery display reached zero.',`<div class="subtabs" role="group" aria-label="Group reserve chart"><button data-group="vehicle" class="${state.reserveBy==='vehicle'?'active':''}" aria-pressed="${state.reserveBy==='vehicle'}">By vehicle</button><button data-group="manufacturer" class="${state.reserveBy==='manufacturer'?'active':''}" aria-pressed="${state.reserveBy==='manufacturer'}">By manufacturer</button></div><div class="chart-scroll">${bars(items,{title:`Distance after 0% by ${state.reserveBy}`,series:[['Distance after 0%','#C8102E']]})}</div>`,`${missing} of ${ev.length} tests have no reserve measurement and are excluded, not treated as zero. Manufacturer bars are arithmetic means of measured tests. A measured zero is retained.`,'reserve-chart')+
  panel('Range before and after 0%','The two segments add up to the total achieved range.',`${legend([['Before displayed 0%','#003B8E'],['After displayed 0%','#C8102E']])}<div class="chart-scroll">${bars(split,{title:'Achieved range before and after displayed 0%',series:[['Before displayed 0%','#003B8E'],['After displayed 0%','#C8102E']],stack:true})}</div>`,'Only tests with both total and reserve measurements are shown. Before 0% = total achieved range − distance after 0%.','split-chart');
}

function scatter(ev){
  const valid=ev.filter(r=>numeric(r[state.x])&&numeric(r[state.y]));
  if(!valid.length)return chartEmpty('No paired measurements for these axes. Choose another measure or reset your filters.');
  const w=chartWidth(),h=w<650?400:480,L=64,R=24,T=24,B=72,pw=w-L-R,ph=h-T-B;
  const xs=valid.map(r=>convert(r[state.x],state.x)),ys=valid.map(r=>convert(r[state.y],state.y));
  const ax=niceAxis(Math.min(0,...xs),Math.max(1,...xs),w<650?3:5),ay=niceAxis(Math.min(0,...ys),Math.max(1,...ys),5);const xmin=ax.min,ymin=ay.min,xmax=ax.max,ymax=ay.max;
  const x=v=>L+(v-xmin)/(xmax-xmin)*pw,y=v=>T+ph-(v-ymin)/(ymax-ymin)*ph;
  const trend=quadraticTrend(xs,ys);
  let body='';
  for(const xv of ax.ticks)body+=`<line class="gridline" x1="${x(xv)}" x2="${x(xv)}" y1="${T}" y2="${h-B}"/><text x="${x(xv)}" y="${h-B+24}" text-anchor="middle">${ax.format(xv)}</text>`;
 for(const yv of ay.ticks)body+=`<line class="gridline" x1="${L}" x2="${w-R}" y1="${y(yv)}" y2="${y(yv)}"/><text x="${L-12}" y="${y(yv)+4}" text-anchor="end">${ay.format(yv)}</text>`;
  if(trend){
    const low=Math.min(...xs),high=Math.max(...xs);
    const points=Array.from({length:161},(_,i)=>{const xv=low+(high-low)*i/160;return `${x(xv)},${y(trend(xv))}`;}).join(' ');
    body+=`<defs><clipPath id="scatter-trend-clip"><rect x="${L}" y="${T}" width="${pw}" height="${ph}"/></clipPath></defs><polyline class="quadratic-trend" points="${points}" fill="none" stroke="#111111" stroke-width="2.5" stroke-dasharray="1 7" stroke-linecap="round" clip-path="url(#scatter-trend-clip)"><title>Quadratic trend fitted to the selected vehicle tests</title></polyline>`;
  }
  valid.forEach((r,i)=>{const color=colors[allMakes().indexOf(r.make)%colors.length];const detail=`${r.name} (${r.year})\n${prettyDate(r.date)}\n${fields[state.x]}: ${value(r[state.x],state.x)}\n${fields[state.y]}: ${value(r[state.y],state.y)}`;body+=`<circle class="point" cx="${x(xs[i])}" cy="${y(ys[i])}" r="6" fill="${color}" fill-opacity=".8" stroke="white" stroke-width="1.5" ${tip(detail)}><title>${esc(detail)}</title></circle>`;});
  body+=`<text class="axis-label" x="${L+pw/2}" y="${h-12}" text-anchor="middle">${fields[state.x]} (${esc(unitFor(state.x))})</text><text class="axis-label" transform="translate(17 ${T+ph/2}) rotate(-90)" text-anchor="middle">${fields[state.y]} (${esc(unitFor(state.y))})</text>`;
  if(!trend)body+=`<text x="${L}" y="16" font-size="14">Trend unavailable: too few distinct X values</text>`;
  return svg(body,w,h,`${fields[state.y]} versus ${fields[state.x]} scatter plot${trend?', with a dotted quadratic trend':''}`)+`<div class="chart-summary">${valid.length} plotted tests · ${ev.length-valid.length} excluded because an axis value is missing. Hover or focus a point for vehicle details.</div>`;
}
function explorePage(ev){
  const options=axis=>Object.entries(fields).map(([key,text])=>`<option value="${key}" ${state[axis]===key?'selected':''}>${text} (${unitFor(key)})</option>`).join('');
  return panel('Scatter plot','Each point represents one EV test. Use the legend and point details to identify manufacturers; colours may repeat.',`<div class="chart-controls"><label>Horizontal axis (X)<select id="x-axis">${options('x')}</select></label><button class="secondary" id="swap" aria-label="Swap X and Y axes">⇄ Swap axes</button><label>Vertical axis (Y)<select id="y-axis">${options('y')}</select></label></div><div class="scatter-wrap">${scatter(ev)}</div>${legend([...new Set(ev.map(r=>r.make))].sort().map(make=>[make,colors[allMakes().indexOf(make)%colors.length]]))}`,'The dotted line is a second-degree polynomial fit to the plotted tests, with equal weight per test. It updates with the axes and filters and stays within the observed X range. It describes association, not a prediction. Test conditions, model versions and battery capacity differ. Calculated efficiency uses range ÷ stated battery capacity; reported efficiency uses the separate video field.','scatter-chart');
}

function batteryChart(series){
  if(!series.length)return chartEmpty('Select a vehicle test to display its battery readings.');
  const w=Math.max(260,chartWidth()-((globalThis.innerWidth||1024)>=768?272:0)),h=420,L=56,R=24,T=24,B=64,axis=niceAxis(0,Math.max(1,...series.flatMap(s=>s.points.map(p=>p[0]*factor(state.unit)))),w<650?3:5),max=axis.max;
  const x=d=>L+d*factor(state.unit)/max*(w-L-R),y=p=>T+(100-p)/100*(h-T-B);
  let body='';
  for(const p of [0,20,40,60,80,100])body+=`<line class="gridline" x1="${L}" x2="${w-R}" y1="${y(p)}" y2="${y(p)}"/><text x="${L-8}" y="${y(p)+4}" text-anchor="end">${p}%</text>`;
 for(const d of axis.ticks)body+=`<line class="gridline" x1="${x(d/factor(state.unit))}" x2="${x(d/factor(state.unit))}" y1="${T}" y2="${h-B}"/><text x="${x(d/factor(state.unit))}" y="${h-B+24}" text-anchor="middle">${axis.format(d)}</text>`;
  series.forEach(s=>{const color=seriesColor(s.id);body+=`<polyline points="${s.points.map(p=>`${x(p[0])},${y(p[1])}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;s.points.forEach(p=>{const detail=`${s.name}\n${prettyDate(s.date)}\nDistance: ${fmt(p[0]*factor(state.unit))} ${state.unit}\nBattery remaining: ${fmt(p[1],0)}%`;body+=`<circle class="point" cx="${x(p[0])}" cy="${y(p[1])}" r="4" fill="${color}" stroke="white" stroke-width="1" ${tip(detail)}><title>${esc(detail)}</title></circle>`;});});
  body+=`<text class="axis-label" x="${w/2}" y="${h-10}" text-anchor="middle">Distance driven (${state.unit})</text><text class="axis-label" transform="translate(13 ${h/2}) rotate(-90)" text-anchor="middle">Battery remaining (%)</text>`;
  return svg(body,w,h,'Battery remaining versus distance driven for selected vehicles');
}
function seriesColor(id){return colors[state.data.series.findIndex(s=>s.id===id)%colors.length];}
function availableSeries(ev){const ids=new Set(ev.map(r=>r.id));return state.data.series.filter(s=>ids.has(s.id)).sort((a,b)=>b.date.localeCompare(a.date)||a.name.localeCompare(b.name));}
function batteryPage(ev){
  const available=availableSeries(ev);
  if(state.selected===null)state.selected=new Set(available.map(s=>s.id));
  const selected=available.filter(s=>state.selected.has(s.id));
  return panel('Battery remaining vs distance driven',`${available.length} tests with recorded battery observations in this selection.`,available.length?`<div class="battery-layout"><div><div class="battery-actions"><button data-battery="all">All vehicles</button><button data-battery="none">Clear</button></div><div class="vehicle-list" aria-label="Choose vehicle tests">${available.map(s=>`<label class="vehicle-item" title="Test date: ${prettyDate(s.date)}"><input type="checkbox" aria-label="${esc(s.name)}, tested ${prettyDate(s.date)}" value="${esc(s.id)}" data-series ${state.selected.has(s.id)?'checked':''}><i style="background:${seriesColor(s.id)}"></i><span>${esc(s.name)}<small>${s.points.length} recorded points</small></span></label>`).join('')}</div></div><div><div class="scatter-wrap" id="battery-plot">${batteryChart(selected)}</div><div class="caption">${selected.length} selected vehicle tests. Lines connect measured observations; they do not predict battery depletion.</div></div></div>`:chartEmpty('No battery observations match the current filters.'),`Matched using manufacturer + test date. ${ev.length-available.length} selected EV tests have no matched battery series. ${state.data.plotExcluded} source points could not be matched or were invalid. Lines end at the last recorded reading.`,'battery-chart')+
  `<div class="insight"><span>⌁</span><p><strong>Reading the chart.</strong> Battery readings were recorded at individual distances. Selecting a few vehicles makes differences easier to see. A displayed 0% reading can occur before the vehicle stops.</p></div>`;
}
function dataPage(ev){
  if(!ev.length)return empty();
  const columns=[['name','Vehicle'],['date','Test date'],['claimed',`Claimed (${state.unit})`],['actual',`Achieved (${state.unit})`],['achievement','Claimed range achieved (%)'],['capacity','Battery (kWh)'],['efficiency',`Calculated efficiency (${state.unit}/kWh)`],['reserve',`After 0% (${state.unit})`],['weight','Weight (kg)']];
  const sorted=[...ev].sort((a,b)=>{const av=a[state.tableSort],bv=b[state.tableSort];if(av===null)return 1;if(bv===null)return -1;return (typeof av==='string'?av.localeCompare(bv):av-bv)*state.tableDirection;});
  return `<section class="panel"><div class="panel-head"><div><h2>${ev.length} EV test records</h2><p class="panel-subtitle">Click a column heading to sort. Export includes the filtered EV records in the selected units.</p></div><span class="tag">Workbook data</span></div><div class="table-wrap"><table><thead><tr>${columns.map(([key,text])=>`<th aria-sort="${state.tableSort===key?(state.tableDirection>0?'ascending':'descending'):'none'}"><button data-sort="${key}">${esc(text)} ${state.tableSort===key?(state.tableDirection>0?'↑':'↓'):'↕'}</button></th>`).join('')}</tr></thead><tbody>${sorted.map(r=>`<tr><td>${esc(r.name)}<small>${esc(r.year)} model · EV_Data row ${r.sourceRow}</small></td><td>${prettyDate(r.date)}</td><td>${fmt(convert(r.claimed,'claimed'))}</td><td>${fmt(convert(r.actual,'actual'))}</td><td><span class="percentage">${fmt(r.achievement)}${numeric(r.achievement)?'%':''}</span></td><td>${fmt(r.capacity)}</td><td>${fmt(convert(r.efficiency,'efficiency'),2)}</td><td>${fmt(convert(r.reserve,'reserve'))}</td><td>${fmt(r.weight,0)}</td></tr>`).join('')}</tbody></table></div><div class="panel-foot">A dash (—) means the measurement is missing or invalid. Repeated models on different dates remain separate tests. Combustion records are shown in the Overview benchmark.</div></section>`;
}
function methodPage(){return panel('How this dashboard works','Source tables, definitions and refresh behaviour.',`<div class="method-content"><h3>Source and scope</h3><p>The measurements come from <strong>Carwow vehicle range tests</strong> and are stored locally in <strong>Data.xlsx</strong>. Individual video links are not included in this dashboard. The workbook in the parent project folder is read directly. The dashboard never writes to it. EV_Data supplies EV test records; ICE_Data supplies the combustion comparison; Battery_Depletion supplies battery observations. All valid EV test records count, including repeated models tested on different dates. Each row counts as one test; the same model can appear more than once.</p><h3>Calculations</h3><ul><li><strong>Claimed range achieved:</strong> actual range ÷ claimed range × 100, calculated for each test.</li><li><strong>Average EV and manufacturer averages:</strong> arithmetic mean of individual valid test values, with equal weight per test. Missing values are excluded; sample sizes are shown.</li><li><strong>Efficiency:</strong> achieved range ÷ stated battery capacity. This measures distance per unit of stated battery capacity. It does not measure charging consumption. Video-reported efficiency is available separately in the scatter plot and export.</li><li><strong>Range before 0%:</strong> achieved range − measured distance after 0%. Records with missing reserve are excluded from split charts.</li><li><strong>Units:</strong> miles are the source of distance calculations. Kilometres = miles × 1.609344. Efficiency converts to km/kWh. Raw inputs drive results, avoiding dependence on cached derived Excel formulas.</li><li><strong>Extremes:</strong> all ties are shown. The highest/lowest claimed range achieved refers to the percentage, while longest/shortest delivered range refers to distance.</li></ul><h3>Battery curves and missing data</h3><p>Battery observations store percentages as fractions from 0 to 1. They are converted to 0–100% and joined to EV tests using make + test date. Ambiguous joins and invalid observations are excluded and reported. Lines only join measured points; no start, zero point or stopping point is fabricated. Blank reserve cells stay missing, even when the workbook’s derived kilometre field contains zero.</p><h3>Workbook saves</h3><p>The local server checks the workbook every 0.3 seconds, waits 0.6 seconds for a stable file, then parses it. The browser checks for a new version every 1.2 seconds. Saved changes normally appear within 1–3 seconds. If Excel temporarily locks the file, or a table is invalid, the last successful data stays visible with a warning and the server retries automatically.</p><p>Add records within the existing Excel tables. Contiguous rows immediately below a table are also read. Preserve the table names and column headings. To add a battery curve, add rows to Battery_Depletion with the same make and test date as exactly one EV test. For two models of the same make on the same day, the available columns cannot identify which vehicle a reading belongs to; those points are excluded.</p><h3>Interpreting comparisons</h3><p>The tests span different dates, conditions, model versions and routes. Rankings describe this collection; they are not controlled evidence that one manufacturer always performs better. Combustion vehicles remain fixed benchmarks when EV filters change. Range after 0% describes test observations, not a dependable reserve for trip planning.</p><h3>Current source checks</h3><p>${state.data.sourceRows} EV_Data records · ${state.data.ev.length} EV tests · ${state.data.ice.length} combustion records · ${state.data.plotRows} battery observations · ${state.data.plotExcluded} excluded battery points.</p>${state.data.issues.length?`<details open><summary>${state.data.issues.length} source notices</summary><ul>${state.data.issues.map(i=>`<li>${esc(i)}</li>`).join('')}</ul></details>`:'<p>No invalid rows or ambiguous battery matches were detected.</p>'}</div>`);}

function allMakes(){return [...new Set(state.data.ev.map(r=>r.make))].sort();}
function refreshOptions(){
  const makes=allMakes(),dates=[...new Set(state.data.ev.map(r=>r.date))].sort().reverse();
  $('#make').innerHTML='<option value="">All manufacturers</option>'+makes.map(m=>`<option value="${esc(m)}">${esc(m)}</option>`).join('');
  $('#date').innerHTML='<option value="">All test dates</option>'+dates.map(d=>`<option value="${esc(d)}">${prettyDate(d)}</option>`).join('');
  // Keep current filters, even if a saved edit removed the last matching record.
  if(state.make&&!makes.includes(state.make))$('#make').insertAdjacentHTML('beforeend',`<option value="${esc(state.make)}">${esc(state.make)} (no longer in source)</option>`);
  if(state.date&&!dates.includes(state.date))$('#date').insertAdjacentHTML('beforeend',`<option value="${esc(state.date)}">${prettyDate(state.date)} (no longer in source)</option>`);
  $('#make').value=state.make;$('#date').value=state.date;
}
function render(){
  const config=titles[state.page]||titles.overview;
  $('#crumb').textContent=config[0];$('#page-title').textContent=config[1];$('#page-description').textContent=config[2];
  document.querySelectorAll('[data-page]').forEach(a=>{const active=a.dataset.page===state.page;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(!state.data)return;
  const ev=rows();$('#filter-count').textContent=`${ev.length} / ${state.data.ev.length} EV tests`;
  $('#export').disabled=!ev.length;$('#export').style.opacity=ev.length?'1':'.4';
  const view={overview,range:rangePage,reserve:reservePage,battery:batteryPage,explore:explorePage,data:dataPage,method:methodPage};
  const scrolls=[...document.querySelectorAll('.chart-scroll,.table-wrap,.vehicle-list')].map(x=>x.scrollTop);
  $('#tooltip').hidden=true;$('#content').innerHTML=view[state.page](ev);
  document.querySelectorAll('.chart-scroll,.table-wrap,.vehicle-list').forEach((x,i)=>x.scrollTop=scrolls[i]||0);
}
function reset(){state.make='';state.date='';state.query='';$('#make').value='';$('#date').value='';$('#search').value='';render();}
$('#reset').addEventListener('click',reset);
$('#make').addEventListener('change',e=>{state.make=e.target.value;render();});
$('#date').addEventListener('change',e=>{state.date=e.target.value;render();});
$('#search').addEventListener('input',e=>{state.query=e.target.value;render();});
document.querySelectorAll('[data-unit]').forEach(button=>button.addEventListener('click',()=>{state.unit=button.dataset.unit;document.querySelectorAll('[data-unit]').forEach(b=>b.setAttribute('aria-pressed',b===button));render();}));
$('#export').addEventListener('click',()=>{
  if(!state.data)return;
  const columns=[{label:'Source',get:()=> 'Carwow range tests'},{label:'Workbook',get:()=> 'Data.xlsx'},{label:'Vehicle',get:r=>r.name},{label:'Manufacturer',get:r=>r.make},{label:'Model year',get:r=>r.year},{label:'Test date',get:r=>r.date},...Object.entries(fields).map(([key,title])=>({label:`${title} (${unitFor(key)})`,get:r=>convert(r[key],key)}))];
  download(`ev-range-tests-${state.unit}.csv`,'\uFEFF'+csv(rows(),columns),'text/csv;charset=utf-8');
});
$('#content').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.action==='reset')reset();
  if(b.dataset.group){state.reserveBy=b.dataset.group;render();}
  if(b.id==='swap'){[state.x,state.y]=[state.y,state.x];render();}
  if(b.dataset.sort){if(state.tableSort===b.dataset.sort)state.tableDirection*=-1;else{state.tableSort=b.dataset.sort;state.tableDirection=-1;}render();}
  if(b.dataset.battery){const available=availableSeries(rows());state.selected=new Set((b.dataset.battery==='all'?available:[]).map(s=>s.id));render();}
  if(b.dataset.download){const chart=document.querySelector(`#${b.dataset.download} svg`);if(!chart)return;const clone=chart.cloneNode(true);const style=document.createElementNS('http://www.w3.org/2000/svg','style');style.textContent=chartStyle;clone.prepend(style);const bg=document.createElementNS('http://www.w3.org/2000/svg','rect');bg.setAttribute('width','100%');bg.setAttribute('height','100%');bg.setAttribute('fill','#ffffff');clone.insertBefore(bg,clone.firstChild);download(`${b.dataset.download}-${state.unit}.svg`,new XMLSerializer().serializeToString(clone),'image/svg+xml');}
});
$('#content').addEventListener('change',e=>{
  if(e.target.id==='range-sort')state.rangeSort=e.target.value;
  if(e.target.id==='x-axis')state.x=e.target.value;
  if(e.target.id==='y-axis')state.y=e.target.value;
  if(e.target.matches('[data-series]')){if(e.target.checked)state.selected.add(e.target.value);else state.selected.delete(e.target.value);}
  render();
});
function showTip(target,x,y){const tooltip=$('#tooltip');tooltip.textContent=target.dataset.tip;tooltip.hidden=false;tooltip.style.left=`${Math.max(8,Math.min(x+14,innerWidth-tooltip.offsetWidth-12))}px`;tooltip.style.top=`${Math.max(8,Math.min(y+14,innerHeight-tooltip.offsetHeight-12))}px`;}
document.addEventListener('pointermove',e=>{const t=e.target.closest('[data-tip]');if(t)showTip(t,e.clientX,e.clientY);else $('#tooltip').hidden=true;});
document.addEventListener('focusin',e=>{const t=e.target.closest('[data-tip]');if(t){const r=t.getBoundingClientRect();showTip(t,r.right,r.top);}});
document.addEventListener('focusout',()=>$('#tooltip').hidden=true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#tooltip').hidden=true;});
window.addEventListener('hashchange',()=>{state.page=Object.hasOwn(titles,location.hash.slice(1))?location.hash.slice(1):'overview';render();window.scrollTo(0,0);});
state.page=Object.hasOwn(titles,location.hash.slice(1))?location.hash.slice(1):'overview';
let polling=false;
async function poll(){
  if(polling)return;polling=true;
  try{
    const response=await fetch('/api/data',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error(`Server returned ${response.status}`);
    const payload=await response.json();if(payload.app!=='range-observatory-swiss')throw new Error('Unexpected server on this port.');
    $('#live-dot').className=payload.status;
    $('#live-status').textContent=payload.status==='connected'?'Workbook connected · automatic updates':payload.status==='loading'?'Reading workbook…':'Workbook needs attention';
    $('#notice').hidden=['connected','loading'].includes(payload.status);
    if(!$('#notice').hidden)$('#notice').textContent=`${payload.data?'Showing the last successfully loaded data. ':''}${payload.message}`;
    if(payload.saved)$('#saved').textContent=` · Saved ${new Date(payload.saved).toLocaleString('en-GB')}${payload.data?.issues.length?` · ${payload.data.issues.length} data notice(s) (see About the measurements)`:''}`;
    if(payload.data&&payload.version!==state.version){state.data=payload.data;state.version=payload.version;refreshOptions();render();}
    if(!payload.data&&payload.status==='invalid')$('#content').innerHTML='<div class="empty"><strong>The workbook could not be loaded.</strong>Check the workbook error above. The dashboard will retry automatically.</div>';
  }catch(error){$('#live-dot').className='stale';$('#live-status').textContent='Server disconnected';$('#notice').hidden=false;$('#notice').textContent=`${state.data?'Showing the last loaded data. ':''}Cannot reach the dashboard server. Keep Start Dashboard.cmd running. Reconnecting automatically.`;}
  finally{polling=false;setTimeout(poll,1200);}
}
render();poll();

let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>render(),150);});


