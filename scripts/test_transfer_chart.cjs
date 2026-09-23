async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>{
    const v={absorbedKg:10,releasedKg:10,targetKg:10,targetServedPct:100,waterBalancePct:100,netWaterKg:0,specificRegenHeat:3,regenHeatKWh:30,regenOnHours:2,regenWeatherOutsideHours:0,regenWeatherOutsidePct:0};
    const times=['2020-07-07 13:00:00','2020-07-07 14:00:00','2020-07-07 15:00:00'];
    const hourly=times.map(t=>[t,5,5,5,5,15,1,0,32,15]);
    // Known ratios: 50%, gap, 80% (abs); 25%, gap, 120% (reg).
    const rows=[[times[0],1,2,0,0,1,4,0,0],[times[1],0,0,0,0,0,0,60,0],[times[2],8,10,0,0,12,10,0,600]];
    window.dispatchEvent(new MessageEvent('message',{origin:'https://saldop.vercel.app',data:{type:'saldop:calculation-complete',summary:{primaryKey:'test',regions:[{key:'test',label:'검증용',best:{collectorArea:500},monthly:[],ldPerformance:{total:v,monthly:[{month:7,...v}],hourlyVersion:2,hourly,effectiveness:{version:1,rows}}}],failedCount:0}}}));
  });
  const chart=page.locator('.transfer-chart');await chart.locator('svg').waitFor();
  if(!(await chart.locator('tbody').textContent()).includes('75'))throw Error('Weighted monthly aggregation');
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:950});
    await chart.getByRole('button',{name:'7월 유효도 상세',exact:true}).click();
    await chart.getByRole('button',{name:'7일 유효도 상세',exact:true}).click();
    const text=await chart.locator('tbody').textContent();
    if(!text.includes('120')||!text.includes('—')||!text.includes('50'))throw Error('Raw values/off interval');
    const paths=await chart.locator('svg path').evaluateAll(es=>es.map(e=>e.getAttribute('d')));
    if(paths.some(d=>(d.match(/M/g)||[]).length!==2))throw Error('Gap connected');
    const fits=await chart.evaluate(e=>e.getBoundingClientRect().right<=innerWidth);
    if(!fits)throw Error('Panel overflow');
    await chart.screenshot({path:`/tmp/transfer-chart-${width}.png`});
    await page.getByRole('button',{name:'전체 · 월별',exact:true}).click();
  }
  if(errors.length)throw Error(errors.join('\n'));
  return 'PASS: weighted epsilon, un-clamped >100%, gaps, monthly/day/hour, desktop/mobile';
}
