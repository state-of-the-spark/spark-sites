const {chromium}=require('playwright-core');
const {BASE,UA,tool}=require('./lib');
(async()=>{
 const browser=await chromium.launch(); const ctx=await browser.newContext({userAgent:UA,viewport:{width:1400,height:900}});
 await ctx.addCookies([{name:'playground_auto_login_already_happened',value:'1',url:BASE}]);
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,150))});
 await p.goto(BASE+'/wp-login.php'); await p.fill('#user_login','admin'); await p.fill('#user_pass','password'); await p.click('#wp-submit'); await p.waitForLoadState('networkidle');
 await p.goto(BASE+'/wp-admin/post.php?post=5&action=edit'); await p.waitForFunction(()=>window.wp&&wp.data&&wp.data.select('core/block-editor')&&wp.data.select('core/block-editor').getBlocks().length>0,null,{timeout:60000}).catch(e=>console.log('wait err'));
 await p.waitForTimeout(1500);
 const r=await p.evaluate(()=>{const b=wp.data.select('core/block-editor').getBlocks();return {types:[wp.blocks.getBlockType('spark-living/living-block')?1:0,wp.blocks.getBlockType('spark-living/variant')?1:0],top:b.map(x=>x.name+'['+x.innerBlocks.map(i=>i.name+':'+i.attributes.variantKey+':'+i.innerBlocks.length).join(',')+']'),invalid:b.some(x=>!x.isValid)};});
 console.log(JSON.stringify(r));
 await p.screenshot({path:'screenshots/editor.png'});
 // save and confirm
 await p.evaluate(()=>wp.data.dispatch('core/editor').editPost({title:'Block Test'})); await p.evaluate(()=>wp.data.dispatch('core/editor').savePost()); await p.waitForTimeout(2500);
 console.log('errors',errs); await browser.close(); console.log(await tool('log'));
})();
