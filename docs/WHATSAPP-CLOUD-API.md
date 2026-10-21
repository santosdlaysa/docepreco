# Migração para WhatsApp Cloud API

O sistema usa a API oficial da Meta. Não crie QR Code nem conecte este número à Evolution/Baileys após a virada.

## Antes do deploy

1. No Meta Business Suite, conclua a verificação da empresa e crie/associe a WhatsApp Business Account (WABA).
2. Crie um app do tipo Business, adicione o produto WhatsApp e registre o número. Faça primeiro com um número de teste.
3. Crie um usuário de sistema com as permissões necessárias para WhatsApp e gere o token de longa duração. Nunca o exponha no web ou mobile.
4. Configure no ambiente do backend as variáveis listadas em `backend/.env.example`.
5. No painel Meta, cadastre `https://docepreco.onrender.com/api/webhooks/whatsapp` como Callback URL, informe `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN` e assine o campo `messages`.
6. Crie e obtenha aprovação do template de Marketing configurado em `WHATSAPP_WINBACK_TEMPLATE_NAME`. O template deve conter cinco variáveis, nesta ordem: nome, percentual, preço cheio, preço com desconto e data de validade.

## Política operacional

- Não importe opt-ins por suposição. `users.whatsapp_marketing_opt_in` começa como `false`; registre a autorização inequívoca do usuário e a data antes de ativá-lo.
- Win-back usa somente o template de Marketing aprovado e só envia para opt-in verdadeiro.
- Mensagens livres não são enviadas pelo backend. Para atendimento manual, o painel abre o WhatsApp do atendente; para automação, adicione um template aprovado ou implemente a verificação documentada da janela de atendimento de 24 horas.
- Acompanhe qualidade, limites e erros no WhatsApp Manager. Pausar uma campanha é obrigatório diante de queda de qualidade ou reclamações.

## Corte para o número de produção

1. Confirme em produção o webhook, um template de teste e o recebimento dos status `sent`, `delivered`, `read` e `failed`.
2. Faça backup da configuração atual e pare os disparos da Evolution.
3. Siga o fluxo de registro/migração do número apresentado pela Meta. Não exclua o número ou a conta WhatsApp antes de o painel Meta confirmar o registro.
4. Após a confirmação, remova `EVOLUTION_*`, desative/remova o serviço `evolution-api` e o volume de sessão somente depois de alguns dias de observação.
