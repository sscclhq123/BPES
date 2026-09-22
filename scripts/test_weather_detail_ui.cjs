async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>{
    const v={absorbedKg:10,releasedKg:10,targetKg:10,targetServedPct:100,waterBalancePct:100,netWaterKg:0,specificRegenHeat:3,regenHeatKWh:30,regenOnHours:1.5,regenWeatherOutsideHours:1.5,regenWeatherOutsidePct:100};
    const hourly=[['2020-07-07 12:00:00',0,0,0,0,0,0,0,20,25],['2020-07-07 13:00:00',5,5,5,5,15,.5,.5,29.3,24],['2020-07-07 14:00:00',5,5,5,5,15,1,1,28.3,23]];
    window.dispatchEvent(new MessageEvent('message',{origin:'https://saldop.vercel.app',data:{type:'saldop:calculation-complete',summary:{primaryKey:'manila_tmy',regions:[{key:'manila_tmy',label:'마닐라',best:{collectorArea:500},monthly:[],ldPerformance:{total:v,monthly:[{month:7,...v}],hourlyVersion:2,hourly}}],failedCount:0}}}));
  });
  await page.locator('.regen-weather-detail').waitFor();
  const text=await page.locator('.regen-weather-detail').textContent();
  if(!text.includes('1.67')||!text.includes('1.33'))throw Error('Weighted means incorrect: '+text);
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});
    await page.locator('.ld-performance-table button').filter({hasText:'7월'}).click();
    await page.locator('.ld-performance-table button').filter({hasText:'7일'}).click();
    const table=page.locator('.ld-performance > .ld-performance-table');
    if(await table.locator('tbody tr').count()!==3)throw Error('Hourly drilldown rows');
    const row=await table.locator('tbody tr').filter({hasText:'13:00'}).textContent();
    if(!row.includes('29.3')||!row.includes('최대 1 °C')||!row.includes('최대 2 g/kgDA'))throw Error('Hourly conditions '+row);
    if(!(await table.textContent()).includes('재생 비가동'))throw Error('Off status');
    const fits=await page.locator('.ld-performance').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth});
    if(!fits)throw Error('Overflow '+width);
    await page.locator('.regen-weather-detail').screenshot({path:`/tmp/weather-detail-${width}.png`});
    await page.getByRole('button',{name:'전체 · 월별',exact:true}).click();
  }
  if(errors.length)throw Error(errors.join('\n'));
  return 'PASS: desktop/mobile, monthly/day/hour, weighted means, actual conditions, off-hours';
}
