# DP-007 — Suporte técnico

Preparado em 24/11/2026. Inspeção local e roteiros de diagnóstico; não confirma falha atual nem correção em produção.

## 1. Login e recuperação

**Evidência mínima:** forma de entrada original, plataforma, versão, ação, mensagem, horário e fuso. Não coletar senha, código ou token. Prioridade alta se bloqueia acesso; ampliar prioridade diante de vários relatos correlacionados comprovados.

**Fontes:** `mobile/src/presentation/screens/LoginScreen.tsx`, `ForgotPasswordScreen.tsx`, `backend/src/presentation/routes/authRoutes.ts`, `backend/src/presentation/controllers/AuthController.ts`, `backend/src/presentation/middleware/loginLockout.ts`, `backend/src/presentation/middleware/rateLimiter.ts`.

**Hipóteses a distinguir:** forma de entrada diferente do cadastro; senha incorreta; bloqueio por tentativas; conectividade; falha na entrega de e-mail; código inválido/expirado. São hipóteses, não diagnósticos.

**Teste local seguro:** usar testes com repositório e e-mail simulados em `AuthController.test.ts`. Verificar resposta de recuperação sem revelar existência de conta, código inválido e atualização de senha. Não usar endpoint de produção para experimentar. No caso real, logs autorizados devem ser filtrados e mascarados; resposta de sucesso genérica não comprova envio ou chegada de e-mail.

**Orientação externa:** conferir forma de login e pasta de spam; recolher mensagem e horário. Não repetir solicitações indefinidamente nem pedir código ao cliente.

## 2. Aplicativo que fecha

**Evidência mínima:** modelo, versão do sistema/app, horário, ação imediatamente anterior, recorrência e se alcança a tela inicial. Prioridade alta para bloqueio de abertura; diferenciar travamento de encerramento pelo sistema.

**Fontes:** `mobile/package.json`, `mobile/src/presentation/screens/LoginScreen.tsx`, `mobile/src/presentation/context/PremiumContext.tsx`; README descreve observabilidade, mas isso não demonstra telemetria ativa na versão do cliente.

**Hipóteses:** erro nativo, falha JavaScript, incompatibilidade de build/atualização, recurso específico ou falta de memória. Nenhuma pode ser concluída sem relatório e reprodução.

**Teste proposto, não executado:** reproduzir em build equivalente à distribuída, com conta de teste, primeiro em abertura e depois na ação relatada; correlacionar relatório de crash autorizado pelo horário e build. Testar também a condição de rede relatada. Não basta abrir em outro aparelho para descartar o caso. Nenhum teste em dispositivo foi feito nesta entrega.

**Orientação externa:** coletar o contexto e encaminhar. Não recomendar reinstalação, exclusão da conta ou limpeza de dados sem avaliar dados locais não sincronizados.

## 3. Atualização de custo/preço inesperado

**Evidência mínima:** esperado/observado; preço, quantidade de compra, unidade e peso por unidade do ingrediente; quantidade usada; rendimento; adicionais por unidade/lote; sub-receitas e percentual informado. Prioridade alta se compromete decisões de preço ou integridade de dados.

**Fontes:** `backend/src/domain/services/recipeCalculator.ts`, `recipeCalculator.test.ts`, `backend/src/application/use-cases/calculation/CalculateRecipeUseCase.ts`, `mobile/src/presentation/screens/CreateRecipeScreen.tsx`, `RecipeDetailScreen.tsx`.

**Comportamento local observado:** preço por unidade = custo por unidade × (1 + `profitMargin`/100). O campo representa markup sobre custo, não margem sobre preço de venda. Exemplo fictício: custo R$ 10 e percentual 50 resultam em preço R$ 15; a margem sobre venda é 33,33%, antes de custos não cadastrados. Adicionais com tipo `unit` multiplicam pelo rendimento; demais adicionais são de lote. Há conversão entre massa e volume dentro da mesma família. Ingrediente ausente do mapa é ignorado pelo calculador; verificar vínculo em caso de custo incompleto, sem afirmar defeito confirmado.

**Hipóteses:** unidade/quantidade divergente, rendimento incorreto, adicional por unidade interpretado como lote, sub-receita ou expectativa de margem diferente do markup. Também investigar dado não atualizado e vínculo ausente conforme evidência.

**Teste local seguro:** suíte `recipeCalculator.test.ts`, com entradas sintéticas, sem banco. Para relato real, montar reprodução com dados minimizados e comparar valores intermediários. Não modificar ingrediente de cliente para testar.

## Modelo de incidente

ID interno; categoria; impacto/prioridade; data e fuso; plataforma/build; usuário mascarado; esperado; observado; passos mínimos; evidências sem segredos; hipótese e nível de confiança; reprodução local sim/não; teste realizado e resultado; próximo teste; responsável; estado; critério de encerramento. Abrir sem credenciais ou dados de pagamento completos.

## Testes e limites

Executado em `backend/`: `node node_modules/jest/bin/jest.js --runInBand src/domain/services/recipeCalculator.test.ts src/presentation/controllers/AuthController.test.ts`. Resultado: duas suítes aprovadas, 55 testes aprovados, zero falhas. Testes de autenticação usam repositório e e-mail simulados; calculador usa entradas sintéticas. Não houve acesso a produção.

A primeira tentativa via `npm test` foi bloqueada por EPERM ao resolver a instalação do npm em outro perfil do Windows. A execução direta do Jest acima contornou o problema sem alterar configurações ou permissões. Sete referências principais de triagem foram verificadas com `Test-Path` e existem.

Inspeção de arquivos não equivale a teste em produção. Sem dispositivo e relatório de crash, o roteiro de encerramento permanece proposta de teste. Não houve alteração de código ou dados.

Indicadores futuros: percentual de relatos com evidência suficiente, tempo de triagem, recorrência por categoria. Sem histórico, permanecem não medidos.
