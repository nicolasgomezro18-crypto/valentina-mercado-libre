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
  function filter(rows,f){return rows.filter(r=>r.status!=='Eliminado'&&(!f.seller||r.sellerId===f.seller)&&(!f.account||r.accountId===f.account)&&(!f.status||r.status===f.status)&&(!(f.from||f.to)||validDate(r.date))&&(!f.from||r.date>=f.from)&&(!f.to||r.date<=f.to)&&(!f.settlement||(f.settlement==='review'?settlementReview(r):f.settlement==='yes'?!!r.settlementId:!r.settlementId&&!settlementReview(r)))&&(!f.search||normalize([r.reference,r.productName,r.sellerName,r.accountName].join(' ')).includes(normalize(f.search))));}
  function summarize(rows){const active=rows.filter(r=>!['Cancelado','Eliminado'].includes(r.status));return {orders:new Set(active.filter(r=>r.reference!=='').map(r=>r.orderId)).size,units:active.reduce((s,r)=>s+r.quantity,0),total:active.reduce((s,r)=>s+r.total,0),paid:active.filter(r=>r.status==='Pagado').reduce((s,r)=>s+r.total,0),pending:active.filter(r=>r.status==='Pendiente').reduce((s,r)=>s+r.total,0),unsettled:active.filter(r=>!r.settlementId&&!settlementReview(r)).reduce((s,r)=>s+r.total,0)};}
  function settlementReview(r){return !r.settlementId&&r.settlementNotes==='Estado de rendición no confirmado en la importación.';}
  function dashboard(rows,f={}){
    const selected=filter(rows,f),active=selected.filter(r=>r.status!=='Cancelado'),s=summarize(selected);
    function groups(key){const map=new Map();for(const r of active){const label=key(r);if(!label)continue;const entry=map.get(label)||{label,total:0,units:0};entry.total+=r.total;entry.units+=r.quantity;map.set(label,entry);}return [...map.values()].sort((a,b)=>b.total-a.total);}
    return {...s,rows:selected.length,missingDates:active.filter(r=>!validDate(r.date)).length,missingReferences:active.filter(r=>!r.reference).length,settlementReview:active.filter(settlementReview).reduce((sum,r)=>sum+r.total,0),settled:active.filter(r=>r.settlementId).reduce((sum,r)=>sum+r.total,0),products:groups(r=>r.productName),sellers:groups(r=>r.sellerName),accounts:groups(r=>r.accountName),months:groups(r=>validDate(r.date)?r.date.slice(0,7):'').sort((a,b)=>a.label.localeCompare(b.label)),review:active.filter(r=>!validDate(r.date)||!r.reference||settlementReview(r))};
  }
  function csv(rows){return '\uFEFF'+rows.map(r=>r.map(v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(';')).join('\r\n');}
  return {normalize,amount,validDate,parseDate,total,filter,summarize,csv,dashboard,settlementReview};
})();
if(typeof module!=='undefined')module.exports=SalesCore;
