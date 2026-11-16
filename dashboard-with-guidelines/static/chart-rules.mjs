export const chartStyle = `text{font-family:'IBM Plex Sans',Helvetica,Arial,sans-serif;font-size:14px;fill:#111;font-variant-numeric:tabular-nums}.axis-label,.value-label,.chart-label{font-size:14px;fill:#111}.gridline{stroke:#ddd;stroke-width:1}`;
export function formatNumber(n,d=1){
 if(typeof n!=='number'||!Number.isFinite(n))return '—';
 if(n!==0&&Math.abs(n)<10**-d)return (n<0?'−':'')+'<'+(10**-d).toLocaleString('en-GB',{maximumFractionDigits:d});
 return (Object.is(n,-0)?0:n).toLocaleString('en-GB',{maximumFractionDigits:d,minimumFractionDigits:0});
}
export function niceAxis(low,high,count=5){
 if(!Number.isFinite(low)||!Number.isFinite(high))return niceAxis(0,1,count);
 if(high<=low)high=low+1;
 const raw=(high-low)/count,power=10**Math.floor(Math.log10(raw));
 const step=([1,2,2.5,5,10].find(n=>n*power>=raw)||10)*power;
 const min=Math.floor(low/step)*step,max=Math.ceil(high/step)*step;
 const digits=Math.max(0,-Math.floor(Math.log10(step))+(step/power===2.5?1:0));
 const ticks=Array.from({length:Math.round((max-min)/step)+1},(_,i)=>Number((min+i*step).toPrecision(12)));
 return {min,max,step,ticks,format:n=>formatNumber(n,digits)};
}
