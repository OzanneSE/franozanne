import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixture.mjs';
import {validateBank,initialState,validateState,pickMission,startMission,answerQuestion,advance,xp,bankKey} from '../src/engine.mjs';
const DAY=86400000;const NOW=1800000000000;
test('rascunho pode ser consultado, mas nunca entra em missão',()=>{
 const b=fixture();b.review={status:'draft',by:null,at:null};b.questions.forEach(q=>{q.status='draft';q.active=false;});
 validateBank(b);assert.deepEqual(pickMission(b,initialState(),NOW),[]);assert.throws(()=>startMission(b,initialState(),NOW));
 b.questions[0].active=true;assert.throws(()=>validateBank(b),/rascunho/);
});
test('fonte inexistente e gabarito fora das alternativas são rejeitados',()=>{
 const b=fixture();b.questions[0].source_item_ids=['ausente'];assert.throws(()=>validateBank(b),/fonte/);
 b.questions[0].source_item_ids=['item0'];b.questions[0].correct_index=7;assert.throws(()=>validateBank(b),/Gabarito/);
});
test('missão tem até cinco questões, sem duplicar prato e com três competências',()=>{
 const b=fixture();b.questions[1].source_item_ids=['item0'];validateBank(b);const ids=pickMission(b,initialState(),NOW);
 assert.equal(ids.length,5);assert.equal(new Set(ids.flatMap(id=>b.questions.find(q=>q.id===id).source_item_ids)).size,5);
 assert.equal(new Set(ids.map(id=>b.questions.find(q=>q.id===id).competence)).size,3);
});
test('confirmar duas vezes não duplica resposta nem XP; completar dá bônus único',()=>{
 const b=fixture();let s=startMission(b,initialState(),NOW);s=answerQuestion(b,s,0,NOW);const again=answerQuestion(b,s,1,NOW+1);
 assert.deepEqual(s,again);assert.equal(xp(s),10);
 while(s.active){if(!s.attempts.some(a=>a.id===`${s.active.id}:${s.active.position}`))s=answerQuestion(b,s,0,NOW);s=advance(s,NOW);}
 assert.equal(xp(s),60);assert.equal(s.sessions.length,1);assert.throws(()=>advance(s));validateState(s,b);
});
test('erro volta na próxima missão, acerto novo aguarda dois dias',()=>{
 const b=fixture();b.questions=b.questions.slice(0,1);let s=startMission(b,initialState(),NOW);s=answerQuestion(b,s,1,NOW);s=advance(s,NOW);
 assert.equal(pickMission(b,s,NOW+1).length,1);s=startMission(b,s,NOW+1);s=answerQuestion(b,s,0,NOW+1);s=advance(s,NOW+1);
 assert.equal(pickMission(b,s,NOW+DAY).length,0);assert.equal(pickMission(b,s,NOW+2*DAY+1).length,1);
});
test('revisões avançam em 2, 7, 21 dias; erro após nível três reinicia',()=>{
 const b=fixture();b.questions=b.questions.slice(0,1);let s=initialState();let time=NOW;
 for(const days of [2,7,21]){s=startMission(b,s,time);s=answerQuestion(b,s,0,time);s=advance(s,time);assert.equal(s.reviews[0].due,time+days*DAY);time=s.reviews[0].due;}
 assert.equal(s.reviews[0].level,3);s=startMission(b,s,time);s=answerQuestion(b,s,1,time);assert.equal(s.reviews[0].level,0);assert.equal(s.reviews[0].error_pending,true);
});
test('manutenção antecipada não adianta domínio nem adia a revisão',()=>{
 const b=fixture();b.questions=b.questions.slice(0,1);let s=initialState();let time=NOW;
 for(let i=0;i<3;i++){s=startMission(b,s,time);s=answerQuestion(b,s,0,time);s=advance(s,time);if(i<2)time=s.reviews[0].due;}
 const due=s.reviews[0].due;s=startMission(b,s,time+1000);s=answerQuestion(b,s,0,time+1000);assert.equal(s.reviews[0].due,due);assert.equal(s.reviews[0].level,3);
});
test('backup preserva sessão e rejeita respostas duplicadas ou progresso incompatível',()=>{
 const b=fixture();let s=startMission(b,initialState(),NOW);s=answerQuestion(b,s,0,NOW);s=JSON.parse(JSON.stringify(s));assert.equal(validateState(s,b).active.position,0);
 const d=structuredClone(s);d.attempts.push(d.attempts[0]);assert.throws(()=>validateState(d,b));
 d.attempts.pop();d.next_session=1;assert.throws(()=>validateState(d,b),/Sequência/);
});
test('chave separa restaurantes e versões sem alterar o estado original',()=>{
 const b=fixture();const other=fixture();other.restaurant.id='outro';assert.notEqual(bankKey(b),bankKey(other));other.restaurant.id=b.restaurant.id;other.version='demo-2';assert.notEqual(bankKey(b),bankKey(other));
 const original=initialState();startMission(b,original,NOW);assert.equal(original.active,null);
});
