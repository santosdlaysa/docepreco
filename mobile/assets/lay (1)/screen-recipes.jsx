// screen-recipes.jsx — recipe list
function RecipesScreen(){
  const recipes=[
    {n:'Bolo de Chocolate',cat:'Bolos · 12 fatias',cu:'R$ 4,30',ps:'R$ 11,50',m:'62%',tint:'linear-gradient(135deg,#8B5E3C,#4E2E1B)',cap:'foto · bolo'},
    {n:'Brigadeiro Gourmet',cat:'Docinhos · 50 un',cu:'R$ 1,15',ps:'R$ 3,50',m:'67%',tint:'linear-gradient(135deg,#5E3A23,#2E1B12)',cap:'foto · brigadeiro'},
    {n:'Cupcake de Morango',cat:'Cupcakes · 12 un',cu:'R$ 3,80',ps:'R$ 8,00',m:'52%',tint:'linear-gradient(135deg,#FF8FB6,#EA4B92)',cap:'foto · cupcake'},
    {n:'Torta de Limão',cat:'Tortas · 8 fatias',cu:'R$ 5,60',ps:'R$ 14,00',m:'60%',tint:'linear-gradient(135deg,#FFE08A,#F2B705)',cap:'foto · torta'},
  ];
  return (
    <div className="scroll">
      <div style={{padding:'54px 18px 4px'}}>
        <h1 style={{fontSize:30}}>Receitas</h1>
        <div className="hi" style={{marginTop:2}}>Suas fichas técnicas e preços</div>
      </div>

      <div className="body" style={{paddingTop:12,gap:13}}>
        <div className="searchbar">{Ico.search('var(--ink-3)',19)} Buscar receita…</div>

        <div className="filters">
          <span className="pill on">Todas</span>
          <span className="pill">Bolos</span>
          <span className="pill">Docinhos</span>
          <span className="pill">Tortas</span>
        </div>

        <div className="quota">
          {Ico.spark('#C8870B',16)}
          <span className="qn">3 / 5 grátis</span>
          <div className="track"><div className="fill" style={{width:'60%'}}></div></div>
          <span className="qn" style={{color:'var(--pink)'}}>Virar PRO</span>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:12,marginTop:2}}>
          {recipes.map((r,i)=>(
            <div className="rcard" key={i}>
              <div className="rimg"><Photo label={r.cap} style={{background:r.tint}}/></div>
              <div className="rinfo">
                <div className="rname">{r.n}</div>
                <div className="hi" style={{fontSize:11.5,marginTop:-3}}>{r.cat}</div>
                <div className="rmeta">
                  <div className="m"><div className="ml">CUSTO/UN</div><div className="mv" style={{color:'var(--ink-2)'}}>{r.cu}</div></div>
                  <div className="m"><div className="ml">PREÇO</div><div className="mv" style={{color:'var(--pink)'}}>{r.ps}</div></div>
                  <div className="m" style={{display:'flex',alignItems:'flex-end'}}><span className="tag-margin">{Ico.spark('#1F8A48',11)} {r.m}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{height:6}}></div>
      </div>

      <TabBar active="recipes"/>
    </div>
  );
}
window.RecipesScreen = RecipesScreen;
