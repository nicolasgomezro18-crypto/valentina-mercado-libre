'use strict';
const SalesCore = (() => {
  const normalize = x => String(x ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
  function amount(value) {
    if(typeof value==='number') return Number.isSafeInteger(value)&&value>=0?value:null;
    const s=String(value??'').replace(/CLP|\$/gi,'').trim();
    if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,0+)?$/.test(s))return null;
    const n=Number(s.replace(/\./g,'').replace(/,0+$/,''));
    return Number.isSafeInteger(n)?n:null;
  }
  function validDate(s) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;
    const d=new Date(s+'T12:00:00Z');
    return !isNaN(d)&&d.toISOString().slice(0,10)===s;
  }
  function parseDate(s) {
    s=String(s??'').trim();
    if(validDate(s))return s;
    const m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if(!m)return '';
    const date=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    return validDate(date)?date:'';
  }
  function total(qty,price) {
    const q=Number(qty),p=amount(price),v=q*p;
    if(!Number.isSafeInteger(q)||q<1||p===null||!Number.isSafeInteger(v))throw Error('Revisa cantidad y valor unitario: usa unidades enteras y pesos chilenos sin decimales.');
    return v;
  }
  function extract(text,products=[],sellers=[],accounts=[]) {
    const out={date:'',seller:'',account:'',reference:'',status:'',lines:[],warnings:[]};
    const labels={fecha:'date',vendedor:'seller',vendedora:'seller',persona:'seller',cuenta:'account','cuenta de salida':'account','cuenta mercado libre':'account',pedido:'reference',referencia:'reference','numero de pedido':'reference','numero de referencia':'reference','# de venta':'reference',orden:'reference','estado de pago':'status',estado:'status'};
    let line={productId:'',quantity:'',unitPrice:''},explicitTotal=null;
    for(const raw of text.split(/[\n;]+/)) {
      const m=raw.trim().match(/^([^:]+):\s*(.+)$/); if(!m)continue;
      const key=normalize(m[1]),value=m[2].trim();
      if(labels[key])out[labels[key]]=value;
      if(key==='producto'){
        if(line.productId||line.productText){out.lines.push(line);line={productId:'',quantity:'',unitPrice:''};}
        const p=products.find(p=>[p.name,...(p.aliases||'').split(',')].some(a=>normalize(a)===normalize(value)));
        line.productId=p?.id||'';line.productText=value;
      }
      if(['cantidad','unidades'].includes(key))line.quantity=value;
      if(['valor unidad','valor unitario','precio unitario'].includes(key))line.unitPrice=amount(value)??'';
      if(['total','valor total'].includes(key))explicitTotal=amount(value);
    }
    if(!line.productId&&!line.productText){
      const normalized=normalize(text),matches=products.filter(p=>[p.name,...(p.aliases||'').split(',')].filter(Boolean).some(a=>new RegExp('(^|[^a-z0-9])'+normalize(a).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^a-z0-9])').test(normalized)));
      if(matches.length===1)line.productId=matches[0].id;
      if(matches.length>1)out.warnings.push('Se detectaron varios productos. Separa cada uno con «Producto:».');
    }
    out.lines.push(line);
    if(!out.date){const m=text.match(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\b/);out.date=m?.[0]||'';}
    const originalDate=out.date;out.date=parseDate(originalDate);
    if(originalDate&&!out.date)out.warnings.push('Fecha no reconocida. Complétala manualmente.');
    if(!out.reference){const m=text.match(/(?:pedido|venta|orden|referencia)\s*(?:n[°ºo.]*)?\s*[#:]?\s*(\d{4,})/i);out.reference=m?.[1]||'';}
    const st=normalize(out.status);out.status=st==='pagado'?'Pagado':st==='pendiente'?'Pendiente':st==='cancelado'?'Cancelado':'';
    for(const l of out.lines){
      if(!l.quantity){const m=text.match(/\b(\d+)\s*(?:unidades?|uds?)\b/i);if(out.lines.length===1&&m)l.quantity=m[1];}
      if(l.unitPrice==='')out.warnings.push('Confirma el precio unitario neto; el OCR no descuenta comisiones ni envíos.');
      if(!l.productId)out.warnings.push('Selecciona el producto del catálogo.');
    }
    if(out.seller&&!sellers.some(s=>normalize(s.name)===normalize(out.seller)))out.warnings.push('El vendedor no existe en el catálogo. Selecciónalo o créalo.');
    if(out.account&&!accounts.some(s=>normalize(s.name)===normalize(out.account)))out.warnings.push('La cuenta no existe en el catálogo. Selecciónala o créala.');
    if(explicitTotal!==null){try {if(out.lines.reduce((sum,l)=>sum+total(l.quantity,l.unitPrice),0)!==explicitTotal)out.warnings.push('El total del texto no coincide con cantidad × valor unitario. Revisa los valores.');}catch{out.warnings.push('Completa los valores para comparar el total del texto.');}}
    out.warnings=[...new Set(out.warnings)];return out;
  }
  function filter(rows,f){return rows.filter(r=>(!f.seller||r.sellerId===f.seller)&&(!f.account||r.accountId===f.account)&&(!f.status||r.status===f.status)&&(!f.from||r.date>=f.from)&&(!f.to||r.date<=f.to)&&(!f.settlement||(f.settlement==='yes'?!!r.settlementId:!r.settlementId))&&(!f.search||normalize([r.reference,r.productName,r.sellerName,r.accountName].join(' ')).includes(normalize(f.search))));}
  function summarize(rows){const active=rows.filter(r=>r.status!=='Cancelado');return {orders:new Set(active.map(r=>r.orderId)).size,units:active.reduce((s,r)=>s+r.quantity,0),total:active.reduce((s,r)=>s+r.total,0),paid:active.filter(r=>r.status==='Pagado').reduce((s,r)=>s+r.total,0),pending:active.filter(r=>r.status==='Pendiente').reduce((s,r)=>s+r.total,0),unsettled:active.filter(r=>!r.settlementId).reduce((s,r)=>s+r.total,0)};}
  function csv(rows){return '\uFEFF'+rows.map(r=>r.map(v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(';')).join('\r\n');}
  return {normalize,amount,validDate,parseDate,total,extract,filter,summarize,csv};
})();
if(typeof module!=='undefined')module.exports=SalesCore;
