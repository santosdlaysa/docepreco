# Changelog

## v2.3.0 (27/04/2026)

### Painel Admin - 11 novas funcionalidades

- **Ingredientes Globais** - Precos de referencia sugeridos no app ao cadastrar ingredientes
- **Receitas Sugeridas** - 12 receitas premium com ingredientes gerenciaveis pelo painel (antes hardcoded)
- **Categorias de Receitas** - Categorias com emoji para organizar receitas no app
- **FAQ / Ajuda** - Perguntas frequentes exibidas no app
- **Changelog / Novidades** - Tela "O que ha de novo" por versao
- **Onboarding** - 4 telas de boas-vindas editaveis com preview de celular (antes hardcoded)
- **Cupons de Desconto** - Codigos promocionais para o premium com validacao via API
- **Feature Flags** - Liga/desliga 9 funcionalidades do app remotamente (antes hardcoded)
- **Configuracao de Planos** - Limite free, preco premium e features editaveis (antes hardcoded)
- **Feedbacks** - Avaliacoes dos usuarios com estrelas e resposta pelo painel
- **Telegram** - Controle ON/OFF de cada alerta e relatorio do bot, com criacao de alertas customizados

### Melhorias

- **Agendamento de notificacoes locais** editavel pelo painel (hora, dia, intervalo de inatividade)
- **Sidebar reorganizada** em 4 secoes: Conteudo, Comunicacao, Configuracao e Sistema
- **Swagger** disponivel em `/api/docs` com todas as rotas documentadas
- **Seeds automaticos** no primeiro boot: 12 receitas, 4 onboarding, 9 feature flags, 9 alertas Telegram

### Backend

- 11 tabelas novas no PostgreSQL
- 10 repositories, 11 controllers, 11 route files
- Todas as rotas admin protegidas por `x-admin-secret`
- Endpoints publicos `/active` para o app consumir

### Numeros

- 11 novas paginas no painel admin (total: 19)
- 70+ endpoints na API (documentados no Swagger)
- 27 tabelas no banco de dados
