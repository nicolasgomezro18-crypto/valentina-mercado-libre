'use strict';
(() => {
 const $=id=>document.getElementById(id),C=SalesCore;
 const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Santiago'}).format(new Date());
 let data={products:[],sellers:[],accounts:[],sales:[]},connected=false,selection=new Set(),visible=[],entityKind='',entityId='',saleRequest='',settlementRequest='',settlementRows=[],busy=false,ocrBusy=false,ocrGeneration=0;
 const ENDPOINT='https://script.google.com/macros/s/AKfycbwuytcBHTjNVto3qWozXJibJgoxEcUxh5_OuPhtakQMEzJw-fopj3bUP4ATcbNSqsaHzQ/exec';
 let access=null,bridge=null,bridgePromise=null,frame=null;
 const pending=new Map();
 function connectBridge(){
  if(bridge)return Promise.resolve(bridge);
  if(bridgePromise)return bridgePromise;
  bridgePromise=new Promise((resolve,reject)=>{
   const channel=crypto.randomUUID();
   const timeout=setTimeout(()=>{window.removeEventListener('message',ready);frame?.remove();bridgePromise=null;reject(Error('La conexión necesita activarse una vez por la administradora. No tienes que iniciar sesión en Google.'));},30000);
   function ready(e){
    if(!/^https:\/\/[a-z0-9-]+(?:-script)?\.googleusercontent\.com$/.test(e.origin)||e.data?.type!=='ready'||e.data.channel!==channel)return;
    clearTimeout(timeout);window.removeEventListener('message',ready);bridge={source:e.source,origin:e.origin,channel};resolve(bridge);
   }
   window.addEventListener('message',ready);
   frame=document.createElement('iframe');frame.hidden=true;frame.title='Conexión segura con la hoja';frame.src=ENDPOINT+'?channel='+encodeURIComponent(channel);document.body.appendChild(frame);
  });return bridgePromise;
 }
 window.addEventListener('message',e=>{
  if(!bridge||e.source!==bridge.source||e.origin!==bridge.origin||e.data?.channel!==bridge.channel||e.data.type!=='response')return;
  const entry=pending.get(e.data.id);if(!entry)return;pending.delete(e.data.id);clearTimeout(entry.timer);
  e.data.error?entry.reject(Error(e.data.error)):entry.resolve(e.data.value);
 });
 async function rpc(method,input){
  if(!access)throw Error('Ingresa tu nombre y el código de acceso.');
  const connection=await connectBridge();
  return new Promise((resolve,reject)=>{
   const id=crypto.randomUUID();
   const timer=setTimeout(()=>{pending.delete(id);reject(Error(method==='getData'?'La hoja tardó demasiado en responder. Pulsa Entrar de nuevo.':'No llegó la confirmación. Actualiza las ventas antes de volver a guardar.'));},45000);
   pending.set(id,{resolve,reject,timer});
   connection.source.postMessage({type:'request',channel:connection.channel,id,request:{method,input,actor:access.actor,key:access.key}},connection.origin);
  });
 }
 function toast(text){$('toast').textContent=text;$('toast').hidden=false;setTimeout(()=>$('toast').hidden=true,5500);}
 function options(items,selected='',placeholder='Selecciona…'){return `<option value="">${placeholder}</option>`+items.map(i=>`<option value="${esc(i.id)}" ${i.id===selected?'selected':''}>${esc(i.name)}</option>`).join('');}
 function replaceOptions(id,items,placeholder){const value=$(id).value;$(id).innerHTML=options(items,value,placeholder);}
 function catalog(){
   replaceOptions('filterSeller',data.sellers,'Todos');replaceOptions('filterAccount',data.accounts,'Todas');
   replaceOptions('saleSeller',data.sellers,'Selecciona…');replaceOptions('saleAccount',data.accounts,'Selecciona…');
   $('productGrid').innerHTML=data.products.length?data.products.map(p=>`<article class="product-card"><h3>${esc(p.name)}</h3><strong>${money(p.unitPrice)}</strong><p>Unidad neta · CLP</p><p>${esc(p.note||'')}</p><button data-edit-product="${esc(p.id)}">Editar producto</button></article>`).join(''):'<p>No hay productos. Agrega el primero.</p>';
   for(const [id,list]of [['sellerList',data.sellers],['accountList',data.accounts]])$(id).innerHTML=list.map(i=>`<li>${esc(i.name)}</li>`).join('')||'<li class="muted">Todavía no hay registros.</li>';
 }
 function filters(){return {seller:$('filterSeller').value,account:$('filterAccount').value,status:$('filterStatus').value,settlement:$('filterSettlement').value,from:$('filterFrom').value,to:$('filterTo').value,search:$('search').value};}
 function render(){
   const f=filters();visible=C.filter(data.sales,f).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));
   const selectable=visible.filter(r=>!r.settlementId&&r.status!=='Cancelado');selection=new Set([...selection].filter(id=>selectable.some(r=>r.id===id)));
   const s=C.summarize(visible);$('metricTotal').textContent=money(s.total);$('metricPaid').textContent=money(s.paid);$('metricPending').textContent=money(s.pending);$('metricUnsettled').textContent=money(s.unsettled);$('metricOrders').textContent=`${s.orders} órdenes · ${s.units} unidades`;
   $('salesBody').innerHTML=visible.map(r=>`<tr><td><input type="checkbox" data-select="${esc(r.id)}" aria-label="Seleccionar ${esc(r.reference)} ${esc(r.productName)}" ${selection.has(r.id)?'checked':''} ${r.settlementId||r.status==='Cancelado'?'disabled':''}></td><td>${esc(r.date.split('-').reverse().join('/'))}<small>#${esc(r.reference)}</small></td><td>${esc(r.productName)}</td><td>${esc(r.sellerName)}<small>${esc(r.accountName)}</small></td><td class="num">${r.quantity}</td><td class="num">${money(r.unitPrice)}</td><td class="num"><b>${money(r.total)}</b></td><td><select data-status="${esc(r.id)}" aria-label="Estado de pago ${esc(r.reference)}" ${!connected?'disabled':''}>${['Pendiente','Pagado','Cancelado'].map(x=>`<option ${r.status===x?'selected':''}>${x}</option>`).join('')}</select></td><td>${r.settlementId?`<span class="status done">Rendida</span><small>${esc(r.settlementDate)}</small>`:'<span class="status">Sin rendir</span>'}</td></tr>`).join('');
   $('emptyState').hidden=visible.length>0;$('emptyState').querySelector('h3').textContent=data.sales.length?'No hay ventas con estos filtros':'Aquí empieza tu control de ventas';
   $('rowCount').textContent=`${visible.length} líneas de producto · Los importes excluyen ventas canceladas.${f.from&&f.to&&f.from>f.to?' El rango de fechas está invertido.':''}`;
   const chosen=selectable.filter(r=>selection.has(r.id));$('selectionSummary').textContent=chosen.length?`${chosen.length} líneas seleccionadas · ${money(chosen.reduce((s,r)=>s+r.total,0))} CLP`:'Selecciona ventas para rendir.';
   $('selectAll').checked=selectable.length>0&&chosen.length===selectable.length;$('selectAll').indeterminate=chosen.length>0&&chosen.length<selectable.length;
   $('settle').disabled=!connected||!chosen.length;$('exportCsv').disabled=!visible.length;
   const groups=new Map();for(const r of C.filter(data.sales,{seller:f.seller,account:f.account})){if(!r.settlementId)continue;const g=groups.get(r.settlementId)||{id:r.settlementId,date:r.settlementDate,seller:r.sellerName,count:0,total:0};g.count++;g.total+=r.total;groups.set(g.id,g);}
   $('settlementHistory').innerHTML=[...groups.values()].sort((a,b)=>b.date.localeCompare(a.date)).map(g=>`<div class="history-row"><div><b>${esc(g.seller)} · ${esc(g.date)}</b><small>${esc(g.id)} · ${g.count} líneas</small></div><strong>${money(g.total)} CLP</strong></div>`).join('')||'Todavía no hay rendiciones para esta persona y cuenta.';
 }
 async function refresh(){
   if($('retryConnection').disabled)return;
   $('refresh').disabled=true;$('retryConnection').disabled=true;$('retryConnection').textContent='Comprobando…';$('saveSale').disabled=true;
   $('connectionBanner').className='banner';$('connectionBanner').textContent='Comprobando conexión con Google Sheets…';$('connectionDetails').textContent='Consultando tu hoja. Esta comprobación puede tardar hasta 30 segundos.';
   try{
     const result=await rpc('getData');
     if(!result||!['products','sellers','accounts','sales'].every(key=>Array.isArray(result[key])))throw Error('Google devolvió una respuesta incompleta. Revisa que la implementación use la última versión del script.');
     data=result;catalog();render();connected=true;$('accessDialog').close();
     $('connectionBanner').className='banner';$('connectionBanner').textContent='Conectado a Google Sheets · '+data.email;
     $('connectionDetails').textContent=`Conexión comprobada a las ${new Date().toLocaleTimeString('es-CL')}. ${data.products.length} productos y ${data.sales.length} líneas de venta. Versión 2.0.`;
   }
   catch(e){connected=false;const message=e.message;$('accessError').textContent=message;$('connectionBanner').className='banner error';$('connectionBanner').textContent=message;$('connectionDetails').textContent=message;}
   finally{
     // Restore the connection controls even if data rendering itself fails.
     $('refresh').disabled=false;$('retryConnection').disabled=false;$('retryConnection').textContent='Comprobar conexión';$('saveSale').disabled=!connected;
     try{render();}catch(e){connected=false;$('saveSale').disabled=true;$('connectionBanner').className='banner error';$('connectionBanner').textContent='No se pudieron mostrar las ventas: '+e.message;}
   }
 }
 function openSale(){if(busy)return;$('saleForm').reset();$('saleDate').value=today();$('saleLines').innerHTML='';$('saleError').textContent='';$('extractionWarnings').hidden=true;$('ocrStatus').textContent='Revisa los datos detectados antes de guardar.';saleRequest=crypto.randomUUID();addLine();$('saveSale').disabled=!connected;$('saleDialog').showModal();}
 function addLine(value={}){const el=document.createElement('div');el.className='sale-line';el.innerHTML=`<label>Producto<select class="product" required>${options(data.products,value.productId)}</select></label><label>Cantidad<input class="quantity" type="number" min="1" max="1000000" step="1" value="${esc(value.quantity??1)}" required></label><label>Valor unidad · CLP<input class="price" inputmode="numeric" placeholder="17.060" value="${esc(value.unitPrice??'')}" required></label><button type="button" class="remove-line" aria-label="Quitar producto">×</button>`;el.querySelector('.product').onchange=()=>{const p=data.products.find(p=>p.id===el.querySelector('.product').value);el.querySelector('.price').value=p?.unitPrice??'';updateTotal();};el.querySelector('.remove-line').onclick=()=>{if($('saleLines').children.length===1)return;el.remove();updateTotal();};el.oninput=updateTotal;$('saleLines').appendChild(el);updateTotal();}
 function lines(){return [...document.querySelectorAll('.sale-line')].map(el=>({productId:el.querySelector('.product').value,quantity:el.querySelector('.quantity').value,unitPrice:el.querySelector('.price').value}));}
 function updateTotal(){try{$('orderTotal').textContent=money(lines().reduce((s,l)=>s+C.total(l.quantity,l.unitPrice),0))+' CLP';}catch{$('orderTotal').textContent='Completa los valores';}}
 function parse(){if(!$('saleText').value.trim())return toast('Pega el texto de una venta o adjunta una imagen.');const x=C.extract($('saleText').value,data.products,data.sellers,data.accounts);
   // An extraction starts a fresh draft so fields from another order are not retained.
   $('saleDate').value=x.date;$('saleReference').value=x.reference;$('saleStatus').value=x.status;
   for(const [id,name,list]of [['saleSeller',x.seller,data.sellers],['saleAccount',x.account,data.accounts]])$(id).value=list.find(i=>C.normalize(i.name)===C.normalize(name))?.id||'';
   $('saleLines').innerHTML='';x.lines.forEach(addLine);$('extractionWarnings').hidden=false;$('extractionWarnings').textContent=['Datos sugeridos: confirma fecha, vendedor, cuenta, referencia, cantidades, precio neto y pago.',...x.warnings].join(' ');updateTotal();
 }
 let ocrLibrary;
 async function loadOCR(){if(window.Tesseract)return;if(!ocrLibrary)ocrLibrary=new Promise((res,rej)=>{const el=document.createElement('script');el.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';el.onload=res;el.onerror=()=>{ocrLibrary=null;el.remove();rej(Error('No se pudo descargar el lector. Revisa tu conexión a internet.'));};document.head.appendChild(el);});await ocrLibrary;}
 async function readImages(){const files=[...$('images').files];if(!files.length||ocrBusy)return;if(files.length>5)return toast('Adjunta hasta 5 imágenes por vez.');if(files.some(f=>!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>10*1024*1024))return toast('Usa imágenes JPG, PNG o WebP de hasta 10 MB cada una.');
   ocrBusy=true;const generation=++ocrGeneration;$('parseText').disabled=true;$('images').disabled=true;let worker;
   try{await loadOCR();worker=await Tesseract.createWorker('spa',1,{logger:m=>{$('ocrStatus').textContent=m.status==='recognizing text'?`Leyendo imagen: ${Math.round(m.progress*100)} %`:'Preparando lector de imágenes…';}});const parts=[];for(let i=0;i<files.length;i++){const result=await worker.recognize(files[i]);parts.push(result.data.text);}if(generation!==ocrGeneration)return;const text=parts.join('\n\n');if(!text.trim())throw Error('No se encontró texto legible. Prueba una captura más nítida.');$('saleText').value=text;$('ocrStatus').textContent=`Texto extraído de ${files.length} imagen(es). Pulsa Detectar datos y revisa el formulario. Si son órdenes distintas, regístralas por separado.`;}
   catch(e){$('ocrStatus').textContent='No se pudo leer la imagen: '+e.message;}finally{if(worker)await worker.terminate();ocrBusy=false;$('parseText').disabled=false;$('images').disabled=false;$('images').value='';}
 }
 async function saveSale(e){e.preventDefault();if(busy||!connected)return;const payload={requestId:saleRequest,date:$('saleDate').value,reference:$('saleReference').value.trim(),sellerId:$('saleSeller').value,accountId:$('saleAccount').value,status:$('saleStatus').value,notes:$('saleNotes').value,lines:lines().map(l=>({...l,quantity:Number(l.quantity),unitPrice:C.amount(l.unitPrice)}))};
   try{payload.lines.forEach(l=>C.total(l.quantity,l.unitPrice));busy=true;$('saveSale').disabled=true;$('saleError').textContent='';await rpc('saveOrder',payload);$('saleDialog').close();toast('Venta guardada en Google Sheets.');await refresh();}catch(e){$('saleError').textContent=e.message;}finally{busy=false;$('saveSale').disabled=!connected;}
 }
 function openEntity(kind,id=''){entityKind=kind;entityId=id;const p=data.products.find(p=>p.id===id);$('entityTitle').textContent=kind==='products'?(id?'Editar producto':'Agregar producto'):kind==='sellers'?'Agregar vendedor':'Agregar cuenta';$('entityForm').reset();$('entityName').value=p?.name||'';$('entityPrice').value=p?.unitPrice??'';$('entityAliases').value=p?.aliases||'';$('entityNote').value=p?.note||'';$('productFields').hidden=kind!=='products';$('entityPrice').required=kind==='products';$('entityError').textContent='';$('entityDialog').showModal();}
 async function saveEntity(e){e.preventDefault();if(busy)return;const button=e.submitter;try{busy=true;button.disabled=true;await rpc('saveEntity',{kind:entityKind,id:entityId,name:$('entityName').value,unitPrice:C.amount($('entityPrice').value),aliases:$('entityAliases').value,note:$('entityNote').value});$('entityDialog').close();await refresh();toast('Catálogo actualizado.');}catch(e){$('entityError').textContent=e.message;}finally{busy=false;button.disabled=false;}}
 function exportCSV(){const rows=[['Fecha','Referencia','Producto','Vendedor','Cuenta','Cantidad','Valor unitario CLP','Valor total CLP','Estado de pago','Rendición','Fecha rendición'],...visible.map(r=>[r.date,r.reference,r.productName,r.sellerName,r.accountName,r.quantity,r.unitPrice,r.total,r.status,r.settlementId,r.settlementDate])];const url=URL.createObjectURL(new Blob([C.csv(rows)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ventas-mercado-libre-'+today()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
 function openSettlement(){settlementRows=visible.filter(r=>selection.has(r.id));if(new Set(settlementRows.map(r=>r.sellerId)).size!==1)return toast('Selecciona ventas de una sola persona para esta rendición.');settlementRequest=crypto.randomUUID();const sum=C.summarize(settlementRows);$('settleSummary').innerHTML=`<p><b>${esc(settlementRows[0].sellerName)}</b> · ${settlementRows.length} líneas de producto</p><h2>${money(sum.total)} CLP</h2><p>Pagado: ${money(sum.paid)} · Pendiente de pago: ${money(sum.pending)}</p>`;$('settleDate').value=today();$('settleNotes').value='';$('settleError').textContent='';$('settleDialog').showModal();}
 async function saveSettlement(e){e.preventDefault();if(busy)return;const button=e.submitter;try{busy=true;button.disabled=true;await rpc('settleSales',{requestId:settlementRequest,ids:settlementRows.map(r=>r.id),versions:settlementRows.map(r=>r.version),date:$('settleDate').value,notes:$('settleNotes').value});$('settleDialog').close();selection.clear();await refresh();toast('Rendición registrada.');}catch(e){$('settleError').textContent=e.message;}finally{busy=false;button.disabled=false;}}
 document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n===b));document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==b.dataset.view);$('pageTitle').textContent=b.textContent;});
 document.querySelectorAll('dialog .close').forEach(b=>b.onclick=()=>{if(busy)return;ocrGeneration++;b.closest('dialog').close();});document.querySelectorAll('dialog').forEach(d=>d.addEventListener('cancel',e=>{if(busy)e.preventDefault();else ocrGeneration++;}));
 $('newSale').onclick=openSale;$('emptyNew').onclick=openSale;$('saleForm').onsubmit=saveSale;$('addLine').onclick=()=>addLine();$('parseText').onclick=parse;$('images').onchange=readImages;
 $('refresh').onclick=refresh;$('retryConnection').onclick=refresh;
 for(const id of ['filterSeller','filterAccount','filterStatus','filterSettlement','filterFrom','filterTo','search'])$(id).addEventListener('input',()=>{selection.clear();render();});
 $('clearFilters').onclick=()=>{for(const id of ['filterSeller','filterAccount','filterStatus','filterSettlement','filterFrom','filterTo','search'])$(id).value='';selection.clear();render();};
 $('selectAll').onchange=e=>{selection=e.target.checked?new Set(visible.filter(r=>!r.settlementId&&r.status!=='Cancelado').map(r=>r.id)):new Set();render();};
 $('salesBody').onchange=async e=>{const id=e.target.dataset.select;if(id){e.target.checked?selection.add(id):selection.delete(id);render();return;}const saleId=e.target.dataset.status;if(saleId){const row=data.sales.find(r=>r.id===saleId);e.target.disabled=true;try{await rpc('updatePayment',{id:saleId,status:e.target.value,version:row.version});await refresh();toast('Estado de pago actualizado.');}catch(err){toast(err.message);render();}}};
 $('exportCsv').onclick=exportCSV;$('settle').onclick=openSettlement;$('settleForm').onsubmit=saveSettlement;
 $('addProduct').onclick=()=>openEntity('products');$('addSeller').onclick=()=>openEntity('sellers');$('addAccount').onclick=()=>openEntity('accounts');$('entityForm').onsubmit=saveEntity;$('productGrid').onclick=e=>{const id=e.target.dataset.editProduct;if(id)openEntity('products',id);};
 $('accessForm').onsubmit=async e=>{e.preventDefault();const button=$('enterApp');button.disabled=true;$('accessError').textContent='Conectando…';access={actor:$('accessName').value.trim(),key:$('accessKey').value.trim()};try{await refresh();}finally{button.disabled=false;}};
 $('accessDialog').addEventListener('cancel',e=>e.preventDefault());
 $('signOut').onclick=()=>location.reload();
 $('connectionBanner').textContent='Ingresa para consultar y registrar tus ventas.';
 $('accessDialog').showModal();
})();
