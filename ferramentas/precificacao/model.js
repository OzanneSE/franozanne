/* Cálculo local: despesas rateadas pela participação no custo variável previsto. */
(function(root){
'use strict';
const num=v=>{const s=String(v??'').trim(); if(!s)return NaN; return Number(s.includes(',')?s.replace(/\./g,'').replace(',','.'):s);};
const valid=n=>Number.isFinite(n)&&n>=0;
const text=s=>String(s??'').trim().slice(0,120);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
function validate(s){
 if(!s||s.app!=='ozanne-precificacao'||s.version!==1||!['full','mc'].includes(s.mode)||!valid(s.target)||s.target>=100||!Array.isArray(s.products)||s.products.length>100||!Array.isArray(s.expenses)||s.expenses.length>100)throw Error('Backup de precificação inválido.');
 const ids=new Set(); const safeId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(id);
 for(const p of s.products){if(!text(p.name)||!safeId(p.id)||ids.has(p.id)||!valid(p.cost)||p.cost<=0||!Array.isArray(p.formats)||p.formats.length>20)throw Error('Produto inválido no backup.');ids.add(p.id);
 for(const f of p.formats){if(!safeId(f.id)||ids.has(f.id)||!text(f.label)||!valid(f.yield)||f.yield<=0||!valid(f.pack)||!valid(f.extra)||!valid(f.fee)||f.fee>=100||!(f.target==null||(valid(f.target)&&f.target<100))||!Number.isInteger(f.qty)||f.qty<0||!(f.price===null||(valid(f.price)&&f.price>0)))throw Error('Formato inválido no backup.');ids.add(f.id);}}
 for(const e of s.expenses){if(!safeId(e.id)||ids.has(e.id)||!text(e.name)||!valid(e.value))throw Error('Despesa inválida no backup.');ids.add(e.id);}
 return {app:s.app,version:1,business:text(s.business),mode:s.mode,target:s.target,expenses:s.expenses.map(e=>({id:e.id,name:text(e.name),value:e.value})),products:s.products.map(p=>({id:p.id,name:text(p.name),cost:p.cost,source:text(p.source),formats:p.formats.map(f=>({id:f.id,label:text(f.label),yield:f.yield,pack:f.pack,extra:f.extra,fee:f.fee,qty:f.qty,price:f.price,target:f.target??null}))}))};
}
function calculate(s){
 const fixed=s.expenses.reduce((a,e)=>a+e.value,0);
 const items=s.products.flatMap(p=>p.formats.map(f=>({...f,product:p.name,productId:p.id,cost:p.cost/f.yield+f.pack+f.extra})));
 const basis=items.reduce((a,f)=>a+f.cost*f.qty,0);
 const rows=items.map(f=>{
  const allocation=basis>0?fixed*f.cost/basis:0,target=f.target??s.target,denominator=1-(f.fee+target)/100;
  const error=denominator<=0?'Taxas + margem devem ser menores que 100%.':s.mode==='full'&&basis<=0?'Informe as vendas previstas para distribuir as despesas.':null;
  const raw=error?null:(f.cost+(s.mode==='full'?allocation:0))/denominator;
  const suggested=raw===null?null:Math.ceil((raw-1e-10)*100)/100;
  const price=f.price??suggested;
  const mc=price===null?null:price*(1-f.fee/100)-f.cost;
  return {...f,allocation,error,suggested,price,mc,mcPct:price?mc/price*100:null,afterAllocation:mc===null?null:mc-allocation};
 });
 const complete=rows.length>0&&rows.every(r=>r.price!==null&&!r.error),revenue=complete?rows.reduce((a,r)=>a+r.price*r.qty,0):null;
 const contribution=complete?rows.reduce((a,r)=>a+r.mc*r.qty,0):null;
 return {fixed,basis,rows,complete,revenue,contribution,result:complete?contribution-fixed:null};
}
function doc(s){
 const a=calculate(s);if(!a.rows.length||!a.complete)throw Error('Complete os cálculos antes de exportar os preços.');
 const rows=a.rows.map(r=>`<tr><td>${esc(r.product)}</td><td>${esc(r.label)}</td><td>${money(r.price)}</td></tr>`).join('');
 return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Tabela de preços</title><style>body{font-family:Calibri,Arial,sans-serif;color:#29251d;margin:40px}h1{color:#3D6B45}table{border-collapse:collapse;width:100%}th,td{padding:12px;border-bottom:1px solid #ccc;text-align:left}th{background:#f3eee2}footer{margin-top:30px;font-size:10pt;color:#655f52}</style></head><body><h1>${esc(s.business||'Tabela de preços')}</h1><p>Preços de venda · ${new Date().toLocaleDateString('pt-BR')}</p><table><thead><tr><th>Produto</th><th>Formato / canal</th><th>Preço de venda</th></tr></thead><tbody>${rows}</tbody></table><footer>Ozanne Consultoria · ozanneconsultoria.com.br</footer></body></html>`;
}
const api={num,valid,text,esc,money,validate,calculate,doc};root.Pricing=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
