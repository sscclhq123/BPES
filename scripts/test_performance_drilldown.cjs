async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>{
    const values={absorbedKg:10,releasedKg:5,targetKg:20,targetServedPct:50,waterBalancePct:50,netWaterKg:5,specificRegenHeat:2,regenHeatKWh:10,regenOnHours:1,regenWeatherOutsideHours:.5,regenWeatherOutsidePct:50};
    const hourly=[['2020-07-31 00:00:00',0,0,0,0,0,0,0],['2020-07-31 13:00:00',10,5,20,10,10,1,.5],['2020-08-01 00:00:00',0,0,0,0,0,0,0]];
    const region=(key,label,area)=>({key,label,best:{collectorArea:area},monthly:[],ldPerformance:{total:values,monthly:[{month:7,...values},{month:8,...values}],hourlyVersion:1,hourly}});
    window.dispatchEvent(new MessageEvent('message',{origin:'https://saldop.vercel.app',data:{type:'saldop:calculation-complete',summary:{primaryKey:'seoul_epw',regions:[region('seoul_epw','서울',2491),region('manila_tmy','마닐라',4982)],failedCount:0}}}));
  });
  await page.locator('.ld-performance').waitFor();
  if(!(await page.locator('.result-heading').textContent()).includes('DESIGN OUTPUT · 건축면적 4,982 m² · 서울'))throw Error('Heading order');
  if(!(await page.locator('.geo-ranking').textContent()).includes('건축면적 대비 50.0%'))throw Error('Map ratio');
  const checks=[];
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});
    await page.locator('.ld-performance-table button').filter({hasText:'7월'}).click();
    await page.locator('.ld-performance-table button').filter({hasText:'31일'}).focus();
    await page.keyboard.press('Enter');
    if(await page.locator('.ld-performance tbody tr').count()!==2)throw Error('Missing hour/off row');
    if(!(await page.locator('.ld-performance tbody').textContent()).includes('13:00'))throw Error('Hour label');
    if(!(await page.locator('.ld-performance-metrics').textContent()).includes('50 %'))throw Error('Selected period aggregation');
    const fits=await page.locator('.ld-performance').evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth});
    if(!fits)throw Error('Overflow '+width);
    await page.locator('.ld-performance').screenshot({path:`/tmp/ld-drilldown-${width}.png`});
    await page.getByRole('button',{name:'7월 · 일별',exact:true}).click();
    await page.getByRole('button',{name:'전체 · 월별',exact:true}).click();
    checks.push({width,fits});
  }
  await page.locator('.ld-performance-table button').filter({hasText:'7월'}).click();
  await page.locator('.summary-region-select select').selectOption('manila_tmy');
  if(await page.locator('.ld-performance-table button').filter({hasText:'7월'}).count()!==1)throw Error('Region selection must reset drilldown');
  if(errors.length)throw Error(errors.join('\n'));
  return checks;
}
