/** Valentina Mercado Libre. HTML + Google Sheets. Sin servicios pagos. */
var SCHEMA_ = {
 products: {sheet:'ML_Productos',fields:['id','name','unitPrice','aliases','note'],headers:['Código del producto','Nombre del producto','Valor unitario neto (CLP)','Otros nombres','Observaciones']},
 sellers: {sheet:'ML_Vendedores',fields:['id','name'],headers:['Código del vendedor','Nombre del vendedor']},
 accounts: {sheet:'ML_Cuentas',fields:['id','name'],headers:['Código de la cuenta','Nombre de la cuenta']},
 sales: {sheet:'ML_Ventas',fields:['id','orderId','requestId','date','reference','sellerId','sellerName','accountId','accountName','productId','productName','quantity','unitPrice','total','status','notes','createdAt','createdBy','updatedAt','updatedBy','version','settlementId','settlementDate','settlementNotes','settledBy'],headers:['Código de la venta','Código de la orden','Código de registro','Fecha de venta','Referencia del pedido','Código del vendedor','Nombre del vendedor','Código de la cuenta','Nombre de la cuenta','Código del producto','Nombre del producto','Cantidad','Valor unitario neto (CLP)','Valor total neto (CLP)','Estado de pago','Observaciones','Fecha de registro','Registrado por','Última actualización','Actualizado por','Versión','Código de rendición','Fecha de rendición','Observaciones de rendición','Rendido por']}
};
function doGet(){authorize_();return HtmlService.createHtmlOutputFromFile('Index').setTitle('Valentina · Mercado Libre').addMetaTag('viewport','width=device-width, initial-scale=1');}
function authorize_(){
 var email=Session.getActiveUser().getEmail().toLowerCase();
 var allowed=(PropertiesService.getScriptProperties().getProperty('ALLOWED_EMAILS')||'').split(',').map(function(x){return x.trim().toLowerCase();}).filter(Boolean);
 if(!email||allowed.indexOf(email)<0)throw new Error('Acceso no autorizado. Configura ALLOWED_EMAILS y ejecuta la app como el usuario que accede.');
 return email;
}
function db_(){var id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');if(!id)throw new Error('Falta la propiedad SPREADSHEET_ID.');return SpreadsheetApp.openById(id);}
function lock_(fn){var lock=LockService.getScriptLock();lock.waitLock(30000);try{return fn();}finally{lock.releaseLock();}}
function setup(){authorize_();return lock_(function(){var db=db_();Object.keys(SCHEMA_).forEach(function(k){var def=SCHEMA_[k],s=db.getSheetByName(def.sheet);if(!s)s=db.insertSheet(def.sheet);if(s.getLastRow()===0){s.getRange(1,1,1,def.fields.length).setValues([def.headers]);s.setFrozenRows(1);s.getRange(1,1,1,def.fields.length).setBackground('#eeeeee').setFontColor('#000000').setFontWeight('bold');s.autoResizeColumns(1,def.fields.length);}check_(s,def);});return {ok:true};});}
// Los encabezados visibles están en español; las claves internas conservan el contrato del HTML.
// También se admiten los encabezados originales completos para hojas de la primera versión.
function check_(s,def){if(!s)throw new Error('Falta '+def.sheet+'. Ejecuta setup.');var headers=s.getRange(1,1,1,def.fields.length).getValues()[0],actual=JSON.stringify(headers);if(actual!==JSON.stringify(def.headers)&&actual!==JSON.stringify(def.fields))throw new Error('Encabezados incompatibles en '+def.sheet+'. No se modificaron los datos.');}
function read_(db,key){var def=SCHEMA_[key],s=db.getSheetByName(def.sheet);check_(s,def);if(s.getLastRow()<2)return [];return s.getRange(2,1,s.getLastRow()-1,def.fields.length).getValues().filter(function(r){return !!r[0];}).map(function(row){var o={};def.fields.forEach(function(f,i){o[f]=row[i] instanceof Date?Utilities.formatDate(row[i],'America/Santiago','yyyy-MM-dd'):row[i];});return o;});}
function safe_(value){if(typeof value==='string'&&/^[\s]*[=+@-]/.test(value))return "'"+value;return value;}
function rows_(key,records){return records.map(function(r){return SCHEMA_[key].fields.map(function(f){return safe_(r[f]===undefined?'':r[f]);});});}
function append_(db,key,records){var def=SCHEMA_[key],s=db.getSheetByName(def.sheet);check_(s,def);var at=s.getLastRow()+1;var needed=at+records.length-1;if(needed>s.getMaxRows())s.insertRowsAfter(s.getMaxRows(),needed-s.getMaxRows());var range=s.getRange(at,1,records.length,def.fields.length);range.setNumberFormat('@');range.setValues(rows_(key,records));}
function rewrite_(db,key,records){if(!records.length)return;db.getSheetByName(SCHEMA_[key].sheet).getRange(2,1,records.length,SCHEMA_[key].fields.length).setValues(rows_(key,records));}
function getData(){var email=authorize_();return lock_(function(){var db=db_();return {email:email,products:read_(db,'products'),sellers:read_(db,'sellers'),accounts:read_(db,'accounts'),sales:read_(db,'sales')};});}
function text_(v,name,max){if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error('Revisa '+name+'.');return v.trim();}
function optional_(v,max){if(v===undefined||v==='')return '';return text_(v,'observaciones',max);}
function date_(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))throw new Error('Fecha inválida.');var d=new Date(v+'T12:00:00Z');if(isNaN(d)||d.toISOString().slice(0,10)!==v)throw new Error('Fecha inválida.');return v;}
function number_(v,min,name){if(typeof v!=='number'||!Number.isSafeInteger(v)||v<min)throw new Error('Revisa '+name+'. Usa enteros válidos.');return v;}
function status_(v){if(['Pendiente','Pagado','Cancelado'].indexOf(v)<0)throw new Error('Estado de pago inválido.');return v;}
function normalized_(v){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');}
function find_(records,id,name){var r=records.find(function(x){return x.id===id;});if(!r)throw new Error('Selecciona '+name+' del catálogo.');return r;}
function saveEntity(input){authorize_();return lock_(function(){if(!input||['products','sellers','accounts'].indexOf(input.kind)<0)throw new Error('Tipo inválido.');var db=db_(),list=read_(db,input.kind),name=text_(input.name,'nombre',150),id=input.id||Utilities.getUuid();if(list.some(function(r){return normalized_(r.name)===normalized_(name)&&r.id!==id;}))throw new Error('Este nombre ya existe.');var entry={id:id,name:name};if(input.kind==='products'){entry.unitPrice=number_(input.unitPrice,0,'valor unitario');entry.aliases=optional_(input.aliases,300);entry.note=optional_(input.note,300);}if(input.id){var at=list.findIndex(function(r){return r.id===id;});if(at<0)throw new Error('Registro no encontrado.');list[at]=entry;rewrite_(db,input.kind,list);}else append_(db,input.kind,[entry]);return {ok:true,id:id};});}
function saveOrder(input){var email=authorize_();return lock_(function(){
 if(!input)throw new Error('Orden vacía.');var requestId=text_(input.requestId,'identificador',100),db=db_(),sales=read_(db,'sales');
 var prior=sales.filter(function(r){return r.requestId===requestId;});if(prior.length)return {ok:true,orderId:prior[0].orderId,replayed:true};
 var date=date_(input.date),reference=text_(input.reference,'referencia',100),status=status_(input.status),notes=optional_(input.notes,1000);
 var seller=find_(read_(db,'sellers'),input.sellerId,'vendedor'),account=find_(read_(db,'accounts'),input.accountId,'cuenta');
 if(sales.some(function(r){return r.accountId===account.id&&normalized_(r.reference)===normalized_(reference);}))throw new Error('Este pedido ya existe en esa cuenta. No se guardó una segunda copia.');
 if(!Array.isArray(input.lines)||!input.lines.length||input.lines.length>50)throw new Error('La orden debe contener entre 1 y 50 líneas.');
 var products=read_(db,'products'),orderId=Utilities.getUuid(),now=new Date().toISOString();
 var records=input.lines.map(function(l){var p=find_(products,l.productId,'producto'),q=number_(l.quantity,1,'cantidad'),price=number_(l.unitPrice,0,'valor unitario'),total=q*price;if(q>1000000||!Number.isSafeInteger(total))throw new Error('Cantidad o total fuera de rango.');return {id:Utilities.getUuid(),orderId:orderId,requestId:requestId,date:date,reference:reference,sellerId:seller.id,sellerName:seller.name,accountId:account.id,accountName:account.name,productId:p.id,productName:p.name,quantity:q,unitPrice:price,total:total,status:status,notes:notes,createdAt:now,createdBy:email,updatedAt:now,updatedBy:email,version:1};});
 if(!Number.isSafeInteger(records.reduce(function(s,r){return s+r.total;},0)))throw new Error('Total fuera de rango.');append_(db,'sales',records);SpreadsheetApp.flush();return {ok:true,orderId:orderId};
 });}
function updatePayment(input){var email=authorize_();return lock_(function(){var db=db_(),sales=read_(db,'sales'),row=find_(sales,input.id,'venta');if(row.version!==input.version)throw new Error('La venta cambió. Actualiza antes de editar.');var next=status_(input.status);if(row.settlementId&&next==='Cancelado')throw new Error('No se puede cancelar una venta ya rendida.');row.status=next;row.updatedAt=new Date().toISOString();row.updatedBy=email;row.version++;rewrite_(db,'sales',sales);return {ok:true};});}
function settleSales(input){var email=authorize_();return lock_(function(){
 var db=db_(),sales=read_(db,'sales'),id=text_(input.requestId,'identificador',100),date=date_(input.date),notes=optional_(input.notes,1000);
 if(!Array.isArray(input.ids)||!input.ids.length||input.ids.length>2000||!Array.isArray(input.versions)||input.ids.length!==input.versions.length||new Set(input.ids).size!==input.ids.length)throw new Error('Selección inválida.');
 var prior=sales.filter(function(r){return r.settlementId===id;});if(prior.length){if(prior.length===input.ids.length&&prior.every(function(r){return input.ids.indexOf(r.id)>=0;}))return {ok:true,replayed:true};throw new Error('La identificación de rendición ya está en uso.');}
 var selected=input.ids.map(function(saleId,i){var r=find_(sales,saleId,'venta');if(r.version!==input.versions[i])throw new Error('Una venta cambió. Actualiza la selección.');if(r.settlementId)throw new Error('Una venta ya fue rendida.');if(r.status==='Cancelado')throw new Error('No se pueden rendir ventas canceladas.');return r;});
 if(new Set(selected.map(function(r){return r.sellerId;})).size!==1)throw new Error('Selecciona ventas de una sola persona.');
 var now=new Date().toISOString();selected.forEach(function(r){r.settlementId=id;r.settlementDate=date;r.settlementNotes=notes;r.settledBy=email;r.version++;r.updatedAt=now;r.updatedBy=email;});rewrite_(db,'sales',sales);SpreadsheetApp.flush();return {ok:true,id:id};
 });}
