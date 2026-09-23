import { ensure, validateBank, bankKey, approvedQuestions, initialState, validateState, xp, pickMission, startMission, answerQuestion, advance } from './engine.mjs';

const STORE = 'ozanne_npl_manual_v1';
const $ = id => document.getElementById(id);
let saved = { format: 'npl-backup', schema_version: 1, selected: null, packages: [] };
let rawRecovery = ''; let storageSnapshot = ''; let temporary = false; let blocked = false; let view = 'home'; let selection = null;
function node(tag, value, className) { const n = document.createElement(tag); if (value !== undefined && value !== null) n.textContent = value; if (className) n.className = className; return n; }
function append(parent, ...children) { children.filter(Boolean).forEach(x => parent.appendChild(x)); return parent; }
function button(label, fn, className = '') { const b = node('button', label, className); b.type = 'button'; b.addEventListener('click', () => safely(fn)); return b; }
function notice(message, error = false) { const n = $('notice'); n.textContent = message; n.className = error ? 'error' : ''; n.hidden = !message; }
function safely(fn) { try { const r = fn(); if (r?.catch) r.catch(e => notice(e.message, true)); } catch(e) { notice(e.message, true); } }
function current() { return saved.packages.find(p => bankKey(p.bank) === saved.selected); }
function verifyBackup(value) {
  ensure(value?.format === 'npl-backup' && value.schema_version === 1 && Array.isArray(value.packages) && value.packages.length <= 20, 'Backup inválido.');
  const keys = new Set();
  for (const p of value.packages) { validateBank(p.bank); validateState(p.state, p.bank); const key = bankKey(p.bank); ensure(!keys.has(key), 'Pacote duplicado no backup.'); keys.add(key); }
  ensure(value.selected === null || keys.has(value.selected), 'Seleção inválida no backup.');
  return value;
}
function commit(next) {
  ensure(!blocked, 'Baixe a recuperação e escolha o modo temporário para continuar.');
  if (!temporary) {
    try {
      ensure((localStorage.getItem(STORE) || '') === storageSnapshot, 'Outra aba alterou os dados. Recarregue antes de continuar.');
      const encoded = JSON.stringify(next); localStorage.setItem(STORE, encoded); storageSnapshot = encoded;
    }
    catch (e) { throw new Error(e.message.includes('Outra aba') ? e.message : 'Não foi possível salvar neste navegador. Exporte o backup antes de continuar em outro navegador.'); }
  }
  saved = next;
}
function saveState(nextState) {
  const next = JSON.parse(JSON.stringify(saved)); const p = next.packages.find(p => bankKey(p.bank) === saved.selected); p.state = nextState; commit(next);
}
function download(name, value, raw = false) {
  const blob = new Blob([raw ? value : JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
async function importFile(file) {
  if (!file) return;
  ensure(!blocked, 'Resolva a recuperação antes de importar.'); ensure(file.size <= 5 * 1024 * 1024, 'Use um pacote .txt ou .json de até 5 MB.');
  let data; try { data = JSON.parse(await file.text()); } catch { throw new Error('Este arquivo não contém JSON válido.'); }
  if (data.format === 'npl-backup') {
    verifyBackup(data);
    if (saved.packages.length && !window.confirm('Restaurar este backup substituirá os pacotes e o progresso atuais. Exporte o backup atual antes, se precisar preservá-lo. Continuar?')) return;
    commit(data); notice('Backup restaurado.');
  } else {
    validateBank(data);
    const next = JSON.parse(JSON.stringify(saved)); const key = bankKey(data); const existing = next.packages.find(p => bankKey(p.bank) === key);
    if (existing) ensure(JSON.stringify(existing.bank) === JSON.stringify(data), 'Já existe conteúdo diferente com essa versão. Solicite uma nova versão do pacote antes de importar.');
    else { ensure(next.packages.length < 20, 'Limite de 20 pacotes neste piloto. Exporte seu backup.'); next.packages.push({ bank: data, state: initialState() }); }
    next.selected = key; commit(next); notice(data.review.status === 'draft' ? 'Rascunho importado para revisão. O treino será liberado com um pacote aprovado.' : 'Banco aprovado importado. Pronto para treinar.');
  }
  view = 'home'; selection = null; render();
}
function importControl() { const label = node('label', 'Carregar pacote de treinamento', 'file'); const input = node('input'); input.type = 'file'; input.accept = '.txt,.json,text/plain,application/json'; input.addEventListener('change', () => safely(() => importFile(input.files[0]))); label.appendChild(input); return label; }
function navigate(to) { view = to; selection = null; render(); $('content').focus(); }
function context(root) {
  if (!saved.packages.length) return;
  const bar = node('div', null, 'context'); const label = node('label', 'Restaurante e versão '); const select = node('select');
  for (const p of saved.packages) { const o = node('option', `${p.bank.restaurant.name} · ${p.bank.version}`); o.value = bankKey(p.bank); o.selected = o.value === saved.selected; select.appendChild(o); }
  select.addEventListener('change', () => safely(() => { const next = JSON.parse(JSON.stringify(saved)); next.selected = select.value; commit(next); selection = null; render(); }));
  label.appendChild(select); append(bar, label, node('span', current().bank.review.status === 'approved' ? 'Aprovado para treino' : 'Rascunho para revisão', 'badge')); root.appendChild(bar);
}
function home(root) {
  const p = current(); const hero = node('section', null, 'hero');
  append(hero, node('div', 'Da leitura do cardápio à conversa com o cliente', 'eyebrow'), node('h1', 'Na ponta\nda língua.'), node('p', p ? `${p.bank.restaurant.name}: conteúdo da casa, organizado para explicar cada prato com confiança.` : 'Transforme o conhecimento do cardápio em prática. Carregue o pacote preparado e revisado com o responsável pelo restaurante.'));
  const actions = node('div', null, 'actions');
  if (p && approvedQuestions(p.bank).length) append(actions, button(p.state.active ? 'Retomar missão' : 'Começar missão', () => { saveState(startMission(p.bank, p.state)); navigate('train'); }));
  if (p) append(actions, button('Revisar o conteúdo', () => navigate('review'), 'quiet'));
  append(actions, importControl()); hero.appendChild(actions); root.appendChild(hero);
  root.appendChild(node('p','Recebeu o pacote pelo WhatsApp? Salve o documento no celular. Abra este site no navegador, toque em “Carregar pacote de treinamento” e selecione o arquivo .txt ou .json. Não é preciso abrir o documento no WhatsApp.','note'));
  const steps = node('div', null, 'grid');
  [['01','Preparar','Envie seu cardápio ou análise na conversa e receba um banco de perguntas com fontes.'],['02','Revisar','Confira o conteúdo, corrija o que for necessário e aprove o pacote.'],['03','Praticar','Missões curtas, explicações e revisão dos pontos que pedem mais atenção.']].forEach(([n,t,d]) => append(steps, append(node('div',null,'panel'),node('span',n,'step'),node('h3',t),node('p',d,'muted')))); root.appendChild(steps);
  if (p) {
    if (p.bank.review.status === 'draft') root.appendChild(node('p','Este pacote está em revisão. Leia as perguntas e envie os ajustes na conversa antes de liberar o treino.','note'));
    for (const n of p.bank.notes) root.appendChild(node('p', n, 'note'));
  }
}
function empty(root) { append(root,node('h2','Carregue um pacote para começar'),node('p','Selecione o arquivo .txt ou .json recebido após a análise do cardápio. Se veio pelo WhatsApp, salve o documento no celular e selecione-o por este botão.'),importControl()); }
function sourceFor(bank, q) {
  const box = node('div',null,'source');
  for (const id of q.source_item_ids) { const i = bank.items.find(i => i.id === id); append(box,node('strong',i.reference),node('p',i.description)); }
  for (const id of (q.source_protocol_ids || [])) { const p = bank.protocols.find(p => p.id === id); append(box,node('strong',p.name),node('p',p.description),node('small',p.reference)); }
  return box;
}
function review(root, bank) {
  append(root,node('div','Revisão editorial','eyebrow'),node('h2',`${bank.questions.length} perguntas para conferir`),node('p','Perguntas, gabaritos e explicações ficam vinculados aos itens de origem. A aprovação final acontece com o responsável pelo conteúdo.','muted'));
  for (const [index,q] of bank.questions.entries()) {
    const d = node('details'); const inside = node('div',null,'inside');
    append(d,node('summary',`${index+1}. ${q.prompt}`)); const list = node('ol'); list.type = 'A'; q.options.forEach((o,i) => list.appendChild(node('li',o+(i===q.correct_index?' — gabarito':''))));
    append(inside,node('p',`${q.competence} · ${q.status==='approved'?'aprovada':'rascunho'}`,'muted'),list,node('p',q.explanation),sourceFor(bank,q)); append(d,inside); root.appendChild(d);
  }
}
function catalog(root, bank) {
  append(root,node('div','Consulta rápida','eyebrow'),node('h2','O cardápio da casa'));
  const input = node('input'); input.type = 'search'; input.placeholder = 'Buscar prato, ingrediente ou turno'; input.setAttribute('aria-label','Buscar no cardápio'); root.appendChild(input);
  const grid = node('div',null,'catalog'); root.appendChild(grid);
  const draw = () => {
    grid.replaceChildren(); const term = input.value.toLocaleLowerCase('pt-BR');
    const items = bank.items.filter(i => `${i.name} ${i.description} ${i.service} ${i.category}`.toLocaleLowerCase('pt-BR').includes(term));
    items.forEach(i => append(grid,append(node('article',null,'panel'),node('div',`${i.service} · ${i.category}`,'eyebrow'),node('h3',i.name),node('p',i.description || 'Descrição pendente na fonte.'),node('small',i.reference))));
    if (!items.length) grid.appendChild(node('p','Nenhum item encontrado.'));
  }; input.addEventListener('input',draw); draw();
}
function training(root, p) {
  if (!p.state.active) {
    append(root,node('h2',p.state.sessions.length?'Prática concluída.':'Uma missão, poucos minutos.'),node('p',`${xp(p.state)} XP · ${p.state.sessions.length} missões concluídas.`));
    const available = pickMission(p.bank,p.state,Date.now()).length;
    append(root,node('p',available?`Até ${available} questões disponíveis nesta missão.`:'Nenhuma questão aprovada disponível agora. Conteúdos em aprendizagem aguardam a revisão; rascunhos aguardam aprovação.'),button('Começar missão',()=>{saveState(startMission(p.bank,p.state));render();}));
    root.lastChild.disabled = available===0; return;
  }
  const s=p.state.active; const q=p.bank.questions.find(q=>q.id===s.question_ids[s.position]); const a=p.state.attempts.find(a=>a.id===`${s.id}:${s.position}`);
  const wrap=node('div',null,'training'); const box=node('section',null,'panel');
  append(wrap,node('div',`Questão ${s.position+1} de ${s.question_ids.length} · ${q.competence}`,'eyebrow'));
  append(box,node('h2',q.prompt)); const field=node('fieldset'); append(field,node('legend','Escolha uma alternativa e confirme.'));
  const confirm=button('Confirmar resposta',()=>{saveState(answerQuestion(p.bank,p.state,selection));navigate('train');}); confirm.disabled=selection===null;
  q.options.forEach((o,i)=>{
    const label=node('label',null,`option${a&&i===q.correct_index?' correct':a&&i===a.answer?' wrong':''}`); const radio=node('input'); radio.type='radio';radio.name='answer';radio.value=String(i);radio.checked=a?a.answer===i:selection===i;radio.disabled=Boolean(a);
    radio.addEventListener('change',()=>{selection=i;confirm.disabled=false;}); append(label,radio,node('span',o));field.appendChild(label);
  }); box.appendChild(field);
  if (!a) box.appendChild(confirm);
  else {
    const fb=node('section',null,`feedback${a.correct?'':' wrong'}`); fb.setAttribute('role','status');
    append(fb,node('h3',a.correct?'Acertou. +10 XP':'Vamos revisar esse ponto.'),node('p',`Resposta: ${q.options[q.correct_index]}`),node('p',q.explanation),sourceFor(p.bank,q),button(s.position+1===s.question_ids.length?'Concluir missão':'Próxima questão',()=>{saveState(advance(p.state));navigate('train');}));box.appendChild(fb);
  }
  append(wrap,box);root.appendChild(wrap);
}
function progress(root,p) {
  append(root,node('div','Seu percurso','eyebrow'),node('h2','Aprender também é voltar.'));
  const consistent=p.state.reviews.filter(r=>r.level===3).length;const stats=node('div',null,'grid stats');
  [[xp(p.state),'XP acumulados'],[p.state.sessions.length,'missões'],[consistent,'questões consistentes']].forEach(([v,t])=>append(stats,append(node('div',null,'stat'),node('strong',String(v)),node('span',t))));root.appendChild(stats);
  append(root,node('p','Acertos rendem 10 XP e concluir uma missão rende mais 10. A revisão acontece após 2, 7 e 21 dias. Um erro volta na próxima missão. XP registra atividade; não comprova domínio.','muted'));
  const list=node('ul',null,'rows');
  for(const r of p.state.reviews){const q=p.bank.questions.find(q=>q.id===r.id);append(list,append(node('li'),node('strong',q.prompt),node('div',r.error_pending?'Rever na próxima missão':`Próxima revisão: ${new Date(r.due).toLocaleDateString('pt-BR')}`)));}root.appendChild(list);
}
function render() {
  const root=$('content');root.replaceChildren();document.querySelectorAll('[data-view]').forEach(b=>{if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  if(blocked){root.appendChild(node('p','Resolva a recuperação acima para abrir os pacotes.'));return;}
  context(root); const p=current();
  if(view==='home')home(root);else if(!p)empty(root);else if(view==='review')review(root,p.bank);else if(view==='catalog')catalog(root,p.bank);else if(view==='train')training(root,p);else progress(root,p);
}
$('import').addEventListener('change',e=>safely(async()=>{await importFile(e.target.files[0]);e.target.value='';}));
$('backup').addEventListener('click',()=>safely(()=>{ensure(!blocked,'Use o botão de recuperação.');download('NA_PONTA_DA_LINGUA_BACKUP.json',saved);}));
$('recoverDownload').addEventListener('click',()=>download('NA_PONTA_DA_LINGUA_RECUPERACAO.json',rawRecovery,true));
$('temporary').addEventListener('click',()=>{temporary=true;blocked=false;$('recovery').hidden=true;notice('Modo temporário: exporte um backup antes de fechar. Nenhum progresso será salvo neste navegador.');render();});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));
window.addEventListener('storage',e=>{if(e.key===STORE&&!temporary){blocked=true;notice('Os dados foram alterados em outra aba. Recarregue esta página antes de continuar.',true);render();}});
try { const raw=localStorage.getItem(STORE);rawRecovery=raw||'';storageSnapshot=raw||'';if(raw)saved=verifyBackup(JSON.parse(raw)); }
catch{blocked=true;$('recovery').hidden=false;notice('Não foi possível acessar o progresso salvo. Seus dados não foram substituídos.',true);}
render();
