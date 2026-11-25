const fs=require('node:fs'); const assert=require('node:assert/strict');
const themePath='mobile/src/presentation/theme/colors.ts';
const theme=fs.readFileSync(themePath,'utf8');
const colors=Object.fromEntries([...theme.matchAll(/(\w+):\s*'(#[A-Fa-f0-9]{6})'/g)].map(x=>[x[1],x[2]]));
function luminance(hex){const rgb=hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]}
function contrast(a,b){let x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
assert.equal(contrast('#000000','#FFFFFF'),21);assert.equal(contrast('#FFFFFF','#FFFFFF'),1);
const pairs=[
 ['Button primary; texto branco e fundo primary', '#FFFFFF',colors.primary,'13/16/18, peso 600'],
 ['Navbar; texto inativo sobre primary','#FFFFFF',colors.primary,'11, peso 600'],
 ['Navbar; texto ativo primaryDark em surface',colors.primaryDark,colors.surface,'11, peso 600'],
 ['Receitas; nome em card branco',colors.text,colors.surface,'16, peso 600'],
 ['Receitas; subtítulo em card branco',colors.textSecondary,colors.surface,'12, peso 400'],
 ['Receitas; rótulo CUSTO/UN em card branco',colors.textMuted,colors.surface,'9, peso 700'],
 ['Receitas; badge percentual','#2E7D32',colors.greenBgSoft,'12, peso 700'],
 ['Receitas; preço rosa em card branco',colors.primary,colors.surface,'13, peso 700'],
 ['Detalhe; valor branco sobre âncora 1 do gradiente','#FFFFFF','#34C97B','42, peso 800'],
 ['Detalhe; valor branco sobre âncora 2 do gradiente','#FFFFFF',colors.green,'42, peso 800'],
 ['Detalhe; valor branco sobre âncora 3 do gradiente','#FFFFFF','#2BA060','42, peso 800'],
];
const rows=pairs.map(([label,a,b,size])=>{assert.ok(a&&b);let r=contrast(a,b);return `| ${label} | ${a} / ${b} | ${size} | ${r.toFixed(2)}:1 | ${r>=4.5?'Atinge 4,5':r>=3?'Abaixo de 4,5; atinge 3':'Abaixo de 3 e de 4,5'} |`});
const refs=[themePath,'mobile/src/presentation/components/Button.tsx','mobile/src/presentation/navigation/AppNavigator.tsx','mobile/src/presentation/screens/RecipesScreen.tsx','mobile/src/presentation/screens/RecipeDetailScreen.tsx','mobile/src/presentation/theme/fonts.ts','mobile/src/presentation/theme/typography.ts'];refs.forEach(p=>assert.ok(fs.existsSync(p),p));
const report='docs/time-agentes/entregas/diario/2026-11-25/marketing-design.md';
assert.ok(!fs.readFileSync(report,'utf8').includes('## Complemento — contraste calculado'));
const appendix=`

## Complemento — contraste calculado a partir do código local

Retomada da pendência P2 em 25/11/2026. Não foram reabertas as 24 imagens nem modificadas cores do produto. A afirmação anterior de ausência de aferição refere-se à inspeção inicial; este complemento acrescenta cálculo dos pares definidos no código, não medição de tela física.

### Tokens e contexto confirmados

A cor primary é ${colors.primary}, primaryDark ${colors.primaryDark}, text ${colors.text}, textSecondary ${colors.textSecondary} e textMuted ${colors.textMuted}; surface é ${colors.surface}. Valores lidos de colors.ts, sem estimar HEX pelos JPEGs. fonts.ts define DM Sans para UI e Playfair Display para títulos explícitos; typography.ts define tamanhos e pesos. Isso esclarece a configuração local, sem provar a fonte renderizada na versão fotografada.

Button.tsx usa branco sobre primary, com tamanhos 13/16/18 e peso 600; outline transparente depende da superfície e não foi classificado como par opaco certo. AppNavigator.tsx usa surface no texto inativo sobre primary e primaryDark no ativo sobre surface (11, peso 600). RecipesScreen.tsx define pares de nome/subtítulo/preço no card e badge verde. RecipeDetailScreen.tsx define as três âncoras verdes do resultado e valor branco a 42/peso 800.

### Razões calculadas

| Contexto real no código | Primeiro plano / fundo | fontSize / peso local | Contraste | Comparação numérica |
| --- | --- | --- | --- | --- |
${rows.join('\n')}

O critério de referência W3C SC 1.4.3 usa 4,5:1 para texto normal e 3:1 para texto grande; grande é 18pt regular ou 14pt em negrito. Fonte: [Understanding Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), consultada nesta retomada. Os rótulos 9–16 merecem a comparação conservadora com 4,5:1. O valor a 42/800 foi comparado também a 3:1; fontSize React Native não foi convertido automaticamente em ponto CSS e não se declara conformidade global.

As linhas do gradiente são cálculos em cada âncora, não amostragem exaustiva de toda a área do texto. Nem o texto rgba branco a 0,92 nem as subcaixas brancas translúcidas foram tratados como branco opaco: precisam composição alfa e localização real para medição completa. Estados disabled/pressed, opacidade de ancestral, escala de fonte e antialiasing não foram validados. Inatividade é exceção normativa em alguns controles, mas não justifica automaticamente o contraste do estado normal.

### Três ajustes concretos propostos — não aplicados

1. **Ações e navbar inativa:** avaliar primaryDark no fundo das áreas com texto branco ou token específico de ação que alcance 4,5:1, preservando primary para acento decorativo. Medir estados normal/pressionado antes de trocar. Navbar ativa já usa par distinto e deve ser preservada se mantiver a razão encontrada.
2. **Informação pequena de receita:** substituir textMuted nos rótulos de custo e revisar textSecondary em legendas por cor mais escura validada; manter fonte legível. Aumentar tamanho sozinho não torna automaticamente texto de 9px/pt equivalente a texto grande.
3. **Resultado verde:** testar superfície mais escura ou texto escuro no cartão e subcaixas, incluindo a composição dos alfas e todos os pontos do gradiente. Só aprovar com 4,5:1 para legendas pequenas e 3:1 para valores efetivamente grandes. Não alterar globalmente success/green sem verificar outros usos.

### Testes executados neste complemento

Fórmula sRGB: converter cada canal para 0–1; linearizar por c/12,92 até 0,04045, ou ((c+0,055)/1,055)^2,4; luminância = 0,2126R + 0,7152G + 0,0722B; razão = (Lmaisclaro+0,05)/(Lmaisescuro+0,05). Controles de referência: preto/branco = 21:1; branco/branco = 1:1. Ambos passaram. Onze pares calculados, sete caminhos de fonte existentes e três propostas conferidos. Não houve teste de dispositivo, alteração de paleta ou publicação.

Fontes locais adicionais:
${refs.map(p=>'- '+p).join('\n')}
`;
fs.appendFileSync(report,appendix,'utf8');
console.log('PASS contraste: 21:1 e 1:1; 11 pares; 7 caminhos; 3 ajustes.');console.log(rows.join('\n'));
