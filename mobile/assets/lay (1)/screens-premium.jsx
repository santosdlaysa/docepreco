// screens-premium.jsx — Orders, CreateOrder, Clients, CreateClient
function Sec2({children}){return <h3 style={{fontSize:16,margin:'6px 2px -3px'}}>{children}</h3>;}

function OrderCard({r,client,qty,total,paid,partial,status,time,notes}){
  const stages=['Pendente','Produção','Pronto','Entregue'];
  const si=stages.indexOf(status);
  return (
    <div className="gcard" style={{padding:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
        <div style={{minWidth:0}}>
          <div style={{fontFamily:'Baloo 2',fontWeight:700,fontSize:16,lineHeight:1.1}}>{r}</div>
          <div style={{fontSize:12.5,color:'var(--ink-2)',fontWeight:600,marginTop:2}}>{client} · {qty}</div>
        </div>
        <div style={{textAlign:'right',flexShrink:0}}>
          <div style={{fontFamily:'Baloo 2',fontWeight:700,fontSize:16}}>{total}</div>
          <div className={'badge '+(paid?'b-green':'b-yellow')} style={{marginTop:4}}>{paid?'Pago':'Não pago'}</div>
        </div>
      </div>
      {partial&&<div style={{fontSize:11.5,color:'var(--ink-2)',fontWeight:600,marginTop:8,display:'flex',gap:7}}>
        <span className="badge b-blue">Pix R$ 50</span><span>Restante R$ {partial}</span></div>}
      <div style={{display:'flex',gap:5,marginTop:11}}>
        {stages.map((s,i)=>(
          <div key={i} style={{flex:1,textAlign:'center',padding:'7px 2px',borderRadius:9,fontSize:10.5,fontWeight:700,
            background:i===si?'var(--pink)':'var(--cream-2)',color:i===si?'#fff':(i<si?'var(--ink-2)':'var(--ink-3)')}}>{s}</div>
        ))}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:7,marginTop:10,fontSize:12,color:'var(--ink-2)',fontWeight:600}}>
        {Ico.clock('var(--ink-2)',15)} Entrega {time}{notes&&<span> · {notes}</span>}
      </div>
    </div>
  );
}

function OrdersScreen(){
  return (
    <div className="scroll" style={{position:'relative'}}>
      <div className="sh">
        <div className="sh-t" style={{marginLeft:2}}><h1>Pedidos</h1><div className="ssub">5 em andamento</div></div>
        <div className="sh-act"><div className="act-pill" style={{background:'var(--pink)',color:'#fff'}}>{Ico.plus('#fff',18)} Novo</div></div>
      </div>
      <div className="body" style={{paddingTop:12,gap:13}}>
        <div className="filters">
          <span className="pill on">Todos</span><span className="pill">Pendente</span><span className="pill">Produção</span><span className="pill">Pronto</span><span className="pill">Entregue</span>
        </div>
        <div style={{fontSize:13,fontWeight:700,color:'var(--ink-2)',textTransform:'uppercase',letterSpacing:.4,margin:'2px 4px -2px'}}>Hoje</div>
        <OrderCard r="Bolo de Aniversário 2kg" client="Dona Ana" qty="1 un × R$ 120" total="R$ 120,00" paid={false} partial="70" status="Produção" time="hoje, 16:00" notes="sem glúten"/>
        <OrderCard r="100 Brigadeiros" client="Festa Lúcia" qty="100 un × R$ 2,50" total="R$ 250,00" paid={true} status="Pronto" time="hoje, 18:30"/>
        <div style={{fontSize:13,fontWeight:700,color:'var(--ink-2)',textTransform:'uppercase',letterSpacing:.4,margin:'4px 4px -2px'}}>Amanhã</div>
        <OrderCard r="Torta de Morango" client="Carlos M." qty="1 un × R$ 90" total="R$ 90,00" paid={false} status="Pendente" time="amanhã, 10:00"/>
        <div style={{height:70}}></div>
      </div>
      <div className="fab">{Ico.plus('#fff',26)}</div>
    </div>
  );
}

function CreateOrderScreen(){
  const status=[['Pendente','var(--yellow-100)','#8A5A00'],['Produção','var(--blue-100)','#1A6F96',true],['Pronto','var(--pink-100)','var(--pink-700)'],['Entregue','var(--green-100)','#1F8A48'],['Cancelado','#FBE0E0','#C0392B']];
  return (
    <div className="scroll">
      <div className="sh">
        <div className="bk">{Ico.back('var(--ink)',20)}</div>
        <div className="sh-t"><h1>Novo pedido</h1></div>
        <div className="sh-act"><div className="act-pill" style={{background:'var(--pink)',color:'#fff'}}>Salvar</div></div>
      </div>
      <div className="body" style={{paddingTop:14,gap:13}}>
        <Sec2>Cliente</Sec2>
        <div className="field"><div className="input">{Ico.users('var(--ink-3)',18)}<span style={{color:'var(--ink)'}}>Dona Ana</span></div></div>
        <div className="field"><div className="input">{Ico.phone('var(--ink-3)',18)}<span className="ph-txt">(11) 98888-7777</span></div></div>

        <Sec2>Produto</Sec2>
        <div className="field"><div className="input"><div className="gi" style={{width:30,height:30,borderRadius:9,background:'linear-gradient(135deg,#FF8FB6,#EA4B92)'}}></div><span style={{color:'var(--ink)'}}>Bolo de Aniversário</span><span style={{marginLeft:'auto'}}>{Ico.chevR('var(--ink-3)',16)}</span></div></div>
        <div className="two">
          <div className="field"><label>Qtd</label><div className="input"><span style={{color:'var(--ink)'}}>1</span></div></div>
          <div className="field"><label>Preço un.</label><div className="input"><span className="ph-txt">R$</span><span style={{color:'var(--ink)'}}>120,00</span></div></div>
        </div>

        <Sec2>Entrega</Sec2>
        <div className="two">
          <div className="field"><label>Data</label><div className="input"><span style={{color:'var(--ink)'}}>29-05-2026</span></div></div>
          <div className="field"><label>Horário</label><div className="input"><span style={{color:'var(--ink)'}}>16:00</span></div></div>
        </div>

        <Sec2>Status</Sec2>
        <div className="ugrid">{status.map((s,i)=>(<span key={i} className="uchip" style={{background:s[1],color:s[2],boxShadow:s[3]?'0 0 0 2px '+s[2]:'var(--shadow)'}}>{s[0]}</span>))}</div>

        <Sec2>Pagamentos</Sec2>
        <div className="gcard"><div className="grow"><div className="gi" style={{background:'var(--blue-50)'}}>{Ico.pix('var(--blue)',16)}</div><div className="gt"><b>Pix</b><span>hoje</span></div><div className="gv" style={{color:'var(--green)'}}>R$ 50,00</div></div></div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0 4px'}}>
          <span style={{fontSize:13,fontWeight:700,color:'var(--ink-2)'}}>Restante</span>
          <span style={{fontFamily:'Baloo 2',fontWeight:700,fontSize:16,color:'var(--pink)'}}>R$ 70,00</span>
        </div>
        <div className="btn btn-primary" style={{height:54,fontSize:16}}>Salvar pedido</div>
        <div style={{height:24}}></div>
      </div>
    </div>
  );
}

