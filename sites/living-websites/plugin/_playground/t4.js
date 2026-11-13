const {chromium}=require('playwright-core');
const {tool,BASE,UA}=require('./lib');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch();
 const mk=async(bucket,vid)=>{const ctx=await browser.newContext({userAgent:UA});await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false});});
   await ctx.addCookies([{name:'playground_auto_login_already_happened',value:'1',url:BASE},{name:'spark_living',value:`${vid}.${bucket}`,url:BASE}]);return ctx;};
 await tool('sql','&q='+encodeURIComponent('DELETE FROM wp_spark_living_events'));
 // B visitor clicks cta, tel, focuses form
 let ctx=await mk(7000,'bbbbbbbbbbbbbbbb'); let p=await ctx.newPage(); await p.goto(BASE+'/button-test/'); await sleep(400);
 await p.evaluate(()=>document.addEventListener('click',e=>{if(e.target.closest('a'))e.preventDefault();})); await p.click('.header-cta'); await sleep(200); await p.click('#callus'); await sleep(200); await p.focus('#in1'); await sleep(800);
 await p.click('.header-cta'); await sleep(300); // repeat should not duplicate
 await ctx.close();
 // A visitor clicks CTA only
 ctx=await mk(2000,'cccccccccccccccc'); p=await ctx.newPage(); await p.goto(BASE+'/button-test/'); await sleep(400); await p.click('.header-cta'); await sleep(800); await ctx.close();
 // editor logged in (browser login)
 ctx=await browser.newContext({userAgent:UA}); await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false});});
 await ctx.addCookies([{name:'playground_auto_login_already_happened',value:'1',url:BASE}]);
 p=await ctx.newPage(); await p.goto(BASE+'/wp-login.php'); await p.fill('#user_login','admin'); await p.fill('#user_pass','password'); await p.click('#wp-submit'); await p.waitForLoadState('networkidle');
 await p.goto(BASE+'/button-test/'); await sleep(500); const html=await p.content(); console.log('editor page has script:',html.includes('spark-living-js'),'cookies:',(await ctx.cookies()).filter(c=>c.name.startsWith('spark_living')).map(c=>c.name));
 await p.click('.header-cta').catch(()=>{}); await sleep(500);
 // editor with the staff cookie but forcing script? staff cookie path: simulate logged-out browser with staff cookie
 const ctx2=await mk(7000,'dddddddddddddddd'); await ctx2.addCookies([{name:'spark_living_staff',value:'1',url:BASE}]); const p2=await ctx2.newPage(); await p2.goto(BASE+'/button-test/'); await sleep(500); await p2.click('.header-cta'); await sleep(500); console.log('staff-cookie visitor text:',await p2.textContent('.header-cta'));
 await browser.close();
 const rows=JSON.parse(await tool('events')); console.log(rows.map(r=>`${r.experiment_id} ${r.variant} ${r.visitor_id.slice(0,4)} ${r.event_type}`).join('\n'));
 console.log(await tool('log'));
})().catch(e=>{console.error(e);process.exit(1)});
