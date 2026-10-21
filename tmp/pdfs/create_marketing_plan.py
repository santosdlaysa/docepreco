from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, HRFlowable
)

OUT = r"C:\dev\sweet-pricing\output\pdf\plano-marketing-docepreco-90-dias.pdf"
NAVY = colors.HexColor('#2C1A25')
PINK = colors.HexColor('#E91E8C')
ROSE = colors.HexColor('#FFF0F6')
PURPLE = colors.HexColor('#6B3A66')
MUTED = colors.HexColor('#665A61')
LINE = colors.HexColor('#E8DCE3')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name='CoverKicker', parent=styles['Normal'], fontName='Helvetica-Bold',
    fontSize=10, leading=13, textColor=PINK, alignment=TA_CENTER,
    spaceAfter=14, uppercase=True,
))
styles.add(ParagraphStyle(
    name='CoverTitle', parent=styles['Title'], fontName='Helvetica-Bold',
    fontSize=29, leading=35, textColor=NAVY, alignment=TA_CENTER,
    spaceAfter=12,
))
styles.add(ParagraphStyle(
    name='CoverSub', parent=styles['Normal'], fontName='Helvetica',
    fontSize=13, leading=19, textColor=MUTED, alignment=TA_CENTER,
    spaceAfter=24,
))
styles.add(ParagraphStyle(
    name='H1Custom', parent=styles['Heading1'], fontName='Helvetica-Bold',
    fontSize=19, leading=24, textColor=NAVY, spaceBefore=4, spaceAfter=10,
))
styles.add(ParagraphStyle(
    name='H2Custom', parent=styles['Heading2'], fontName='Helvetica-Bold',
    fontSize=12.5, leading=16, textColor=PURPLE, spaceBefore=12, spaceAfter=6,
))
styles.add(ParagraphStyle(
    name='BodyCustom', parent=styles['BodyText'], fontName='Helvetica',
    fontSize=10.2, leading=15, textColor=NAVY, spaceAfter=7,
))
styles.add(ParagraphStyle(
    name='SmallCustom', parent=styles['BodyText'], fontName='Helvetica',
    fontSize=8.5, leading=11, textColor=MUTED,
))
styles.add(ParagraphStyle(
    name='TableHead', parent=styles['BodyText'], fontName='Helvetica-Bold',
    fontSize=8.6, leading=10.5, textColor=colors.white,
))
styles.add(ParagraphStyle(
    name='TableCell', parent=styles['BodyText'], fontName='Helvetica',
    fontSize=8.35, leading=10.6, textColor=NAVY,
))
styles.add(ParagraphStyle(
    name='Callout', parent=styles['BodyText'], fontName='Helvetica-Bold',
    fontSize=11, leading=16, textColor=NAVY, alignment=TA_CENTER,
))

def p(text, style='BodyCustom'):
    return Paragraph(text, styles[style])

def header_footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    if doc.page > 1:
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.5)
        canvas.line(1.7 * cm, h - 1.45 * cm, w - 1.7 * cm, h - 1.45 * cm)
        canvas.setFillColor(MUTED)
        canvas.setFont('Helvetica', 8)
        canvas.drawString(1.7 * cm, h - 1.1 * cm, 'DOCEPRECO  |  PLANO DE MARKETING')
        canvas.drawRightString(w - 1.7 * cm, 1.15 * cm, f'Pagina {doc.page}')
    canvas.restoreState()

doc = SimpleDocTemplate(
    OUT, pagesize=A4, rightMargin=1.7*cm, leftMargin=1.7*cm,
    topMargin=1.9*cm, bottomMargin=1.7*cm,
)

story = []
story += [Spacer(1, 3.1*cm), p('CRESCIMENTO DE MARCA', 'CoverKicker')]
story += [p('Plano de marketing<br/>DocePreço', 'CoverTitle')]
story += [p('Um plano de 90 dias para tornar o app mais conhecido entre confeiteiras, gerar instalações e transformar interesse em assinaturas.', 'CoverSub')]

