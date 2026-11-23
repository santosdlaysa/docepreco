import subprocess, pathlib
ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

PAGES = {
  'precificacao': dict(tag='Precificação', title='Descubra o preço certo dos seus doces',
      sub='Custo por unidade, margem e preço sugerido calculados na hora a partir das suas receitas.',
      shots=['4', '3', '2']),
  'loja-online': dict(tag='Plano Master', title='Sua confeitaria com loja online',
      sub='Cardápio digital, pedidos pelo link e PIX direto no checkout. Tudo pelo app.',
      shots=['loja', 'cardapio', '5']),
  'financeiro': dict(tag='Gestão', title='Saiba quanto você lucra de verdade',
      sub='Vendas, faturamento, ticket médio e relatórios do mês num só lugar.',
      shots=['5', '1', '2']),
  'novidades': dict(tag='Novidades', title='Muita coisa nova te esperando',
      sub='Loja online, estoque, financeiro e muito mais. Volte e confira.',
      shots=['2', 'cardapio', '1']),
}
SIZES = {'5244x2950': (2622, 1475), '3840x1646': (1920, 823)}

def html(p):
    a, b, c = p['shots']
    return f'''<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;700;800&display=block" rel="stylesheet">
<style>
*{{margin:0;box-sizing:border-box}}
html,body{{width:100vw;height:100vh;overflow:hidden}}
body{{font-family:Poppins,'Segoe UI',sans-serif;color:#fff;
 background:radial-gradient(circle at 85% 15%,#ff94c4 0,transparent 45%),
 radial-gradient(circle at 10% 100%,#851058 0,transparent 55%),
 linear-gradient(135deg,#ff5ca3 0%,#e91e8c 45%,#a5136a 100%);
 display:flex;align-items:center;padding:0 6vw;gap:3vw}}
.text{{flex:0 0 46%}}
.logo{{height:13vh;background:#fff;border-radius:3vh;padding:1.2vh 2vh;margin-bottom:4vh;box-shadow:0 2vh 5vh rgba(0,0,0,.15)}}
.tag{{display:inline-block;font-weight:700;font-size:2.6vh;letter-spacing:.3vh;text-transform:uppercase;
 background:rgba(255,255,255,.2);border:.2vh solid rgba(255,255,255,.45);padding:1vh 2.4vh;border-radius:5vh;margin-bottom:3vh}}
h1{{font-weight:800;font-size:9vh;line-height:1.08;letter-spacing:-.15vh;text-wrap:balance;text-shadow:0 .6vh 2vh rgba(107,13,72,.25)}}
p{{font-weight:500;font-size:3.4vh;line-height:1.45;margin-top:3.5vh;opacity:.93;max-width:90%}}
.phones{{flex:1;position:relative;height:100%}}
.ph{{position:absolute;top:50%;height:78vh;aspect-ratio:738/1438;border-radius:5.5vh;background:#111;
 padding:1.1vh;box-shadow:0 4vh 9vh rgba(70,0,40,.45)}}
.ph img{{width:100%;height:100%;object-fit:cover;object-position:top;border-radius:4.6vh;display:block}}
.l{{left:0;transform:translateY(-46%) rotate(-7deg);height:68vh}}
.c{{left:50%;transform:translate(-50%,-50%);z-index:2;height:84vh}}
.r{{right:0;transform:translateY(-46%) rotate(7deg);height:68vh}}
</style></head><body>
<div class="text"><img class="logo" src="src/logo.png"><br><span class="tag">{p['tag']}</span>
<h1>{p['title']}</h1><p>{p['sub']}</p></div>
<div class="phones">
<div class="ph l"><img src="src/s-{a}.jpg"></div>
<div class="ph r"><img src="src/s-{c}.jpg"></div>
<div class="ph c"><img src="src/s-{b}.jpg"></div>
</div></body></html>'''

for name, p in PAGES.items():
    f = ROOT / f'_{name}.html'
    f.write_text(html(p), encoding='utf-8')
    for label, (w, h) in SIZES.items():
        out = ROOT / f'{name}-{label}.png'
        subprocess.run([CHROME, '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=2',
            f'--window-size={w},{h}', '--virtual-time-budget=5000', '--allow-file-access-from-files',
            f'--screenshot={out}', f.as_uri()], check=True, capture_output=True)
        print(out.name)

# --- Screenshots verticais de iPhone (Dynamic Island) ---
SHOTS = {
  'precificacao': [('3', 'Custo e preço de cada receita'), ('4', 'Preço por unidade automático'),
                   ('2', 'Lucro e margem na palma da mão')],
  'loja-online': [('cardapio', 'Cardápio digital com link para seus clientes'), ('loja', 'Gerencie loja e pedidos pelo app'),
                  ('5', 'Acompanhe cada venda')],
  'financeiro': [('1', 'Faturamento e ticket médio do mês'), ('5', 'Todas as vendas organizadas'),
                 ('2', 'Seu negócio resumido na tela inicial')],
  'novidades': [('2', 'Volte e veja o que mudou'), ('cardapio', 'Agora com loja online e cardápio digital'),
                ('1', 'Relatórios e financeiro completos')],
}
# viewport no tamanho final (Chrome headless tem largura mínima de janela)
PORTRAIT = {'1206x2622': (1206, 2622), '1179x2556': (1179, 2556), '1320x2868': (1320, 2868)}

def portrait_html(shot, caption):
    return f'''<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@700;800&display=block" rel="stylesheet">
<style>
*{{margin:0;box-sizing:border-box}}
html,body{{width:100vw;height:100vh;overflow:hidden}}
body{{font-family:Poppins,'Segoe UI',sans-serif;color:#fff;text-align:center;
 background:radial-gradient(circle at 90% 5%,#ff94c4 0,transparent 45%),
 radial-gradient(circle at 0% 100%,#851058 0,transparent 55%),
 linear-gradient(160deg,#ff5ca3 0%,#e91e8c 45%,#a5136a 100%)}}
h1{{font-weight:800;font-size:9.6vw;line-height:1.12;padding:11vh 8vw 0;text-wrap:balance;
 text-shadow:0 .4vh 1.5vh rgba(107,13,72,.25)}}
.ph{{position:absolute;left:50%;top:31vh;transform:translateX(-50%);width:80vw;aspect-ratio:738/1438;
 border-radius:11vw;background:#111;padding:2.2vw;box-shadow:0 3vh 7vh rgba(70,0,40,.45)}}
.ph img{{width:100%;height:100%;object-fit:cover;object-position:top;border-radius:9vw;display:block}}
</style></head><body><h1>{caption}</h1>
<div class="ph"><img src="src/s-{shot}.jpg"></div></body></html>'''

for name, items in SHOTS.items():
    for i, (shot, caption) in enumerate(items, 1):
        f = ROOT / f'_{name}-{i}.html'
        f.write_text(portrait_html(shot, caption), encoding='utf-8')
        for label, (w, h) in PORTRAIT.items():
            out = ROOT / 'iphone' / label / f'{name}-{i}.png'
            out.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run([CHROME, '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
                f'--window-size={w},{h}', '--virtual-time-budget=5000', '--allow-file-access-from-files',
                f'--screenshot={out}', f.as_uri()], check=True, capture_output=True)
        f.unlink()
