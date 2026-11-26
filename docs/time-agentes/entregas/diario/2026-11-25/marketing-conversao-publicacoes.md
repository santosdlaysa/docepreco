# Análise das publicações — 25/11/2026

## Evidência e alcance

Laysa informou que publicou no feed “A embalagem também entra na conta” e no TikTok um vídeo “Sua receita rende quantas unidades de verdade?”. Esta análise usa os temas informados, sem inspeção das versões publicadas, legendas, perfil, comentários ou métricas. Não certifica a qualidade visual, o CTA existente nem o desempenho. Nenhum acesso às redes, publicação ou mensagem foi realizado.

## Diagnóstico editorial

| Publicação | Problema que torna visível | Ponte para o DocePreço | Hipótese a verificar |
| --- | --- | --- | --- |
| Feed: embalagem | Custos adicionais esquecidos na precificação | Revisar embalagem e demais custos em uma receita própria | Conteúdo pode gerar salvamentos e interesse em revisar preços; depende de demonstração e CTA |
| TikTok: rendimento | Dividir o custo por uma quantidade diferente do rendimento real distorce o custo unitário | Informar rendimento e conferir custo por unidade no app | Pergunta pode provocar identificação e comentários; retenção e conversão ainda desconhecidas |

Os temas se complementam: levantar o custo completo e distribuir pelo rendimento. Isso permite uma sequência educativa coerente. A frase “o lote custa R$ 40 e rende 20 unidades, custo médio R$ 2” está aritmeticamente correta, mas R$ 2 só inclui os custos que compõem esses R$ 40. Não equivale ao preço de venda ou a lucro líquido.

## Ação para hoje: conectar o conteúdo ao primeiro cálculo

Não é necessário produzir outro post de feed hoje. Preparar três stories de apoio com captura demonstrativa atual sem dados pessoais:

1. Enquete: “Você inclui a embalagem no custo de cada doce?” Opções: “Sim” e “Preciso revisar”.
2. Demonstração: “Custo do lote ÷ unidades produzidas = custo médio por unidade. Antes, confira ingredientes, embalagem e demais custos aplicáveis.” Mostrar onde revisar esses dados no app; verificar a navegação na versão publicada antes de gravar.
3. Convite: “Abra o DocePreço e revise uma receita que você já vende: confira embalagem, rendimento e custo por unidade.” Para novos usuários, usar link de acesso ao app; só afirmar que abre diretamente uma receita se o destino tiver sido testado.

Comentário sugerido para o TikTok: “Quantas unidades sua receita rende de verdade? No DocePreço, confira o rendimento e o custo por unidade de uma receita sua. O acesso ao app está no perfil.” Usar a última frase apenas se o perfil realmente tiver o acesso disponível. Não afirmar que cada comentário receberá atendimento sem capacidade para cumprir.

Na resposta a quem pedir ajuda: “Me conta o que você vende e onde travou: quantidade dos ingredientes, embalagem ou rendimento? Vamos conferir uma etapa por vez.” Não pedir senha, token ou dados pessoais em comentário público.

## Ponte para assinatura

Primeira meta: a pessoa conseguir revisar uma receita própria e entender o resultado. Em seguida, apresentar o plano relacionado à necessidade demonstrada, com preço e elegibilidade atuais. Não oferecer teste grátis universal ou desconto sem confirmação.

A oferta pode explicar: “Quer continuar organizando as receitas do seu negócio? Confira os recursos e limites de cada plano.” Recursos e limites precisam corresponder à configuração vigente. Não usar promessa de aumento garantido de lucro.

## O que o produto precisa validar

Inspeção de código realizada na conversa, sem teste nativo da versão publicada:

- BeginnerGuideScreen chama showInterstitial ao abrir: verificar frequência e elegibilidade; testar primeiro uso sem interrupção publicitária.
- Etapas de receita e margem usam recipesCount >= 1: a conclusão do guia não comprova que o resultado foi visto ou entendido. Diferenciar essa etapa.
- Já existem onboarding, demonstração, guia e paywall. Aperfeiçoar o fluxo existente, sem duplicar telas.
- Instrumentar os eventos faltantes após inventário técnico: origem da campanha quando disponível, cadastro concluído, receita criada, resultado visto, oferta vista, checkout iniciado e assinatura confirmada. A busca anterior não encontrou instrumentação explícita no mobile, mas não prova ausência em todo o sistema.

## Medição: preencher após 24 e 72 horas

Janelas relativas ao horário de cada publicação; horários exatos não foram informados.

| Camada | Feed | TikTok | Limitação |
| --- | --- | --- | --- |
| Distribuição | Alcance e impressões, se disponíveis | Visualizações e alcance, se disponíveis | Métricas das plataformas podem ter definições diferentes |
| Interesse | Salvamentos, compartilhamentos, visitas ao perfil | Retenção/conclusão, compartilhamentos e visitas ao perfil | Não equivalem a cadastro |
| Acesso | Cliques no link identificado para o canal | Cliques no link identificado para o canal | Conferir se a conta/plataforma disponibiliza a métrica |
| Ativação | Cadastros atribuíveis que criaram receita e viram resultado | Mesma definição | Sem origem persistida, não atribuir por coincidência de data |
| Receita | Primeira assinatura confirmada da coorte em até sete dias | Mesma definição | Separar assinatura nova, renovação e teste gratuito |

