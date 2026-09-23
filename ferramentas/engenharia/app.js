/* Engenharia de cardápio: dados locais, entradas verificáveis e leitura relativa. */
const KEY = 'ozanne_engenharia_v1';
const money = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
const pct = n => new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(n) + '%';
const valid = n => Number.isFinite(n) && n >= 0;
const clean = s => String(s ?? '').trim().slice(0,120);

function analyse(rows) {
  const totalQty = rows.reduce((a,r)=>a+r.qty,0);
  const revenue = rows.reduce((a,r)=>a+r.price*r.qty,0);
  const costs = rows.reduce((a,r)=>a+r.cost*r.qty,0);
  const averageMargin = rows.reduce((a,r)=>a+r.price-r.cost,0)/rows.length;
  const popularityLine = 100/rows.length;
  return {
    totalQty,revenue,costs,contribution:revenue-costs,
    weightedCmv:revenue>0?costs/revenue*100:0,averageMargin,popularityLine,
    rows:rows.map(r=>{
      const margin=r.price-r.cost,share=r.qty/totalQty*100;
      const highMargin=margin>=averageMargin,highPopularity=share>=popularityLine;
      const group=highMargin?(highPopularity?'Estrela':'Oportunidade'):(highPopularity?'Popular de margem menor':'Baixa tração');
      return {...r,margin,share,cmv:r.cost/r.price*100,group,contribution:margin*r.qty};
    })
  };
}

function fromFichas(data) {
  if(data?.app!=='ozanne-fichas'||!Array.isArray(data.fichas)||!Array.isArray(data.insumos)) throw Error('Use um backup JSON da ferramenta Fichas Técnicas.');
  if(data.fichas.length>5000 || data.insumos.length>10000) throw Error('Arquivo grande demais para esta versão.');
  const ingredients=new Map(data.insumos.map(i=>[i.id,i]));
  const recipes=new Map(data.fichas.map(f=>[f.id,f]));
  function recipeCost(f,seen=new Set()) {
    if(seen.has(f.id)) throw Error('Referência circular');
    seen.add(f.id);
    let sum=0;
    for(const c of f.comps||[]) for(const item of c.itens||[]) {
      if(!item.r && !clean(item.n) && !(+item.q>0)) continue;
      const q=Number(item.q),fc=Number(item.fc)||1;
      if(!valid(q)||!valid(fc)||fc<=0) throw Error('Quantidade ou fator inválido');
      let price;
      if(item.r && ingredients.has(item.r)) price=Number(ingredients.get(item.r).preco);
      else if(item.r && recipes.has(item.r) && recipes.get(item.r).tipo==='base') {
        const base=recipes.get(item.r),yieldQty=Number(base.rend?.q);
        if(!valid(yieldQty)||yieldQty<=0) throw Error('Rendimento da base ausente');
        price=recipeCost(base,new Set(seen))/yieldQty;
      } else if(item.r) throw Error('Referência não encontrada');
      else price=Number(item.p);
      if(!valid(price)||price<=0) throw Error('Preço ausente');
      const factor=item.u==='un'?1:1000;
      sum+=(f.entrada==='bruta'?q:q*fc)/factor*price;
    }
    return sum;
  }
  const rows=[],skipped=[];
  for(const f of data.fichas.filter(f=>f.tipo==='prato')) {
    try {
      const name=clean(f.nome),price=Number(f.preco),cost=recipeCost(f);
      if(!name||!valid(price)||price<=0||!valid(cost)||cost<=0) throw Error('Ficha ou preço incompleto');
      rows.push({id:crypto.randomUUID(),sourceId:clean(f.id),name,cost,price,qty:0});
    } catch { skipped.push(clean(f.nome)||'Prato sem nome'); }
  }
  return {rows,skipped};
}

