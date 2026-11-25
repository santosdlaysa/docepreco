# Suporte — verificação de 25/11/2026

Resultado: **nenhum bug reproduzido** nos cenários executados nesta rodada. Não foi alterado código do produto para esta entrega. Não houve acesso a produção, envio, agendamento real ou migração em banco.

## Testes executados hoje

Todos os comandos abaixo terminaram com código de saída 0. Executados no checkout local em 25/11/2026, com as dependências já instaladas, sem instalação adicional.

| Diretório de execução | Comando | Resultado e alcance |
| --- | --- | --- |
| Raiz do projeto | `node web/scripts/test-activation.cjs` | PASS. Carregamento, métricas independentes, abrir usuário correto, preparação bloqueada para inativa e disponível para ativa, paginação, busca, troca de coorte, descarte de resposta antiga, vazio, erro genérico, repetição e percentuais. API simulada. |
| Raiz do projeto | `node web/scripts/test-notification-drafts.cjs` | PASS. Rascunho de ativação pré-seleciona apenas ativos, remove duplicatas, força individual, limita a 100 e bloqueia seleção vazia. Busca com mínimo de 3 caracteres/debounce, estados de erro/vazio/carregamento, resposta antiga ignorada, seleção mantida ao pesquisar, remoção, IDs no agendamento, exclusão dos IDs no payload de grupo, agendamento vazio bloqueado e cancelamento sem criar/enviar. API e temporizadores simulados. |
| `backend/` | `node node_modules/jest/bin/jest.js --runInBand src/infrastructure/services/individualNotifications.test.ts` | PASS: 1 suíte, 28 testes aprovados, 0 falhas. Validação de IDs/agendamento, persistência e releitura da seleção, resolução parametrizada de destinatários ativos, compatibilidade de grupos, caminhos de criação/envio/agendador e migração simulada. Banco e serviço de push substituídos por mocks. |
| `mobile/` | `node scripts/test-session-failure.cjs` | PASS. Falha de credenciais preserva sessão; sessão protegida expirada encerra a sessão; resposta antiga não remove novo login; casos admin, demo, sem token e falhas de rede/servidor tratados. Cliente e armazenamento simulados; sem rede ou dispositivo nativo. |

## Fluxo inspecionado no código

`ActivationPage.tsx` → callbacks em `AdminApp.tsx` → `UserDataPage.tsx` para abrir conta, ou `NotificationsPage.tsx` para ajuda individual.

- **Abrir usuário:** passa o ID da linha, muda para usuários e seleciona a conta para exibição dos dados.
- **Preparar ajuda:** exige conta ativa e monta rascunho com `requiresIndividualTargeting` e `recipients` da linha. Não executa criação nem envio.
- **Editor:** filtra ativos no rascunho, deduplica IDs e força seleção individual; o consumo do rascunho impede reabertura automática ao cancelar. O envio é outra ação explícita; não foi executado nesta rodada.
- **Persistência:** `recipient_user_ids` é incluído no repositório e recuperado ao reler. Os testes conferem argumentos SQL e registros simulados. Isso não prova que a migração já está aplicada em produção.
- **Agendamento:** armazena os destinatários escolhidos, não uma busca dinâmica. O agendador usa a seleção persistida; atividade da conta e resolução de tokens são verificadas no caminho backend coberto pelos testes. A condição de primeira receita ou consentimento não é inferida pelo grupo de plano.

## Fontes verificadas

- `web/src/pages/ActivationPage.tsx`
- `web/src/admin/AdminApp.tsx`
- `web/src/pages/UserDataPage.tsx`
- `web/src/pages/NotificationsPage.tsx`
- `web/scripts/test-activation.cjs`
- `web/scripts/test-notification-drafts.cjs`
- `backend/src/infrastructure/services/individualNotifications.test.ts`
- `backend/src/infrastructure/repositories/PostgresNotificationRepository.ts`
- `backend/src/infrastructure/repositories/PostgresPushTokenRepository.ts`
- `backend/src/infrastructure/services/scheduledNotificationService.ts`
- `mobile/scripts/test-session-failure.cjs`
- `mobile/src/data/api/sessionFailure.ts`

## Limitações e próximo dado necessário

Os resultados são testes locais com dependências simuladas e inspeção de integração, não execução ponta a ponta em navegador, aparelho ou banco real. Não confirmam entrega de push, publicação da versão nem elegibilidade de conta individual em produção. Um relato real de falha ainda requer ação tentada, esperado/observado, plataforma/build, horário e evidência minimizada para reprodução. Não solicitar senha, token ou código de recuperação.

Os 28 testes acima foram executados hoje. Não reutilizei o resultado de 55 testes da rodada de 24/11 como se fosse uma nova execução.

## Retomada manual: precisão do custo unitário

Defeito reproduzido no formatador: custo de R$ 1 dividido por 100.000 unidades (R$ 0,00001) aparecia como R$ 0,0000. Corrigido em `mobile/src/presentation/utils/currency.ts`: precisão adaptativa até oito casas; abaixo do limite, indicador de valor menor que a menor unidade exibida, sem sugerir custo zero. Valores negativos também são tratados. A divisão preço/quantidade e os preços finais não foram alterados.

Teste `node scripts/test-unit-cost-format.cjs`, executado em mobile: saída 0, 12 casos de custos fracionários/zero/inválidos/negativos, nove moedas e 54 casos de preços finais preservados. `node node_modules/typescript/bin/tsc --noEmit`, em mobile: saída 0. Testes locais; não houve validação em aparelho nem publicação.
