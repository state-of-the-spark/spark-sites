// Captures dashboard animation frames at exact times by pausing all animations (Web Animations API).
const {chromium}=require('playwright-core');
const {BASE,UA}=require('./lib');
const OUT='C:/Users/grant/Documents/GitHub/spark-sites/sites/living-websites/audit/screenshots/';
(async()=>{
 const browser=await chromium.launch();
 const login=async(ctx)=>{const p=await ctx.newPage();await ctx.addCookies([{name:'playground_auto_login_already_happened',value:'1',url:BASE}]);await p.goto(BASE+'/wp-login.php');await p.fill('#user_login','admin');await p.fill('#user_pass','password');await p.click('#wp-submit');await p.waitForLoadState('networkidle');return p;};
 const frame=async(p,t,file,clip)=>{
  await p.goto(BASE+'/living/?v='+Math.random(),{waitUntil:'domcontentloaded'});
  await p.evaluate(t=>{document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000;});},t);
  await p.waitForTimeout(150);
  await p.screenshot({path:OUT+file,clip});
 };
 const ctx=await browser.newContext({userAgent:UA,viewport:{width:1366,height:640}});
 const p=await login(ctx);
 const clip={x:0,y:0,width:1366,height:560};
 for(const [t,n] of [[0.3,'0.3s'],[1.2,'1.2s'],[2.4,'2.4s'],[3.2,'3.2s'],[4.0,'4.0s'],[6,'rest']]) await frame(p,t,`dash-anim-local-${n}.png`,clip);
 // real-time sanity: load and wait 6s, no pausing
 await p.goto(BASE+'/living/?v=rt');await p.waitForTimeout(6500);await p.screenshot({path:OUT+'dash-anim-local-realtime-6s.png',clip});
 await ctx.close();
 const m=await browser.newContext({userAgent:UA,viewport:{width:390,height:844}});
 const pm=await login(m); await frame(pm,6,'dash-anim-local-rest-mobile.png',{x:0,y:0,width:390,height:700});
 await frame(pm,3.2,'dash-anim-local-mobile-3.2s.png',{x:0,y:0,width:390,height:700});
 await m.close();
 const r=await browser.newContext({userAgent:UA,viewport:{width:1366,height:640},reducedMotion:'reduce'});
 const pr=await login(r); await pr.goto(BASE+'/living/?v=rm');await pr.waitForTimeout(600);await pr.screenshot({path:OUT+'dash-anim-local-reduced-motion.png',clip});
 const info=await pr.evaluate(()=>({anim:document.getAnimations().length,off:getComputedStyle(document.querySelector('.sl-stem')).strokeDashoffset}));
 console.log('reduced-motion',info);
 await browser.close();
})();