function ClientsScreen(){
  const list=[
    {n:'Dona Ana',p:'(11) 98888-7777',b:'12 de junho',soon:true,i:'A',bg:'linear-gradient(135deg,#FF8FB6,#EA4B92)'},
    {n:'Festa Lúcia',p:'(11) 97777-6666',b:'03 de março',i:'L',bg:'linear-gradient(135deg,#2BA7DD,#1A6F96)'},
    {n:'Carlos Mendes',p:'(11) 96666-5555',b:'28 de agosto',i:'C',bg:'linear-gradient(135deg,#FFB01F,#F2960B)'},
    {n:'Juliana Reis',p:'(11) 95555-4444',b:'15 de novembro',i:'J',bg:'linear-gradient(135deg,#43BE6E,#2BA060)'},
  ];
  return (
    <div className="scroll" style={{position:'relative'}}>
      <div className="sh">
        <div className="sh-t" style={{marginLeft:2}}><h1>Clientes</h1><div className="ssub">38 cadastrados</div></div>
        <div className="sh-act"><div className="act-pill" style={{background:'var(--pink)',color:'#fff'}}>{Ico.plus('#fff',18)} Novo</div></div>
      </div>
      <div className="body" style={{paddingTop:12,gap:12}}>
        <div className="searchbar">{Ico.search('var(--ink-3)',19)} Buscar cliente…</div>
        <div className="gcard">
          {list.map((c,i)=>(
            <div className="grow" key={i}>
              <div className="thumb" style={{width:42,height:42,background:c.bg}}>{c.soon?Ico.cake('#fff',20):c.i}</div>
              <div className="gt"><b style={{display:'flex',alignItems:'center',gap:7}}>{c.n}{c.soon&&<span className="badge b-pink">{Ico.cake('var(--pink-700)',12)} Aniversário</span>}</b><span>{c.p} · {c.b}</span></div>
              <div className="icobtn" style={{background:'var(--green-100)'}}>{Ico.whats('var(--green)',17)}</div>
            </div>
          ))}
        </div>
        <div style={{height:70}}></div>
      </div>
      <div className="fab">{Ico.plus('#fff',26)}</div>
    </div>
  );
}

function CreateClientScreen(){
  return (
    <div className="scroll">
      <div className="sh">
        <div className="bk">{Ico.back('var(--ink)',20)}</div>
        <div className="sh-t"><h1>Novo cliente</h1></div>
        <div className="sh-act"><div className="act-pill" style={{background:'var(--pink)',color:'#fff'}}>Salvar</div></div>
      </div>
      <div className="body" style={{paddingTop:14,gap:13}}>
        <Sec2>Dados pessoais</Sec2>
        <div className="field"><label>Nome</label><div className="input">{Ico.users('var(--ink-3)',18)}<span style={{color:'var(--ink)'}}>Dona Ana</span></div></div>
        <div className="field"><label>Telefone</label><div className="input">{Ico.phone('var(--ink-3)',18)}<span className="ph-txt">(11) 98888-7777</span></div></div>
        <div className="field"><label>E-mail</label><div className="input">{Ico.mail('var(--ink-3)',18)}<span className="ph-txt">ana@email.com</span></div></div>
        <Sec2>Aniversário</Sec2>
        <div className="two">
          <div className="field"><label>Dia</label><div className="input"><span style={{color:'var(--ink)'}}>12</span></div></div>
          <div className="field"><label>Mês</label><div className="input"><span style={{color:'var(--ink)'}}>Junho</span><span style={{marginLeft:'auto'}}>{Ico.chevR('var(--ink-3)',16)}</span></div></div>
        </div>
        <Sec2>Endereço</Sec2>
        <div className="field"><div className="input area"><span className="ph-txt">Rua, número, bairro…</span></div></div>
        <Sec2>Observações</Sec2>
        <div className="field"><div className="input area"><span className="ph-txt">Ex: prefere chocolate meio amargo</span></div></div>
        <div className="btn btn-primary" style={{height:54,fontSize:16}}>Salvar cliente</div>
        <div style={{height:24}}></div>
      </div>
    </div>
  );
}

Object.assign(window,{OrdersScreen,CreateOrderScreen,ClientsScreen,CreateClientScreen});
