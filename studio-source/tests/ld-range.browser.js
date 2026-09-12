// Browser regression: automatic guidance, manual limits, and engine request wiring.
async page => {
 const check=(ok,msg)=>{if(!ok)throw Error(msg);};
 const url=page.url();
 async function enter(){
  await page.setViewportSize({width:1366,height:900});
  await page.goto(url);await page.locator('.intro-screen').click();
  await page.getByRole('button',{name:'기상데이터 선택 시작'}).click();
  await page.locator('.step-rail button').nth(2).click();
  await page.waitForTimeout(650);
 }
 await page.setViewportSize({width:1366,height:900});await enter();
 const scope=page.locator('.ld-auto-scope');
 for(const text of ['0.24–0.40','0.26–0.48','48.5–59.4','23.7–40.7','30.3–36.6','10.5–22.0','3배'])check((await scope.innerText()).includes(text),'Missing range '+text);
 const budget=()=>page.getByLabel('재생 외기량 상한 / 제습 풍량');
 check(await budget().count()===0,'Automatic mode exposes editable budget');
 await page.screenshot({path:'/tmp/ld-range-auto-desktop.png',fullPage:true});
 await page.getByRole('button',{name:/USER DEFINED/}).click();
 await budget().fill('4.5');await page.getByLabel('재생부 고정 L/G').fill('1.3');
 await page.getByRole('button',{name:/PROGRAM SIZING/}).click();
 await page.getByRole('button',{name:/USER DEFINED/}).click();
 check(await budget().inputValue()==='3','Automatic preset did not restore 3x');
 check(await page.getByLabel('재생부 고정 L/G').inputValue()==='1.2','Automatic L/G preset mismatch');
 await budget().fill('4.5');await page.getByLabel('재생부 고정 L/G').fill('1.3');
 await page.locator('.step-rail button').nth(3).click();
 await page.getByLabel('목표 재생열 커버율').fill('80');
 await page.route('**/engine/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Request wiring test</title>'}));
 await page.getByRole('button',{name:/계산 시작 RUN CALCULATION/}).click();
 const query=await page.locator('.calculation-frame').evaluate(el=>Object.fromEntries(new URL(el.src).searchParams));
 check(query.regenMaxAirRatio==='4.5'&&query.regenLgRatio==='1.3','Manual values not passed to engine');
 await page.unroute('**/engine/**');
 await enter();await page.setViewportSize({width:390,height:844});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile horizontal overflow');
 await scope.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/ld-range-auto-mobile.png',fullPage:true});
 await page.getByRole('button',{name:/USER DEFINED/}).click();await budget().fill('4');
 check(await budget().inputValue()==='4','Mobile manual limit not editable');
 await budget().scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/ld-range-manual-mobile.png'});
 return {passed:true,manualEngineBudget:query.regenMaxAirRatio,manualEngineLg:query.regenLgRatio,autoBudget:3};
}
