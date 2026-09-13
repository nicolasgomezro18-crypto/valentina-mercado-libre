import fs from 'node:fs';
const dir=new URL('./',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,dir),'utf8');
const html=read('src/template.html').replace('/* STYLES */',()=>read('src/styles.css')).replace('/* CORE */',()=>read('src/core.js')).replace('/* APP */',()=>read('src/app.js'));
fs.mkdirSync(new URL('apps-script/',dir),{recursive:true});
fs.writeFileSync(new URL('index.html',dir),html);
fs.writeFileSync(new URL('apps-script/Index.html',dir),html);
console.log('HTML generado: index.html y apps-script/Index.html');
