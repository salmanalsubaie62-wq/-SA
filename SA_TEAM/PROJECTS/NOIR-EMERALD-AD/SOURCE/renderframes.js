const {chromium}=require('playwright');const fs=require('fs');
(async()=>{
  const out=process.argv[2],fps=30,from=+process.argv[3]||0,to=+process.argv[4]||720;
  fs.mkdirSync(out,{recursive:true});
  const b=await chromium.launch({args:['--no-sandbox']});const pg=await b.newPage({viewport:{width:1080,height:1920}});
  await pg.goto('file://'+process.cwd()+'/render.html');
  for(let f=from;f<to;f++){
    await pg.evaluate(t=>window.render(t),f/fps);
    await pg.locator('#c').screenshot({path:`${out}/f${String(f).padStart(4,'0')}.jpg`,type:'jpeg',quality:94});
  }
  await b.close();
})();
