export function ensure(ok, message) { if (!ok) throw new Error(message); }
const str = (v, n = 2000) => typeof v === 'string' && v.trim().length > 0 && v.length <= n;
const code = v => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(v);
export function validateBank(b) {
  ensure(b?.format === 'npl-manual' && b.schema_version === 1, 'Formato de banco não reconhecido. Use o pacote preparado para este piloto.');
  ensure(code(b.restaurant?.id) && str(b.restaurant?.name, 160) && code(b.version), 'Restaurante ou versão inválidos.');
  ensure(['draft', 'approved'].includes(b.review?.status), 'Situação de revisão inválida.');
  if (b.review.status === 'approved') ensure(str(b.review.by, 160) && Number.isFinite(Date.parse(b.review.at)), 'Banco aprovado sem responsável ou data.');
  ensure(str(b.source?.file_name, 240) && /^[a-f0-9]{64}$/.test(b.source?.sha256), 'A identificação da fonte está incompleta.');
  ensure(Array.isArray(b.items) && b.items.length > 0 && b.items.length <= 500, 'O banco precisa ter de 1 a 500 itens.');
  const items = new Set();
  for (const i of b.items) {
    ensure(code(i.id) && !items.has(i.id), 'Identificador de prato inválido ou repetido.'); items.add(i.id);
    ensure(str(i.name, 240) && str(i.service, 120) && str(i.category, 160) && str(i.reference, 500), 'Há um prato sem nome, turno, categoria ou referência.');
    ensure(typeof i.description === 'string' && i.description.length <= 5000, 'Descrição de prato inválida.');
  }
  ensure(b.protocols === undefined || (Array.isArray(b.protocols) && b.protocols.length <= 100), 'Fontes de protocolo inválidas.');
  const protocols = new Set();
  for (const p of (b.protocols || [])) {
    ensure(code(p.id) && !items.has(p.id) && !protocols.has(p.id), 'Identificador de protocolo inválido ou repetido.'); protocols.add(p.id);
    ensure(str(p.name, 240) && str(p.description, 5000) && str(p.reference, 500), 'Fonte de protocolo incompleta.');
  }
  ensure(Array.isArray(b.questions) && b.questions.length > 0 && b.questions.length <= 300, 'O banco precisa ter de 1 a 300 questões.');
  const ids = new Set();
  for (const q of b.questions) {
    ensure(code(q.id) && !ids.has(q.id), 'Identificador de questão inválido ou repetido.'); ids.add(q.id);
    ensure(str(q.prompt) && str(q.explanation, 4000) && ['conhecer', 'explicar', 'aplicar'].includes(q.competence), 'Questão incompleta.');
    ensure(Array.isArray(q.options) && q.options.length >= 3 && q.options.length <= 4 && q.options.every(o => str(o, 1200)), 'Use três ou quatro alternativas por questão.');
    ensure(new Set(q.options.map(o => o.trim().toLocaleLowerCase('pt-BR'))).size === q.options.length, 'Há alternativas repetidas.');
    ensure(Number.isInteger(q.correct_index) && q.correct_index >= 0 && q.correct_index < q.options.length, 'Gabarito inválido.');
    ensure(['draft', 'approved'].includes(q.status) && typeof q.active === 'boolean', 'Situação de questão inválida.');
    ensure(Array.isArray(q.source_item_ids) && q.source_item_ids.every(id => items.has(id)), 'Questão com fonte de prato inválida.');
    ensure(q.source_protocol_ids === undefined || (Array.isArray(q.source_protocol_ids) && q.source_protocol_ids.every(id => protocols.has(id))), 'Questão com fonte de protocolo inválida.');
    ensure(q.source_item_ids.length + (q.source_protocol_ids || []).length > 0, 'Questão sem fonte válida.');
    ensure(!q.active || (q.status === 'approved' && b.review.status === 'approved'), 'Um rascunho não pode estar ativo para treino.');
  }
  ensure(Array.isArray(b.notes) && b.notes.length <= 50 && b.notes.every(x => str(x, 2000)), 'Observações inválidas.');
  return b;
}
export function bankKey(b) { return `${b.restaurant.id}:${b.version}`; }
export function approvedQuestions(b) { return b.review.status === 'approved' ? b.questions.filter(q => q.active && q.status === 'approved') : []; }
export function initialState() { return { next_session: 1, active: null, sessions: [], attempts: [], reviews: [] }; }
export function validateState(s, bank) {
  ensure(s && Number.isSafeInteger(s.next_session) && s.next_session > 0 && Array.isArray(s.sessions) && Array.isArray(s.attempts) && Array.isArray(s.reviews), 'Progresso inválido.');
  const qs = new Map(bank.questions.map(q => [q.id, q]));
  const ids = new Set(); const allSessions = [...s.sessions, ...(s.active ? [s.active] : [])];
  for (const session of allSessions) {
    ensure(code(session.id) && !ids.has(session.id) && Array.isArray(session.question_ids) && session.question_ids.length > 0 && session.question_ids.length <= 5 && session.question_ids.every(id => qs.has(id)) && new Set(session.question_ids).size === session.question_ids.length, 'Sessão inválida.'); ids.add(session.id);
    ensure(Number.isInteger(session.position) && session.position >= 0 && session.position < session.question_ids.length, 'Posição de sessão inválida.');
    ensure(/^s[1-9][0-9]*$/.test(session.id) && Number(session.id.slice(1)) < s.next_session, 'Sequência de sessões inválida.');
  }
  const attempts = new Set();
  for (const a of s.attempts) {
    const session = allSessions.find(x => x.id === a.session_id); const q = qs.get(a.question_id);
    ensure(q && session && session.question_ids[a.position] === q.id && a.id === `${session.id}:${a.position}` && !attempts.has(a.id), 'Tentativa inválida ou repetida.'); attempts.add(a.id);
    ensure(Number.isInteger(a.answer) && a.answer >= 0 && a.answer < q.options.length && a.correct === (a.answer === q.correct_index) && Number.isFinite(a.at), 'Resposta inválida.');
  }
  for (const session of s.sessions) ensure(session.question_ids.every((_, i) => attempts.has(`${session.id}:${i}`)), 'Missão concluída com respostas faltando.');
  if (s.active) {
    for (let i = 0; i < s.active.position; i++) ensure(attempts.has(`${s.active.id}:${i}`), 'Progresso da missão incompleto.');
    ensure(s.active.question_ids.every(id => approvedQuestions(bank).some(q => q.id === id)), 'Uma missão contém questões não aprovadas.');
  }
  const reviewIds = new Set();
  for (const r of s.reviews) {
    ensure(qs.has(r.id) && !reviewIds.has(r.id) && [0,1,2,3].includes(r.level) && typeof r.error_pending === 'boolean' && Number.isFinite(r.due) && code(r.last_session), 'Revisão inválida.'); reviewIds.add(r.id);
  }
  return s;
}
const copy = s => JSON.parse(JSON.stringify(s));
export function xp(s) { return s.attempts.filter(a => a.correct).length * 10 + s.sessions.length * 10; }
export function pickMission(bank, state, now) {
  const candidates = approvedQuestions(bank).map(q => {
    const r = state.reviews.find(r => r.id === q.id);
    const priority = !r ? 1 : (r.error_pending || r.due <= now) ? 0 : r.level === 3 ? 2 : 9;
    return { q, r, priority, exposures: state.attempts.filter(a => a.question_id === q.id).length };
  }).filter(x => x.priority < 9).sort((a,b) => a.priority-b.priority || (a.priority === 0 ? (a.r?.due || 0)-(b.r?.due || 0) : 0) || a.exposures-b.exposures || a.q.id.localeCompare(b.q.id));
  const result = []; const sources = new Set(); const counts = {};
  for (const { q } of candidates) {
    if (result.length === 5) break;
    const sourceIds = [...q.source_item_ids, ...(q.source_protocol_ids || [])];
    if (sourceIds.some(id => sources.has(id))) continue;
    if ((counts[q.competence] || 0) >= 2 && candidates.some(x => !result.includes(x.q.id) && ![...x.q.source_item_ids, ...(x.q.source_protocol_ids || [])].some(id => sources.has(id)) && (counts[x.q.competence] || 0) < 2)) continue;
    result.push(q.id); sourceIds.forEach(id => sources.add(id)); counts[q.competence] = (counts[q.competence] || 0) + 1;
  }
  return result;
}
export function startMission(bank, state, now = Date.now()) {
  if (state.active) return state;
  const question_ids = pickMission(bank, state, now);
  ensure(question_ids.length > 0, 'Não há questões aprovadas disponíveis para treinar agora. Consulte o cardápio ou aguarde a próxima revisão.');
  const s = copy(state); s.active = { id: `s${s.next_session++}`, question_ids, position: 0, started_at: now }; return s;
}
export function answerQuestion(bank, state, answer, now = Date.now()) {
  ensure(state.active, 'Nenhuma missão em andamento.');
  const session = state.active; const id = `${session.id}:${session.position}`;
  if (state.attempts.some(a => a.id === id)) return state;
  const q = approvedQuestions(bank).find(q => q.id === session.question_ids[session.position]);
  ensure(q && Number.isInteger(answer) && answer >= 0 && answer < q.options.length, 'Escolha uma alternativa válida.');
  const s = copy(state); const correct = answer === q.correct_index;
  s.attempts.push({ id, session_id: session.id, position: session.position, question_id: q.id, answer, correct, at: now });
  let r = s.reviews.find(r => r.id === q.id);
  if (!r) { r = { id: q.id, level: 0, due: 0, error_pending: false, last_session: session.id }; s.reviews.push(r); }
  if (!correct) { r.level = 0; r.error_pending = true; r.due = now; }
  else if (r.level === 0 || r.error_pending || r.due <= now) {
    r.level = Math.min(3, r.level + 1); r.error_pending = false;
    r.due = now + [0,2,7,21][r.level] * 86400000;
  }
  r.last_session = session.id;
  return s;
}
export function advance(state, now = Date.now()) {
  ensure(state.active, 'Nenhuma missão em andamento.');
  ensure(state.attempts.some(a => a.id === `${state.active.id}:${state.active.position}`), 'Confirme a resposta antes de avançar.');
  const s = copy(state);
  if (s.active.position + 1 < s.active.question_ids.length) s.active.position++;
  else { s.active.completed_at = now; s.sessions.push(s.active); s.active = null; }
  return s;
}
