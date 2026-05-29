// screens-misc.jsx — PremiumAd, PixPayment, SupportChat, BeginnerGuide, PrivacyPolicy
function PremiumAdScreen(){
  const benefits=['Receitas e ingredientes ilimitados','Calculadora de escala de produção','Duplicar receitas em 1 toque','Agenda de pedidos e entregas','Gestão completa de clientes','Calculadora de mão de obra','Relatórios completos com gráficos','PDF com seu logo e cores'];
  return (
    <div className="scroll">
      <div className="body" style={{paddingTop:60,gap:16,justifyContent:'center'}}>
        <div style={{textAlign:'center'}}>
          <div style={{width:96,height:96,borderRadius:30,margin:'0 auto 16px',background:'linear-gradient(140deg,#FFE08A,#FFB01F)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 14px 30px rgba(255,176,31,.35)'}}>{Ico.crown('#fff',46)}</div>
          <h1 style={{fontSize:26,lineHeight:1.12}}>Desbloqueie todo<br/>o potencial</h1>
          <p style={{fontSize:14.5,color:'var(--ink-2)',fontWeight:500,marginTop:8,padding:'0 10px',lineHeight:1.45}}>8 recursos para profissionalizar sua confeitaria de vez.</p>
        </div>
        <div className="feat-card">
          {benefits.map((b,i)=>(<div className="feat" key={i}><div className="fc">{Ico.check('var(--green)',16)}</div><b>{b}</b></div>))}
        </div>
        <div className="btn btn-primary" style={{height:54,fontSize:16}}>{Ico.crown('#fff',20)} Ver planos</div>
        <div style={{textAlign:'center',fontSize:14,fontWeight:700,color:'var(--ink-2)'}}>Agora não</div>
        <div style={{height:20}}></div>
      </div>
    </div>
  );
}

function QR(){
  // deterministic pseudo-QR built from simple squares
  const N=21, cells=[];
  const finder=(ox,oy)=>{for(let y=0;y<7;y++)for(let x=0;x<7;x++){const edge=x===0||x===6||y===0||y===6;const core=x>=2&&x<=4&&y>=2&&y<=4;if(edge||core)cells.push([ox+x,oy+y]);}};
  finder(0,0);finder(N-7,0);finder(0,N-7);
  let seed=7;const rnd=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const inF=(x<8&&y<8)||(x>N-9&&y<8)||(x<8&&y>N-9);
    if(!inF&&rnd()>0.55)cells.push([x,y]);
  }
  return (<svg viewBox="0 0 21 21" shapeRendering="crispEdges">{cells.map((c,i)=>(<rect key={i} x={c[0]} y={c[1]} width="1" height="1" fill="#3D2233"/>))}</svg>);
}

