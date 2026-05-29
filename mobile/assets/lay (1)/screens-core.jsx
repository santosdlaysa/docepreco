// screens-core.jsx — CreateRecipe, Ingredients, CreateIngredient, PriceHistory, Sales, CreateSale
function Sec({children}){return <h3 style={{fontSize:16,margin:'6px 2px -3px'}}>{children}</h3>;}

function CreateRecipeScreen(){
  const presets=[['Básico','30%'],['Equilibrado','50%'],['Recomendado','70%',true],['Lucrativo','100%'],['Premium','150%']];
  const ings=[
    {n:'Chocolate meio amargo',q:'400 g',v:'R$ 18,00',bg:'#5E3A23'},
    {n:'Farinha de trigo',q:'500 g',v:'R$ 3,00',bg:'#E8C98E'},
    {n:'Manteiga',q:'200 g',v:'R$ 6,40',bg:'#F4C95D'},
  ];
  const extras=[['Embalagem','R$ 4,20'],['Gás','R$ 1,50'],['Energia','R$ 0,90'],['Mão de obra','R$ 27,00']];
  return (
    <div className="scroll">
      <div className="sh">
        <div className="bk">{Ico.back('var(--ink)',20)}</div>
        <div className="sh-t"><h1>Nova receita</h1></div>
        <div className="sh-act"><div className="act-pill" style={{background:'var(--pink)',color:'#fff',boxShadow:'0 6px 14px rgba(216,55,127,.3)'}}>Salvar</div></div>
      </div>
      <div className="body" style={{paddingTop:14,gap:14}}>
        <div className="banner"><div className="qa-ico" style={{width:36,height:36,background:'#fff'}}>{Ico.info('var(--blue)',18)}</div>
          <div className="bt"><b>Preencha os dados</b><span>O preço sugerido é calculado automaticamente.</span></div></div>

        <Sec>Dados básicos</Sec>
        <div className="field"><label>Nome da receita</label>
          <div className="input">{Ico.chef('var(--ink-3)',18)}<span style={{color:'var(--ink)'}}>Bolo de Chocolate</span></div></div>
        <div className="field"><label>Rendimento</label>
          <div className="input"><span style={{color:'var(--ink)'}}>12</span><span className="suffix">unidades</span></div></div>
        <div className="field"><label>Margem de lucro</label>
          <div className="preset-grid">
            {presets.map((p,i)=>(
              <div className={'preset'+(p[2]?' on':'')} key={i}><div className="pp">{p[1]}</div><div className="pl">{p[0]}</div></div>
            ))}
          </div>
        </div>

        <Sec>Ingredientes</Sec>
        <div className="gcard">
          {ings.map((g,i)=>(
            <div className="grow" key={i}>
              <div className="gi" style={{background:g.bg}}></div>
              <div className="gt"><b>{g.n}</b><span>{g.q}</span></div>
              <div className="gv">{g.v}</div>
            </div>
          ))}
        </div>
        <div style={{border:'2px dashed var(--pink-100)',borderRadius:14,padding:'13px',display:'flex',alignItems:'center',justifyContent:'center',gap:8,color:'var(--pink)',fontWeight:700,fontSize:14}}>
          {Ico.plus('var(--pink)',18)} Adicionar ingrediente</div>

        <Sec>Custos adicionais</Sec>
        <div className="gcard">
          {extras.map((e,i)=>(
            <div className="grow" key={i}>
              <div className="gt"><b style={{fontWeight:600}}>{e[0]}</b></div>
              <div className="gv" style={{fontFamily:'DM Sans',fontWeight:700,color:'var(--ink-2)'}}>{e[1]}</div>
            </div>
          ))}
        </div>
        <div className="btn btn-primary" style={{height:54,fontSize:16}}>Salvar receita</div>
        <div style={{height:24}}></div>
      </div>
    </div>
  );
}

