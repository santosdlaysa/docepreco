// screens-profile.jsx — Profile, PdfSettings
function NavRow({icon,bg,c,label,detail,right,last}){
  return (
    <div className="grow" style={last?{}:{}}>
      <div className="gi" style={{background:bg}}>{icon(c,18)}</div>
      <div className="gt"><b style={{fontWeight:600}}>{label}</b>{detail&&<span>{detail}</span>}</div>
      {right||<span>{Ico.chevR('var(--ink-3)',16)}</span>}
    </div>
  );
}

function ProfileScreen(){
  return (
    <div className="scroll">
      <div style={{padding:'54px 18px 0',display:'flex',flexDirection:'column',alignItems:'center'}}>
        <div style={{position:'relative'}}>
          <div style={{width:88,height:88,borderRadius:30,background:'linear-gradient(140deg,#FF8FB6,#EA4B92)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Baloo 2',fontWeight:800,fontSize:34,color:'#fff',boxShadow:'0 10px 22px rgba(216,55,127,.3)'}}>DM</div>
          <div style={{position:'absolute',right:-4,bottom:-4,width:32,height:32,borderRadius:11,background:'#fff',boxShadow:'var(--shadow)',display:'flex',alignItems:'center',justifyContent:'center'}}>{Ico.camera('var(--ink-2)',16)}</div>
        </div>
        <div style={{fontFamily:'Baloo 2',fontWeight:700,fontSize:22,marginTop:12}}>Doces da Marina</div>
        <div style={{fontSize:13,color:'var(--ink-2)',fontWeight:600}}>marina@confeitaria.com</div>
        <div className="chip chip-pro" style={{marginTop:10}}>{Ico.crown('#7A4E00',14)} PRO ativo</div>
      </div>
      <div className="body" style={{paddingTop:20,gap:14}}>
        <div className="gcard">
          <NavRow icon={Ico.phone} bg="var(--blue-50)" c="var(--blue)" label="Telefone" detail="+55 (11) 99999-9999"/>
          <NavRow icon={Ico.insta} bg="var(--pink-50)" c="var(--pink)" label="Instagram" detail="@docesdamarina"/>
        </div>

        <div className="pro-cta" style={{background:'linear-gradient(120deg,#FFF1CE,#FFE3EF)'}}>
          <div className="pc-ico">{Ico.crown('var(--pink)',24)}</div>
          <div className="pc-t"><b>Plano PRO ativo</b><span>Renova em 12 de junho de 2026</span></div>
        </div>

        <div style={{fontSize:13,fontWeight:700,color:'var(--ink-2)',margin:'2px 4px -4px'}}>Conta</div>
        <div className="gcard">
          <NavRow icon={Ico.doc} bg="var(--pink-50)" c="var(--pink)" label="Personalizar PDF"/>
          <NavRow icon={Ico.key} bg="var(--cream-2)" c="var(--ink-2)" label="Alterar senha"/>
          <NavRow icon={Ico.bell} bg="var(--yellow-100)" c="#C8870B" label="Notificações" right={<div className="switch on"><div className="knob"></div></div>}/>
        </div>

        <div style={{fontSize:13,fontWeight:700,color:'var(--ink-2)',margin:'2px 4px -4px'}}>Ajuda</div>
        <div className="gcard">
          <NavRow icon={Ico.chat} bg="var(--blue-50)" c="var(--blue)" label="Chat de suporte"/>
          <NavRow icon={Ico.whats} bg="var(--green-100)" c="var(--green)" label="WhatsApp do suporte"/>
          <NavRow icon={Ico.spark} bg="var(--pink-50)" c="var(--pink)" label="Enviar sugestão"/>
          <NavRow icon={Ico.shield} bg="var(--cream-2)" c="var(--ink-2)" label="Política de privacidade"/>
        </div>

        <div className="btn btn-ghost" style={{height:50,color:'#C0392B'}}>Sair da conta</div>
        <div style={{textAlign:'center',fontSize:12.5,color:'var(--ink-3)',fontWeight:600}}>Excluir minha conta</div>
        <div style={{height:24}}></div>
      </div>
    </div>
  );
}

function PdfSettingsScreen(){
  const colors=['#EA4B92','#2BA7DD','#43BE6E','#FFB01F','#9B59B6','#E8702A','#3D2233','#1ABC9C'];
  return (
    <div className="scroll">
      <div className="sh">
        <div className="bk">{Ico.back('var(--ink)',20)}</div>
        <div className="sh-t"><h1>Personalizar PDF</h1></div>
        <div className="sh-act"><div className="act-pill" style={{background:'var(--pink)',color:'#fff'}}>Salvar</div></div>
      </div>
      <div className="body" style={{paddingTop:14,gap:16}}>
        <div className="field"><label>Logo da empresa</label>
          <div className="gcard" style={{padding:14,display:'flex',alignItems:'center',gap:13}}>
            <div className="logo-badge" style={{width:54,height:54,borderRadius:16}}><img src="assets/logo.png" alt=""/></div>
            <div style={{flex:1}}><b style={{fontSize:14,fontWeight:700}}>logo-marina.png</b><div style={{fontSize:12,color:'var(--ink-2)',fontWeight:500}}>Aparece no topo do orçamento</div></div>
            <div className="icobtn">{Ico.edit('var(--ink-2)',15)}</div>
          </div>
        </div>
        <div className="field"><label>Cor da marca</label>
          <div className="swatches">{colors.map((c,i)=>(<div className={'sw'+(i===0?' on':'')} key={i} style={{background:c}}></div>))}</div>
          <span className="hint">Ou use um código hex personalizado</span></div>
        <div className="field"><label>Slogan</label>
          <div className="input"><span style={{color:'var(--ink)'}}>Feito com amor e açúcar 🍰</span></div></div>
        <div className="gcard" style={{padding:'13px 15px',display:'flex',alignItems:'center',gap:12}}>
          <div className="gt"><b style={{fontWeight:600}}>Remover marca d'água</b><span>Oculta "Gerado pelo DocePreço"</span></div>
          <div className="switch on"><div className="knob"></div></div>
        </div>
        <div className="btn btn-ghost" style={{height:52}}>{Ico.doc('var(--pink)',18)} Visualizar exemplo</div>
        <div className="btn btn-primary" style={{height:52}}>Salvar configurações</div>
        <div style={{height:24}}></div>
      </div>
    </div>
  );
}

Object.assign(window,{ProfileScreen,PdfSettingsScreen});
