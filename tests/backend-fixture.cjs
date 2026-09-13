const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),path=require('node:path');
function fixture(){
 const sheets=new Map();let email='test@example.com',locked=false;
 function sheet(){return {rows:[],getLastRow(){let n=this.rows.length;while(n&&!this.rows[n-1].some(v=>v!==''&&v!==undefined))n--;return n;},getMaxRows(){return 10000;},insertRowsAfter(){},setFrozenRows(){},autoResizeColumns(){},getRange(row,col,n,m){const self=this;return {getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>self.rows[row-1+i]?.[col-1+j]??'')),setValues(values){if(values.length!==n||values.some(r=>r.length!==m))throw Error('Invalid shape');values.forEach((r,i)=>{self.rows[row-1+i]||=[];r.forEach((v,j)=>{self.rows[row-1+i][col-1+j]=typeof v==='string'&&v.startsWith("'")?v.slice(1):v;});});return this;},setNumberFormat(){return this;},setBackground(){return this;},setFontColor(){return this;},setFontWeight(){return this;}};}};}
 const db={getSheetByName:n=>sheets.get(n),insertSheet:n=>{const s=sheet();sheets.set(n,s);return s;}};
 const ctx={Session:{getActiveUser:()=>({getEmail:()=>email})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>({ALLOWED_EMAILS:'test@example.com',SPREADSHEET_ID:'test'}[k])})},SpreadsheetApp:{openById:()=>db,flush:()=>{}},Utilities:{getUuid:()=>crypto.randomUUID(),formatDate:d=>d.toISOString().slice(0,10)},LockService:{getScriptLock:()=>({waitLock:()=>{if(locked)throw Error('Already locked');locked=true;},releaseLock:()=>{locked=false;}})}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8'),ctx);ctx.setup();
 const p=ctx.saveEntity({kind:'products',name:'BERBERINA',unitPrice:17060,aliases:'Berberina',note:''}).id;
 const p2=ctx.saveEntity({kind:'products',name:'HPZ',unitPrice:36690,aliases:'HPZ',note:''}).id;
 const s=ctx.saveEntity({kind:'sellers',name:'Valen'}).id,a=ctx.saveEntity({kind:'accounts',name:'Tía'}).id;
 const order=(overrides={})=>({requestId:crypto.randomUUID(),date:'2026-09-13',reference:'00123456',sellerId:s,accountId:a,status:'Pendiente',notes:'',lines:[{productId:p,quantity:2,unitPrice:17060}],...overrides});
 return {ctx,p,p2,s,a,order,setEmail:e=>{email=e;},db};
}
module.exports={fixture};
