async page => {
  const checks = [];
  for (const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]) {
    await page.setViewportSize(viewport);
    await page.getByRole('button',{name:'03 LD 외조기 상세 보기',exact:true}).click();
    await page.locator('.ldp-dialog[open]').waitFor();
    await page.locator('.ldp-dialog').scrollIntoViewIfNeeded();
    const result = await page.evaluate(() => {
      const panel=document.querySelector('.ldp-dialog'),scene=document.querySelector('.scene-visual');
      const p=panel.getBoundingClientRect(),s=scene.getBoundingClientRect();
      const close=document.querySelector('.ldp-close').getBoundingClientRect();
      return {inside:p.left>=s.left&&p.right<=s.right&&p.top>=s.top&&p.bottom<=s.bottom,
        position:getComputedStyle(panel).position,modal:panel.matches(':modal'),
        closeInside:close.left>=p.left&&close.right<=p.right&&close.top>=p.top&&close.bottom<=p.bottom,
        bodyLocked:document.body.style.overflow==='hidden',width:p.width,height:p.height};
    });
    if (!result.inside||result.modal||!result.closeInside||result.bodyLocked) throw Error(JSON.stringify({viewport,result}));
    await page.locator('.scene-visual').screenshot({path:`/tmp/salddp-ld-panel-${viewport.width}.png`});
    if(viewport.width===390){
      await page.locator('.ldp-content').evaluate(el=>el.scrollTop=el.scrollHeight);
      await page.getByRole('button',{name:'LD 상세 스케메틱 닫기',exact:true}).click();
    }else await page.keyboard.press('Escape');
    await page.locator('.ldp-dialog').waitFor({state:'detached'});
    checks.push({viewport,...result});
  }
  return checks;
}
