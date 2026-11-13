const {tool,run,admin,BASE}=require('./lib');
(async()=>{
 const a=await admin();
 let r=await a.api('POST','/tests',{name:'Block hero test',element_type:'block',hypothesis:'x',tier:1,start:true,sessions_14d:500,variants:{A:{label:'A'},B:{label:'B'}}});
 console.log(r.status, JSON.stringify(r.body).slice(0,400));
 const id=r.body.id;
 // update block page to experiment id
 await fetch(`${BASE}/test-tools/tool.php?a=run&f=upd.php&exp=${id}`,{headers:{cookie:'playground_auto_login_already_happened=1'}});
 const html=await (await fetch(`${BASE}/block-test/`,{headers:{cookie:'playground_auto_login_already_happened=1','user-agent':require('./lib').UA}})).text();
 console.log('hasA',html.includes('VARIANT-A-TEXT'),'hasB',html.includes('VARIANT-B-TEXT'));
 console.log((html.match(/<div class="spark-living-block"[\s\S]{0,500}/)||[''])[0]);
 console.log('script?',html.includes('id="spark-living-js"'), 'style?',html.includes('spark-living-base'));
 console.log(await tool('log'));
})()
