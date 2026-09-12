// Run with Playwright CLI run-code --filename after opening the target site.
async page => {
 const check=(condition,message)=>{if(!condition)throw new Error(message);};
 if(await page.locator('.ldp-dialog[open]').count())await page.getByRole('button',{name:'LD 상세 스케메틱 닫기',exact:true}).click();
 if(await page.locator('.intro-screen').count())await page.locator('.intro-screen').click();
 await page.locator('.hotspot-ld').click();
 const modal=page.locator('.ldp-dialog[open]');await modal.waitFor();
 const reports=[];
 for(const [width,height] of [[1440,1000],[1366,768],[768,1024],[390,844],[320,740],[844,390]]){
  await page.setViewportSize({width,height});
  const data=await modal.evaluate(el=>{
   const r=el.getBoundingClientRect(),content=el.querySelector('.ldp-content'),svg=Array.from(el.querySelectorAll('.ldp-diagram')).find(s=>s.getBoundingClientRect().width>0);
   const sr=svg.getBoundingClientRect(),texts=Array.from(svg.querySelectorAll('text')),overlaps=[],clipped=[];
   for(let i=0;i<texts.length;i++){
    const a=texts[i].getBoundingClientRect();
    if(a.left<sr.left-1||a.right>sr.right+1||a.top<sr.top-1||a.bottom>sr.bottom+1)clipped.push(texts[i].textContent);
    for(let j=i+1;j<texts.length;j++){
     const b=texts[j].getBoundingClientRect();
     if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlaps.push([texts[i].textContent,texts[j].textContent]);
    }
   }
   const tank=svg.querySelector('.ldp-common-tank').getBoundingClientRect(),close=el.querySelector('.ldp-close').getBoundingClientRect();
   return {bounds:[r.left,r.top,r.right,r.bottom],overflow:[content.scrollWidth-content.clientWidth,content.scrollHeight-content.clientHeight,el.scrollHeight-el.clientHeight],overlaps,clipped,tankBottom:tank.bottom,close:[close.width,close.height,close.top,close.bottom],scrollLock:document.body.style.overflow};
  });
  check(data.bounds[0]>=0&&data.bounds[1]>=0&&data.bounds[2]<=width+1&&data.bounds[3]<=height+1,`Modal clips at ${width}`);
  check(data.overflow.every(n=>n<=1),`Scroll needed at ${width}: ${data.overflow}`);
  check(!data.overlaps.length,`Overlapping labels at ${width}: ${JSON.stringify(data.overlaps)}`);
  check(!data.clipped.length,`Clipped labels at ${width}: ${data.clipped}`);
  check(data.tankBottom<height,`Tank offscreen at ${width}`);
  check(data.close[0]>=44&&data.close[1]>=44&&data.close[2]>=0&&data.close[3]<=height,`Close clipped at ${width}`);
  check(data.scrollLock==='hidden','Background scroll not locked');
  check(await modal.locator('button').count()===1,'Unexpected playback button');
  check(await modal.locator('h3').count()===0,'Duplicate section headings');
  await page.screenshot({path:`/tmp/ld-compact-${width}-${height}.png`});
  reports.push({width,height,...data});
 }
 await page.setViewportSize({width:1440,height:1000});
 const moving=modal.locator('.ldp-wide');await page.waitForTimeout(200);
 const before=await moving.evaluate(el=>el.querySelector('.ldp-particle').getCTM().f);
 await page.waitForTimeout(180);
 const after=await moving.evaluate(el=>el.querySelector('.ldp-particle').getCTM().f);
 check(Math.abs(after-before)>.01,'Flow particles are not moving');
 const colors=await modal.locator('.ldp-legend span').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n,'::before').borderTopColor));
 check(new Set(colors).size===3,'Solution flow colors are not distinct');
 await page.emulateMedia({reducedMotion:'reduce'});
 check(await modal.evaluate(el=>Array.from(el.querySelectorAll('.ldp-particle')).every(s=>getComputedStyle(s).display==='none')),'Reduced motion failed');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.keyboard.press('Escape');
 check(await page.locator('.ldp-dialog').count()===0,'Escape did not close');
 check(await page.evaluate(()=>document.body.style.overflow!=='hidden'),'Scroll lock not restored');
 await page.locator('.hotspot-ld').click();
 await page.getByRole('button',{name:'LD 상세 스케메틱 닫기',exact:true}).click();
 check(await page.locator('.ldp-dialog').count()===0,'Close button failed');
 return {passed:true,viewports:reports};
}
