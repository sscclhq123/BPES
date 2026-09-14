async page => {
  const check=(ok,msg)=>{if(!ok)throw Error(msg)};
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.reload(); await page.locator('.intro-screen').waitFor();
  // Synthetic data isolate UI reconciliation from annual calculation runtime.
  const region=(key,label,value)=>{
    const hours=Array.from({length:24},()=>value);
    const heatmap=[1,5,11].map(month=>({month,hours,weeks:[1,2].map(week=>({week,hours,days:Array.from({length:7},(_,day)=>({day,hours}))}))}));
    return {key,label,best:{regenFixedLg:1.2},monthly:[],ldUsageHeatmap:heatmap,
      regUsageHeatmap:heatmap.map(m=>({...m,hours:hours.map(v=>v/2)}))};
  };
  const summary={primaryKey:'seoul_epw',regions:[region('seoul_epw','서울',20),region('manila_tmy','마닐라',80)]};
  await page.evaluate(summary=>window.dispatchEvent(new MessageEvent('message',{
    origin:'https://saldop.vercel.app',data:{type:'saldop:calculation-complete',summary}
  })),summary);
  const card=page.locator('.heatmap-v2'); await card.waitFor();
  const verify=async(label,average)=>{
    check(await card.count()===1,`Expected one heatmap, got ${await card.count()} after selecting ${label}`);
    check((await card.locator('.heatmap-summary').innerText()).includes(label),'Wrong displayed region');
    check((await card.locator('.heatmap-summary').innerText()).includes(average),'Wrong regional values');
    check(await card.locator('.heatmap-row').count()===3,'Monthly rows were not replaced');
    check(await page.locator('.ld-flow-card').count()===1,'Flow chart duplicated');
  };
  await verify('서울','20.0%');
  for(const [key,label,avg] of [['manila_tmy','마닐라','80.0%'],['seoul_epw','서울','20.0%'],['manila_tmy','마닐라','80.0%']]){
    await page.getByLabel('요약 지역').selectOption(key);
    await verify(label,avg);
  }
  await card.locator('.heatmap-row').filter({hasText:'5월'}).click();
  await card.locator('.heatmap-row').filter({hasText:'1주차'}).click();
  check(await card.locator('.heatmap-row').count()===7,'Weekday drilldown missing');
  await card.locator('select').selectOption('seoul_epw'); await verify('서울','20.0%');
  check((await card.locator('h2').innerText()).startsWith('월·시간대별'),'Region did not reset depth');
  await card.getByRole('button',{name:'재생',exact:true}).click();
  check(await card.locator('.heatmap-hours span').count()===25,'Regeneration needs all 24 hours');
  await verify('서울','10.0%');
  await card.locator('select').selectOption('manila_tmy'); await verify('마닐라','40.0%');
  await card.getByRole('button',{name:'제습',exact:true}).click();
  check(await card.locator('.heatmap-hours span').count()===10,'Absorber schedule needs 9 hours');
  for(const [width,height] of [[1440,1000],[390,844]]){
    await page.setViewportSize({width,height}); await card.scrollIntoViewIfNeeded();
    check(await card.evaluate(el=>el.getBoundingClientRect().width<=innerWidth),'Mobile card exceeds viewport');
    await card.screenshot({path:`/tmp/heatmap-region-${width}.png`});
    await page.getByLabel('요약 지역').selectOption('seoul_epw'); await verify('서울','20.0%');
    await page.getByLabel('요약 지역').selectOption('manila_tmy'); await verify('마닐라','80.0%');
  }
  check(!errors.length,errors.join('\n'));
  return {passed:true,desktop:true,mobile:true,repeatedSummarySwitch:true,localSwitch:true,drilldown:true,modes:true};
}
