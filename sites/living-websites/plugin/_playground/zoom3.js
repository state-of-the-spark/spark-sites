const {chromium}=require('playwright-core');const {BASE,UA}=require('./lib');
const OUT='C:/Users/grant/Documents/GitHub/spark-sites/sites/living-websites/audit/screenshots/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({userAgent:UA,viewport:{width:1366,height:640},deviceScaleFactor:3});
const p=await ctx.newPage();await ctx.addCookies([{name:'playground_auto_login_already_happened',value:'1',url:BASE}]);await p.goto(BASE+'/wp-login.php');await p.fill('#user_login','admin');await p.fill('#user_pass','password');await p.click('#wp-submit');await p.waitForLoadState('networkidle');
await p.goto(BASE+'/living/?z='+Math.random(),{waitUntil:'domcontentloaded'});await p.evaluate(()=>document.getAnimations().forEach(a=>{a.pause();a.currentTime=6000;}));await p.waitForTimeout(150);
await p.screenshot({path:OUT+'dash-anim3-local-burst-zoom.png',clip:{x:780,y:100,width:220,height:90}});await b.close();})();
