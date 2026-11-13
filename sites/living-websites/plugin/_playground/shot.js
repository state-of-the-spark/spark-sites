const {chromium}=require('playwright-core');
const {BASE,UA,tool}=require('./lib');
(async()=>{
 const browser=await chromium.launch(); const ctx=await browser.newContext({userAgent:UA,viewport:{width:1280,height:900}});
 await ctx.addCookies([{name:'playground_auto_login_already_happened',value:'1',url:BASE}]);
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 const r0=await p.goto(BASE+'/living/'); console.log('logged-out status',r0.status());
 await p.goto(BASE+'/wp-login.php'); await p.fill('#user_login','admin'); await p.fill('#user_pass','password'); await p.click('#wp-submit'); await p.waitForLoadState('networkidle');
 const r=await p.goto(BASE+'/living/'); console.log('admin status',r.status()); await p.waitForTimeout(800);
 await p.screenshot({path:process.argv[2]||'screenshots/dashboard.png',fullPage:true});
 console.log('errors',errs);
 await p.goto(BASE+'/wp-admin/admin.php?page=spark-living'); await p.waitForTimeout(800); console.log('admin page title',await p.title());
 await p.screenshot({path:'screenshots/wp-admin-page.png',fullPage:true});
 await browser.close(); console.log(await tool('log'));
})();
