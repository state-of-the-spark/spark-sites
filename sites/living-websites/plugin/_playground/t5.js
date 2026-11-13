const {chromium}=require('playwright-core');
const {tool,admin,BASE,UA}=require('./lib');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const a=await admin(); const browser=await chromium.launch();
 async function slowCheck(label){
  const ctx=await browser.newContext({userAgent:UA}); await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false});});
  await ctx.addCookies([{name:'playground_auto_login_already_happened',value:'1',url:BASE},{name:'spark_living',value:'eeeeeeeeeeeeeeee.7000',url:BASE}]);
  const p=await ctx.newPage();
  await p.route('**/button-test/', async route=>{const r=await route.fetch();let b=await r.text();b=b.replace('</body>','<script src="/slow.js"></script></body>');await route.fulfill({response:r,body:b});});
  await p.route('**/slow.js', async route=>{await sleep(3500);await route.fulfill({contentType:'application/javascript',body:'window.slowDone=1;'});});
  const nav=p.goto(BASE+'/button-test/',{waitUntil:'commit'});
  await sleep(500); const early=await p.evaluate(()=>{const e=document.querySelector('.header-cta');return e?getComputedStyle(e).visibility+'|'+e.textContent:'no-el';}).catch(e=>'err '+e.message);
  await sleep(1300); const mid=await p.evaluate(()=>{const e=document.querySelector('.header-cta');return e?getComputedStyle(e).visibility+'|'+e.textContent+'|slowDone='+window.slowDone:'no-el';});
  await nav; await sleep(500); const late=await p.evaluate(()=>{const e=document.querySelector('.header-cta');return getComputedStyle(e).visibility+'|'+e.textContent;});
  console.log(label,'t=0.5s:',early,' t=1.8s (DOM still blocked):',mid,' after load:',late); await ctx.close();
 }
 await slowCheck('valid selector');
 for(const target of ['a[[ broken','.does-not-exist']){
   const s=await a.api('GET','/state'); if(s.body.running) await a.api('POST',`/tests/${s.body.running.id}/conclude`,{verdict:'no_difference',note:'x'});
   const r=await a.api('POST','/tests',{name:'broken '+target,element_type:'selector',target,hypothesis:'h',tier:1,start:true,sessions_14d:500,variants:{A:{label:'A'},B:{label:'B',changes:[{op:'text',value:'ZZZ'}]}}});
   console.log('create',target,r.status,JSON.stringify(r.body).slice(0,200));
   if(r.status!==201) continue;
   const ctx=await browser.newContext({userAgent:UA}); await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false});});
   await ctx.addCookies([{name:'playground_auto_login_already_happened',value:'1',url:BASE},{name:'spark_living',value:'ffffffffffffffff.7000',url:BASE}]);
   const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.goto(BASE+'/button-test/'); await sleep(1800);
   console.log(target,'-> cta:',await p.evaluate(()=>{const e=document.querySelector('.header-cta');return getComputedStyle(e).visibility+'|'+e.textContent;}),'| body visible:',await p.evaluate(()=>getComputedStyle(document.body).visibility),'| pageerrors',errs); await ctx.close();
 }
 await browser.close(); console.log(await tool('log'));
})().catch(e=>{console.error(e);process.exit(1)});
