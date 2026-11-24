# Pacote operacional de marketing — 24/11/2026

## Arquivos prontos
- calendario-conteudos.csv: sete linhas, uma por peça, com título, dia relativo e texto integral (roteiro/cards, legenda, visual e ação conforme fonte).
- mensagens.csv: dez mensagens de WhatsApp (cinco pares A/B) e três pushes; público, ação, texto e contagem de caracteres separados.
- campanha.csv: três etapas relativas D0/D2/D5, com ações, objetivos, público, regras de exclusão/interrupção e medição extraídos do plano.
- exportar-marketing.ps1: extração reexecutável e verificações locais. Lê os três documentos DP-002/003/004 do diretório pai; não chama APIs e não envia mensagens.

Os dias são posições relativas; não há agendamento ativo. Os CSVs são arquivos UTF-8 separados por vírgula, com campos entre aspas. Campos de conteúdo podem conter quebras de linha. Use um importador CSV, não contagem de linhas físicas.

## Testes executados
Comando: `& docs/time-agentes/entregas/operacao/exportar-marketing.ps1`
Resultado: passou.
- Sete conteúdos, treze mensagens (dez WhatsApp/três pushes) e três etapas.
- Exportação e reimportação CSV com comparação de todos os campos, incluindo acentos, aspas, vírgulas e quebras de linha.
- Campos essenciais não vazios.
- Correspondência dos textos completos dos conteúdos, corpos de mensagens e ações da campanha com documentos-fonte.
- Títulos de push presentes na fonte e contagens de caracteres recalculadas.

## Uso e pendências
As mensagens A e B são alternativas. Escolher uma por etapa; não disparar ambas ao mesmo cliente. Confirmar consentimento, elegibilidade e ausência de outro atendimento antes de qualquer envio. Push exige destino interno real e permissão. Não há contatos de clientes nos arquivos.

Calendário contém instruções visuais e textos completos; imagens/vídeos não foram produzidos nem publicados. Nenhuma campanha foi iniciada. Faltam dados atuais de público, autorização de envio, verificação visual do tutorial na versão publicada e instrumentação para medir primeira criação. Não houve teste em dispositivo ou produção.

Fontes: ../DP-002-campanha-ativacao.md, ../DP-003-conteudos.md e ../DP-004-mensagens.md. O conteúdo foi extraído fielmente, sem substituir o planejamento existente.
