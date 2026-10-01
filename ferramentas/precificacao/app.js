'use strict';
const {num,valid,text,esc,money,validate,calculate,doc}=Pricing;
const KEY='ozanne_precificacao_v1';
const $=id=>document.getElementById(id),uid=()=>crypto.randomUUID();
const initial=()=>({app:'ozanne-precificacao',version:1,business:'',mode:'full',target:20,products:[],expenses:[]});
let state=initial(),tab='products';
function message(s){$('notice').textContent=s;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{message('Este navegador não conseguiu salvar. Exporte um backup antes de fechar.');}}
function download(content,type,name){const a=document.createElement('a'),url=URL.createObjectURL(new Blob(['\ufeff',content],{type}));a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function switchTab(next){tab=next;for(const b of document.querySelectorAll('[data-tab]')){b.classList.toggle('active',b.dataset.tab===tab);if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}for(const p of document.querySelectorAll('.tab-panel'))p.hidden=p.id!==tab;render();}
function metrics(label,value){return `<div class="metric"><span>${esc(label)}</span><strong>${value===null?'—':money(value)}</strong></div>`;}
function render(){
 $('business').value=state.business;$('mode').value=state.mode;$('target').value=String(state.target).replace('.',',');$('margin-slider').value=Math.min(90,state.target);
 $('target-label').textContent=state.mode==='full'?'Margem após despesas (%)':'Margem de contribuição (%)';
 $('mode-help').textContent=state.mode==='full'?'A sugestão inclui as despesas distribuídas pelas vendas previstas. Ajuste a margem e veja o resultado do mês.':'A contribuição paga as despesas do mês e depois gera resultado. Não é lucro líquido; confira a cobertura abaixo.';
 $('product-list').innerHTML=state.products.length?state.products.map(p=>`<article class="panel"><h3>${esc(p.name)}</h3><span class="badge">Receita: ${money(p.cost)}</span>${p.source?`<p class="hint">${esc(p.source)}</p>`:''}<div class="actions"><button data-edit-product="${p.id}" class="small secondary">Editar receita</button><button data-add-format="${p.id}" class="small">Adicionar formato de venda</button><button data-remove-product="${p.id}" class="small secondary">Remover receita</button></div>${p.formats.map(f=>`<div class="row"><div><b>${esc(f.label)}</b><br><span class="hint">${f.yield} vendas por receita · ${f.qty} vendas previstas/mês</span></div><div class="actions"><button class="small secondary" data-edit-format="${f.id}" data-product="${p.id}">Editar formato</button><button class="small secondary" data-remove-format="${f.id}" data-product="${p.id}">Remover formato</button></div></div>`).join('')}${!p.formats.length?'<p class="hint">Adicione um formato para calcular o preço.</p>':''}</article>`).join(''):'<div class="panel"><h3>Seu primeiro preço começa aqui.</h3><p>Adicione uma receita ou experimente o exemplo fictício de salgado e torta.</p></div>';
 $('expense-list').innerHTML=state.expenses.map(e=>`<div class="row"><b>${esc(e.name)}</b><div><label class="sr-only" for="expense-${e.id}">Valor de ${esc(e.name)}</label><input id="expense-${e.id}" data-expense="${e.id}" inputmode="decimal" value="${e.value.toFixed(2).replace('.',',')}"></div><button class="small secondary" data-remove-expense="${e.id}">Remover</button></div>`).join('')+`<p><b>Total mensal: ${money(state.expenses.reduce((a,e)=>a+e.value,0))}</b></p>`;
 renderPrices();
}
function renderPrices(){
 const a=calculate(state);
 $('summary').innerHTML=metrics('Vendas previstas (receita)',a.revenue)+metrics('Despesas do mês',a.fixed)+metrics('Resultado mensal projetado',a.result);
 if(!a.rows.length){$('price-list').innerHTML='<p class="notice">Cadastre uma receita e pelo menos um formato de venda na aba Produtos.</p>';$('doc').disabled=true;return;}
 const incomplete=state.products.filter(p=>!p.formats.length);
 let html=incomplete.length?`<p class="error">${incomplete.length} receita(s) ainda sem formato: não entram nesta projeção.</p>`:'';
 if(!state.expenses.length)html+='<p class="notice">Nenhuma despesa mensal cadastrada. A projeção ainda não considera as contas do negócio.</p>';
 if(a.basis===0)html+='<p class="notice">Informe vendas previstas. Sem previsão, o resultado mensal não representa uma operação com vendas.</p>';
 if(a.result!==null&&a.result<0)html+=`<p class="notice error">Com essas vendas e preços, faltam ${money(-a.result)} para cobrir as despesas cadastradas.</p>`;
 for(const r of a.rows){html+=`<article class="panel price-card"><h3>${esc(r.product)}</h3><span class="badge">${esc(r.label)}</span><div class="price-grid"><div><span>Custo por venda</span><strong>${money(r.cost)}</strong></div><div><span>Despesas distribuídas por venda</span><strong>${a.basis>0?money(r.allocation):'—'}</strong></div><div><span>Preço sugerido</span><strong>${r.suggested===null?'—':money(r.suggested)}</strong></div><div><span>Contribuição por venda</span><strong>${r.mc===null?'—':money(r.mc)}</strong></div></div>${r.error?`<p class="error">${esc(r.error)}</p>`:''}<div class="fields"><div><label for="qty-${r.id}">Vendas previstas no mês</label><input id="qty-${r.id}" data-qty="${r.id}" inputmode="numeric" value="${r.qty}"></div><div><label for="price-${r.id}">Preço escolhido (R$)</label><input id="price-${r.id}" data-price="${r.id}" inputmode="decimal" placeholder="Usar sugerido" value="${r.price===null?'':r.price.toFixed(2).replace('.',',')}"></div></div><label for="target-${r.id}">Margem deste formato (%) · vazio usa a geral</label><input id="target-${r.id}" data-format-target="${r.id}" inputmode="decimal" placeholder="${state.target}% (geral)" value="${r.target==null?'':String(r.target).replace('.',',')}"><div class="actions"><button class="small secondary" data-use-suggested="${r.id}">Usar preço sugerido</button></div><p class="hint">${r.price!==null?`${r.price===r.suggested&&r.price!==null?'':r.suggested!==null&&r.price<r.suggested?'Preço escolhido abaixo da sugestão. ':''}Contribuição: ${r.mcPct.toFixed(1).replace('.',',')}% do preço. ${a.basis>0?'Após o rateio estimado: '+money(r.afterAllocation)+' por venda.':''}`:''}${r.qty===0?' Sem vendas previstas neste formato.':''}</p></article>`;}
 html+='<div class="panel"><h3>Produção necessária para o cenário</h3>'+state.products.filter(p=>p.formats.length).map(p=>`<p>${esc(p.name)}: ${(p.formats.reduce((a,f)=>a+f.qty/f.yield,0)).toLocaleString('pt-BR',{maximumFractionDigits:2})} receitas completas equivalentes.</p>`).join('')+'<p class="hint">Inteiras e fatias representam destinos diferentes da produção. A soma acima inclui as receitas necessárias para ambos; não é um controle de estoque.</p></div>';
 $('price-list').innerHTML=html;$('doc').disabled=!a.complete||!!incomplete.length;
}
function formatById(id){for(const p of state.products){const f=p.formats.find(f=>f.id===id);if(f)return f;}}
function openFormat(pid,fid){const p=state.products.find(p=>p.id===pid),f=p.formats.find(f=>f.id===fid);$('format-product').value=pid;$('format-id').value=fid||'';for(const [id,key,def]of [['label','label',''],['yield','yield',''],['pack','pack',0],['extra','extra',0],['fee','fee',0],['qty','qty',0]])$('format-'+id).value=f?String(f[key]).replace('.',','):def;$('format-error').textContent='';$('format-dialog').showModal();}
function cancelProduct(){$('product-form').reset();$('product-id').value='';$('product-save').textContent='Adicionar receita';$('cancel-product').hidden=true;}
// Importação por cópia: recalcula custos sem exigir preço de venda na origem.
function fromFichas(data){
 if(data?.app!=='ozanne-fichas'||!Array.isArray(data.insumos)||!Array.isArray(data.fichas)||data.insumos.length>10000||data.fichas.length>5000)throw Error('Use um backup JSON das Fichas Técnicas ou desta ferramenta.');
 const ins=new Map(data.insumos.map(x=>[x.id,x])),recipes=new Map(data.fichas.map(x=>[x.id,x]));
 function cost(f,seen=new Set()){
  if(seen.has(f.id))throw Error('Referência circular');seen.add(f.id);let total=0,count=0;
  for(const group of f.comps||[])for(const i of group.itens||[]){if(!i.r&&!text(i.n)&&!(num(i.q)>0))continue;const q=num(i.q),fc=i.fc==null||i.fc===''?1:num(i.fc);if(!valid(q)||!valid(fc)||fc<=0||!['g','ml','un'].includes(i.u))throw Error('Item incompleto');let price;
   if(i.r&&ins.has(i.r))price=num(ins.get(i.r).preco);
   else if(i.r&&recipes.has(i.r)&&recipes.get(i.r).tipo==='base'){const b=recipes.get(i.r),y=num(b.rend?.q);if(!valid(y)||y<=0)throw Error('Rendimento ausente');const expected=b.rend?.u==='kg'?'g':b.rend?.u==='L'?'ml':b.rend?.u==='un'?'un':null;if(expected!==i.u)throw Error('Unidades incompatíveis');price=cost(b,new Set(seen))/y;}
   else if(i.r)throw Error('Vínculo ausente');else price=num(i.p);
   if(!valid(price)||price<=0)throw Error('Preço ausente');total+=q*(f.entrada==='bruta'?1:fc)*price/(i.u==='un'?1:1000);count++;}
  if(!count||total<=0)throw Error('Receita vazia');return total;
 }
 const products=[],skipped=[];
 for(const p of data.fichas.filter(p=>p.tipo==='prato')){try{const c=cost(p);if(!text(p.nome))throw Error('Nome ausente');products.push({id:uid(),name:text(p.nome),cost:c,source:'Cópia das Fichas em '+new Date().toLocaleDateString('pt-BR')+' — confira o rendimento e os gastos incluídos.',formats:[]});}catch{skipped.push(text(p.nome)||'Sem nome');}}
 return {products,skipped};
}
document.addEventListener('DOMContentLoaded',()=>{
 try{const raw=localStorage.getItem(KEY);if(raw)state=validate(JSON.parse(raw));}catch{message('Os dados salvos não puderam ser lidos. Importe um backup ou comece de novo.');}
 render();
 document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.tab){switchTab(b.dataset.tab);return;}
  if(b.dataset.addFormat){openFormat(b.dataset.addFormat);return;}
  if(b.dataset.editFormat){openFormat(b.dataset.product,b.dataset.editFormat);return;}
  if(b.dataset.editProduct){const p=state.products.find(p=>p.id===b.dataset.editProduct);$('product-id').value=p.id;$('product-name').value=p.name;$('product-cost').value=p.cost.toFixed(2).replace('.',',');$('product-save').textContent='Salvar receita';$('cancel-product').hidden=false;$('product-name').focus();return;}
  if(b.dataset.removeProduct){if(!confirm('Remover esta receita e seus formatos?'))return;state.products=state.products.filter(p=>p.id!==b.dataset.removeProduct);cancelProduct();}
  else if(b.dataset.removeFormat){if(!confirm('Remover este formato de venda?'))return;const p=state.products.find(p=>p.id===b.dataset.product);p.formats=p.formats.filter(f=>f.id!==b.dataset.removeFormat);}
  else if(b.dataset.removeExpense)state.expenses=state.expenses.filter(x=>x.id!==b.dataset.removeExpense);
  else if(b.dataset.useSuggested){formatById(b.dataset.useSuggested).price=null;}
  else return;save();render();
 });
 document.addEventListener('change',e=>{
  const el=e.target;let n;
  if(el.dataset.expense){n=num(el.value);if(!valid(n)){message('Informe um valor válido, como 120,50.');render();return;}state.expenses.find(x=>x.id===el.dataset.expense).value=n;}
  else if(el.dataset.qty){n=num(el.value);if(!Number.isInteger(n)||n<0){message('Use vendas inteiras e não negativas.');renderPrices();return;}formatById(el.dataset.qty).qty=n;}
  else if(el.dataset.formatTarget){n=el.value.trim()===''?null:num(el.value);if(n!==null&&(!valid(n)||n>=100)){message('Use uma margem de 0 a menos de 100%.');renderPrices();return;}formatById(el.dataset.formatTarget).target=n;}
  else if(el.dataset.price){n=el.value.trim()===''?null:num(el.value);if(n!==null&&(!valid(n)||n<=0)){message('Informe um preço positivo ou deixe vazio para usar a sugestão.');renderPrices();return;}formatById(el.dataset.price).price=n;}
  else return;save();if(el.dataset.expense)render();else renderPrices();
 });
 $('product-form').addEventListener('submit',e=>{e.preventDefault();const name=text($('product-name').value),cost=num($('product-cost').value);if(!name||!valid(cost)||cost<=0){message('Informe o nome e um custo de receita maior que zero.');return;}const id=$('product-id').value;if(id){const p=state.products.find(p=>p.id===id);p.name=name;p.cost=cost;}else{if(state.products.length>=100){message('Este piloto aceita até 100 receitas.');return;}state.products.push({id:uid(),name,cost,formats:[]});}cancelProduct();save();render();message('Receita salva. Adicione o formato de venda e seu rendimento.');});
 $('cancel-product').onclick=cancelProduct;
 $('cancel-format').onclick=()=>$('format-dialog').close();
 $('format-form').addEventListener('submit',e=>{e.preventDefault();const p=state.products.find(p=>p.id===$('format-product').value),id=$('format-id').value;
 const f={id:id||uid(),label:text($('format-label').value),yield:num($('format-yield').value),pack:num($('format-pack').value),extra:num($('format-extra').value),fee:num($('format-fee').value),qty:num($('format-qty').value),price:id?p.formats.find(f=>f.id===id).price:null,target:id?(p.formats.find(f=>f.id===id).target??null):null};
 if(!f.label||!valid(f.yield)||f.yield<=0||!valid(f.pack)||!valid(f.extra)||!valid(f.fee)||f.fee>=100||!Number.isInteger(f.qty)||f.qty<0){$('format-error').textContent='Confira rendimento maior que zero, custos não negativos, taxas abaixo de 100% e vendas inteiras.';return;}
 if(id)p.formats[p.formats.findIndex(f=>f.id===id)]=f;else{if(p.formats.length>=20){$('format-error').textContent='Limite de 20 formatos por receita.';return;}p.formats.push(f);}$('format-dialog').close();save();render();message('Formato salvo. Vá a Meu preço para simular.');});
 $('expense-form').onsubmit=e=>{e.preventDefault();const name=text($('expense-name').value),value=num($('expense-value').value);if(!name||!valid(value)){message('Confira o nome e o valor da despesa.');return;}if(state.expenses.length>=100){message('Limite de 100 despesas.');return;}state.expenses.push({id:uid(),name,value});e.target.reset();save();render();};
 $('business').addEventListener('input',()=>{state.business=text($('business').value);save();});
 $('mode').onchange=()=>{state.mode=$('mode').value;save();render();};
 $('target').onchange=()=>{const n=num($('target').value);if(!valid(n)||n>=100){message('Use uma margem de 0 a menos de 100%.');render();return;}state.target=n;$('margin-slider').value=Math.min(90,n);save();renderPrices();};
 $('margin-slider').oninput=()=>{state.target=Number($('margin-slider').value);$('target').value=String(state.target).replace('.',',');save();renderPrices();};
 $('backup').onclick=()=>{download(JSON.stringify(state,null,2),'application/json','ozanne_precificacao_'+new Date().toISOString().slice(0,10)+'.json');message('Backup exportado. Guarde uma cópia fora do aparelho; o DOC não é um backup.');};
 $('doc').onclick=()=>{try{download(doc(state),'application/msword','Precos_de_venda_Ozanne_'+new Date().toISOString().slice(0,10)+'.doc');message('Tabela DOC exportada com seus preços escolhidos.');}catch(e){message(e.message);}};
 $('import').onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>5e6){message('Limite de 5 MB por arquivo.');return;}try{const d=JSON.parse((await file.text()).replace(/^\uFEFF/,''));if(d.app==='ozanne-precificacao'){const next=validate(d);if(!confirm('Substituir os dados atuais por este backup?'))return;state=next;message('Backup restaurado.');}else{const {products,skipped}=fromFichas(d);if(!products.length)throw Error('Nenhuma receita completa foi encontrada. Confira preços, unidades e referências nas Fichas.');if(state.products.length+products.length>100)throw Error('O total excede 100 receitas.');if(!confirm(`Adicionar ${products.length} receitas? ${skipped.length} incompletas serão ignoradas. Você precisará informar os formatos e rendimentos.`))return;state.products.push(...products);message(`${products.length} receitas importadas; ${skipped.length} ignoradas${skipped.length?': '+skipped.join(', '):''}. Confira o rendimento e adicione formatos.`);}cancelProduct();save();render();}catch(err){message(err.message||'Arquivo inválido.');}};
 $('demo').onclick=()=>{if((state.products.length||state.expenses.length)&&!confirm('Substituir os dados pelo exemplo fictício? Exporte seu backup antes.'))return;const f=(label,yieldQty,pack,qty)=>({id:uid(),label,yield:yieldQty,pack,extra:0,fee:5,qty,price:null});state={...initial(),business:'Exemplo fictício',expenses:[{id:uid(),name:'Despesas do mês (exemplo)',value:600}],products:[{id:uid(),name:'Salgado (exemplo)',cost:100,formats:[f('Unidade · venda direta',50,0,500)]},{id:uid(),name:'Torta (exemplo)',cost:40,formats:[f('Inteira · venda direta',1,4,10),f('Fatia · venda direta',8,1,80)]}]};save();render();message('Exemplo fictício carregado. Altere custos e vendas para experimentar.');};
 $('clear').onclick=()=>{if(!confirm('Apagar os dados de precificação neste navegador?'))return;state=initial();save();cancelProduct();switchTab('products');message('Dados desta ferramenta apagados.');};
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>$('offline').textContent='Pronto para reabrir sem internet neste navegador.').catch(()=>$('offline').textContent='Uso offline indisponível neste navegador. Salve um backup.');else $('offline').textContent='Este navegador não oferece uso offline.';
});
