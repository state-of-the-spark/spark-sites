// 0.1.3 local frames: pauses all animations and sets their clock (Web Animations API).
const {chromium}=require('playwright-core');
const {BASE,UA}=require('./lib');
const OUT='C:/Users/grant/Documents/GitHub/spark-sites/sites/living-websites/audit/screenshots/';
const FR=[[1.6,'pre-burst'],[2.0,'burst-mid'],[2.4,'bubbles-mid'],[6,'rest']];
(async()=>{
 const browser=await chromium.launch();
 const login=async(ctx)=>{const p=await ctx.newPage();await ctx.addCookies([{name:'playground_auto_login_already_happened',value:'1',url:BASE}]);await p.goto(BASE+'/wp-login.php');await p.fill('#user_login','admin');await p.fill('#user_pass','password');await p.click('#wp-submit');await p.waitForLoadState('networkidle');return p;};
 const frame=async(p,t,file,clip)=>{
  await p.goto(BASE+'/living/?v='+Math.random(),{waitUntil:'domcontentloaded'});
  await p.evaluate(t=>{document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000;});},t);
  await p.waitForTimeout(150);
  await p.screenshot({path:OUT+file,clip});
 };
 const run=async(name,vp,clip,extra={})=>{
  const ctx=await browser.newContext({userAgent:UA,viewport:vp,...extra});const p=await login(ctx);
  for(const [t,n] of FR) await frame(p,t,`dash-anim3-local-${name}-${n}.png`,clip);
  const m=await p.evaluate(()=>{const st=document.querySelector('.sl-stem').getBoundingClientRect();const sv=document.querySelector('.sl-vine').getBoundingClientRect();const b=document.querySelector('.sl-bscale').getBoundingClientRect();const h1=document.querySelector('.sl-dash h1').getBoundingClientRect();const ev=document.querySelector('.sl-evolved').getBoundingClientRect();return {stemRight:st.right,svgLeft:sv.left,svgW:sv.width,pct:((st.right-sv.left)/sv.width*100).toFixed(1),burstBox:[b.left,b.top,b.width,b.height],h1Bottom:h1.bottom,svgTop:sv.top,svgBottom:sv.bottom,evTop:ev.top};});
  console.log(name,JSON.stringify(m));
  await ctx.close();
 };
 await run('desktop',{width:1366,height:640},{x:0,y:0,width:1366,height:560});
 await run('mobile',{width:390,height:844},{x:0,y:0,width:390,height:700});
 await run('dark',{width:1366,height:640},{x:0,y:0,width:1366,height:560},{colorScheme:'dark'});
 const r=await browser.newContext({userAgent:UA,viewport:{width:1366,height:640},reducedMotion:'reduce'});
 const pr=await login(r); await pr.goto(BASE+'/living/?v=rm');await pr.waitForTimeout(600);await pr.screenshot({path:OUT+'dash-anim3-local-reduced-motion.png',clip:{x:0,y:0,width:1366,height:560}});
 console.log('reduced-motion',await pr.evaluate(()=>({anim:document.getAnimations().length,off:getComputedStyle(document.querySelector('.sl-stem')).strokeDashoffset,bub:getComputedStyle(document.querySelector('.sl-bub')).display})));
 await r.close();
 // real-time: sample burst scale + first bubble at wall-clock moments
 const c=await browser.newContext({userAgent:UA,viewport:{width:1366,height:640}});const p=await login(c);
 await p.goto(BASE+'/living/?v=rt',{waitUntil:'domcontentloaded'});
 const times=await p.evaluate(()=>new Promise(res=>{const out={};const t0=performance.now();const as=()=>document.getAnimations();
  const tick=()=>{const t=(performance.now()-t0)/1000;const b=as().find(a=>a.animationName==='sl-burst');const s=as().find(a=>a.animationName==='sl-grow'&&a.effect.target.classList.contains('sl-stem'));const r=as().find(a=>a.animationName==='sl-rise');
   if(b&&b.currentTime>0&&!out.burstStarted)out.burstStarted=t;if(r&&r.currentTime>0&&!out.riseStarted)out.riseStarted=t;if(s&&s.playState==='finished'&&!out.stemDone)out.stemDone=t;
   if(t<4)requestAnimationFrame(tick);else res(out);};tick();}));
 console.log('realtime (from DOM ready, s)',JSON.stringify(times));
 await browser.close();
})();
