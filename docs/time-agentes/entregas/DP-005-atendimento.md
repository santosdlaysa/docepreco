# DP-005 — Atendimento

Preparado em 24/11/2026. Dez modelos para revisão e uso em conversa autorizada. São cenários, não incidentes atuais confirmados. Pergunte somente o que ainda não constar no histórico.

| Caso | Resposta pronta | Informação mínima e encaminhamento |
| --- | --- | --- |
| 1. Não sabe começar | Vamos começar por uma receita que você já faz. Primeiro, separe o preço e a quantidade comprada de cada ingrediente. Qual receita você gostaria de cadastrar? | Nome da receita; atendimento acompanha o primeiro cadastro. |
| 2. Ingrediente | Para calcular o custo, precisamos do preço e da quantidade da embalagem comprada. Por exemplo: um pacote de 1 kg por R$ 10. Qual informação está deixando você em dúvida? | Unidade, quantidade e preço; valores do exemplo são fictícios. Suporte se o cadastro falhar. |
| 3. Rendimento | O rendimento deve representar quanto a receita inteira produz. Se ela rende 20 unidades iguais, use esse total para calcular o custo de cada uma. Qual rendimento você está tentando informar? | Quantidade e unidade do rendimento; atendimento, com suporte se houver divergência. |
| 4. Plano | Posso ajudar a escolher conforme o que você precisa. Você quer organizar a precificação e as vendas ou também receber encomendas pela loja online? | Necessidade; comercial consulta os benefícios e preços vigentes antes de recomendar. |
| 5. Tutorial | Posso te orientar passo a passo por aqui. Você prefere começar pelo cadastro dos ingredientes ou pela primeira receita? | Etapa atual; atendimento usa tutorial verificado. Não afirmar que há vídeo pronto. |
| 6. Senha recusada | Entendi. Confira se está usando o mesmo e-mail e a mesma forma de entrada do cadastro. Se foi por e-mail e senha, use a opção de recuperação na tela de entrada. Qual mensagem aparece? Não envie sua senha. | Mensagem, forma de login e plataforma; suporte se persistir. |
| 7. Recuperação não chega | Confira a caixa de spam e se o endereço informado está correto. Você pode me dizer aproximadamente quando fez a solicitação e qual mensagem apareceu no app? Não envie o código de recuperação. | Horário com fuso, mensagem e provedor de e-mail; suporte verifica fluxo e entrega em acesso autorizado. |
| 8. App fecha | Vamos investigar. O aplicativo fecha logo ao abrir ou depois de alguma ação? Informe também o modelo do celular e as versões do sistema e do app, se conseguir consultar. | Ação, modelo, versões, horário; suporte. Não orientar apagar dados ou reinstalar nesta triagem. |
| 9. Valor inesperado | Vamos conferir com um exemplo. Qual era o valor esperado e qual apareceu? Se puder, envie os valores do ingrediente, quantidade usada e rendimento da receita, sem dados pessoais. | Esperado/observado, unidades e custos; suporte investiga. Não atribuir erro ao cliente. |
| 10. Pagou sem acesso | Vamos verificar o pagamento e a liberação do acesso. A assinatura foi feita pelo iPhone, Google Play ou pelo site? Informe a data e o status mostrado no comprovante, ocultando dados pessoais e bancários. | Canal, data, status e referência mascarada; financeiro concilia e suporte verifica acesso. Não pedir novo pagamento. |

## Verificação e fontes

- Contagem conferida: dez cenários, cada um com resposta e próximo passo.
- `mobile/src/presentation/screens/LoginScreen.tsx`: ação de recuperação na tela de entrada; `ForgotPasswordScreen.tsx`: tela correspondente.
- `backend/src/presentation/controllers/AuthController.ts`: recuperação retorna mensagem genérica mesmo sem cadastro encontrado; isso não comprova entrega do e-mail.
- `backend/src/domain/services/recipeCalculator.ts`: custo depende de quantidade, unidade, rendimento e adicionais.
- Revisão editorial: sem pedido de credenciais, promessa de correção ou oferta para resolver defeito. Nada foi enviado.

Pendências: validar telas na versão publicada e dados do caso real. Indicadores de resolução, reabertura e tempo de encaminhamento não medidos sem histórico de atendimentos.
