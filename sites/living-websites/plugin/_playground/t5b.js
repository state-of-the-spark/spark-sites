const {chromium}=require('playwright-core');
const {tool,admin,BASE,UA}=require('./lib');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const a=await admin(); const browser=await chromium.launch();
 const s=await a.api('GET','/state'); if(s.body.running) await a.api('POST',`/tests/${s.body.running.id}/conclude`,{verdict:'no_difference',note:'x'});
 const r=await a.api('POST','/tests',{name:'Header CTA wording 2',element_type:'selector',target:'.header-cta',hypothesis:'h',tier:1,start:true,sessions_14d:500,variants:{A:{label:'A'},B:{label:'B',changes:[{op:'text',value:'Get my free estimate'}]}}});
 console.log('create',r.status,r.body.id);
 const ctx=await browser.newContext({userAgent:UA}); await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false});});
 await ctx.addCookies([{name:'playground_auto_login_already_happened',value:'1',url:BASE},{name:'spark_living',value:'eeeeeeeeeeeeeeee.7000',url:BASE}]);
 const p=await ctx.newPage(); const log=[]; p.on('console',m=>log.push(m.text()));
 await p.route('**/button-test/', async route=>{const r=await route.fetch();let b=await r.text();b=b.replace('</body>','<script src="/slow.js"></script></body>');const h={...r.headers()};delete h['content-length'];await route.fulfill({status:200,headers:h,body:b});});
 await p.route('**/slow.js', async route=>{await sleep(3500);await route.fulfill({contentType:'application/javascript',body:'window.slowDone=1;'});});
 // record visibility timeline via an init script observer
 await p.addInitScript(()=>{window.__tl=[];const t0=performance.now();const iv=setInterval(()=>{const e=document.querySelector('.header-cta');if(e)window.__tl.push(Math.round(performance.now()-t0)+':'+getComputedStyle(e).visibility+':'+e.textContent);},150);setTimeout(()=>clearInterval(iv),6000);});
 await p.goto(BASE+'/button-test/'); await sleep(1500);
 console.log('timeline',await p.evaluate(()=>window.__tl.filter((x,i)=>i%3==0).join(' | ')));
 console.log('final',await p.evaluate(()=>getComputedStyle(document.querySelector('.header-cta')).visibility+'|'+document.querySelector('.header-cta').textContent+'|'+typeof window.sparkLiving+'|'+document.cookie));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
