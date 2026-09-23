# Verificação do piloto manual

23/09/2026 — versão 0.2.0.

## Executado

- Nove testes de motor passaram: bloqueio de rascunho, integridade de fontes/gabarito, composição da missão, idempotência de resposta/XP, retorno do erro, espaçamento de 2/7/21 dias, manutenção, consistência de backup e separação de versões/restaurantes.
- Build reproduzível sem dependências externas.
- Verificação de sintaxe do JavaScript incorporado.
- Pacote real validado localmente, mantido fora deste repositório.

## Ainda pendente

- Ensaio completo da interface em navegador real, teclado, leitores de tela e diferentes larguras.
- Toque e persistência em Safari/iPhone real.
- Testes de usuário e de aprendizagem.
- Revisão editorial e aprovação dos bancos reais.

A tentativa de teste com Playwright foi bloqueada pela ausência de um executável de navegador; a instalação retornou arquivos de download inválidos. Não há evidência de teste visual ou de fluxo completo no navegador nesta entrega. Os testes do motor não substituem essa etapa. O pull request deve permanecer em rascunho até o ensaio.

O site de produção não foi alterado nesta entrega. A nova ferramenta foi preparada em branch para revisão.
