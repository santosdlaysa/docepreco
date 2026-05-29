// screen-paywall.jsx — PRO paywall
function PaywallScreen({onClose}){
  const feats=[
    'Ingredientes e receitas ilimitados',
    'Seu logo personalizado no PDF',
    'Relatórios avançados com gráficos',
    'Gestão de clientes e aniversários',
    'Sistema de pedidos e entregas',
    'Cálculo de mão de obra',
    'Lista de compras inteligente',
    'Templates de receitas prontos',
    'Precificação sazonal avançada',
  ];
  return (
    <div className="scroll">
      <div className="pw-hero">
        <div className="deco" style={{width:150,height:150,left:-40,top:-50}}></div>
        <div className="deco" style={{width:90,height:90,right:-20,bottom:-30}}></div>
        <div className="pw-close" onClick={onClose}>{Ico.close('#fff',20)}</div>
        <div className="pw-crown">{Ico.crown('#FFE08A',26)}</div>
        <h1>Tudo ilimitado para<br/>sua confeitaria</h1>
        <p>Desbloqueie 9 recursos PRO e leve seu negócio de doces a sério.</p>
      </div>

      <div className="body" style={{paddingTop:24,gap:16}}>
        {/* plan selector */}
        <div className="plans">
          <div className="plan">
            <div className="radio"></div>
            <div className="pn">Mensal</div>
            <div className="pp">R$ 14<small>,90</small></div>
            <div className="pper">por mês</div>
          </div>
          <div className="plan on">
            <div className="save">Economize 50%</div>
            <div className="radio">{Ico.check('#fff',12)}</div>
            <div className="pn">Anual</div>
            <div className="pp">R$ 7<small>,49</small></div>
            <div className="pper">R$ 89,90/ano</div>
          </div>
        </div>

        {/* features */}
        <div className="feat-card">
          {feats.map((f,i)=>(
            <div className="feat" key={i}>
              <div className="fc">{Ico.check('var(--green)',16)}</div>
              <b>{f}</b>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="btn btn-primary" onClick={onClose} style={{height:54,fontSize:17,borderRadius:18}}>
          {Ico.crown('#fff',20)} Começar agora
        </div>
        <div className="pw-foot">
          7 dias grátis · depois R$ 89,90/ano · cancele quando quiser
        </div>
        <div className="pw-links">{Ico.pix('var(--blue)',16)} Pagar com PIX · Restaurar compra</div>

        <div style={{height:44}}></div>
      </div>
    </div>
  );
}
window.PaywallScreen = PaywallScreen;
