async page => {
  await page.evaluate(()=>window.dispatchEvent(new MessageEvent('message',{origin:'https://saldop.vercel.app',data:{type:'saldop:calculation-complete',summary:{primaryKey:'seoul_epw',failedCount:0,regions:[{key:'seoul_epw',label:'서울',best:{regenFixedLg:1.2},monthly:[],ldFlowHourly:{version:1,rows:[['2001-01-04 13:00:00',3600,1,1,1.5,1.2,1,1.5,2,2.4,6],['2001-01-04 14:00:00',3600,0,0,null,null,null,null,null,null,null]]}}]}}})));
  await page.locator('.ld-flow-plot').first().waitFor();
  await page.getByLabel('액기비 분석 월').selectOption('01');
  await page.getByLabel('액기비 분석 일').selectOption('04');
  const checks=[];
  for(const width of [390,1440]){
    await page.setViewportSize({width,height:900});
    const card=page.locator('.ld-flow-card');
    if(await card.locator('.ld-flow-checks').count()!==0)throw Error('Debug cards remain');
    if((await card.innerText()).includes('최대 차이'))throw Error('Debug text remains');
    if(await card.locator('.ld-flow-plot').count()!==3)throw Error('Missing charts');
    await card.screenshot({path:`/tmp/flow-clean-${width}.png`});
    const fit=await card.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth});
    if(!fit)throw Error('Overflow');
    checks.push({width,fit,charts:3,debugCards:0});
  }
  return checks;
}
