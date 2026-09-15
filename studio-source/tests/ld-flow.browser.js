async page => {
 const check=(ok,msg)=>{if(!ok)throw Error(msg)};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.reload();await page.locator('.intro-screen').waitFor();
 // Deliberately synthetic browser fixtures exercise OFF/partial duty and region switching.
 const rows=[];
 for(const date of ['2001-07-30','2001-07-31','2001-08-01'])for(let h=0;h<24;h++){
  const on=h>=9&&h<18,ad=on?.75:0,rd=on?(h===13?.5:1):0;
  rows.push([`${date} ${String(h).padStart(2,'0')}:00:00`,3600,ad,rd,on?2: null,on?1.2:null,on?2:null,on?4:null,on?(h<14?2:3):null,on?(h<14?2.4:3.6):null,on?6:null]);
 }
 const base={key:'seoul_epw',label:'서울',best:{regenFixedLg:1.2},monthly:[],ldFlowHourly:{version:1,designMaxAirRatio:4.49322,rows},traceRequest:{weatherDataset:'seoul_epw',regenLgRatio:1.2}};
 const summary={primaryKey:'seoul_epw',regions:[base,{...base,key:'busan',label:'부산',ldFlowHourly:{version:1,rows:rows.filter(r=>r[0].includes('08-01'))}}]};
 await page.evaluate(summary=>window.dispatchEvent(new MessageEvent('message',{origin:'https://saldop.vercel.app',data:{type:'saldop:calculation-complete',summary}})),summary);
 const card=page.locator('.ld-flow-card');await card.waitFor();
 const lgPlot=card.locator('.ld-flow-plot').filter({hasText:'제습·재생 액기비 변화'});
 const multiplePlot=card.locator('.ld-flow-plot').filter({hasText:'제습 설계 풍량 대비 재생 외기량'});
 check((await lgPlot.locator('svg text').allTextContents()).join(',')==='0.0,0.5,1.0,1.5,2.0,2.5,3.0','L/G axis must end at 3.0');
 check(await multiplePlot.count()===1,'Airflow multiple plot missing');
 check((await multiplePlot.innerText()).includes('산정 설비 용량 4.49배'),'Calculated bank capacity reference missing');
 check(!(await multiplePlot.innerText()).includes('설정 상한'),'Retired ratio budget label remains');
 await page.getByLabel('액기비 분석 월').selectOption('07');await page.getByLabel('액기비 분석 일').selectOption('31');
 check(await card.locator('.ld-flow-checks').innerText().then(s=>!/[1-9]\.\d{6}/.test(s)),'Unexpected diagnostic difference');
 check((await card.locator('.ld-flow-xlabels button').allTextContents()).includes('23:00'),'Missing last hourly x label');
 await card.locator('.ld-flow-table summary').click();
 const tableRows=card.locator('.ld-flow-table tbody tr');
 check((await tableRows.nth(0).innerText()).includes('—'),'OFF ratio is not null');
 check((await tableRows.nth(13).innerText()).includes('2.400'),'ON flow lost');
 await card.locator('.ld-flow-basis select').selectOption('period');
 check((await multiplePlot.locator('svg title').allTextContents()).some(t=>t.includes('13:00 · 재생 풍량 배수 · 정지 포함 0.500')),'Airflow multiple period duty incorrect');
 check((await card.locator('svg title').allTextContents()).some(t=>t.includes('13:00 · 용액 질량유량 1.200')),'Partial duty not applied');
 await card.locator('.ld-flow-basis select').selectOption('on');
 check((await multiplePlot.locator('svg title').allTextContents()).some(t=>t.includes('14:00 · 재생 풍량 배수 · 가동 중 1.500')),'Airflow multiple denominator incorrect');
 await card.locator('.ld-flow-table summary').click();
 await page.setViewportSize({width:1440,height:1000});await card.scrollIntoViewIfNeeded();
 await card.screenshot({path:'/tmp/ld-flow-desktop.png'});
 await page.setViewportSize({width:390,height:844});await card.scrollIntoViewIfNeeded();
 check(await card.evaluate(el=>el.getBoundingClientRect().width<=innerWidth),'Card exceeds mobile width');
 await card.screenshot({path:'/tmp/ld-flow-mobile.png'});
 let received;
 await page.route('**/api/substep-trace',async route=>{
  received=route.request().postDataJSON();
  const steps=Array.from({length:120},(_,i)=>({time:`2001-07-31 ${String(13+Math.floor((i+30)/60)).padStart(2,'0')}:${String((i+30)%60).padStart(2,'0')}:00`,startSeconds:i*60,endSeconds:(i+1)*60,durationSeconds:60,
   concentrationStart:38,concentrationEnd:38,saltKg:38,waterStartKg:62,waterEndKg:62,absorbedKg:1,desorbedKg:1,supplyHumidity:10,absFraction:1,regFraction:.5,lg:2,regLg:1.2,regModules:6,absTemp:25,regTemp:58,regenHeatKWh:1,protection:false,absAirFlow:2,absSolutionFlow:4,regAirFlow:2,regSolutionFlow:2.4}));
  await route.fulfill({json:{traces:[{time:'2001-07-31 13:30:00',endTime:'2001-07-31 15:30:00',durationSeconds:7200,outdoorTemp:32,outdoorHumidity:24,irradiance:400,target:10,upper:10.5,floor:36.4,hourSupplyHumidity:10,steps}]}});
 });
 await page.getByLabel('유량 상세 분석 시각').selectOption('2001-07-31 14:00:00');
 await page.getByRole('button',{name:'선택 시간의 60초별 유량 계산'}).click();
 await page.getByLabel('선택 시점 내부 계산 상세').waitFor();
 check(received.times[0]==='2001-07-31 14:00:00','Wrong trace timestamp');
 check(await card.locator('.ld-flow-diagnostics').count()===2,'Minute flow plots missing');
 const trace=page.getByLabel('선택 시점 내부 계산 상세');await trace.screenshot({path:'/tmp/ld-flow-trace-mobile.png'});
 await page.getByLabel('요약 지역').selectOption('busan');
 check(await page.getByLabel('액기비 분석 월').inputValue()==='','Region did not reset period');
 check((await page.getByLabel('액기비 분석 월').locator('option').allTextContents()).join(',')==='전체 · 월별,8월','Wrong region dataset');
 check(!errors.length,errors.join('\n'));
 const recovery={...base,key:'recovery',label:'재생 단독',traceRequest:{airflow:6000,regenMaxAirRatio:3,regenLgRatio:1.2},ldFlowHourly:{version:1,rows:[['2001-07-31 19:00:00',3600,0,1,null,1.2,null,null,3,3.6,6]]}};
 await page.evaluate(region=>window.dispatchEvent(new MessageEvent('message',{origin:'https://saldop.vercel.app',data:{type:'saldop:calculation-complete',summary:{primaryKey:region.key,regions:[region]}}})),recovery);
 check((await page.locator('.ld-flow-plot').filter({hasText:'제습 설계 풍량 대비 재생 외기량'}).locator('svg title').allTextContents()).some(t=>t.includes('1.500 배')),'Recovery-only period lost design airflow');
 await page.unroute('**/api/substep-trace');
 return {passed:true,desktop:true,mobile:true,partialDuty:true,offNull:true,minuteTrace:true,regionSwitch:true,pageErrors:errors};
}
