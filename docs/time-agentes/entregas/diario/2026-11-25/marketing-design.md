# Marketing — análise do design atual

25/11/2026. Análise visual de arquivos locais, sem alterações no produto, publicação ou acesso a produção. Pasta efetivamente encontrada: `marketing/telanovaapp` (singular). Nove prints novos foram abertos individualmente; oito capturas web e sete artes também foram vistos para comparação.

## Inventário observado

Os códigos T1–T9 são referências deste relatório, não nomes novos de arquivos.

| ID | Arquivo em marketing/telanovaapp | Tela/conteúdo visto |
| --- | --- | --- |
| T1 | WhatsApp Image 2026-11-25 at 08.26.59 (1).jpeg | Minhas Receitas: abas Produtos/Bases, busca, categorias, custo por unidade, preço, percentual de acréscimo, botão + Ingrediente e + |
| T2 | WhatsApp Image 2026-11-25 at 08.26.59 (2).jpeg | Detalhe da receita: ingredientes, rendimento, custos adicionais, acréscimo sobre custo |
| T3 | WhatsApp Image 2026-11-25 at 08.26.59 (3).jpeg | Continuação: custo total, acréscimo, preço sugerido, custo/unidade e margem sobre venda; entrada de seção de preço para iFood, conteúdo completo não visível |
| T4 | WhatsApp Image 2026-11-25 at 08.26.59.jpeg | Início: logo ilustrado pequeno, saudação personalizada, banner de planos, resumo de vendas, aviso de ajuda, atalhos e chat flutuante |
| T5 | WhatsApp Image 2026-11-25 at 08.36.52 (1).jpeg | Vendas: resumo, filtros Todas/Este mês/Esta semana, agrupamentos por data, quantidade e pagamento |
| T6 | WhatsApp Image 2026-11-25 at 08.36.52 (2).jpeg | Editar ingrediente: salvar no topo, orientação de compra/unidades, acesso a tutorial |
| T7 | WhatsApp Image 2026-11-25 at 08.36.52 (3).jpeg | Continuação da edição: unidade selecionada, custo por unidade e Atualizar ingrediente |
| T8 | WhatsApp Image 2026-11-25 at 08.36.52.jpeg | Ingredientes: lista, Novo, edição/histórico/exclusão e CTA Montar receita e calcular preço |
| T9 | WhatsApp Image 2026-11-25 at 08.36.53.jpeg | Registrar venda: Receita/Produto avulso, quantidade, preço unitário, desconto, data, pagamento e campos opcionais |

Não foram copiados nomes da conta, valores de faturamento nem dados de contato para este inventário. O nome de produto em uma tela não prova exemplo autorizado para propaganda.

## Diagnóstico visual

**Cores e marca:** rosa vivo/fúcsia domina ações, navegação e preço; texto principal marrom muito escuro; fundos majoritariamente brancos, rosa pálido e creme em resumos. Verde destaca resultado/estado e azul informa orientação; amarelo sinaliza ajuda/alerta. T4 contém banner roxo/rosa que se diferencia do restante. Descrição perceptiva: não é extração de tokens/HEX.

**Tipografia:** aparência sem serifa, títulos pesados, valores grandes e descrições menores em marrom acinzentado. Família exata, peso numérico e escala em pixels não podem ser certificados por JPEG. As sete artes usam predominantemente títulos serifados: isso funciona como linguagem editorial, mas não reproduz a tipografia da interface.

**Componentes:** cantos amplamente arredondados, sombras suaves, bordas claras, ícones lineares e blocos grandes de resultado. Boa separação entre ingredientes/custos e preço sugerido em T2/T3. O termo “Acréscimo sobre o custo” está explícito, e a margem sobre a venda aparece separada: ponto positivo para comunicação educativa.

**Navegação observável:** barra rosa com Início, Receitas, Adicionar, Ingredientes e Vendas; item ativo em cápsula branca. Em T1 há + e + Ingrediente; em T5 há + flutuante; em T6/T7 coexistem salvar no topo e atualizar no rodapé. Prints mostram controles, mas não comprovam o destino de Adicionar, acessibilidade ou sucesso de gravação. No Início, o chat se aproxima de atalho e pode competir visualmente com ele; sobreposição precisa ser reproduzida em aparelho antes de concluir defeito.