callout = Table([[p('Posicionamento recomendado: <font color="#E91E8C">o app que transforma receitas em lucro e pedidos em organização.</font>', 'Callout')]], colWidths=[14.2*cm])
callout.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), ROSE), ('BOX', (0,0), (-1,-1), 0.7, colors.HexColor('#F6C9DF')),
    ('LEFTPADDING', (0,0), (-1,-1), 15), ('RIGHTPADDING', (0,0), (-1,-1), 15),
    ('TOPPADDING', (0,0), (-1,-1), 15), ('BOTTOMPADDING', (0,0), (-1,-1), 15),
]))
story += [callout, Spacer(1, 1.1*cm)]
story += [p('<b>Público inicial:</b> confeiteiras que vendem por encomenda, sobretudo via WhatsApp e Instagram, e precisam precificar melhor, controlar pedidos e profissionalizar as vendas.', 'BodyCustom')]
story += [Spacer(1, 2.3*cm), p('Outubro de 2026', 'SmallCustom')]
story.append(PageBreak())

story += [p('1. Estratégia de crescimento', 'H1Custom')]
story += [p('O marketing deve partir de uma dor concreta, e nao de uma lista de recursos. A promessa central e ajudar a confeiteira a parar de trabalhar sem saber se esta lucrando.', 'BodyCustom')]
story += [p('Mensagem principal', 'H2Custom')]
story += [p('<b>“Saiba quanto cobrar, organize suas encomendas e venda online em um so lugar.”</b>', 'BodyCustom')]
story += [p('Pilares de comunicacao', 'H2Custom')]

pillars = [
    [p('<b>Lucro real</b><br/>Receitas, custos, margem e preco sugerido.', 'TableCell'), p('<b>Organizacao</b><br/>Pedidos, clientes, caixa e metas.', 'TableCell'), p('<b>Venda digital</b><br/>Loja online e vitrine para receber pedidos.', 'TableCell')],
]
t = Table(pillars, colWidths=[4.7*cm, 4.7*cm, 4.7*cm])
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), ROSE), ('BOX', (0,0), (-1,-1), 0.6, colors.HexColor('#F6C9DF')),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F6C9DF')),
    ('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 11),
    ('RIGHTPADDING', (0,0), (-1,-1), 11), ('TOPPADDING', (0,0), (-1,-1), 12),
    ('BOTTOMPADDING', (0,0), (-1,-1), 12),
]))
story += [t, Spacer(1, 10)]

story += [p('Cronograma de 90 dias', 'H2Custom')]
rows = [[p('Periodo', 'TableHead'), p('Objetivo', 'TableHead'), p('Acoes prioritarias', 'TableHead')],
    [p('<b>Dias 1-15</b>', 'TableCell'), p('Conversao', 'TableCell'), p('Atualizar App Store e Google Play; preparar landing page; criar link unico de campanha; definir eventos do funil.', 'TableCell')],
    [p('<b>Dias 16-45</b>', 'TableCell'), p('Alcance organico', 'TableCell'), p('Publicar 4 Reels por semana; ensinar precificacao e mostrar o produto em uso; direcionar para o download.', 'TableCell')],
    [p('<b>Dias 30-60</b>', 'TableCell'), p('Prova social', 'TableCell'), p('Convidar 10-20 confeiteiras para teste acompanhado; coletar depoimentos, duvidas e resultados reais.', 'TableCell')],
    [p('<b>Dias 45-90</b>', 'TableCell'), p('Midia paga', 'TableCell'), p('Testar criativos no Instagram e Facebook; pausar os que nao trazem cadastros; aumentar apenas os vencedores.', 'TableCell')],
    [p('<b>Continuo</b>', 'TableCell'), p('Retencao', 'TableCell'), p('Pedir avaliacao apos o primeiro resultado; programa de indicacao; notificacoes uteis e campanhas de retorno.', 'TableCell')],
]
t = Table(rows, colWidths=[2.4*cm, 2.9*cm, 8.9*cm], repeatRows=1)
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), PURPLE), ('BACKGROUND', (0,1), (-1,-1), colors.white),
    ('GRID', (0,0), (-1,-1), 0.35, LINE), ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('LEFTPADDING', (0,0), (-1,-1), 7), ('RIGHTPADDING', (0,0), (-1,-1), 7),
    ('TOPPADDING', (0,0), (-1,-1), 7), ('BOTTOMPADDING', (0,0), (-1,-1), 7),
]))
story += [t]
story.append(PageBreak())