function PixPaymentScreen(){
  return (
    <div className="scroll">
      <div className="sh">
        <div className="bk">{Ico.back('var(--ink)',20)}</div>
        <div className="sh-t"><h1>Pagar com Pix</h1></div>
      </div>
      <div className="body" style={{paddingTop:14,gap:15}}>
        <div className="plans">
          <div className="plan"><div className="radio"></div><div className="pn">Mensal</div><div className="pp">R$ 10</div><div className="pper">por mês</div></div>
          <div className="plan on"><div className="save">Economize 33%</div><div className="radio">{Ico.check('#fff',12)}</div><div className="pn">Anual</div><div className="pp">R$ 120</div><div className="pper">R$ 10/mês</div></div>
        </div>
        <div className="gcard" style={{padding:18,textAlign:'center'}}>
          <div className="qr"><QR/></div>
          <div style={{fontSize:13,color:'var(--ink-2)',fontWeight:600,marginTop:12}}>Escaneie o QR Code com o app do seu banco</div>
        </div>
        <div className="field"><label>Pix copia e cola</label>
          <div className="input" style={{alignItems:'center'}}><span style={{color:'var(--ink-2)',fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>00020126580014br.gov.bcb.pix0136a1f3…</span>
            <div className="icobtn" style={{background:'var(--pink-50)'}}>{Ico.copy('var(--pink)',16)}</div></div></div>
        <div className="gcard" style={{padding:'4px 16px'}}>
          {[['Abra o app do seu banco'],['Cole o código ou escaneie o QR'],['Confirme o pagamento']].map((s,i)=>(
            <div className="grow" key={i}><div className="gi" style={{background:'var(--pink-50)',fontFamily:'Baloo 2',fontWeight:800,color:'var(--pink)'}}>{i+1}</div><div className="gt"><b style={{fontWeight:600}}>{s[0]}</b></div></div>
          ))}
        </div>
        <div className="btn btn-primary" style={{height:54,fontSize:16,background:'linear-gradient(140deg,#34C97B,var(--green))',boxShadow:'0 10px 20px rgba(67,190,110,.35)'}}>{Ico.check('#fff',18)} Já fiz o pagamento</div>
        <div style={{height:24}}></div>
      </div>
    </div>
  );
}

function Msg({side,text,time}){
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:side==='me'?'flex-end':'flex-start'}}>
      <div className={'bubble '+side}>{text}</div>
      <div className="btime">{time}</div>
    </div>
  );
}
function SupportChatScreen(){
  return (
    <div className="scroll" style={{background:'var(--cream)'}}>
      <div className="sh" style={{paddingBottom:14,borderBottom:'1px solid var(--line)',background:'rgba(255,255,255,.7)'}}>
        <div className="bk">{Ico.back('var(--ink)',20)}</div>
        <div className="thumb" style={{width:40,height:40,background:'linear-gradient(140deg,#FF8FB6,#EA4B92)'}}>{Ico.chat('#fff',18)}</div>
        <div className="sh-t"><h1 style={{fontSize:18}}>Suporte DocePreço</h1><div className="ssub" style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:7,height:7,borderRadius:99,background:'var(--green)',display:'inline-block'}}></span>online agora</div></div>
      </div>
      <div className="body" style={{paddingTop:16,gap:10,justifyContent:'flex-end'}}>
        <div style={{textAlign:'center',fontSize:11.5,color:'var(--ink-3)',fontWeight:600,marginBottom:4}}>Hoje</div>
        <Msg side="them" text="Oi Marina! 👋 Como podemos ajudar você hoje?" time="14:02"/>
        <Msg side="me" text="Como faço pra adicionar uma sub-receita?" time="14:05"/>
        <Msg side="them" text="Ótima pergunta! Ao criar a receita, role até a seção 'Sub-receitas' e toque em adicionar — dá pra usar outra receita como ingrediente." time="14:06"/>
        <div className="typing"><i></i><i style={{opacity:.6}}></i><i style={{opacity:.3}}></i></div>
      </div>
      <div className="chat-input">
        <div className="ci-field">Escreva uma mensagem…</div>
        <div className="chat-send">{Ico.share('#fff',18)}</div>
      </div>
    </div>
  );
}

