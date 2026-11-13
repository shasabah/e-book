const {chromium}=require('playwright');
const jobs=JSON.parse(process.argv[2]);
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage();
  for(const [name,land] of jobs){
    await p.goto('file:///home/claude/ptanmap/out/'+name+'.html',{waitUntil:'load'});
    await p.pdf({path:'/home/claude/ptanmap/out/'+name+'.pdf',format:'A3',landscape:land,printBackground:true});
    console.log(name, land?'landscape':'portrait');
  }
  await b.close();
})();
