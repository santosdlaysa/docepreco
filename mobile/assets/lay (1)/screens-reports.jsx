// screens-reports.jsx — Reports, Seasons, CreateSeason
function ReportsScreen(){
  const months=[['Dez',55],['Jan',62],['Fev',48],['Mar',70],['Abr',80],['Mai',96,true]];
  const top=[
    {n:'Brigadeiro Gourmet',q:'412 un',v:'R$ 1.442',m:'🥇',bg:'var(--yellow)'},
    {n:'Bolo de Chocolate',q:'58 un',v:'R$ 667',m:'2',bg:'var(--cream-2)'},
    {n:'Cupcake de Morango',q:'96 un',v:'R$ 768',m:'3',bg:'var(--cream-2)'},
    {n:'Torta de Limão',q:'24 un',v:'R$ 336',m:'4',bg:'var(--cream-2)'},
  ];
  return (
    <div className="scroll">
      <div className="sh">
        <div className="sh-t" style={{marginLeft:2}}><h1>Relatórios</h1><div className="ssub">Maio 2026</div></div>
        <div className="sh-act"><div className="act-pill">{Ico.share('var(--ink)',16)} PDF</div></div>
      </div>
      <div className="body" style={{paddingTop:12,gap:14}}>
        <div className="hero">
          <div className="deco" style={{width:120,height:120,right:-30,top:-40}}></div>
          <div className="label">Faturamento do mês</div>
          <div className="big">R$ 6.840</div>
          <div className="sub" style={{display:'flex',alignItems:'center',gap:6}}><span style={{display:'inline-flex'}}>{Ico.arrowUp('#fff',13)}</span> +18% vs abril (R$ 5.800)</div>
        </div>
        <div className="two">
          <div className="card pad"><div style={{fontSize:12,color:'var(--ink-2)',fontWeight:700}}>Ticket médio</div><div style={{fontFamily:'Baloo 2',fontWeight:800,fontSize:24,color:'var(--ink)',marginTop:5}}>R$ 78,60</div><div style={{fontSize:11.5,color:'var(--ink-2)',fontWeight:500,marginTop:2}}>por venda</div></div>
          <div className="card pad"><div style={{fontSize:12,color:'var(--ink-2)',fontWeight:700}}>Vendas</div><div style={{fontFamily:'Baloo 2',fontWeight:800,fontSize:24,color:'var(--ink)',marginTop:5}}>87</div><div style={{fontSize:11.5,color:'var(--ink-2)',fontWeight:500,marginTop:2}}>neste mês</div></div>
        </div>
        <div>
          <div className="section-title"><h3>Últimos 6 meses</h3></div>
          <div className="card pad" style={{marginTop:10}}>
            <div className="rbars">
              {months.map((m,i)=>(<div className="rb" key={i}><div className={'bar2'+(m[2]?' on':'')} style={{height:m[1]+'%'}}></div><small>{m[0]}</small></div>))}
            </div>
          </div>
        </div>
        <div>
          <div className="section-title"><h3>Mais vendidas</h3></div>
          <div className="gcard" style={{marginTop:10}}>
            {top.map((t,i)=>(
              <div className="grow" key={i}>
                <div className="gi" style={{background:t.bg,fontFamily:'Baloo 2',fontWeight:800,fontSize:15,color:i===0?'#7A4E00':'var(--ink-2)'}}>{i===0?Ico.trophy('#8A5A00',18):t.m}</div>
                <div className="gt"><b>{t.n}</b><span>{t.q} vendidas</span></div>
                <div className="gv" style={{color:'var(--green)'}}>{t.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="btn btn-primary" style={{height:52}}>{Ico.doc('#fff',18)} Baixar relatório completo</div>
        <div style={{height:20}}></div>
      </div>
    </div>
  );
}

function SeasonsScreen(){
  const seasons=[
    {n:'Páscoa 2026',d:'15 mar → 20 abr',adj:'+25%',active:true,up:true},
    {n:'Dia das Mães',d:'01 mai → 11 mai',adj:'+20%',active:true,up:true},
    {n:'Pós-festas',d:'02 jan → 31 jan',adj:'-10%',up:false},
  ];
  return (
    <div className="scroll" style={{position:'relative'}}>
      <div className="sh">
        <div className="sh-t" style={{marginLeft:2}}><h1>Épocas</h1><div className="ssub">Ajuste sazonal de preços</div></div>
        <div className="sh-act"><div className="act-pill" style={{background:'var(--pink)',color:'#fff'}}>{Ico.plus('#fff',18)} Nova</div></div>
      </div>
      <div className="body" style={{paddingTop:12,gap:12}}>
        <div className="banner"><div className="qa-ico" style={{width:36,height:36,background:'#fff'}}>{Ico.info('var(--blue)',18)}</div>
          <div className="bt"><b>Cobre mais nas datas certas</b><span>O ajuste é aplicado no preço sugerido.</span></div></div>
        <div className="gcard">
          {seasons.map((s,i)=>(
            <div className="grow" key={i}>
              <div className="gi" style={{background:s.up?'var(--pink-50)':'var(--green-100)'}}>{Ico.tag(s.up?'var(--pink)':'var(--green)',18)}</div>
              <div className="gt"><b style={{display:'flex',alignItems:'center',gap:7}}>{s.n}{s.active&&<span className="badge b-green">Ativa</span>}</b><span>{s.d}</span></div>
              <div style={{textAlign:'right'}}>
                <div className="gv" style={{color:s.up?'var(--pink)':'var(--green)'}}>{s.adj}</div>
                <div className="gact" style={{justifyContent:'flex-end',marginTop:5}}><div className="icobtn">{Ico.edit('var(--ink-2)',15)}</div><div className="icobtn">{Ico.trash('var(--ink-2)',15)}</div></div>
              </div>
            </div>
          ))}
        </div>
        <div style={{height:70}}></div>
      </div>
      <div className="fab">{Ico.plus('#fff',26)}</div>
    </div>
  );
}

function CreateSeasonScreen(){
  const shortcuts=['Natal','Páscoa','Dia das Mães','Namorados'];
  return (
    <div className="scroll">
      <div className="sh">
        <div className="bk">{Ico.back('var(--ink)',20)}</div>
        <div className="sh-t"><h1>Nova época</h1></div>
        <div className="sh-act"><div className="act-pill" style={{background:'var(--pink)',color:'#fff'}}>Salvar</div></div>
      </div>
      <div className="body" style={{paddingTop:14,gap:14}}>
        <div className="field"><label>Atalhos rápidos</label>
          <div className="ugrid">{shortcuts.map((s,i)=>(<span className={'uchip'+(i===1?' on':'')} key={i}>{s}</span>))}</div></div>
        <div className="field"><label>Nome da época</label><div className="input">{Ico.tag('var(--ink-3)',18)}<span style={{color:'var(--ink)'}}>Páscoa 2026</span></div></div>
        <div className="two">
          <div className="field"><label>Início</label><div className="input"><span style={{color:'var(--ink)'}}>15-03-2026</span></div></div>
          <div className="field"><label>Fim</label><div className="input"><span style={{color:'var(--ink)'}}>20-04-2026</span></div></div>
        </div>
        <div className="field"><label>Ajuste de preço</label><div className="input"><span style={{color:'var(--ink)'}}>+25</span><span className="suffix">%</span></div></div>
        <div className="result" style={{background:'linear-gradient(140deg,#FF6AAE,var(--pink) 60%,#C7367A)'}}>
          <div className="rl">Pré-visualização</div>
          <div style={{fontSize:15,fontWeight:600,marginTop:8,opacity:.96}}>Uma receita de <b>R$ 10,00</b></div>
          <div className="rprice" style={{fontSize:34,marginTop:4}}>passa a R$ 12,50</div>
        </div>
        <div className="btn btn-primary" style={{height:54,fontSize:16}}>Salvar época</div>
        <div style={{height:24}}></div>
      </div>
    </div>
  );
}

Object.assign(window,{ReportsScreen,SeasonsScreen,CreateSeasonScreen});
