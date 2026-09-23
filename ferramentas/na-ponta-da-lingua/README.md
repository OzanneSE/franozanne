# Na Ponta da Língua — piloto manual 0.3.1

Aplicação genérica sem serviços externos. Recebe um pacote JSON preparado na conversa, permite revisar perguntas e consultar pratos, e libera treino somente com banco aprovado. A V0 específica de um restaurante continua sendo uma referência; este piloto não importa automaticamente seu progresso nem seu esquema antigo.

## Fluxo de trabalho

1. Enviar cardápio ou análise em HTML/PDF/texto para a conversa com o assistente.
2. Preparar pacote `npl-manual` com itens separados por restaurante, turno e versão, mais questões com referência de origem.
3. Revisar e aprovar o conteúdo com François. Rascunhos usam `review.status: draft`, `questions[].status: draft` e `active: false`.
4. Após aprovação real, gerar **nova versão**, registrar responsável/data e ativar as questões aprovadas.
5. Importar o JSON no aplicativo. A importação não envia arquivos para um servidor.

Para enviar por WhatsApp, distribua uma cópia do mesmo JSON com extensão `.txt` como documento. No celular, salve o documento e selecione-o pelo botão **Carregar pacote de treinamento** no site. O aplicativo aceita `.txt` e `.json`, lê o conteúdo da mesma forma e não depende de abrir o anexo pelo WhatsApp.
6. Praticar, exportar o backup e trazer resultados à conversa para orientar revisões.

O JSON é um pacote editorial, não uma assinatura digital de aprovação. O piloto confia no arquivo importado pelo operador; não oferece controle de acesso ou proteção contra alteração manual do banco.

## Conteúdo e privacidade

O código público é genérico. Nunca incluir cardápios reais, nomes/dados de clientes, preços, relatórios ou bancos reais neste repositório. A fixture em `test/fixture.mjs` é inteiramente sintética.

Há um perfil por navegador, com progresso separado por restaurante e versão. Compartilhar o navegador compartilha o perfil. O armazenamento local é apagável e não oferece sincronização. Alterações em outra aba bloqueiam gravações até recarregar. Backup inválido não substitui dados existentes. Dados corrompidos permitem exportação bruta e opção explícita de modo temporário.

Uma nova versão inicia progresso independente; o pacote anterior continua no seletor. O aplicativo rejeita conteúdo diferente importado com a mesma identificação e versão. Máximo de 20 pacotes e 5 MB por arquivo; limites práticos do armazenamento variam conforme navegador.

## Construir e verificar

Requer Node 20 ou superior, sem instalação de dependências:

```sh
cd ferramentas/na-ponta-da-lingua
npm test
npm run build
```

`index.html` é gerado de `src/` e contém CSS/JS incorporados, sem dependências remotas. Edite `src/` e execute o build; não altere manualmente o HTML gerado. Para prévia por link local, sirva a raiz do repositório com `python3 -m http.server 8000` e abra `/ferramentas/na-ponta-da-lingua/`.

O arquivo também pode ser aberto diretamente no navegador do computador. No iPhone, usar link HTTPS em Safari; a prévia de um anexo do WhatsApp não deve ser tratada como execução do aplicativo. Aprovação no teste em navegador desktop ou simulação móvel não substitui teste em iPhone real.

## Esquema mínimo do pacote

- `format: npl-manual`, `schema_version: 1`.
- `restaurant: {id, name}`, `version` imutável.
- `review: {status: draft|approved, by, at}`; responsável e data são obrigatórios para aprovação.
- `source: {file_name, sha256}` identifica o documento de origem.
- `notes: string[]` registra escopo, vigência e pendências.
- `items[]: {id, name, service, category, description, reference}`.
- `protocols[]: {id, name, description, reference}` é opcional para situações de serviço com referência própria, sem misturá-las ao cardápio.
- `questions[]: {id, competence, prompt, options[], correct_index, explanation, source_item_ids[], source_protocol_ids?[], status, active}`. Uma questão deve citar ao menos um prato ou protocolo válido.
- Competências: `conhecer`, `explicar`, `aplicar`. Gabarito é índice de base zero. Três ou quatro alternativas distintas.

`test/fixture.mjs` contém um exemplo completo e sintético. O validador limita campos e referências. Texto importado é apresentado com `textContent`, nunca executado como HTML.

## Treino

Missões de até cinco questões, evitando repetir um prato. Erros e revisões vencidas têm prioridade; acertos em aprendizagem aguardam 2, 7 e 21 dias. Questões no nível três podem aparecer como manutenção, sem antecipar avanço ou adiar a revisão. Erro reinicia o espaçamento. Acerto: 10 XP; conclusão: 10 XP. Respostas confirmadas são idempotentes e a missão pode ser retomada.

Não há avaliação científica de aprendizagem, login, ranking, relatório de equipe, processamento de PDF no aplicativo ou API de IA nesta entrega. Esses recursos pertencem a uma etapa posterior.

## Hospedagem e custo

O teste local e a importação manual não exigem Vercel, Supabase ou contratação de API. O código está preparado em branch de revisão; publicar na hospedagem existente é uma decisão posterior ao teste. A assinatura e os limites da ferramenta de conversa continuam sendo os do usuário.

Os custos estimados anteriormente para infraestrutura online se aplicam à futura automação, não são pré-requisito deste piloto. Reavaliar hospedagem e condições comerciais antes de distribuir como serviço para clientes.
