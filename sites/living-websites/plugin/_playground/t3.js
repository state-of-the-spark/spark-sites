const {chromium}=require('playwright-core');
const {tool,admin,BASE,UA}=require('./lib');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function visitor(browser,{bucket,ua=UA,webdriverHidden=true,vid='aaaaaaaaaaaaaaaa',extraCookies=[]}={}){
  const ctx=await browser.newContext({userAgent:ua});
  if(webdriverHidden) await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false});});
  const ck=[{name:'playground_auto_login_already_happened',value:'1',url:BASE}];
  if(bucket!=null) ck.push({name:'spark_living',value:`${vid}.${bucket}`,url:BASE});
  await ctx.addCookies(ck.concat(extraCookies));
  return ctx;
}
(async()=>{
 const a=await admin();
 const browser=await chromium.launch();
 const s=await a.api('GET','/state');
 if(s.body.running){ const c=await a.api('POST',`/tests/${s.body.running.id}/conclude`,{verdict:'no_difference',note:'cleanup'}); console.log('concluded old',c.status);}
 let r=await a.api('POST','/tests',{name:'Header CTA wording',element_type:'selector',target:'.header-cta',hypothesis:'Naming outcome wins',tier:1,start:true,sessions_14d:500,variants:{A:{label:'Free Quote'},B:{label:'Get my free estimate',changes:[{op:'text',value:'Get my free estimate'}]}}});
 console.log('create',r.status,r.body.id,r.body.status); const id=r.body.id;
 const res={};
 for(const [name,bucket] of [['A-group',2000],['B-group',7000],['holdout',500]]){
   const ctx=await visitor(browser,{bucket}); const p=await ctx.newPage();
   await p.goto(BASE+'/button-test/'); await p.waitForSelector('.header-cta'); await sleep(500);
   const txt=await p.textContent('.header-cta'); const vis=await p.evaluate(()=>getComputedStyle(document.querySelector('.header-cta')).visibility);
   const cookies=(await ctx.cookies()).filter(c=>c.name.startsWith('spark_living')).map(c=>c.name+'='+c.value);
   // reload twice for stickiness
   await p.reload(); await sleep(400); const t2=await p.textContent('.header-cta'); await p.reload(); await sleep(400); const t3=await p.textContent('.header-cta');
   res[name]={txt,vis,t2,t3,cookies}; await ctx.close();
 }
 console.log(JSON.stringify(res,null,1));
 // stickiness: visitor in A bucket with prior B assignment cookie keeps B
 {const ctx=await visitor(browser,{bucket:2000,extraCookies:[{name:'spark_living_a',value:`${id}:B`,url:BASE}]});const p=await ctx.newPage();await p.goto(BASE+'/button-test/');await sleep(600);console.log('sticky-override (bucket A, cookie B) ->',await p.textContent('.header-cta'));await ctx.close();}
 // bot UA: shows A and not counted
 {const ctx=await visitor(browser,{bucket:7000,ua:'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'});const p=await ctx.newPage();await p.goto(BASE+'/button-test/');await sleep(600);console.log('bot (bucket B) ->',await p.textContent('.header-cta'));await ctx.close();}
 // automation (webdriver true, normal UA)
 {const ctx=await visitor(browser,{bucket:7000,webdriverHidden:false});const p=await ctx.newPage();await p.goto(BASE+'/button-test/');await sleep(600);console.log('webdriver=true (bucket B) ->',await p.textContent('.header-cta'));await ctx.close();}
 console.log(await tool('events'));
 console.log(await tool('log'));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
