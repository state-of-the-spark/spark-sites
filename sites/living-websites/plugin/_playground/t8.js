const {chromium}=require('playwright-core');
const {BASE,UA,tool}=require('./lib');
(async()=>{
 const browser=await chromium.launch(); const ctx=await browser.newContext({userAgent:UA});
 await ctx.addCookies([{name:'playground_auto_login_already_happened',value:'1',url:BASE}]);
 const p=await ctx.newPage();
 await p.goto(BASE+'/wp-login.php'); await p.fill('#user_login','admin'); await p.fill('#user_pass','password'); await p.click('#wp-submit'); await p.waitForLoadState('networkidle');
 await p.goto(BASE+'/wp-admin/admin.php?page=spark-living');
 await p.fill('input[name="name"]','Form-made CTA test'); await p.fill('textarea[name="hypothesis"]','h'); await p.fill('input[name="target"]','.header-cta'); await p.fill('input[name="b_text"]','Get my free estimate');
 await p.click('text=Create test'); await p.waitForLoadState('networkidle');
 const t=await p.textContent('body'); console.log('notice:',t.match(/Test (created|queued|started)[^.]*\./)?.[0]); console.log('queued/running mentions:',t.includes('Form-made CTA test'));
 const st=await p.$$eval('button, input[type=submit]',e=>e.map(x=>x.textContent||x.value).filter(Boolean)); console.log(st.join(' | '));
 await browser.close(); console.log(await tool('log'));
})();