Todos os resultados dessas publicações permanecem não medidos. Não reutilizar os 25 acessos ativos ou o total financeiro do retrato da manhã como efeito desses posts. Não dividir assinantes ativos atuais pelo total histórico de cadastros como taxa de conversão da campanha.

Para comparação, usar definições explícitas: ativação = novos cadastrados da coorte que criaram receita e viram resultado / novos cadastrados da mesma coorte; conversão em sete dias = novos cadastrados que fizeram a primeira assinatura confirmada nesse prazo / novos cadastrados da coorte com sete dias completos. Se resultado visto não for registrado, usar receita criada como aproximação, identificada como tal. Renovação exige acompanhamento posterior.

## Decisões conforme o resultado

- Pouco alcance: revisar abertura, capa e distribuição; ainda não concluir que a oferta falhou.
- Alcance sem visitas/cliques: conferir demonstração, promessa e convite para o próximo passo.
- Cliques sem cadastro: conferir destino do link, loja, clareza da proposta e fluxo de cadastro.
- Cadastros sem receita: investigar preenchimento, unidades, limites, erros e interrupções.
- Receita sem assinatura: investigar valor percebido, retorno ao app, necessidade dos recursos pagos e checkout.

## Verificações

PASS: duas publicações registradas, oito etapas de investigação descritas entre conteúdo e compra, divisão 40/20 = 2 validada, sem números de desempenho inventados. Textos de apoio preparados; não enviados. Não houve mudança de código nesta análise.

## Consulta pública aos perfis

Instagram https://www.instagram.com/doceprecoapp/ consultado no navegador: nome DocePreço | Precificação de Doces; 140 seguidores e 97 seguindo no momento observado. Bio visível: “Precifique seus doces sem erro”, “Descubra seu lucro real”, “Tudo direto no celular”, “Baixe o app agora IOS e Android”. Link exibido: docepreco.site/download, via redirecionador Instagram; destino final ainda não testado. Grade pública mostrou publicação de 25/11/2026 e outras de 18/11 e 19/10; isso não prova ausência de stories ou publicações ocultas/fixadas. Abrir o post exigiu login: legenda e arte completa não foram verificadas.

TikTok https://www.tiktok.com/@doceprecoapp não carregou no navegador; consulta pública alternativa também bloqueada. Bio, vídeo e métricas do TikTok não inspecionados.

Recomendação editorial baseada no observado: trocar promessa absoluta de “sem erro” e “lucro real” por descrição verificável de custos e preço de venda; tornar o primeiro cálculo a ação central. Sugestão de bio: “🍰 Precificação para confeiteiras
📊 Ingredientes, embalagem e rendimento
📱 Calcule sua primeira receita ↓”. Conferir destino do link e alinhamento do domínio antes de alterar. Nenhum perfil foi editado.

## Continuação: caminho da bio até as lojas

Verificação no navegador: http://docepreco.site/download chegou a https://docepreco.site/download. Página contém título DocePreço, dois botões de download, “Gratuito para começar. Sem cartão de crédito.” e bloco “Compartilhe na sua bio do Instagram / Coloque o link desta página na sua bio”. Links das duas lojas foram abertos e exibiram o aplicativo correto; instalação e primeiro uso não testados.

Apple: link aponta para storefront /us/, com interface em inglês, preço em dólar e metadata de idioma English; descrição principal em português. Não inferir que a cobrança ou interface nativa no Brasil esteja em inglês/dólar. Avaliar URL brasileira por navegação/região e corrigir metadata de idiomas somente conforme traduções reais. Categoria exibida Education; avaliar adequação ao uso de gestão/precificação antes de alterar. Descrição contém garantia “nunca venda no prejuízo”, que excede o que o cálculo pode garantir.

Google Play: app correto, 500+ downloads exibidos, atualizado em 30/10/2026. Essa contagem é faixa pública e não total exato ou métrica da campanha.

Prioridades da página: trocar “comece a lucrar” por “calcule o custo e o preço dos seus doces”; substituir o bloco voltado a quem compartilha links por “Como começar: cadastre os ingredientes, monte uma receita e confira custo/rendimento”; incluir demonstração atual e distinção entre gratuito e recursos pagos. Não há evidência de erro nos links de download verificados.

Plano do perfil: preparar três posts fixados (o que o app resolve, primeira receita em tela real, diferença entre gratuito e planos) e destaques Comece aqui, Como usar, Planos e Dúvidas. São propostas; não foram criados ou publicados. Não foi possível verificar os destaques pela sessão pública, portanto não afirmar que faltam.

Testes: página de download e ambos os destinos das lojas renderizaram o app correto. Sem instalação, checkout, edição de perfis ou deploy. TikTok continua sem inspeção por bloqueio de acesso.