function IngredientsScreen(){
  const list=[
    {n:'Chocolate meio amargo',q:'2 kg · R$ 90,00',u:'R$ 0,045/g',bg:'var(--green-100)'},
    {n:'Farinha de trigo',q:'5 kg · R$ 30,00',u:'R$ 0,006/g',bg:'var(--green-100)'},
    {n:'Leite condensado',q:'2 Latas (660g) · R$ 14,00',u:'R$ 0,021/g',bg:'var(--green-100)'},
    {n:'Manteiga',q:'500 g · R$ 16,00',u:'R$ 0,032/g',bg:'var(--green-100)'},
    {n:'Ovos',q:'30 un · R$ 22,50',u:'R$ 0,75/un',bg:'var(--green-100)'},
  ];
  return (
    <div className="scroll" style={{position:'relative'}}>
      <div className="sh">
        <div className="sh-t" style={{marginLeft:2}}><h1>Ingredientes</h1><div className="ssub">23 cadastrados</div></div>
        <div className="sh-act"><div className="act-pill" style={{background:'var(--pink)',color:'#fff'}}>{Ico.plus('#fff',18)} Novo</div></div>
      </div>
      <div className="body" style={{paddingTop:12,gap:11}}>
        <div className="banner"><div className="qa-ico" style={{width:36,height:36,background:'#fff'}}>{Ico.info('var(--blue)',18)}</div>
          <div className="bt"><b>Preço por unidade automático</b><span>Calculado a partir do que você pagou.</span></div></div>
        <div className="gcard">
          {list.map((g,i)=>(
            <div className="grow" key={i}>
              <div className="gi" style={{background:g.bg}}>{Ico.leaf('var(--green)',18)}</div>
              <div className="gt"><b>{g.n}</b><span>{g.q}</span></div>
              <div style={{textAlign:'right'}}>
                <div className="gv" style={{color:'var(--pink)'}}>{g.u}</div>
                <div className="gact" style={{justifyContent:'flex-end',marginTop:5}}>
                  <div className="icobtn">{Ico.edit('var(--ink-2)',15)}</div>
                  <div className="icobtn">{Ico.chart('var(--ink-2)',15)}</div>
                </div>
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

function CreateIngredientScreen(){
  const pkgs=['Lata','Pacote','Saco','Caixa','Garrafa','Pote'];
  const units=['un','g','kg','ml','l'];
  return (
    <div className="scroll">
      <div className="sh">
        <div className="bk">{Ico.back('var(--ink)',20)}</div>
        <div className="sh-t"><h1>Novo ingrediente</h1></div>
        <div className="sh-act"><div className="act-pill" style={{background:'var(--pink)',color:'#fff'}}>Salvar</div></div>
      </div>
      <div className="body" style={{paddingTop:14,gap:14}}>
        <div className="field"><label>Nome do ingrediente</label>
          <div className="input">{Ico.leaf('var(--ink-3)',18)}<span style={{color:'var(--ink)'}}>Leite condensado</span></div></div>
        <div className="field"><label>Tipo de embalagem</label>
          <div className="ugrid">{pkgs.map((p,i)=>(<span className={'uchip'+(i===0?' on':'')} key={i}>{p}</span>))}</div></div>
        <div className="field"><label>Peso por embalagem</label>
          <div className="input"><span style={{color:'var(--ink)'}}>330</span><span className="suffix">g por Lata</span></div>
          <span className="hint">Ex: uma lata de leite condensado tem 330g</span></div>
        <div className="two">
          <div className="field"><label>Quantidade</label><div className="input"><span style={{color:'var(--ink)'}}>2</span><span className="suffix">Latas</span></div></div>
          <div className="field"><label>Preço pago</label><div className="input"><span className="ph-txt">R$</span><span style={{color:'var(--ink)'}}>14,00</span></div></div>
        </div>
        <div className="field"><label>Unidade de medida</label>
          <div className="ugrid">{units.map((u,i)=>(<span className={'uchip'+(i===1?' on':'')} key={i}>{u}</span>))}</div></div>
        <div className="result" style={{background:'linear-gradient(140deg,#34C97B,var(--green) 60%,#2BA060)'}}>
          <div className="rl">Preço por unidade</div>
          <div className="rprice" style={{fontSize:34}}>R$ 0,021<span style={{fontSize:16}}> /g</span></div>
          <div style={{fontSize:13,opacity:.92,marginTop:6,fontWeight:500}}>Embalagem: R$ 7,00 · 330g cada</div>
        </div>
        <div className="btn btn-primary" style={{height:54,fontSize:16}}>Salvar ingrediente</div>
        <div style={{height:24}}></div>
      </div>
    </div>
  );
}

function PriceHistoryScreen(){
  const hist=[
    {d:'15 mai 2026',pk:'R$ 7,00',q:'330g',u:'R$ 0,021/g',cur:true,delta:'+8%',up:true},
    {d:'02 abr 2026',pk:'R$ 6,50',q:'330g',u:'R$ 0,019/g',delta:'+5%',up:true},
    {d:'18 fev 2026',pk:'R$ 6,20',q:'330g',u:'R$ 0,018/g',delta:'-3%',up:false},
    {d:'05 jan 2026',pk:'R$ 6,40',q:'330g',u:'R$ 0,019/g'},
  ];
  return (
    <div className="scroll">
      <div className="sh">
        <div className="bk">{Ico.back('var(--ink)',20)}</div>
        <div className="sh-t"><h1>Histórico de preço</h1><div className="ssub">Leite condensado</div></div>
      </div>
      <div className="body" style={{paddingTop:14,gap:11}}>
        <div className="gcard">
          {hist.map((h,i)=>(
            <div className="grow" key={i}>
              <div className="gi" style={{background:h.cur?'var(--pink-50)':'var(--cream-2)'}}>{Ico.tag(h.cur?'var(--pink)':'var(--ink-2)',18)}</div>
              <div className="gt">
                <b style={{display:'flex',alignItems:'center',gap:7}}>{h.d}{h.cur&&<span className="badge b-pink">Atual</span>}</b>
                <span>{h.pk} · {h.q}</span>
              </div>
              <div style={{textAlign:'right'}}>
                <div className="gv" style={{color:'var(--ink)'}}>{h.u}</div>
                {h.delta&&<div className="badge" style={{marginTop:4,background:h.up?'var(--pink-100)':'var(--green-100)',color:h.up?'var(--pink-700)':'#1F8A48'}}>
                  <span style={{transform:h.up?'none':'rotate(180deg)',display:'inline-flex'}}>{Ico.arrowUp('currentColor',11)}</span>{h.delta}</div>}
              </div>
            </div>
          ))}
        </div>
        <div style={{height:20}}></div>
      </div>
    </div>
  );
}

function SalesScreen(){
  const today=[
    {n:'Bolo de Chocolate',d:'2 un × R$ 65,00',t:'R$ 130,00'},
    {n:'Brigadeiro Gourmet',d:'50 un × R$ 3,50',t:'R$ 175,00'},
  ];
  const yest=[
    {n:'Cupcake de Morango',d:'12 un × R$ 8,00',t:'R$ 96,00'},
    {n:'Torta de Limão',d:'1 un × R$ 80,00',t:'R$ 80,00'},
  ];
  const group=(title,total,items)=>(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',margin:'4px 4px 9px'}}>
        <span style={{fontSize:13,fontWeight:700,color:'var(--ink-2)',textTransform:'uppercase',letterSpacing:.4}}>{title}</span>
        <span style={{fontSize:13,fontWeight:700,color:'var(--green)'}}>{total}</span>
      </div>
      <div className="gcard">
        {items.map((s,i)=>(
          <div className="grow" key={i}>
            <div className="gi" style={{background:'var(--green-100)'}}>{Ico.dollar('var(--green)',18)}</div>
            <div className="gt"><b>{s.n}</b><span>{s.d}</span></div>
            <div className="gv" style={{color:'var(--green)'}}>{s.t}</div>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="scroll" style={{position:'relative'}}>
      <div className="sh">
        <div className="sh-t" style={{marginLeft:2}}><h1>Vendas</h1><div className="ssub">87 vendas este mês</div></div>
        <div className="sh-act"><div className="act-pill" style={{background:'var(--pink)',color:'#fff'}}>{Ico.plus('#fff',18)} Nova</div></div>
      </div>
      <div className="body" style={{paddingTop:12,gap:14}}>
        <div className="hero" style={{padding:'15px 18px'}}>
          <div className="hero-stats" style={{marginTop:0}}>
            <div className="hero-stat"><div className="n">412 un</div><div className="t">vendidas no mês</div></div>
            <div className="hero-stat"><div className="n">R$ 6.840</div><div className="t">faturamento</div></div>
          </div>
        </div>
        <div className="seg"><div className="opt on">Todas</div><div className="opt">Este mês</div><div className="opt">Esta semana</div></div>
        {group('Hoje','R$ 305,00',today)}
        {group('Ontem','R$ 176,00',yest)}
        <div style={{height:70}}></div>
      </div>
      <div className="fab">{Ico.plus('#fff',26)}</div>
    </div>
  );
}

function CreateSaleScreen(){
  return (
    <div className="scroll">
      <div className="sh">
        <div className="bk">{Ico.back('var(--ink)',20)}</div>
        <div className="sh-t"><h1>Registrar venda</h1></div>
        <div className="sh-act"><div className="act-pill" style={{background:'var(--pink)',color:'#fff'}}>Salvar</div></div>
      </div>
      <div className="body" style={{paddingTop:14,gap:14}}>
        <div className="field"><label>Receita</label>
          <div className="input"><div className="gi" style={{width:30,height:30,borderRadius:9,background:'linear-gradient(135deg,#8B5E3C,#5E3A23)'}}></div><span style={{color:'var(--ink)'}}>Bolo de Chocolate</span><span style={{marginLeft:'auto'}}>{Ico.chevR('var(--ink-3)',16)}</span></div></div>
        <div className="two">
          <div className="field"><label>Quantidade</label><div className="input"><span style={{color:'var(--ink)'}}>2</span><span className="suffix">un</span></div></div>
          <div className="field"><label>Preço unitário</label><div className="input"><span className="ph-txt">R$</span><span style={{color:'var(--ink)'}}>65,00</span></div></div>
        </div>
        <div className="field"><label>Data da venda</label>
          <div className="input">{Ico.clock('var(--ink-3)',18)}<span style={{color:'var(--ink)'}}>29 / 05 / 2026</span></div></div>
        <div className="field"><label>Notas (opcional)</label>
          <div className="input area"><span className="ph-txt">Ex: encomenda da Dona Ana</span></div></div>
        <div className="result" style={{background:'linear-gradient(140deg,#34C97B,var(--green) 60%,#2BA060)'}}>
          <div className="rl">Total da venda</div>
          <div className="rprice">R$ 130,00</div>
        </div>
        <div className="btn btn-primary" style={{height:54,fontSize:16}}>Salvar venda</div>
        <div style={{height:24}}></div>
      </div>
    </div>
  );
}

Object.assign(window,{CreateRecipeScreen,IngredientsScreen,CreateIngredientScreen,PriceHistoryScreen,SalesScreen,CreateSaleScreen});