**Recursos que podem ser apresentados:** organização de receitas e bases, custo/preço por unidade, discriminação de custos adicionais, edição de ingredientes/unidades, lista e registro de vendas. Não afirmar pagamento processado, integração iFood completa, plano disponível a qualquer pessoa ou cálculo líquido garantido a partir dessas imagens. O banner de teste grátis é evidência visual de uma oferta mostrada naquela conta, não valida elegibilidade geral ou vigência.

## Comparação com a galeria web

| Captura existente | Situação frente aos prints de hoje |
| --- | --- |
| web/public/mobile-screen-1.jpg | Relatórios com mês histórico visível. Não há tela nova equivalente; não certificar layout atual. Substituir por captura atual de demonstração quando houver. |
| web/public/mobile-screen-2.jpg | Início antigo confirmado por comparação com T4: navegação branca e ação central contextual; hierarquia de resumo e banner diferentes. |
| web/public/mobile-screen-3.jpg | Receitas antigas em relação a T1: sem Produtos/Bases visível e barra inferior branca contextual. Atualizar para material que ensine navegação atual. |
| web/public/mobile-screen-4.jpg | Ingredientes antigos em relação a T8: bloco de orientação e navegação diferentes; CTA atual para montar receita não aparece. |
| web/public/mobile-screen-5.jpg | Vendas antigas em relação a T5: cartões e barra de navegação diferentes. Não reutilizar em tutorial da versão atual sem aviso. |
| web/public/mobile-screen-cardapio.jpg | Sem comparável novo. Há contato pessoal visível e contexto da loja; não redistribuir como imagem neutra. |
| web/public/mobile-screen-loja.jpg | Sem comparável novo; identifica loja/URL própria. Não concluir que ficou desatualizada apenas pela idade; preferir conta demonstrativa. |
| web/public/mobile-screen-perfil.jpg | Sem comparável novo, mas exibe dados de contato e nomenclatura de plano antiga em relação ao banner de T4. Revisar antes de divulgação, sem replicar dados. |

Diferenças de sistema operacional e compressão também influenciam a aparência. As conclusões de desatualização foram restritas aos componentes comprovadamente diferentes nas telas equivalentes; não se inferiu ausência de funcionalidades.

## Comparação das sete artes

Arquivos em `web/public/agent-materials/`, todos abertos nesta análise:

| Arte | Compatibilidade com prints |
| --- | --- |
| C1-custo-ingredientes.png | Tema combina com quantidade comprada/valor pago em T6/T7. É ilustração educativa, não uma tela real. |
| C2-rendimento.png | Tema combina com rendimento em T2. Valores são exemplo, não resultado da conta fotografada. |
| C3-custos-adicionais.png | Tema diretamente sustentado pela lista de custos de T2/T3. Pontuação duplicada em alguns textos pede polimento editorial. |
| C4-margem.png | Distinção entre acréscimo e margem é sustentada por T3. O percentual da arte é arredondado; manter “aproximadamente” na legenda. Há pontuação duplicada. |
| C5-atualizacao-valores.png | Atualização de ingrediente e informação sobre histórico aparecem em T6. Não prometer recálculo universal de receitas sem confirmar comportamento. |
| C6-organizacao-vendas.png | Registro de quantidade, preço e pagamento é sustentado por T9. “Falta receber” não é um fluxo demonstrado por T9: evitar promover gestão de recebíveis com essa tela como prova. |
| C7-rotina-app.png | Sequência ingredientes → receita é sustentada pelo CTA em T8. Não usar como guia visual literal de botões. |

A paleta das artes (creme/rosa/chocolate) dialoga com o app, mas o fundo do app atual é mais branco, o rosa de ação é mais vivo e o logo ilustrado real de T4 não é o nome tipográfico das artes. Não afirmar que as artes são screenshots ou reproduções do logo. Nenhuma arte nova foi gerada hoje.

## Cinco melhorias priorizadas

