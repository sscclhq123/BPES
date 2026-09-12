// Run with Playwright CLI run-code --filename after opening the target site.
async page => {
  const check=(condition,message)=>{if(!condition)throw new Error(message);};
  if(await page.locator('.ldp-dialog[open]').count())await page.getByRole('button',{name:'LD 상세 스케메틱 닫기',exact:true}).click();
  if(await page.locator('.intro-screen').count())await page.locator('.intro-screen').click();
  await page.locator('.hotspot-ld').click();
  const modal=page.locator('.ldp-dialog[open]');
  await modal.waitFor();
  const reports=[];
  for(const [width,height] of [[1440,1000],[768,1024],[390,844],[320,740],[844,390]]){
    await page.setViewportSize({width,height});
    await page.locator('.ldp-content').evaluate(el=>el.scrollTop=0);
    const data=await modal.evaluate(el=>{
      const r=el.getBoundingClientRect(),c=el.querySelector('.ldp-content');
      const texts=Array.from(el.querySelectorAll('svg text')).filter(t=>t.getBoundingClientRect().width>0);
      const overlaps=[];
      for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){
        if(texts[i].ownerSVGElement!==texts[j].ownerSVGElement)continue;
        const a=texts[i].getBoundingClientRect(),b=texts[j].getBoundingClientRect();
        if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlaps.push([texts[i].textContent,texts[j].textContent]);
      }
      const close=el.querySelector('.ldp-close'),b=close.getBoundingClientRect();
      return {bounds:[r.left,r.top,r.right,r.bottom],overflow:c.scrollWidth-c.clientWidth,overlaps,close:[b.width,b.height,b.top,b.bottom],scrollLock:document.body.style.overflow};
    });
    check(data.bounds[0]>=0&&data.bounds[1]>=0&&data.bounds[2]<=width+1&&data.bounds[3]<=height+1,`Modal clips at ${width}`);
    check(data.overflow<=1,`Horizontal overflow at ${width}`);
    check(data.overlaps.length===0,`Overlapping labels at ${width}: ${JSON.stringify(data.overlaps)}`);
    check(data.close[0]>=44&&data.close[1]>=44&&data.close[2]>=0&&data.close[3]<=height,`Close clipped at ${width}`);
    check(data.scrollLock==='hidden','Background scroll not locked');
    if(width>700){
      const ends=await modal.locator('.ldp-loop>svg').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().bottom));
      check(Math.abs(ends[0]-ends[1])<1,`Parallel loop ports are misaligned at ${width}`);
    }
    await page.screenshot({path:`/tmp/ld-schematic-${width}-${height}.png`});
    await page.locator('.ldp-content').evaluate(el=>el.scrollTop=el.scrollHeight);
    const atBottom=await page.locator('.ldp-close').boundingBox();
    check(atBottom.y>=0&&atBottom.y+atBottom.height<=height,`Close lost after scrolling at ${width}`);
    await page.screenshot({path:`/tmp/ld-schematic-${width}-${height}-bottom.png`});
    reports.push({width,height,...data});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('.ldp-content').evaluate(el=>el.scrollTop=0);
  const moving=modal.locator('.ldp-loop>svg').first();
  await moving.scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  const before=await moving.evaluate(el=>el.querySelector('.ldp-particle').getCTM().f);
  await page.waitForTimeout(150);
  const after=await moving.evaluate(el=>el.querySelector('.ldp-particle').getCTM().f);
  check(Math.abs(after-before)>.01,'Flow particles are not moving');
  await page.locator('.ldp-content').evaluate(el=>el.scrollTop=0);
  await page.getByRole('button',{name:'흐름 일시정지',exact:true}).click();
  check(await modal.evaluate(el=>Array.from(el.querySelectorAll('svg')).every(s=>s.animationsPaused())),'Pause control failed');
  await page.getByRole('button',{name:'흐름 재생',exact:true}).click();
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
