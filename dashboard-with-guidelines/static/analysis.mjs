export const numeric = x => typeof x === 'number' && Number.isFinite(x);
export const mean = values => { const valid = values.filter(numeric); return valid.length ? valid.reduce((a,b)=>a+b,0)/valid.length : null; };
export const factor = unit => unit === 'km' ? 1.609344 : 1;
export function extremes(rows, field) {
  const valid = rows.filter(r => numeric(r[field]));
  if (!valid.length) return {min:[],max:[]};
  const low=Math.min(...valid.map(r=>r[field])), high=Math.max(...valid.map(r=>r[field]));
  return {min:valid.filter(r=>Math.abs(r[field]-low)<1e-9),max:valid.filter(r=>Math.abs(r[field]-high)<1e-9)};
}
export function byMake(rows, field) {
  const groups = new Map();
  for (const row of rows) { if(!groups.has(row.make)) groups.set(row.make, []); groups.get(row.make).push(row); }
  return [...groups].map(([name,group])=>({name,value:mean(group.map(r=>r[field])),count:group.filter(r=>numeric(r[field])).length,total:group.length})).sort((a,b)=>(b.value??-Infinity)-(a.value??-Infinity));
}
export function filterRows(rows, {make='',date='',query=''}) {
  const q=query.trim().toLowerCase();
  return rows.filter(r=>(!make || r.make===make)&&(!date || r.date===date)&&(!q || `${r.name} ${r.year} ${r.date}`.toLowerCase().includes(q)));
}
export function csv(rows, fields) {
  const quote = x => { let text=String(x??''); if (/^[=+@\-\t\r]/.test(text)) text="'"+text; return '"'+text.replaceAll('"','""')+'"'; };
  return [fields.map(f=>quote(f.label)).join(','),...rows.map(row=>fields.map(f=>quote(f.get(row))).join(','))].join('\r\n');
}

// Equal-weight quadratic least squares, with centred/scaled X and an
// orthogonal quadratic basis to avoid large powers of raw axis values.
export function quadraticTrend(xs, ys) {
  if (xs.length !== ys.length || xs.length < 3 ||
      !xs.every(Number.isFinite) || !ys.every(Number.isFinite) || new Set(xs).size < 3) return null;
  const centre=mean(xs), scale=Math.max(...xs.map(v=>Math.abs(v-centre)));
  const z=xs.map(v=>(v-centre)/scale), n=z.length;
  const s2=z.reduce((s,v)=>s+v*v,0), s3=z.reduce((s,v)=>s+v*v*v,0);
  const offset=s2/n, slope=s3/s2, q=z.map(v=>v*v-offset-slope*v);
  const q2=q.reduce((s,v)=>s+v*v,0);
  if (q2 < 1e-12*s2) return null;
  const a=mean(ys), b=z.reduce((s,v,i)=>s+v*(ys[i]-a),0)/s2;
  const c=q.reduce((s,v,i)=>s+v*(ys[i]-a),0)/q2;
  return value=>{const t=(value-centre)/scale;return a+b*t+c*(t*t-offset-slope*t);};
}
