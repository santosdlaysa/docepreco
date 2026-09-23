# Experimento de conversão

## Entrega

- App: limite de receitas consultado na configuração, aviso discreto na lista e oferta contextual na tentativa bloqueada. O formulário permanece montado ao abrir a assinatura.
- Web: aviso próximo ao limite, oferta em resposta a `RECIPE_LIMIT`, formulário preservado, eventos nas páginas de recursos pagos e assinatura por PIX.
- Premium continua sendo a oferta para receitas, clientes e encomendas; Master para loja, financeiro e estoque. Os preços são os da configuração e, no app nativo, da loja. A implementação não altera cobranças nem configurações em produção.
- Administração → Atividade dos cadastros → Oportunidades de conversão: distribuição de receitas, segmentos de Free ativos, até 50 usuários prioritários e atividade/conversão por origem.

## Ativação

Publicar primeiro o backend com a migration `conversion_events`, depois web e app. O servidor já executa `runMigrations()` na inicialização normal; a migration também integra `npm run migrate`. A migration é aditiva e idempotente.

Não há disparo automático de push. A coleta começa com a versão atualizada; as distribuições de receitas usam dados existentes. As primeiras coortes completas ficam disponíveis sete dias após a primeira oferta registrada.

## Definições

- Oportunidades: contas habilitadas, com acesso nos últimos 30 dias, sem Premium vigente. Assinaturas expiradas contam como Free. Os segmentos podem se sobrepor.
- Atividade por origem: usuários únicos nos últimos 30 dias; uma pessoa pode aparecer em mais de uma origem. São contagens de atividade, não um funil necessariamente sequencial.
- Clique: ação para conhecer/assinar ou iniciar o pagamento. Início do pagamento: acionamento da compra no app; copiar PIX, solicitar confirmação ou iniciar upgrade na web. Nenhum desses eventos comprova pagamento.
- Conversão: primeira oferta registrada no período para um Free sem pagamento anterior. Denominador apenas com sete dias completos de observação. Numerador com primeiro pagamento registrado em até sete dias dessa oferta. Atribuição exclusiva à origem dessa primeira oferta.
- Pagamentos: histórico `premium_events`, fontes `webhook`, `pix` e `stripe`, valor positivo e tipo `INITIAL_PURCHASE`, `RENEWAL` ou `NON_RENEWING_PURCHASE`. Usa o horário de registro no servidor e depende da integridade do histórico. Valor zero, sincronização do cliente e concessão manual não comprovam pagamento. Reembolsos não são descontados desta métrica de aquisição; ela não representa receita líquida nem retenção.
- Ex-pagantes: Free com pagamento positivo no histórico aceito acima. “Clicaram para assinar” indica interesse recente de contas atualmente Free, não abandono confirmado de checkout.
- Eventos autenticados usam identidade e estado Free do servidor. UUID torna reenvios idempotentes; limite de 60 eventos/minuto/IP. Falha na coleta não impede cadastro ou pagamento.

## Validação

Builds do backend e web; TypeScript do app. Testes de autenticação/validação, receitas e integração SQL em PostgreSQL isolado.

Para repetir a integração, definir `CONVERSION_TEST_DATABASE_URL` apontando para um PostgreSQL de testes e executar no backend:

```powershell
$env:CONVERSION_TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:55439/postgres'
.\node_modules\.bin\jest.cmd --runInBand conversionService.integration conversionRoutes recipes.e2e recipes-crud.e2e
```

O teste cria e remove um schema exclusivo. Não usa `DATABASE_URL`. Sem a variável explícita, a integração é ignorada.

Verificação funcional após publicar: configurar um limite diferente de 3, salvar a última receita permitida, tentar a seguinte, fechar a oferta e conferir o rascunho; abrir Clientes e Loja para conferir o plano inicial; confirmar que os eventos aparecem no painel. A validação local não realizou compra real nem publicação.
