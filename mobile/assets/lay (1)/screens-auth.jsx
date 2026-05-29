// screens-auth.jsx — Login, Register, ForgotPassword, Onboarding
function LoginScreen(){
  return (
    <div className="scroll">
      <div className="auth-hero">
        <div className="deco" style={{width:150,height:150,left:-40,top:-50}}></div>
        <div className="deco" style={{width:90,height:90,right:-20,bottom:-30}}></div>
        <div className="auth-logo"><img src="assets/logo.png" alt="DocePreço"/></div>
        <h1>Bem-vindo de volta</h1>
        <p>Entre para precificar seus doces</p>
      </div>
      <div className="body" style={{paddingTop:24,gap:15}}>
        <div className="field"><label>E-mail</label>
          <div className="input">{Ico.mail('var(--ink-3)',18)}<span className="ph-txt">marina@confeitaria.com</span></div></div>
        <div className="field"><label>Senha</label>
          <div className="input">{Ico.lock('var(--ink-3)',18)}<span style={{letterSpacing:3,color:'var(--ink)'}}>••••••••</span><span style={{marginLeft:'auto'}}>{Ico.eye('var(--ink-3)',18)}</span></div></div>
        <div style={{textAlign:'right',marginTop:-4}}><span className="link">Esqueci a senha</span></div>
        <div className="btn btn-primary" style={{height:52,marginTop:2}}>Entrar</div>
        <div className="divider">ou</div>
        <div className="btn btn-ghost" style={{height:52}}>{Ico.spark('var(--pink)',16)} Experimentar sem conta</div>
        <div style={{textAlign:'center',fontSize:13.5,color:'var(--ink-2)',fontWeight:600,marginTop:4}}>Não tem conta? <span className="link">Criar conta</span></div>
        <div style={{textAlign:'center',fontSize:11,color:'var(--ink-3)',fontWeight:600}}>Versão 1.0.0</div>
        <div style={{height:20}}></div>
      </div>
    </div>
  );
}

function RegisterScreen(){
  return (
    <div className="scroll">
      <div className="auth-hero">
        <div className="deco" style={{width:150,height:150,left:-40,top:-50}}></div>
        <div className="auth-logo"><img src="assets/logo.png" alt="DocePreço"/></div>
        <h1>Criar sua conta</h1>
        <p>Comece a lucrar mais hoje</p>
      </div>
      <div className="body" style={{paddingTop:22,gap:14}}>
        <div className="field"><label>Nome da empresa</label>
          <div className="input">{Ico.chef('var(--ink-3)',18)}<span className="ph-txt">Doces da Marina</span></div></div>
        <div className="field"><label>E-mail</label>
          <div className="input">{Ico.mail('var(--ink-3)',18)}<span className="ph-txt">marina@confeitaria.com</span></div></div>
        <div className="field"><label>Telefone</label>
          <div className="input"><span style={{fontWeight:700,color:'var(--ink)'}}>+55</span>{Ico.chevR('var(--ink-3)',14)}<span className="ph-txt" style={{marginLeft:2}}>(11) 99999-9999</span></div></div>
        <div className="field"><label>Senha</label>
          <div className="input">{Ico.lock('var(--ink-3)',18)}<span className="ph-txt">Mínimo 6 caracteres</span><span style={{marginLeft:'auto'}}>{Ico.eye('var(--ink-3)',18)}</span></div></div>
        <div className="btn btn-primary" style={{height:52,marginTop:4}}>Criar conta</div>
        <div style={{textAlign:'center',fontSize:13.5,color:'var(--ink-2)',fontWeight:600}}>Já tem conta? <span className="link">Entrar</span></div>
        <div style={{height:20}}></div>
      </div>
    </div>
  );
}

function ForgotScreen(){
  const steps=['E-mail','Código','Nova senha'];
  return (
    <div className="scroll">
      <div className="sh">
        <div className="bk">{Ico.back('var(--ink)',20)}</div>
        <div className="sh-t"><h1>Recuperar senha</h1><div className="ssub">Etapa 2 de 3</div></div>
      </div>
      <div className="body" style={{paddingTop:16,gap:18}}>
        {/* stepper */}
        <div style={{display:'flex',gap:8}}>
          {steps.map((s,i)=>(
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
              <div style={{height:5,borderRadius:99,background:i<=1?'var(--pink)':'var(--pink-100)'}}></div>
              <span style={{fontSize:11,fontWeight:700,color:i<=1?'var(--pink)':'var(--ink-3)'}}>{s}</span>
            </div>
          ))}
        </div>

        <div className="banner" style={{background:'linear-gradient(120deg,var(--green-100),#fff)',borderColor:'var(--green-100)'}}>
          <div className="qa-ico" style={{width:38,height:38,background:'#fff'}}>{Ico.mail('var(--green)',18)}</div>
          <div className="bt"><b>Código enviado!</b><span>Confira o e-mail marina@confeitaria.com</span></div>
        </div>

        <div className="field"><label>Digite o código de 6 dígitos</label>
          <div className="code-row">
            {['4','9','2','','',''].map((d,i)=>(
              <div className={'code-box'+(d?' fill':'')} key={i}>{d}</div>
            ))}
          </div>
        </div>
        <div style={{textAlign:'center'}}><span className="link">Reenviar código</span></div>
        <div className="btn btn-primary" style={{height:52}}>Confirmar código</div>
      </div>
    </div>
  );
}

function OnboardingScreen(){
  return (
    <div className="scroll">
      <div style={{padding:'54px 20px 0',display:'flex',justifyContent:'flex-end'}}>
        <span style={{fontSize:14,fontWeight:700,color:'var(--ink-2)'}}>Pular</span>
      </div>
      <div className="body" style={{paddingTop:18,gap:24,justifyContent:'center'}}>
        <div className="ob-art" style={{background:'linear-gradient(150deg,#FFE3EF,#FFF1CE)'}}>
          <div className="deco" style={{position:'absolute',width:120,height:120,borderRadius:'50%',background:'rgba(255,255,255,.4)',top:-30,right:-20}}></div>
          <div style={{width:130,height:130,borderRadius:40,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 14px 30px rgba(216,55,127,.18)'}}>
            {Ico.scale('var(--pink)',64)}
          </div>
        </div>
        <div style={{textAlign:'center',padding:'0 14px'}}>
          <h1 style={{fontSize:27,lineHeight:1.12}}>Calcule o custo real<br/>de cada receita</h1>
          <p style={{fontSize:15,color:'var(--ink-2)',fontWeight:500,marginTop:10,lineHeight:1.45}}>Some ingredientes, embalagem e mão de obra. O DocePreço mostra quanto cobrar pra lucrar de verdade.</p>
        </div>
        <div className="dots"><span className="d"></span><span className="d on"></span><span className="d"></span><span className="d"></span></div>
      </div>
      <div style={{padding:'0 20px 40px'}}>
        <div className="btn btn-primary" style={{height:54,fontSize:16}}>Próximo {Ico.chevR('#fff',18)}</div>
      </div>
    </div>
  );
}

Object.assign(window,{LoginScreen,RegisterScreen,ForgotScreen,OnboardingScreen});