story += [p('2. Execucao semanal', 'H1Custom')]
story += [p('Conteudo para Instagram, TikTok e WhatsApp', 'H2Custom')]
content_rows = [[p('Formato', 'TableHead'), p('Ideia', 'TableHead'), p('Chamada para acao', 'TableHead')],
    [p('Reel educativo', 'TableCell'), p('“Voce sabe quanto lucra em cada bolo?” Mostre o custo e o preco sugerido no app.', 'TableCell'), p('Baixe o DocePreco e calcule sua proxima receita.', 'TableCell')],
    [p('Carrossel', 'TableCell'), p('“3 erros que fazem confeiteiras trabalharem muito e lucrarem pouco”.', 'TableCell'), p('Salve e envie para uma confeiteira.', 'TableCell')],
    [p('Demonstracao', 'TableCell'), p('Ingrediente -> receita -> margem -> pedido online em 30 segundos.', 'TableCell'), p('Teste gratuitamente.', 'TableCell')],
    [p('Prova social', 'TableCell'), p('Depoimento real com antes e depois da organizacao de encomendas.', 'TableCell'), p('Veja como funciona no link do perfil.', 'TableCell')],
    [p('Sazonal', 'TableCell'), p('Precificacao para Pascoa, Dia das Maes, festas e kits presente.', 'TableCell'), p('Monte sua campanha e acompanhe o lucro.', 'TableCell')],
]
t = Table(content_rows, colWidths=[2.7*cm, 7.5*cm, 4.0*cm], repeatRows=1)
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), PURPLE), ('GRID', (0,0), (-1,-1), 0.35, LINE),
    ('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 7),
    ('RIGHTPADDING', (0,0), (-1,-1), 7), ('TOPPADDING', (0,0), (-1,-1), 7),
    ('BOTTOMPADDING', (0,0), (-1,-1), 7),
]))
story += [t]

story += [p('Rotina de midia paga', 'H2Custom')]
story += [p('Comece com um orcamento de teste que caiba no caixa e dois criativos por campanha. Nao aumente investimento apenas por alcance: priorize anuncios que gerem instalacao, cadastro e primeira receita criada. Use uma pagina e um link especificos por campanha para identificar a origem dos resultados.', 'BodyCustom')]

story += [p('3. Metricas que importam', 'H1Custom')]
metrics = [
    [p('<b>Aquisicao</b><br/>Visitas na loja, instalacoes, custo por instalacao e custo por cadastro.', 'TableCell'),
     p('<b>Ativacao</b><br/>Percentual que cria a primeira receita e ve um preco sugerido.', 'TableCell')],
    [p('<b>Receita</b><br/>Teste Premium, conversao para assinatura, ticket medio e cancelamentos.', 'TableCell'),
     p('<b>Retencao</b><br/>Usuarios ativos apos 7 e 30 dias, avaliacoes e indicacoes.', 'TableCell')],
]
t = Table(metrics, colWidths=[7.1*cm, 7.1*cm])
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FBF8FA')), ('BOX', (0,0), (-1,-1), 0.6, LINE),
    ('INNERGRID', (0,0), (-1,-1), 0.5, LINE), ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('LEFTPADDING', (0,0), (-1,-1), 10), ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ('TOPPADDING', (0,0), (-1,-1), 10), ('BOTTOMPADDING', (0,0), (-1,-1), 10),
]))
story += [t, Spacer(1, 11)]
story += [p('Primeiras prioridades', 'H2Custom')]
story += [p('1. Publicar a nova versao e atualizar as paginas das lojas com beneficios claros.<br/>2. Produzir oito videos curtos de precificacao e organizacao de encomendas.<br/>3. Selecionar as primeiras 10 usuarias para um programa de embaixadoras.<br/>4. Rodar um primeiro teste de anuncios com dois criativos e analisar o funil semanalmente.', 'BodyCustom')]
story += [Spacer(1, 10), HRFlowable(width='100%', thickness=0.5, color=LINE), Spacer(1, 7)]
story += [p('Referencias: Apple App Store Product Page e Product Page Optimization; Google Play Store Listing Experiments. Fontes oficiais consultadas em outubro de 2026.', 'SmallCustom')]

