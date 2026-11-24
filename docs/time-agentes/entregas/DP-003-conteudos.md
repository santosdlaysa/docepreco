# DP-003 — Conteúdos e tutorial
Data: 24/11/2026. Materiais redigidos; publicação não realizada. Dias abaixo são posições no calendário, sem agendamento.

## Peça 1 — Dia 1: custo dos ingredientes (carrossel)
Objetivo: ensinar custo proporcional. Cards: 1. Quanto do pacote entra na sua receita? 2. Um pacote de 1 kg por R$ 20 custa R$ 0,02 por grama. 3. Se usar 250 g, o custo dessa porção é R$ 5. 4. Faça isso com cada ingrediente. 5. Comece registrando uma receita que você já produz.
Legenda: O valor do pacote e o custo usado na receita são diferentes. Anote preço, quantidade comprada e quantidade utilizada para calcular sua porção.
Visual: pacote ilustrativo, balança e exemplo escrito; não simular captura do app.
Ação: salve para conferir sua próxima receita.

## Peça 2 — Dia 2: rendimento (Reel)
Objetivo: mostrar divisão do custo. Cena 1, bandeja: “Sua receita rende quantas unidades de verdade?” Cena 2, vinte brownies: “Se o lote custa R$ 40 e rende 20 unidades, o custo médio é R$ 2 por unidade.” Cena 3, caderno: “Anote o rendimento real e acrescente os demais custos antes de definir o preço.”
Legenda: Porções e perdas mudam o custo por unidade. Meça o rendimento do seu preparo.
Visual: gravação de preparo ou ilustração, sem alegação de lucro.
Ação: confira o rendimento de uma receita sua.

## Peça 3 — Dia 3: custos adicionais (post)
Objetivo: lembrar custos fora dos ingredientes. Texto da arte: “A embalagem também entra na conta.” Legenda: Além dos ingredientes, considere embalagem, tempo de trabalho e outros custos aplicáveis. Diferencie o custo do lote do custo de cada unidade para evitar contar duas vezes. Escolha uma receita e faça essa conferência hoje.
Visual: embalagem, etiqueta e lista de custos.
Ação: revisar custos adicionais.

## Peça 4 — Dia 4: margem (Reel)
Objetivo: evitar confusão entre acréscimo e margem sobre venda. Cena 1: “Acrescentar 50% ao custo não significa margem de 50% sobre o preço.” Cena 2: “Custo de R$ 10 com acréscimo de 50% vira R$ 15.” Cena 3: “A diferença é R$ 5: um terço do preço. Confira a base do percentual antes de comparar.”
Legenda: O significado do percentual muda o cálculo. E o resultado só considera os custos informados.
Visual: conta escrita, sem apresentar como lucro líquido garantido.
Ação: conferir o cálculo que usa hoje.

## Peça 5 — Dia 5: atualização de valores (stories, três telas)
Objetivo: incentivar revisão. Tela 1: “Seu chocolate ficou mais caro?” Tela 2: “Confira preço e quantidade da compra antes de atualizar o cadastro.” Tela 3: “Depois revise custo e preço das receitas que usam esse ingrediente.” Legenda/apoio: O exemplo depende dos seus custos reais; não existe aumento igual para todas as receitas.
Visual: compra antiga e nova sem marcas de terceiros.
Ação: revisar um ingrediente.

## Peça 6 — Dia 6: organização de vendas (post)
Objetivo: criar hábito. Texto da arte: “Vendeu? Registre enquanto lembra.” Legenda: Separe alguns minutos para registrar produto, quantidade, valor e pagamento. No fim do dia, confira o que entrou e o que ainda precisa acompanhar. Venda registrada e dinheiro recebido podem ter datas diferentes.
Visual: lista de conferência.
Ação: conferir os registros do dia.

## Peça 7 — Dia 7: rotina do app (stories, três telas)
Objetivo: reduzir a sensação de tarefa grande. Tela 1: “Comece por uma receita.” Tela 2: “Separe ingredientes, quantidades e rendimento.” Tela 3: “Cadastre, confira os resultados e ajuste com seus dados reais.” Legenda/apoio: Você não precisa organizar todo o catálogo de uma vez. Se travar em uma etapa, conte qual é sua dúvida.
Visual: sequência ilustrada; inserir capturas reais somente após conferir a versão publicada.
Ação: iniciar primeira receita ou pedir ajuda.

## Tutorial textual — Primeira receita
1. Separe uma receita real, o preço e a quantidade de cada embalagem comprada e o rendimento do preparo.
2. Cadastre os ingredientes com unidade e quantidade compatíveis com a compra. Não confunda 1 kg com 1 g.
3. Na área de receitas, inicie o cadastro de uma receita. O código local de RecipesScreen.tsx encaminha a CreateRecipe; o rótulo visual da versão publicada precisa ser conferido antes de produzir capturas.
4. Informe nome e ingredientes com as quantidades utilizadas. Confira se está cadastrando um produto ou uma base, conforme sua finalidade.
5. Informe o rendimento real. Para começar, prefira uma quantidade medida no preparo, evitando estimativa sem referência.
6. Inclua custos adicionais aplicáveis, verificando se são do lote ou da unidade. Confira o percentual usado para formar o preço.
7. Revise e conclua o cadastro. Abra os detalhes e confira custo total, rendimento e preço sugerido antes de usar o valor comercialmente.
8. Se um resultado parecer estranho, confira unidades, quantidades e rendimento. Se persistir, peça ajuda informando a etapa, sem enviar sua senha.

## Verificação e fontes
Fontes: README.md; mobile/src/presentation/screens/RecipesScreen.tsx, CreateRecipeScreen.tsx e CreateIngredientScreen.tsx; DP-002. Sete peças, um carrossel e dois Reels conferidos. Contas verificadas: 20/1000 × 250 = 5; 40/20 = 2; 10 × 1,5 = 15 e 5/15 = 33,33%. Interface publicada e execução visual do tutorial não foram testadas; passos evitam rótulos não confirmados. Disponibilidade por plano exige confirmação atual antes da publicação.
