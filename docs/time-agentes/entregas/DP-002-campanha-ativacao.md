# DP-002 — Campanha de ativação
Data: 24/11/2026. Estado: plano concluído; execução externa não iniciada.

## Proposta
Hipótese a testar: orientação curta ajuda parte dos cadastros sem receitas a começar. A hipótese não foi comprovada com dados atuais. Público: contas reais cadastradas há 2–7 dias, sem receita cadastrada, com contato autorizado no canal escolhido. Excluir contas de teste, recusas, incidentes de acesso ou pagamento abertos e quem criou receita antes de cada contato. Não oferecer desconto ou prometer lucro.

Canal proposto: WhatsApp individual autorizado, com alternativa de tutorial dentro do app quando disponível. Nenhum contato foi realizado. Sem verba de anúncio presumida. Oferta: ajuda para cadastrar a primeira receita, sem benefício pago ou gratuidade adicional.

## Sequência proposta
| Momento relativo à entrada | Ação | Objetivo |
| --- | --- | --- |
| D0 | Perguntar se quer ajuda para começar | Identificar necessidade |
| D2 | Compartilhar tutorial somente após aceite | Ajudar a cadastrar ingrediente e receita |
| D5 | Perguntar se conseguiu e oferecer orientação pontual | Resolver bloqueio |

Antes de cada contato revalidar consentimento, ausência de receita, falta de incidentes e ausência de outro atendimento. Uma lista operacional única deve registrar responsável, status e último contato; não guardar dados de clientes neste repositório. Sair imediatamente após recusa ou primeira receita; após D5 encerrar sequência sem insistência. Comercial só recebe quem pedir informações sobre plano, sem contato simultâneo automático.

## Teste e medição
Proposta: distribuir aleatoriamente elegíveis em grupo com orientação e controle com experiência habitual. Registrar atribuição e instante de entrada antes do envio. Medir criação da primeira receita em sete dias completos após entrada, inclusive para quem não respondeu. Taxa = usuários atribuídos com primeira receita na janela / todos os elegíveis atribuídos ao grupo. Comparar diferença absoluta de taxas; relatar tamanho de amostra, perdas e incerteza. Critério inicial de sucesso: melhora positiva sem aumento de recusas/reclamações; não declarar efeito conclusivo com amostra pequena. Definir tamanho de amostra após linha de base e efeito mínimo desejado.

O código de conversionService.ts tem fontes first_recipe e eventos de oferta; isso não comprova evento de criação de receita. Contagem atual de receitas pode selecionar contas sem receita, mas não mede sozinha primeira criação histórica se houver exclusões. Faltam confirmar histórico de criação, consentimento, entrega de mensagens e registro de atribuição. Não foi implementado rastreamento nem consultada produção. Alcance e respostas são medidas auxiliares, não substituem ativação.

## Briefings
Conteúdo: sete peças educativas e tutorial textual sem telas inventadas; prioridade ao primeiro cadastro. Copy: dois textos por etapa da jornada, mais três pushes. Comercial: receber somente interesse declarado ou outro sinal verificável; não tratar falta de uso como intenção de compra.

## Fontes e verificação
README.md; docs/time-agentes/BASE.md; backend/src/infrastructure/services/conversionService.ts; mobile/src/presentation/screens/CreateRecipeScreen.tsx e RecipesScreen.tsx. Revisão estática confirmou separação entre fonte de oferta e evento de criação. Nenhuma métrica histórica foi tomada como atual. Pendências para lançamento: consentimentos, público real, link/tutorial publicado, instrumentação e autorização de envio.
