# Registro de vendas pelo WhatsApp

O Perfil do aplicativo e da versão web possui a seção **Vendas pelo WhatsApp**. O usuário informa o próprio telefone com DDI/DDD, gera um código e envia `vincular CODIGO` do telefone informado ao bot. O código tem 96 bits aleatórios, é armazenado como hash e expira em 10 minutos. Cada telefone pode pertencer a uma única conta, e cada conta possui um telefone vinculado. Desvincular revoga códigos, rascunhos e respostas pendentes, preservando vendas registradas.

## Ativação no backend

Configure as variáveis no servidor, sem expor segredos no aplicativo:

```env
META_WHATSAPP_ACCESS_TOKEN=token-da-meta
META_WHATSAPP_PHONE_NUMBER_ID=id-do-numero-na-meta
META_APP_SECRET=segredo-do-app-meta
META_WHATSAPP_WEBHOOK_VERIFY_TOKEN=token-de-verificacao-escolhido
WHATSAPP_SALES_PHONE=5592999999999
WHATSAPP_SALES_ENABLED=true
WHATSAPP_SALES_TIMEZONE=America/Manaus
OPENAI_API_KEY=chave-da-openai
WHATSAPP_SALES_AI_MODEL=gpt-4.1-mini
```

`WHATSAPP_SALES_PHONE` é o número público real do bot, com DDI/DDD, e não o identificador interno da Meta. O número acima é ilustrativo. Cadastre o webhook HTTPS `https://SEU_BACKEND/api/webhooks/whatsapp` no aplicativo da Meta, use o mesmo token de verificação e habilite os eventos de mensagens do número conectado. O POST verifica a assinatura HMAC do corpo bruto com `META_APP_SECRET`. A integração existente de templates/status continua disponível.

Publique o backend e as interfaces atualizadas. Reinicie o backend: a migração idempotente cria as tabelas de vínculos, códigos, rascunhos e fila e o índice único de origem nas vendas. Confira o sucesso das migrações nos logs antes de liberar o recurso. A flag vem desligada no exemplo de configuração. A OpenAI precisa ter acesso ao modelo e saldo/créditos disponíveis.

## Uso

1. Em Perfil → Vendas pelo WhatsApp, informe seu número com DDI e DDD.
2. Gere o código, abra o WhatsApp e envie a mensagem de vínculo. Volte ao Perfil e atualize o vínculo.
3. Envie uma venda: `Vendi 10 brownies a R$ 8 cada, pago no Pix para Maria`.
4. Confira produto, quantidade, preço por unidade, total, data, cliente e pagamento. Responda `confirmar ABC123`, usando o código do resumo recebido.
5. A venda aparece na listagem e nos relatórios normais do aplicativo. A nota da venda informa a origem WhatsApp; o identificador da mensagem também fica salvo no banco.

`corrigir` invalida a confirmação anterior e solicita a alteração. Também é possível responder com o complemento/correção diretamente; cada novo resumo recebe outro código. `cancelar` descarta o rascunho. `ajuda` explica o uso. Rascunhos expiram em 2 horas. Sem dados suficientes, o bot pergunta; se o preço não estiver claro como unitário/total, pede esclarecimento. Um total que não possa ser dividido em preços unitários de duas casas decimais exige esclarecimento, sem alterar silenciosamente o total.

Nesta versão: uma venda por mensagem, somente texto, quantidade inteira, pagamentos já realizados em Pix, dinheiro, cartão, crédito ou débito; descontos e vendas com pagamento pendente devem ser registrados pelo aplicativo. A data padrão é o dia do evento no fuso configurado (global para o bot nesta versão). Receitas são vinculadas apenas quando o nome corresponde exatamente após normalizar acentos e maiúsculas. Sem correspondência, o resumo informa **sem receita vinculada**, e registra o nome do produto após confirmação. Não altera estoque nem cria encomendas: registra a mesma venda manual do aplicativo. As regras de plano e o vínculo ao caixa aberto são compartilhados com o cadastro normal.

## Processamento e limites

O webhook confirma o recebimento após gravar a mensagem na fila PostgreSQL. Um worker no backend processa a cada 3 segundos. Não precisa de um serviço de fila adicional; precisa que o processo do backend esteja executando. Mensagens de um mesmo telefone são processadas em ordem e serializadas com advisory locks. Rascunho, confirmação, venda e conclusão do evento são gravados na mesma transação. O ID da mensagem recebida é único na fila e na venda. Confirmar novamente um rascunho já consumido não cria outra venda.

As respostas são persistidas na mesma transação e enviadas depois. Há até 5 tentativas para falhas de processamento/envio, com intervalo de 1 minuto. Registros que esgotarem tentativas permanecem na fila para diagnóstico até a limpeza. Há uma janela conservadora de 23 horas para responder por texto a um evento recente, e nenhuma mensagem livre de campanha é enviada por esta funcionalidade. Uma falha entre aceitar o envio na Meta e marcar a resposta enviada pode repetir a resposta; a venda permanece protegida contra duplicação. A fila limita interpretações a 30 mensagens recebidas por telefone na última hora. Códigos, confirmações e comandos básicos não chamam a IA.

## Dados e privacidade

O app informa o uso de IA antes do vínculo. A OpenAI recebe o texto da mensagem, o rascunho anterior e a data de referência, com `store: false`. Texto pode incluir o nome de um cliente informado pelo usuário. Telefone, código de vínculo, catálogo completo e cadastro de clientes não são enviados ao modelo. Os cálculos e a gravação são feitos no backend, não pela IA.

O corpo recebido é apagado da fila após processamento; a resposta é apagada após envio. Códigos e rascunhos expirados são removidos por limpeza horária. Os registros da fila, inclusive falhas, são removidos após 7 dias. Telefones vinculados e vendas permanecem até desvínculo/exclusão conforme as regras da conta. O webhook continua fora do log geral de requisições e não imprime texto de mensagens ou segredos.

## Verificação realizada

- Build do backend e da versão web, e checagem TypeScript do mobile.
- Testes de validação, rascunho, correção, confirmação, vínculo, assinatura do webhook, indisponibilidade de IA e limite de plano.
- Teste com PostgreSQL 17 isolado: migração repetida, webhook assinado, vínculo, rascunho, correção, confirmação antiga rejeitada, entrega repetida, processamento simultâneo, uma única venda para a conta correta, caixa aberto, limite do plano e desvínculo. APIs externas simuladas; nenhuma mensagem real enviada.
- A suíte geral também apresenta falhas em testes de lojas, receitas, configurações e banners reproduzidas na versão anterior a esta implementação; testes Stripe apresentaram falha intermitente em execução conjunta e passaram isolados.

A confirmação visual em dispositivos e o envio real com Meta/OpenAI ainda dependem das contas configuradas e do ambiente publicado. Não houve ativação em produção nem envio para números reais nesta implementação.

Referências: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) e [formato de mensagem de texto da Meta](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/messages/text/).