1. **P1 — Preparar galeria atual sem dados pessoais.** Trocar primeiro Início/Receitas/Ingredientes/Vendas antigos e revisar perfil/cardápio quanto a contatos. Usar conta demonstrativa e autorização para eventual reutilização de fotos. Aceite: screenshots atuais, mesma navegação e ausência de contato pessoal. Referências: T1/T4/T5/T8 e tabela da galeria.
2. **P1 — Revisar precisão de custo e exemplo de unidade.** T6/T7 exibem compra e custo unitário com aparente perda de precisão; o exemplo de ingrediente sólido está em unidade de volume. Isso pode confundir sem demonstrar erro no cálculo interno. Aceite: verificar formatação com valores fracionários, preservar precisão no cálculo e capturar exemplo com unidade compatível. Referências: T6/T7/T8. Não corrigido neste estudo.
3. **P2 — Unificar identidade dos materiais e interface.** Usar logo autorizado e hierarquia coerente, rosa de ação validado no design e fonte editorial assumida como tal; corrigir pontuação de C3/C4. Aceite: kit consistente sem chamar texto estilizado de logotipo oficial. Referências: T4 e sete artes.
4. **P2 — Explicitar ação primária por tela.** Testar compreensão de Adicionar versus + contextual, salvar superior versus atualizar inferior e posição do chat. Aceite: participante encontra a ação sem dúvida e nenhum CTA fica coberto na tela usada. Referências: T1/T4/T5/T6/T7. Hipótese de UX, não bug confirmado.
5. **P2 — Revisar contraste e microtexto de números.** Medir contraste dos valores brancos sobre rosa/verde e textos claros; revisar frase de unidade singular, decimal da margem e rótulos para impedir leitura de lucro líquido garantido. Aceite: teste de contraste em tokens reais e texto consistente com cálculo. Referências: T3/T5/T7. Não se atribui conformidade WCAG a inspeção visual.

## Verificação e limites

Inventário: nove imagens novas, oito capturas web e sete artes. Caminhos foram conferidos por existência local. Cálculo educativo da relação 50% de acréscimo e um terço de margem foi revisado. Nenhuma interação do app, cálculo em execução, teste em dispositivo, aferição de contraste ou implantação foi realizado. A análise identifica evidências visuais e hipóteses a verificar, não determina versão de produção ou resultado comercial. Conteúdo pronto derivado apenas dos prints: conteudo-copy.md nesta pasta.

Resultado automatizado: PASS — 9 referências de prints novos, 8 capturas web, 7 artes existentes; 5 melhorias; relação entre acréscimo e margem verificada. As 24 imagens foram abertas visualmente, sem recopiá-las para web/public. Fonte de execução: PowerShell local; nenhum acesso ao banco.


## Complemento — contraste calculado a partir do código local

Retomada da pendência P2 em 25/11/2026. Não foram reabertas as 24 imagens nem modificadas cores do produto. A afirmação anterior de ausência de aferição refere-se à inspeção inicial; este complemento acrescenta cálculo dos pares definidos no código, não medição de tela física.

### Tokens e contexto confirmados

A cor primary é #E91E8C, primaryDark #C2185B, text #2D1B14, textSecondary #8B7355 e textMuted #B5A090; surface é #FFFFFF. Valores lidos de colors.ts, sem estimar HEX pelos JPEGs. fonts.ts define DM Sans para UI e Playfair Display para títulos explícitos; typography.ts define tamanhos e pesos. Isso esclarece a configuração local, sem provar a fonte renderizada na versão fotografada.

Button.tsx usa branco sobre primary, com tamanhos 13/16/18 e peso 600; outline transparente depende da superfície e não foi classificado como par opaco certo. AppNavigator.tsx usa surface no texto inativo sobre primary e primaryDark no ativo sobre surface (11, peso 600). RecipesScreen.tsx define pares de nome/subtítulo/preço no card e badge verde. RecipeDetailScreen.tsx define as três âncoras verdes do resultado e valor branco a 42/peso 800.

### Razões calculadas

