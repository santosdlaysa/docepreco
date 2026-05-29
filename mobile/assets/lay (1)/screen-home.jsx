// screen-home.jsx — DocePreço dashboard with clickable PRO (locked) features
function HomeScreen(){
  const [pw,setPw]=React.useState(false);
  const open=()=>setPw(true);
  const close=()=>setPw(false);

  const days=[
    {d:'S',v:40},{d:'T',v:62},{d:'Q',v:35},{d:'Q',v:78},
    {d:'S',v:54},{d:'S',v:96,on:true},{d:'D',v:48},
  ];
  const sales=[
    {n:'Bolo de Chocolate',q:'2 un · 14:20',a:'+ R$ 130',bg:'linear-gradient(135deg,#8B5E3C,#5E3A23)',i:'BC'},
    {n:'Brigadeiro Gourmet',q:'50 un · 11:05',a:'+ R$ 175',bg:'linear-gradient(135deg,#5E3A23,#3A2218)',i:'BG'},
    {n:'Cupcake Morango',q:'12 un · ontem',a:'+ R$ 96',bg:'linear-gradient(135deg,#FF8FB6,#EA4B92)',i:'CM'},
  ];
  const pro=[
    {ic:Ico.chart,label:'Relatórios',sub:'Gráficos e análises',bg:'var(--pink-50)',c:'var(--pink)'},
    {ic:Ico.users,label:'Clientes',sub:'Contatos e aniversários',bg:'var(--blue-50)',c:'var(--blue)'},
    {ic:Ico.clipboard,label:'Pedidos',sub:'Entregas e pagamento',bg:'var(--green-100)',c:'var(--green)'},
    {ic:Ico.list,label:'Lista de compras',sub:'Gerada das receitas',bg:'var(--yellow-100)',c:'#C8870B'},
  ];

  return (
    <React.Fragment>
    <div className="scroll">
      {/* top bar */}
      <div className="topbar">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div className="logo-badge"><img src="assets/logo.png" alt="DocePreço"/></div>
          <div>
            <div className="hi">Quinta, 29 de maio</div>
            <div className="name">Oi, Marina!</div>
          </div>
        </div>
        <div className="chip chip-pro tap" onClick={open}>{Ico.crown('#7A4E00',14)} Seja PRO</div>
      </div>

      <div className="body" style={{paddingTop:8}}>
        {/* hero summary */}
        <div className="hero">
          <div className="deco" style={{width:120,height:120,right:-30,top:-40}}></div>
          <div className="deco" style={{width:70,height:70,right:46,bottom:-34}}></div>
          <div className="label">Faturamento de hoje</div>
          <div className="big">R$ 401,00</div>
          <div className="sub">3 vendas · lucro estimado R$ 233</div>
          <div className="hero-stats">
            <div className="hero-stat"><div className="n">R$ 6.840</div><div className="t">no mês</div></div>
            <div className="hero-stat"><div className="n">58%</div><div className="t">margem média</div></div>
            <div className="hero-stat"><div className="n">87</div><div className="t">vendas</div></div>
          </div>
        </div>

        {/* quick actions */}
        <div className="qa">
          <div className="qa-item"><div className="qa-ico" style={{background:'var(--pink-50)'}}>{Ico.chef('var(--pink)',22)}</div><div className="qt">Nova<br/>receita</div></div>
          <div className="qa-item"><div className="qa-ico" style={{background:'var(--green-100)'}}>{Ico.cart('var(--green)',22)}</div><div className="qt">Registrar<br/>venda</div></div>
          <div className="qa-item"><div className="qa-ico" style={{background:'var(--blue-50)'}}>{Ico.doc('var(--blue)',22)}</div><div className="qt">Novo<br/>orçamento</div></div>
        </div>

        {/* 7-day chart */}
        <div>
          <div className="section-title"><h3>Últimos 7 dias</h3><span className="more">Relatórios</span></div>
          <div className="card pad" style={{marginTop:10}}>
            <div className="chart">
              {days.map((b,i)=>(
                <div className="bar-col" key={i}>
                  <div className={'bar'+(b.on?' on':'')} style={{height:b.v+'%'}}></div>
                  <div className="bar-d">{b.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* recent sales */}
        <div>
          <div className="section-title"><h3>Vendas recentes</h3><span className="more">Ver todas</span></div>
          <div className="card pad" style={{marginTop:10,paddingTop:4,paddingBottom:4}}>
            {sales.map((s,i)=>(
              <div className="row" key={i}>
                <div className="thumb" style={{background:s.bg}}>{s.i}</div>
                <div className="rt"><b>{s.n}</b><span>{s.q}</span></div>
                <div className="amt">{s.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PRO locked features */}
        <div>
          <div className="pro-head"><h3>Recursos PRO</h3><span className="pb">PREMIUM</span></div>
          <div className="pro-grid" style={{marginTop:10}}>
            {pro.map((p,i)=>(
              <div className="pro-tile" key={i} onClick={open}>
                <div className="pro-lock">{Ico.lock('#C8870B',12)}</div>
                <div className="pro-ico" style={{background:p.bg}}>{p.ic(p.c,22)}</div>
                <b>{p.label}</b><span>{p.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PRO upsell banner */}
        <div className="pro-cta" onClick={open}>
          <div className="pc-ico">{Ico.crown('var(--pink)',24)}</div>
          <div className="pc-t"><b>Desbloqueie tudo no PRO</b><span>7 dias grátis · a partir de R$ 7,49/mês</span></div>
          <div className="pc-go">{Ico.chevR('var(--pink)',20)}</div>
        </div>

        <div style={{height:8}}></div>
      </div>

      <TabBar active="home"/>
    </div>

    {pw && (
      <React.Fragment>
        <div className="pw-backdrop" onClick={close}></div>
        <div className="pw-sheet"><PaywallScreen onClose={close}/></div>
      </React.Fragment>
    )}
    </React.Fragment>
  );
}
window.HomeScreen = HomeScreen;
