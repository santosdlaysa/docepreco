# Execução: ativação, notificações e suporte

## Resultado no produto

O admin ganhou **Ativação de usuários**, com coortes de 7, 30 e 90 dias, indicadores de ingredientes/receitas/vendas, pesquisa e paginação das contas sem receitas. Os indicadores são estados atuais independentes; não fingem uma sequência histórica de conversão. Contas inativas aparecem identificadas.

**Abrir usuário** leva ao cadastro existente. **Preparar ajuda** abre o editor de notificação individual com a conta ativa já selecionada, sem enviar. O botão fica indisponível para inativas.

O editor de notificações permite buscar e selecionar até 100 contas por nome/e-mail, remover destinatários e agendar. Os IDs são persistidos e reutilizados no envio imediato, manual e agendado; uma lista individual inválida nunca vira público amplo. Trocar para grupo limpa a seleção. Modelos individuais não permitem troca para grupo. Selecionar contas não comprova token ativo, recebimento ou elegibilidade de negócio; confira o caso antes de enviar.

Agendamento sem data, inválido ou no passado agora é rejeitado na interface e no backend, em vez de cair no envio imediato. O segmento Master também passou a respeitar vigência, assim como Premium; destinatários inativos são excluídos.

## Suporte mobile

Uma rejeição de credenciais em login/cadastro/social/recuperação não invalida o JWT da sessão existente. O interceptor agora distingue essas falhas de uma sessão realmente inválida em rota protegida. Preserva a verificação contra respostas antigas de outra sessão. O admin mobile consegue identificar notificações individuais na listagem; o seletor de destinatários desta entrega está no web admin.

Não foi reproduzido nem declarado corrigido um crash nativo de iPhone. Essa investigação continua dependendo de evidência de dispositivo/build.

## Resultado real em leitura

Em 24/11/2026 às 15:11:40 no fuso America/Manaus, a consulta real de ativação foi executada em transação somente leitura, TLS com validação e timeout. Para os últimos 30 dias:

| Estado atual | Contas |
| --- | ---: |
| Cadastradas | 210 |
| Com ingredientes | 153 |
| Com receitas | 78 |
| Com vendas | 18 |
| Sem receitas | 132 |

78 + 132 = 210. A lista retornou 20 registros na primeira página; apenas agregados foram salvos em `2026-11-24-ativacao-resumo.json`. Ausência atual de receita não comprova que a conta nunca usou ou que autorizou contato. Os demais testes usaram dependências simuladas.

## Verificação

- Backend: 6 suítes e 93 testes aprovados, incluindo validação de público e agendamento, persistência, reenvio, cron, seleção de tokens, ativação, autenticação e cálculo.
- Web: testes de materiais, destinatários individuais e ativação aprovados; pré-seleção de conta ativa, duplicatas, limite de 100, pesquisa com atraso/resposta antiga, cancelamento, agendamento e payloads verificados.
- Mobile: teste do interceptor real com axios/storage simulados aprovado; falha de credenciais preserva sessão, JWT inválido em rota protegida encerra, resposta de token antigo não apaga sessão nova.
- TypeScript do backend, web e mobile aprovado.
- Build completo Vite/PWA aprovado, carregando a configuração original pela API Node para contornar a restrição de leitura do empacotador de configuração neste ambiente.

## Publicação

A migração `individualNotificationsMigration.ts` adiciona `recipient_user_ids UUID[]` e as restrições de público. Está ligada ao fluxo de inicialização, mas **não foi executada no banco nesta tarefa**. Publicar o backend com a migração antes de usar a seleção individual no web; o backend antigo não suporta esse campo.

Nenhuma notificação foi enviada/agendada e nenhum registro de cliente foi alterado nesta execução. As alterações mobile exigem o processo de distribuição correspondente. O teste real de entrega de push em dispositivo e a validação visual da versão publicada permanecem separados dos testes locais.
