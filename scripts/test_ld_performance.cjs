async page => {
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  await page.evaluate(()=>{
    const values={absorbedKg:100,releasedKg:100,targetKg:110,targetServedPct:90.9,waterBalancePct:100,netWaterKg:0,specificRegenHeat:3.17,regenHeatKWh:317,regenOnHours:10,regenWeatherOutsideHours:7.4,regenWeatherOutsidePct:74};
    const region=(key,area)=>({key,label:key,best:{collectorArea:area},monthly:[],ldPerformance:{total:values,monthly:[{month:7,...values}]}});
    // UI fixture only; calculations are covered independently by backend tests.
    window.dispatchEvent(new MessageEvent('message',{origin:'https://saldop.vercel.app',data:{type:'saldop:calculation-complete',summary:{primaryKey:'Seoul',regions:[region('Seoul',2491),region('Manila',4982)],failedCount:0}}}));
  });
  await page.locator('.ld-performance').waitFor();
  const checks=[];
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});
    await page.locator('.ld-performance').scrollIntoViewIfNeeded();
    const fit=await page.locator('.ld-performance').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth});
    if(!fit)throw Error('Performance panel overflow '+width);
    await page.locator('.ld-performance').screenshot({path:`/tmp/ld-performance-${width}.png`});
    checks.push({width,fit});
  }
  await page.locator('.summary-region-select select').selectOption('Manila');
  const card=page.locator('.metric-grid article').filter({hasText:'COLLECTOR / BUILDING'});
  if(await card.locator('b').textContent()!=='100.0')throw Error('Area ratio did not follow region');
  if(!(await page.locator('.ld-performance header').textContent()).includes('Manila'))throw Error('Wrong region');
  if(errors.length)throw Error(errors.join('\n'));
  return checks;
}