function BeginnerGuideScreen(){
  const steps=[
    {n:'1',t:'Cadastre seu primeiro ingrediente',s:'done',d:'Adicione preço e quantidade de compra.'},
    {n:'2',t:'Crie sua primeira receita',s:'current',d:'Junte ingredientes, rendimento e margem de lucro. O preço sugerido aparece sozinho.'},
    {n:'3',t:'Veja o preço sugerido',s:'lock',d:'Descubra quanto cobrar para lucrar.'},
  ];
  const stColor={done:['var(--green)','#fff'],current:['var(--pink)','#fff'],lock:['var(--cream-2)','var(--ink-3)']};
  return (
    <div className="scroll">
      <div className="sh">
        <div className="bk">{Ico.back('var(--ink)',20)}</div>
        <div className="sh-t"><h1>Primeiros passos</h1></div>
        <div className="sh-act"><div className="act-pill">Pular</div></div>
      </div>
      <div className="body" style={{paddingTop:14,gap:16}}>
        <div className="hero" style={{padding:'18px'}}>
          <div className="deco" style={{width:110,height:110,right:-26,top:-36}}></div>
          <div style={{display:'flex',alignItems:'center',gap:13}}>
            <div style={{width:52,height:52,borderRadius:17,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>{Ico.school('#fff',26)}</div>
            <div><div style={{fontFamily:'Baloo 2',fontWeight:700,fontSize:19}}>Vamos começar!</div><div style={{fontSize:13,opacity:.92,fontWeight:500}}>1 de 3 passos concluídos</div></div>
          </div>
          <div style={{height:8,borderRadius:99,background:'rgba(255,255,255,.25)',marginTop:14,overflow:'hidden'}}><div style={{width:'33%',height:'100%',borderRadius:99,background:'#fff'}}></div></div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:18}}>
          {steps.map((st,i)=>(
            <div className="step" key={i}>
              {i<steps.length-1&&<div className="conn"></div>}
              <div className="snum" style={{background:stColor[st.s][0],color:stColor[st.s][1]}}>{st.s==='done'?Ico.check('#fff',20):(st.s==='lock'?Ico.lock('var(--ink-3)',16):st.n)}</div>
              <div className="sbody" style={st.s==='current'?{border:'2px solid var(--pink)'}:{opacity:st.s==='lock'?.65:1}}>
                <b style={{fontFamily:'Baloo 2',fontSize:15.5,display:'block',lineHeight:1.15}}>{st.t}</b>
                <span style={{fontSize:12.5,color:'var(--ink-2)',fontWeight:500,display:'block',marginTop:5,lineHeight:1.4}}>{st.d}</span>
                {st.s==='current'&&<div className="btn btn-primary" style={{height:42,fontSize:14,marginTop:11}}>Criar receita {Ico.chevR('#fff',16)}</div>}
              </div>
            </div>
          ))}
        </div>
        <div style={{height:20}}></div>
      </div>
    </div>
  );
}

function PrivacyScreen(){
  const secs=[
    ['Informações que coletamos','Coletamos os dados que você fornece ao criar sua conta (nome da empresa, e-mail e telefone) e as informações de receitas, ingredientes, vendas e clientes que você cadastra no app.'],
    ['Como usamos','Usamos seus dados exclusivamente para operar o app: calcular custos, gerar relatórios e orçamentos, e enviar notificações que você autorizar.'],
    ['Armazenamento e segurança','Seus dados são armazenados de forma criptografada e protegidos por autenticação. Não vendemos nem compartilhamos suas informações comerciais.'],
    ['Compartilhamento','Compartilhamos dados apenas com serviços essenciais ao funcionamento (pagamentos e notificações), sempre sob acordos de confidencialidade.'],
    ['Seus direitos (LGPD)','Você pode acessar, corrigir ou excluir seus dados a qualquer momento pelo app, ou solicitar a exclusão completa da sua conta.'],
  ];
  return (
    <div className="scroll">
      <div className="sh">
        <div className="bk">{Ico.back('var(--ink)',20)}</div>
        <div className="sh-t"><h1>Política de Privacidade</h1><div className="ssub">Atualizada em maio de 2026</div></div>
      </div>
      <div className="body" style={{paddingTop:14,gap:18}}>
        <div style={{display:'flex',alignItems:'center',gap:12,background:'var(--blue-50)',border:'1px solid var(--blue-100)',borderRadius:16,padding:'13px 15px'}}>
          {Ico.shield('var(--blue)',22)}<span style={{fontSize:13,color:'var(--ink)',fontWeight:600,lineHeight:1.4}}>Levamos a sério a proteção dos seus dados, em conformidade com a LGPD.</span>
        </div>
        {secs.map((s,i)=>(
          <div key={i}>
            <h3 style={{fontSize:16,marginBottom:6}}>{s[0]}</h3>
            <p style={{fontSize:13.5,color:'var(--ink-2)',fontWeight:500,lineHeight:1.55,margin:0,textWrap:'pretty'}}>{s[1]}</p>
          </div>
        ))}
        <div style={{height:20}}></div>
      </div>
    </div>
  );
}

Object.assign(window,{PremiumAdScreen,PixPaymentScreen,SupportChatScreen,BeginnerGuideScreen,PrivacyScreen});