| Contexto real no código | Primeiro plano / fundo | fontSize / peso local | Contraste | Comparação numérica |
| --- | --- | --- | --- | --- |
| Button primary; texto branco e fundo primary | #FFFFFF / #E91E8C | 13/16/18, peso 600 | 4.18:1 | Abaixo de 4,5; atinge 3 |
| Navbar; texto inativo sobre primary | #FFFFFF / #E91E8C | 11, peso 600 | 4.18:1 | Abaixo de 4,5; atinge 3 |
| Navbar; texto ativo primaryDark em surface | #C2185B / #FFFFFF | 11, peso 600 | 5.87:1 | Atinge 4,5 |
| Receitas; nome em card branco | #2D1B14 / #FFFFFF | 16, peso 600 | 16.43:1 | Atinge 4,5 |
| Receitas; subtítulo em card branco | #8B7355 / #FFFFFF | 12, peso 400 | 4.49:1 | Abaixo de 4,5; atinge 3 |
| Receitas; rótulo CUSTO/UN em card branco | #B5A090 / #FFFFFF | 9, peso 700 | 2.50:1 | Abaixo de 3 e de 4,5 |
| Receitas; badge percentual | #2E7D32 / #E8F5E9 | 12, peso 700 | 4.56:1 | Atinge 4,5 |
| Receitas; preço rosa em card branco | #E91E8C / #FFFFFF | 13, peso 700 | 4.18:1 | Abaixo de 4,5; atinge 3 |
| Detalhe; valor branco sobre âncora 1 do gradiente | #FFFFFF / #34C97B | 42, peso 800 | 2.15:1 | Abaixo de 3 e de 4,5 |
| Detalhe; valor branco sobre âncora 2 do gradiente | #FFFFFF / #43BE6E | 42, peso 800 | 2.38:1 | Abaixo de 3 e de 4,5 |
| Detalhe; valor branco sobre âncora 3 do gradiente | #FFFFFF / #2BA060 | 42, peso 800 | 3.33:1 | Abaixo de 4,5; atinge 3 |

O critério de referência W3C SC 1.4.3 usa 4,5:1 para texto normal e 3:1 para texto grande; grande é 18pt regular ou 14pt em negrito. Fonte: [Understanding Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), consultada nesta retomada. Os rótulos 9–16 merecem a comparação conservadora com 4,5:1. O valor a 42/800 foi comparado também a 3:1; fontSize React Native não foi convertido automaticamente em ponto CSS e não se declara conformidade global.

As linhas do gradiente são cálculos em cada âncora, não amostragem exaustiva de toda a área do texto. Nem o texto rgba branco a 0,92 nem as subcaixas brancas translúcidas foram tratados como branco opaco: precisam composição alfa e localização real para medição completa. Estados disabled/pressed, opacidade de ancestral, escala de fonte e antialiasing não foram validados. Inatividade é exceção normativa em alguns controles, mas não justifica automaticamente o contraste do estado normal.

### Três ajustes concretos propostos — não aplicados

1. **Ações e navbar inativa:** avaliar primaryDark no fundo das áreas com texto branco ou token específico de ação que alcance 4,5:1, preservando primary para acento decorativo. Medir estados normal/pressionado antes de trocar. Navbar ativa já usa par distinto e deve ser preservada se mantiver a razão encontrada.
2. **Informação pequena de receita:** substituir textMuted nos rótulos de custo e revisar textSecondary em legendas por cor mais escura validada; manter fonte legível. Aumentar tamanho sozinho não torna automaticamente texto de 9px/pt equivalente a texto grande.
3. **Resultado verde:** testar superfície mais escura ou texto escuro no cartão e subcaixas, incluindo a composição dos alfas e todos os pontos do gradiente. Só aprovar com 4,5:1 para legendas pequenas e 3:1 para valores efetivamente grandes. Não alterar globalmente success/green sem verificar outros usos.

### Testes executados neste complemento

Fórmula sRGB: converter cada canal para 0–1; linearizar por c/12,92 até 0,04045, ou ((c+0,055)/1,055)^2,4; luminância = 0,2126R + 0,7152G + 0,0722B; razão = (Lmaisclaro+0,05)/(Lmaisescuro+0,05). Controles de referência: preto/branco = 21:1; branco/branco = 1:1. Ambos passaram. Onze pares calculados, sete caminhos de fonte existentes e três propostas conferidos. Não houve teste de dispositivo, alteração de paleta ou publicação.

Fontes locais adicionais:
- mobile/src/presentation/theme/colors.ts
- mobile/src/presentation/components/Button.tsx
- mobile/src/presentation/navigation/AppNavigator.tsx
- mobile/src/presentation/screens/RecipesScreen.tsx
- mobile/src/presentation/screens/RecipeDetailScreen.tsx
- mobile/src/presentation/theme/fonts.ts
- mobile/src/presentation/theme/typography.ts
