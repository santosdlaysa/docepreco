// screen-cost.jsx — recipe cost breakdown (the calculation engine)
function CostScreen(){
  const ingredients=[
    {n:'Chocolate meio amargo',q:'400 g · R$ 0,045/g',v:'R$ 18,00',bg:'#5E3A23'},
    {n:'Farinha de trigo',q:'500 g · R$ 0,006/g',v:'R$ 3,00',bg:'#E8C98E'},
    {n:'Açúcar refinado',q:'300 g · R$ 0,005/g',v:'R$ 1,50',bg:'#F2E6D2'},
    {n:'Manteiga',q:'200 g · R$ 0,032/g',v:'R$ 6,40',bg:'#F4C95D'},
    {n:'Ovos',q:'6 un · R$ 0,75/un',v:'R$ 4,50',bg:'#FFD98A'},
  ];
  const extras=[
    {n:'Mão de obra',q:'1h30 · R$ 18/h',v:'R$ 27,00',ic:Ico.scale,c:'var(--pink)',bg:'var(--pink-50)'},
    {n:'Embalagem',q:'caixa + fita',v:'R$ 4,20',ic:Ico.box,c:'var(--blue)',bg:'var(--blue-50)'},
  ];
  return (
    <div className="scroll">
      {/* hero photo */}
      <div className="cost-hero">
        <div className="cost-back">{Ico.back('var(--ink)',20)}</div>
        <Photo label="foto · bolo de chocolate" style={{background:'linear-gradient(135deg,#8B5E3C,#4E2E1B)'}}/>
      </div>

      <div className="cost-title-wrap">
        <h1>Bolo de Chocolate</h1>
        <div className="csub">Rendimento: 12 fatias · 1,6 kg</div>
      </div>

      <div className="body" style={{paddingTop:14,gap:14}}>
        {/* ingredients ledger */}
        <div className="ledger">
          <div className="lhead"><h4>Ingredientes</h4><span style={{fontSize:12,fontWeight:700,color:'var(--ink-2)'}}>5 itens</span></div>
          {ingredients.map((g,i)=>(
            <div className="lrow" key={i}>
              <div className="ldot" style={{background:g.bg}}></div>
              <div className="ln"><b>{g.n}</b><span>{g.q}</span></div>
              <div className="lv">{g.v}</div>
            </div>
          ))}
          <div className="lsum"><span className="lt">Subtotal ingredientes</span><span className="lvv">R$ 33,40</span></div>
        </div>

        {/* additional costs */}
        <div className="ledger">
          <div className="lhead"><h4>Custos adicionais</h4></div>
          {extras.map((g,i)=>(
            <div className="lrow" key={i}>
              <div className="ldot" style={{background:g.bg}}>{g.ic(g.c,17)}</div>
              <div className="ln"><b>{g.n}</b><span>{g.q}</span></div>
              <div className="lv">{g.v}</div>
            </div>
          ))}
          <div className="lsum"><span className="lt">Custo total de produção</span><span className="lvv">R$ 64,60</span></div>
        </div>

        {/* margin slider */}
        <div className="margin-card">
          <div className="margin-top"><span className="ml">Margem de lucro</span><span className="mv">62%</span></div>
          <div className="slider">
            <div className="sf" style={{width:'62%'}}></div>
            <div className="sk" style={{left:'62%'}}></div>
          </div>
          <div className="slider-scale"><span>0%</span><span>50%</span><span>100%</span></div>
        </div>

        {/* result */}
        <div className="result">
          <div className="deco" style={{width:130,height:130,right:-36,top:-46}}></div>
          <div className="deco" style={{width:64,height:64,right:54,bottom:-30}}></div>
          <div className="rl">Preço de venda sugerido</div>
          <div className="rprice">R$ 138,00</div>
          <div className="result-grid">
            <div className="rg"><div className="n">R$ 11,50</div><div className="t">por fatia</div></div>
            <div className="rg"><div className="n">R$ 5,38</div><div className="t">custo / fatia</div></div>
            <div className="rg"><div className="n">R$ 73,40</div><div className="t">lucro estimado</div></div>
          </div>
        </div>

        {/* actions */}
        <div className="actions">
          <div className="btn btn-ghost">{Ico.share('var(--ink)',18)} Compartilhar</div>
          <div className="btn btn-primary">{Ico.doc('#fff',18)} Gerar PDF</div>
        </div>

        <div style={{height:44}}></div>
      </div>
    </div>
  );
}
window.CostScreen = CostScreen;
// rev2