let entries=[];
const $=id=>document.getElementById(id);
function save(){try{localStorage.setItem(KEY,JSON.stringify(entries));}catch{message('Não foi possível salvar neste navegador. Exporte uma cópia.')}}
function message(s){$('notice').textContent=s;}
function read() {
  try {
    const data=JSON.parse(localStorage.getItem(KEY)||'[]');
    if(Array.isArray(data)) entries=data.filter(r=>clean(r.name)&&valid(+r.cost)&&valid(+r.price)&&+r.price>0&&Number.isInteger(+r.qty)&&+r.qty>=0).slice(0,500).map(r=>({...r,id:clean(r.id)||crypto.randomUUID()}));
  } catch {message('Os dados locais não puderam ser lidos. Importe uma cópia, se tiver.');}
}
function render() {
  $('count').textContent=entries.length+' pratos cadastrados';
  const body=$('rows'); body.replaceChildren();
  for(const r of entries) {
    const tr=document.createElement('tr');
    for(const value of [r.name,money(r.cost),money(r.price)]){
      const td=document.createElement('td');td.textContent=value;tr.append(td);
    }
    const qtyCell=document.createElement('td'),qtyInput=document.createElement('input');
    qtyInput.type='number';qtyInput.min='0';qtyInput.step='1';qtyInput.value=r.qty;
    qtyInput.setAttribute('aria-label','Unidades vendidas de '+r.name);
    qtyInput.addEventListener('change',()=>{const n=Number(qtyInput.value);if(!Number.isInteger(n)||n<0){qtyInput.value=r.qty;message('Use uma quantidade inteira e não negativa.');return;}r.qty=n;save();render();});
    qtyCell.append(qtyInput);tr.append(qtyCell);
    const td=document.createElement('td'),btn=document.createElement('button');
    btn.type='button';btn.textContent='Remover';btn.className='small';btn.addEventListener('click',()=>{entries=entries.filter(e=>e.id!==r.id);save();render()});td.append(btn);tr.append(td);body.append(tr);
  }
  const ready=entries.filter(r=>r.qty>0),result=$('results');result.replaceChildren();
  if(ready.length<2){result.textContent='Informe quantidades vendidas de pelo menos dois pratos no mesmo período para comparar popularidade.';return;}
  const a=analyse(ready);
  const summary=document.createElement('div');summary.className='summary';
  for(const [label,value] of [['Receita dos pratos',money(a.revenue)],['Contribuição antes das despesas fixas',money(a.contribution)],['Custo dos pratos / receita',pct(a.weightedCmv)]]){
    const card=document.createElement('div');card.className='metric';
    const strong=document.createElement('strong');strong.textContent=value;
    const small=document.createElement('span');small.textContent=label;card.append(strong,small);summary.append(card);
  }result.append(summary);
  const grid=document.createElement('div');grid.className='quadrants';
  for(const group of ['Estrela','Oportunidade','Popular de margem menor','Baixa tração']){
    const box=document.createElement('section');box.className='quad';
    const h=document.createElement('h3');h.textContent=group;box.append(h);
    const subset=a.rows.filter(r=>r.group===group).sort((x,y)=>y.contribution-x.contribution);
    if(!subset.length){const empty=document.createElement('p');empty.textContent='Nenhum prato neste grupo.';box.append(empty)}
    for(const r of subset){const p=document.createElement('p');p.textContent=`${r.name}: ${pct(r.share)} das unidades, ${money(r.margin)} por unidade`;box.append(p)}
    grid.append(box);
  }result.append(grid);
  const note=document.createElement('p');note.className='method';note.textContent=`Comparação dentro deste conjunto: margem por prato acima ou abaixo de ${money(a.averageMargin)}; participação nas unidades acima ou abaixo de ${pct(a.popularityLine)}. A posição não é uma recomendação automática de retirar pratos.`;result.append(note);
}

if(typeof document!=='undefined') document.addEventListener('DOMContentLoaded',()=>{
  read();render();
  $('add').addEventListener('submit',event=>{
    event.preventDefault();
    const name=clean($('name').value),cost=Number($('cost').value),price=Number($('price').value),qty=Number($('qty').value);
    if(!name||!valid(cost)||!valid(price)||price<=0||!valid(qty)||!Number.isInteger(qty)){message('Confira nome, custo, preço positivo e quantidade inteira.');return;}
    if(entries.length>=500){message('Limite de 500 pratos.');return;}
    entries.push({id:crypto.randomUUID(),name,cost,price,qty});save();render();event.target.reset();message('Prato adicionado.');
  });
  $('demo').addEventListener('click',()=>{
    if(entries.length&&!confirm('Substituir os pratos atuais pelos exemplos fictícios?'))return;
    entries=[{id:crypto.randomUUID(),name:'Prato A (exemplo)',cost:22,price:68,qty:80},{id:crypto.randomUUID(),name:'Prato B (exemplo)',cost:19,price:49,qty:55},{id:crypto.randomUUID(),name:'Prato C (exemplo)',cost:27,price:82,qty:20},{id:crypto.randomUUID(),name:'Prato D (exemplo)',cost:15,price:39,qty:95}];save();render();message('Exemplos fictícios carregados.');
  });
  $('clear').addEventListener('click',()=>{if(entries.length&&confirm('Apagar os pratos desta ferramenta neste aparelho?')){entries=[];save();render();message('Pratos removidos.')}});
  $('export').addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify({app:'ozanne-engenharia',version:1,exportedAt:new Date().toISOString(),entries},null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ozanne_engenharia_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  });
  $('import').addEventListener('change',async event=>{
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    if(file.size>5_000_000){message('Arquivo grande demais. Limite de 5 MB.');return;}
    try {
      const data=JSON.parse(await file.text());
      if(data.app==='ozanne-engenharia'&&Array.isArray(data.entries)){
        const list=data.entries.slice(0,500).map(r=>({id:crypto.randomUUID(),name:clean(r.name),cost:Number(r.cost),price:Number(r.price),qty:Number(r.qty)}));
        if(list.some(r=>!r.name||!valid(r.cost)||!valid(r.price)||r.price<=0||!Number.isInteger(r.qty)||r.qty<0))throw Error('Arquivo com dados inválidos.');
        if(!confirm(`Substituir os dados atuais por ${list.length} pratos do arquivo?`))return;
        entries=list;message('Cópia da Engenharia importada.');
      }else{
        const {rows,skipped}=fromFichas(data);
        if(!rows.length)throw Error('Não há pratos completos com preço de venda e custo calculável.');
        if(!confirm(`Importar ${rows.length} pratos das Fichas? ${skipped.length} fichas incompletas ficarão de fora. As quantidades vendidas começam em zero. Isso substitui os dados atuais.`))return;
        entries=rows.slice(0,500);message(`${entries.length} pratos importados. ${skipped.length} ignorados. Preencha as vendas do período.`);
      }save();render();
    }catch(e){message(e.message||'Não foi possível ler este arquivo.');}
  });
});

if(typeof module!=='undefined') module.exports={analyse,fromFichas};
