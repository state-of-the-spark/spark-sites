const {chromium}=require('playwright-core');
const {BASE,UA,tool}=require('./lib');
(async()=>{
 const browser=await chromium.launch(); const ctx=await browser.newContext({userAgent:UA,viewport:{width:1280,height:900}});
 await ctx.addCookies([{name:'playground_auto_login_already_happened',value:'1',url:BASE}]);
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto(BASE+'/wp-login.php'); await p.fill('#user_login','admin'); await p.fill('#user_pass','password'); await p.click('#wp-submit'); await p.waitForLoadState('networkidle');
 await p.goto(BASE+'/wp-admin/admin.php?page=spark-living');
 console.log('running test shown:',(await p.textContent('body')).includes('AppPw CTA'));
 await p.selectOption('select[name="verdict"]','keep_a').catch(e=>console.log('select err',e.message.split('\n')[0]));
 await p.click('text=End test'); await p.waitForLoadState('networkidle');
 console.log('after end:',(await p.textContent('body')).match(/No test is running[^.]*\./)?.[0], '| notice:',(await p.textContent('.notice, .sl-notice, .updated').catch(()=>''))?.trim().slice(0,100));
 await p.fill('input[name="name"]','Form-made CTA test'); await p.fill('textarea[name="hypothesis"]','h'); 
 const inputs=await p.$$eval('form input[name], form select[name], form textarea[name]',els=>els.map(e=>e.name)); console.log(inputs.join(','));
 await browser.close(); console.log('pageerrors',errs); console.log(await tool('log'));
})();
