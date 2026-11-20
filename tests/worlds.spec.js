const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const WORLD_NAMES = [
 'Connected Care City','Neural Intelligence Core','Digital Health Campus','Intelligent Triage Command',
 'Holographic Anatomy Theater','Clinical Monitoring Center','Hospital Digital Twin Atrium',
 'Nexus Health Exterior','AI Bedside Intelligence','Smart Emergency District',
 'Healthcare Network Skyline','Robotic Clinical Laboratory','Digital Twin Diagnostic Studio',
 'AI Intelligence Sphere','Integrated Clinical Workstations','Emergency Operations Campus'
];
const GLB_WORLDS = new Set([4,8,11,12,14]);
function targetUrl(){
 const value=process.env.PULSAI_TEST_URL;
 if(!value) throw new Error('Set PULSAI_TEST_URL to an authorized preview or public deployment URL.');
 const u=new URL(value); u.pathname='/explore.html'; return u.toString();
}
test('capture all 16 worlds and verify GLB imports',async ({page},testInfo)=>{\n test.setTimeout(480000);
 const failures=[],results=[],pageErrors=[];
 page.on('pageerror',e=>pageErrors.push(e.message));
 await page.goto(targetUrl(),{waitUntil:'domcontentloaded'});
 await expect(page.locator('#stage')).toBeVisible();
 await page.waitForFunction(()=>window.__PULSAI_QA__?.ready===true,null,{timeout:30000});
 for(let i=0;i<WORLD_NAMES.length;i++){
  if(i>0) await page.locator('#next').dispatchEvent('click');
  await expect(page.locator('#worldTitle')).toHaveText(WORLD_NAMES[i]);
  let timedOut=false;
  try {await page.waitForFunction(i=>{const q=window.__PULSAI_QA__;return q?.worldIndex===i && q.requested===q.loaded+q.failed},i,{timeout:20000});}
  catch(e){timedOut=true;}
  const qa=await page.evaluate(()=>structuredClone(window.__PULSAI_QA__));
  const problems=[];
  const shot=`${String(i+1).padStart(2,'0')}-${testInfo.project.name}.png`;
  try { await page.screenshot({path:testInfo.outputPath(shot),fullPage:false,animations:'disabled',timeout:12000}); } catch(e) { problems.push('Screenshot failed: '+e.message); }
  if(fs.existsSync(testInfo.outputPath(shot))) await testInfo.attach(shot,{path:testInfo.outputPath(shot),contentType:'image/png'});
  if(timedOut) problems.push('Asset loading timed out');
  if(qa.worldIndex!==i) problems.push(`Wrong world index ${qa.worldIndex}`);
  if(GLB_WORLDS.has(i)&&qa.requested===0) problems.push('No GLB requested');
  if(GLB_WORLDS.has(i)&&qa.loaded===0) problems.push('No GLB loaded');
  if(qa.failed>0) problems.push(`${qa.failed} failed GLBs: ${qa.errors.join(' | ')}`);
  if(problems.length) failures.push(`${i+1} ${WORLD_NAMES[i]}: ${problems.join('; ')}`);
  results.push({world:i+1,name:WORLD_NAMES[i],...qa,problems});
 }
 const report=JSON.stringify({device:testInfo.project.name,results,pageErrors,failures},null,2);
 fs.writeFileSync(testInfo.outputPath('asset-report.json'),report);
 await testInfo.attach('asset-report.json',{body:report,contentType:'application/json'});
 expect(failures.concat(pageErrors),'See asset-report.json and screenshots').toEqual([]);
});
test('menu has 16 clickable worlds',async ({page})=>{
 await page.goto(targetUrl(),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__PULSAI_QA__?.ready===true,null,{timeout:30000});
 await page.locator('#menuBtn').click();
 await expect(page.locator('#worldList button')).toHaveCount(16);
 await page.locator('#worldList button').nth(11).click();
 await expect(page.locator('#worldTitle')).toHaveText(WORLD_NAMES[11]);
});