export function fixture() {
  const items = Array.from({length:6},(_,i)=>({id:`item${i}`,service:'Turno de demonstração',category:'Exemplo',name:`Prato fictício ${i+1}`,description:`Descrição sintética ${i+1}.`,reference:`Exemplo fictício > Prato ${i+1}`}));
  return {format:'npl-manual',schema_version:1,restaurant:{id:'restaurante-demo',name:'Restaurante de demonstração'},version:'demo-1',review:{status:'approved',by:'Revisão do exemplo sintético',at:'2026-09-23T00:00:00Z'},source:{file_name:'fonte-ficticia.txt',sha256:'0'.repeat(64)},notes:['Exemplo sintético para testes; não representa um cardápio real.'],items,
    questions:items.map((item,i)=>({id:`q${i}`,competence:['conhecer','explicar','aplicar'][i%3],prompt:`Qual alternativa descreve o exemplo ${i+1}?`,options:[`Descrição sintética ${i+1}.`,'Alternativa fictícia B.','Alternativa fictícia C.'],correct_index:0,explanation:'Esta é a descrição do exemplo sintético.',source_item_ids:[item.id],status:'approved',active:true}))};
}
