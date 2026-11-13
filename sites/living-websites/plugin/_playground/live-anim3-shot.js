// Live 0.1.3 capture as the owner's admin via a short-lived cookie (read from a JSON file, never printed).
// node live-anim3-shot.js <cookies.json>
const {chromium}=require('playwright-core');
const fs=require('fs');
const OUT='C:/Users/grant/Documents/GitHub/spark-sites/sites/living-websites/audit/screenshots/';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const FR=[[1.6,'pre-burst'],[2.0,'burst-mid'],[2.4,'bubbles-mid'],[6,'rest']];
(async()=>{
 const ck=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const browser=await chromium.launch();
 const open=async(vp,extra={})=>{const ctx=await browser.newContext({userAgent:UA,viewport:vp,...extra});
  await ctx.addCookies([{name:ck.liName,value:ck.liVal,domain:'sparkmysite.com',path:'/',secure:true,httpOnly:true,sameSite:'Lax'}]);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));return {ctx,p,errs};};
 const load=async(p)=>{for(let i=0;i<3;i++){const r=await p.goto('https://sparkmysite.com/living/?lv='+Date.now(),{waitUntil:'domcontentloaded'});await p.waitForTimeout(1200);if(await p.$('.sl-dash'))return r.status();}return -1;};
 const frame=async(p,t,file,clip)=>{await load(p);await p.evaluate(t=>{document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000;});},t);await p.waitForTimeout(200);await p.screenshot({path:OUT+file,clip});};
 const metrics=p=>p.evaluate(()=>{const st=document.querySelector('.sl-stem').getBoundingClientRect();const sv=document.querySelector('.sl-vine').getBoundingClientRect();const b=document.querySelector('.sl-bscale').getBoundingClientRect();return {pct:((st.right-sv.left)/sv.width*100).toFixed(1),burst:[b.left,b.top,b.width,b.height].map(x=>+x.toFixed(1)),ver:(document.documentElement.innerHTML.match(/Spark Living[^<]{0,20}/)||[''])[0]};});
 for(const [name,vp,clip,extra] of [['desktop',{width:1366,height:640},{x:0,y:0,width:1366,height:560},{}],['mobile',{width:390,height:844},{x:0,y:0,width:390,height:700},{}],['dark',{width:1366,height:640},{x:0,y:0,width:1366,height:560},{colorScheme:'dark'}]]){
  const {ctx,p,errs}=await open(vp,extra);
  const frs=name==='dark'?[[6,'rest']]:FR;
  for(const [t,n] of frs) await frame(p,t,`live-dash-anim3-${name==='dark'?'dark-rest':name+'-'+n}.png`,clip);
  console.log(name,JSON.stringify(await metrics(p)),'errors',JSON.stringify(errs));
  await ctx.close();
 }
 {const {ctx,p}=await open({width:1366,height:640},{reducedMotion:'reduce'});await load(p);await p.waitForTimeout(600);await p.screenshot({path:OUT+'live-dash-anim3-reduced-motion.png',clip:{x:0,y:0,width:1366,height:560}});
  console.log('reduced',JSON.stringify(await p.evaluate(()=>({anim:document.getAnimations().length,off:getComputedStyle(document.querySelector('.sl-stem')).strokeDashoffset}))));await ctx.close();}
 {const {ctx,p}=await open({width:1366,height:640});await load(p);
  // real-time: wall-clock moments when stem finishes, burst becomes active and first bubble becomes active (relative to first sample)
  await p.goto('https://sparkmysite.com/living/?rt='+Date.now(),{waitUntil:'domcontentloaded'});
  const t=await p.evaluate(()=>new Promise(res=>{const out={};const t0=performance.now();const tick=()=>{const t=(performance.now()-t0)/1000;for(const a of document.getAnimations()){const n=a.animationName,ct=a.effect.getComputedTiming();
    if(n==='sl-grow'&&a.effect.target.classList.contains('sl-stem')&&ct.phase==='after'&&!out.stemDone)out.stemDone=+t.toFixed(2);
    if(n==='sl-burst'&&ct.phase==='active'&&!out.burstStart)out.burstStart=+t.toFixed(2);
    if(n==='sl-burst'&&ct.phase==='after'&&!out.burstDone)out.burstDone=+t.toFixed(2);
    if(n==='sl-rise'&&ct.phase==='active'&&!out.firstBubble)out.firstBubble=+t.toFixed(2);
    if(n==='sl-wash'&&ct.phase==='active'&&!out.washStart)out.washStart=+t.toFixed(2);}
   if(t<5)requestAnimationFrame(tick);else res(out);};tick();}));
  console.log('realtime seconds from first frame',JSON.stringify(t));
  await p.waitForTimeout(500);await p.screenshot({path:OUT+'live-dash-anim3-realtime-6s.png',fullPage:true});await ctx.close();}
 await browser.close();
})();
