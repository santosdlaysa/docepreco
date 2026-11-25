# Atendimento e comercial — 25/11/2026

Entrega do dia: procedimento operacional para ajudar uma conta sem receita, com duas respostas prontas. Validado no código local e em testes simulados; a versão publicada não foi verificada. Nenhum cliente foi contatado.

## Procedimento prático — ajudar a começar pela primeira receita

1. No painel administrativo, abrir **Ativação de usuários**. Escolher a coorte de cadastro de 7, 30 ou 90 dias. Os indicadores descrevem o estado atual das contas dessa coorte, não uma sequência histórica obrigatória de conversão.
2. Na lista **Contas sem receita cadastrada**, pesquisar a conta e clicar em **Abrir usuário**. A integração abre os dados da conta selecionada; conferir sua situação atual e eventuais dificuldades antes de propor contato. Ausência de receita não significa consentimento para comunicação nem falta de interesse.
3. Para preparar ajuda por push, voltar à tela de ativação e usar **Preparar ajuda** na conta correta. O botão fica indisponível para contas inativas. Não é necessário copiar o e-mail para uma lista externa.
4. O editor abre com **Destinatários selecionados**, o texto de ajuda e a conta ativa já selecionada. Conferir nome, e-mail, elegibilidade e quantidade de selecionados. O rascunho remove duplicatas, ignora inativos e limita a 100 contas. Este passo não cria registro, não agenda e não envia.
5. Ajustar o texto para a dúvida conhecida. Se houver falha de acesso ou cálculo, encaminhar ao suporte antes de propor assinatura. A seleção individual identifica a conta; não confirma automaticamente permissão, interesse, pagamento ou dificuldade específica.
6. Para esta rodada diária, encerrar em **Cancelar**, pois foi solicitada verificação local, sem envio real. Quando houver autorização para uma ação externa concreta, revisar novamente os destinatários antes de usar **Enviar agora** ou **Agendar**. Agendamento exige data futura e mantém os IDs selecionados; a elegibilidade comportamental não é reavaliada automaticamente.

**Resultado verificado:** abertura do usuário correto, preparação de ajuda somente para conta ativa, pré-seleção individual, cancelamento sem criação/envio, manutenção da seleção ao pesquisar e payload do agendamento com os IDs escolhidos. Persistência no backend foi exercitada com banco simulado, não com migração ou transação real.

## Resposta pronta 1 — atendimento para quem pediu ajuda para começar

> Podemos começar por uma receita que você já faz. Separe o preço e a quantidade comprada de cada ingrediente, as quantidades usadas e o rendimento do preparo. Em qual etapa você quer ajuda primeiro?

Uso: resposta a interesse ou dúvida já recebida. Aproveitar informações do histórico para não pedir o mesmo dado novamente. Não solicitar senha ou código. Se aparecer erro, recolher mensagem, etapa e versão quando relevante e encaminhar ao suporte.

## Resposta pronta 2 — comercial após interesse em assinatura

> Você quer organizar a precificação, acompanhar suas vendas ou trabalhar com uma loja online? Me conte o que precisa resolver hoje para eu conferir quais recursos e condições fazem sentido para você.

Uso: conversa com interesse confirmado em assinatura. Consultar benefícios, preços e links atuais antes de apresentar uma oferta; não copiar valores antigos. Se houver problema técnico ou divergência de pagamento, interromper a proposta comercial e encaminhar à área responsável. Encerrar após recusa.

## Verificação do material

- Um procedimento com seis passos e duas respostas prontas conferidos.
- Sem preço, desconto, link de assinatura ou vantagem inventada; sem afirmação de contato realizado.
- Fontes locais: `web/src/pages/ActivationPage.tsx`, `web/src/admin/AdminApp.tsx`, `web/src/pages/NotificationsPage.tsx`, `web/src/pages/UserDataPage.tsx` e `docs/time-agentes/BASE.md`.
- Comandos e resultados técnicos completos: [suporte.md](suporte.md).

Limites: não houve teste visual em navegador/dispositivo nem consulta de contas reais. Contagens de clientes ajudados, conversão e receita permanecem não medidas nesta entrega.
