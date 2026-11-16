import test from 'node:test';
import assert from 'node:assert/strict';
import {mean,byMake,extremes,factor,filterRows,csv} from '../static/analysis.mjs';

test('means exclude missing values but include recorded zero',()=>{
  assert.equal(mean([0,10,null,undefined,NaN]),5);
  assert.equal(mean([null,undefined]),null);
});
test('manufacturer averages weight each test equally, not by claimed range',()=>{
  const groups=byMake([{make:'A',achievement:50},{make:'A',achievement:100},{make:'A',achievement:null},{make:'B',achievement:90}],'achievement');
  assert.deepEqual(groups,[{name:'B',value:90,count:1,total:1},{name:'A',value:75,count:2,total:3}]);
});
test('extremes retain ties and ignore missing measurements',()=>{
  const rows=[{name:'A',reserve:0},{name:'B',reserve:null},{name:'C',reserve:20},{name:'D',reserve:20}];
  assert.deepEqual(extremes(rows,'reserve').max.map(r=>r.name),['C','D']);
  assert.equal(extremes(rows,'reserve').min[0].name,'A');
  assert.deepEqual(extremes([],'reserve'),{min:[],max:[]});
});
test('manufacturer, date and search filters intersect',()=>{
  const rows=[{make:'Tesla',date:'2025-10-02',name:'Tesla Model Y Long Range',year:'2025'},{make:'Tesla',date:'2024-06-13',name:'Tesla Model 3',year:'2024'}];
  assert.equal(filterRows(rows,{make:'Tesla',date:'2025-10-02',query:'long RANGE'}).length,1);
  assert.equal(filterRows(rows,{make:'Tesla',query:'2024'}).length,1);
  assert.equal(filterRows(rows,{make:'Audi'}).length,0);
});
test('kilometre conversion is precise and reversible',()=>{
  assert.equal(100*factor('km'),160.9344);
  assert.equal(100*factor('mi'),100);
  assert.ok(Math.abs((730*factor('km'))/factor('km')-730)<1e-10);
});
test('CSV escapes quotes, commas, missing values and formula-like names',()=>{
  const out=csv([{name:'A, "B"',range:null},{name:'=SUM(A1)',range:0}],[{label:'Vehicle',get:r=>r.name},{label:'Range',get:r=>r.range}]);
  assert.equal(out,'"Vehicle","Range"\r\n"A, ""B""",""\r\n"\'=SUM(A1)","0"');
});
