import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('HTTP 504 non-JSON response keeps the actionable timeout message',async()=>{
 const context=vm.createContext({XMLHttpRequest:class {
  open(){} setRequestHeader(){}
  send(){this.status=504;this.responseText='FUNCTION_INVOCATION_TIMEOUT';this.onload();}
 }});
 vm.runInContext(source.slice(source.indexOf('function requestJsonViaXhr'),source.indexOf('function setDefaults')),context);
 const r=await context.requestJson('/api/simulate');
 assert.equal(r.status,504);assert.equal(r.ok,false);
 assert.match(r.result.error,/제한시간/);
});

test('all regions finish before result; retry only failures; only one active request',async()=>{
 const messages=[],calls=[],elements=new Map();let active=0,peak=0,fail=true;
 const keys=['manila_tmy','seoul_epw','busan_tmyx','hanoi_tmyx',
  'shanghai_tmyx','houston_tmyx','berlin_tmyx','jeju_tmyx'];
 const context=vm.createContext({window:{location:{origin:'https://saldop.vercel.app'},parent:{postMessage:m=>messages.push(m)}},
  document:{referrer:'https://saldop.vercel.app/'},URL,
  $:key=>{if(!elements.has(key))elements.set(key,{value:'manila_tmy'});return elements.get(key)},
  readInputs:()=>({weatherDataset:keys[0],weatherDatasets:keys}),validateDesignInputs:()=>[],
  estimateCalculation:()=>({candidateCount:10}),weatherDatasets:Object.fromEntries(keys.map(k=>[k,{label:k}])),
  selectedRegionComparisonKeys:new Set(),formatNumber:String,
  requestJson:async(_,options)=>{const k=JSON.parse(options.body).weatherDataset;calls.push(k);peak=Math.max(peak,++active);
   await new Promise(r=>setTimeout(r,5));active--;return k==='seoul_epw'&&fail?{ok:false,result:{error:'HTTP 504'}}:{ok:true,result:{best:{},monthly:[]}};},
 });
 for(const name of ['renderCalculationIssues','renderValidityWarnings','empiricalWarnings','animateCalculationStart','animateFlow','renderRegionResults','applyWeatherDataset','renderPythonResult','clearResultOutputs'])context[name]=()=>{};
 vm.runInContext(source.slice(source.indexOf('let batchRunning ='),source.indexOf('function bindEvents')),context);
 await context.runCalculation();
 assert.deepEqual(calls,keys);assert.equal(peak,1);
 assert(!messages.some(m=>m.type==='saldop:calculation-complete'));
 assert(messages.some(m=>m.type==='saldop:calculation-failed'));
 assert(messages.some(m=>m.regions?.find(r=>r.label==='seoul_epw'&&r.error==='HTTP 504')));
 fail=false;await context.runCalculation();
 assert.deepEqual(calls,[...keys,'seoul_epw']);
 const complete=messages.filter(m=>m.type==='saldop:calculation-complete');
 assert.equal(complete.length,1);assert.equal(complete[0].summary.regions.length,8);
 assert.equal(complete[0].summary.failedCount,0);
});