story.append(PageBreak())
story += [p('4. Cronograma operacional - 12 semanas', 'H1Custom')]
story += [p('A regra para manter consistência é simples: reserve duas manhãs por semana para produzir conteúdo, uma hora para analisar resultados e uma hora para conversar com usuárias. Não tente executar tudo de uma vez.', 'BodyCustom')]

schedule_rows = [
    [p('Semana', 'TableHead'), p('Prioridade', 'TableHead'), p('Entregas da semana', 'TableHead')],
    [p('<b>1</b>', 'TableCell'), p('Base de conversão', 'TableCell'), p('Definir promessa central; revisar bio, link e páginas das lojas; configurar uma planilha ou painel com instalações, cadastros e primeira receita.', 'TableCell')],
    [p('<b>2</b>', 'TableCell'), p('Ativos de conteúdo', 'TableCell'), p('Gravar 4 vídeos: custo de bolo, margem, precificação de brigadeiro e demonstração do app. Criar 2 carrosséis.', 'TableCell')],
    [p('<b>3</b>', 'TableCell'), p('Publicação', 'TableCell'), p('Publicar 4 Reels e 2 carrosséis; responder comentários; usar stories diários com enquete sobre dificuldades de preço e pedidos.', 'TableCell')],
    [p('<b>4</b>', 'TableCell'), p('Embaixadoras', 'TableCell'), p('Convidar 10 confeiteiras para teste acompanhado. Fazer uma chamada curta de onboarding e registrar suas dúvidas.', 'TableCell')],
    [p('<b>5</b>', 'TableCell'), p('Prova social', 'TableCell'), p('Publicar 2 conteúdos com aprendizados ou resultados das usuárias; criar formulário simples para colher depoimentos.', 'TableCell')],
    [p('<b>6</b>', 'TableCell'), p('Teste de anúncios', 'TableCell'), p('Criar 2 anúncios: “quanto você lucra?” e “organize suas encomendas”. Direcionar ambos para o mesmo objetivo de cadastro.', 'TableCell')],
    [p('<b>7</b>', 'TableCell'), p('Otimização', 'TableCell'), p('Pausar o criativo mais fraco; melhorar gancho e primeira imagem do vencedor; testar um novo público de confeiteiras por interesse.', 'TableCell')],
    [p('<b>8</b>', 'TableCell'), p('Indicação', 'TableCell'), p('Lançar convite com benefício: dias de Premium ou recurso liberado. Preparar arte, texto de WhatsApp e mensagem dentro do app.', 'TableCell')],
    [p('<b>9</b>', 'TableCell'), p('Parcerias', 'TableCell'), p('Contatar 15 microcriadoras de conteúdo de confeitaria. Oferecer acesso Premium e código de indicação rastreável.', 'TableCell')],
    [p('<b>10</b>', 'TableCell'), p('Campanha sazonal', 'TableCell'), p('Escolher uma data comercial próxima; criar conteúdo de kit, margem e encomendas; atualizar a página das lojas e os anúncios.', 'TableCell')],
    [p('<b>11</b>', 'TableCell'), p('Retenção', 'TableCell'), p('Analisar quem instalou e não criou receita; enviar push ou mensagem útil com tutorial curto e CTA para concluir a primeira receita.', 'TableCell')],
    [p('<b>12</b>', 'TableCell'), p('Decisão mensal', 'TableCell'), p('Revisar métricas; manter canais e criativos vencedores; definir os próximos 30 dias com base em cadastro, ativação e assinatura.', 'TableCell')],
]
schedule = Table(schedule_rows, colWidths=[1.7*cm, 2.8*cm, 9.6*cm], repeatRows=1)
schedule.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), PURPLE), ('GRID', (0,0), (-1,-1), 0.35, LINE),
    ('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 6),
    ('RIGHTPADDING', (0,0), (-1,-1), 6), ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
]))
story += [schedule]
story += [p('Rotina fixa: segunda-feira, planejar e gravar; terça e quinta, publicar; quarta-feira, responder e conversar com usuárias; sexta-feira, revisar métricas e decidir o próximo teste.', 'H2Custom')]

doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(OUT)
