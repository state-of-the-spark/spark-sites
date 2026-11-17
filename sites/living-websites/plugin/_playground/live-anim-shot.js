// Live capture as the owner's admin via short-lived cookies (read from a JSON file, never printed).
// node live-anim-shot.js <cookies.json> <mode: dash|home>
const {chromium}=require('playwright-core');
const fs=require('fs');
const OUT='C:/Users/grant/Documents/GitHub/spark-sites/sites/living-websites/audit/screenshots/';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
(async()=>{
 const ck=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const mode=process.argv[3]||'dash';
 const browser=await chromium.launch();
 const ctx=await browser.newContext({userAgent:UA,viewport:{width:1366,height:640}});
 await ctx.addCookies([{name:ck.liName,value:ck.liVal,domain:'sparkmysite.com',path:'/',secure:true,httpOnly:true,sameSite:'Lax'}]);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 if(mode==='home'){
  const r=await p.goto('https://sparkmysite.com/?lv='+Date.now(),{waitUntil:'load'});
  await p.waitForTimeout(5000);
  const info=await p.evaluate(()=>({btn:(document.querySelector('a.et_pb_button[href="#contact"]')||{}).textContent,html:document.documentElement.className.match(/sl-v-[^ ]+/g),cookies:document.cookie.split('; ').filter(c=>/spark_living/.test(c)).map(c=>c.split('=')[0]),inlineSL:[...document.scripts].some(s=>/Spark Living/.test(s.textContent)),bodyClass:document.body.className.includes('logged-in')}));
  console.log('home status',r.status(),JSON.stringify(info),'errors',errs);
  await browser.close();return;
 }
 let r=await p.goto('https://sparkmysite.com/living/?lv='+Date.now(),{waitUntil:'load'});
 console.log('first status',r.status());
 await p.waitForTimeout(1500);
 let has=await p.$('.sl-dash');
 if(!has){ r=await p.goto('https://sparkmysite.com/living/?lv='+Date.now(),{waitUntil:'load'}); console.log('second status',r.status()); await p.waitForTimeout(1500); has=await p.$('.sl-dash'); }
 console.log('dashboard present',!!has,'title',await p.title());
 if(!has){await p.screenshot({path:OUT+'live-dash-anim-FAILED.png'});await browser.close();process.exit(2);}
 const clip={x:0,y:0,width:1366,height:560};
 const text=await p.evaluate(()=>document.querySelector('.sl-dash').innerText);
 fs.writeFileSync(process.env.TEMP+'/live-dash-text.txt',text);
 for(const [t,n] of [[0.3,'0.3s'],[1.2,'1.2s'],[2.4,'2.4s'],[3.2,'3.2s'],[4.0,'4.0s'],[6,'rest']]){
  await p.goto('https://sparkmysite.com/living/?lv='+Date.now(),{waitUntil:'domcontentloaded'});
  await p.waitForSelector('.sl-dash');
  await p.evaluate(t=>{document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000;});},t);
  await p.waitForTimeout(200);
  await p.screenshot({path:OUT+`live-dash-anim-${n}.png`,clip});
 }
 await p.goto('https://sparkmysite.com/living/?lv=rt'+Date.now(),{waitUntil:'load'});await p.waitForTimeout(6500);
 await p.screenshot({path:OUT+'live-dash-anim-realtime-6s.png',fullPage:true});
 console.log('errors',errs);
 await browser.close();
})();
