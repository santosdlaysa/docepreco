// ui.jsx — shared icons + small components for DocePreço screens
const Ico = {
  home:(c='currentColor',s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 11l8-6 8 6v8a1.5 1.5 0 01-1.5 1.5H5.5A1.5 1.5 0 014 19z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><path d="M9.5 20.5V14h5v6.5" stroke={c} strokeWidth="2" strokeLinejoin="round"/></svg>),
  book:(c='currentColor',s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 4.5h9a3 3 0 013 3V20a2.5 2.5 0 00-2.5-2.5H5z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><path d="M19 4.5h-0a2 2 0 00-2 2V20" stroke={c} strokeWidth="2" strokeLinejoin="round"/></svg>),
  cart:(c='currentColor',s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M3 4h2l1.6 11a1.5 1.5 0 001.5 1.3h8.3a1.5 1.5 0 001.5-1.2L19.5 8H6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="20" r="1.5" fill={c}/><circle cx="17" cy="20" r="1.5" fill={c}/></svg>),
  grid:(c='currentColor',s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="7" height="7" rx="2" stroke={c} strokeWidth="2"/><rect x="13" y="4" width="7" height="7" rx="2" stroke={c} strokeWidth="2"/><rect x="4" y="13" width="7" height="7" rx="2" stroke={c} strokeWidth="2"/><rect x="13" y="13" width="7" height="7" rx="2" stroke={c} strokeWidth="2"/></svg>),
  plus:(c='currentColor',s=26)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke={c} strokeWidth="2.6" strokeLinecap="round"/></svg>),
  search:(c='currentColor',s=19)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke={c} strokeWidth="2"/><path d="M16 16l4 4" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>),
  chef:(c='currentColor',s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M7 13.5a3.5 3.5 0 01-1-6.85A3.5 3.5 0 0112 5a3.5 3.5 0 016 1.65A3.5 3.5 0 0117 13.5z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><path d="M7 13.5V19h10v-5.5" stroke={c} strokeWidth="2" strokeLinejoin="round"/></svg>),
  tag:(c='currentColor',s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 4h7.5L20 12.5 12.5 20 4 11.5z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><circle cx="8.5" cy="8.5" r="1.4" fill={c}/></svg>),
  doc:(c='currentColor',s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M6 3.5h7l5 5V20a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 016 20z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><path d="M13 3.5V9h5" stroke={c} strokeWidth="2" strokeLinejoin="round"/></svg>),
  back:(c='currentColor',s=20)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  share:(c='currentColor',s=19)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 15V4m0 0L8 8m4-4l4 4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 13v5.5A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5V13" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>),
  star:(c='currentColor',s=14)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 18l-5.8 3 1.1-6.5-4.7-4.6 6.5-.95z"/></svg>),
  spark:(c='currentColor',s=18)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12 2l1.6 5.9L19.5 9l-5.9 1.6L12 16l-1.6-5.4L4.5 9l5.9-1.1z"/></svg>),
  scale:(c='currentColor',s=20)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 4v15M7 19h10" stroke={c} strokeWidth="2" strokeLinecap="round"/><path d="M12 6L5 9l2.5 4a3 3 0 01-5 0L5 9M12 6l7 3-2.5 4a3 3 0 005 0L19 9" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/></svg>),
  box:(c='currentColor',s=20)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 3l8 4v10l-8 4-8-4V7z" stroke={c} strokeWidth="1.9" strokeLinejoin="round"/><path d="M4 7l8 4 8-4M12 11v9" stroke={c} strokeWidth="1.9" strokeLinejoin="round"/></svg>),
  check:(c='currentColor',s=16)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke={c} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  crown:(c='currentColor',s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M3 8l4 4 5-7 5 7 4-4-1.5 12H4.5z"/></svg>),
  close:(c='currentColor',s=20)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke={c} strokeWidth="2.4" strokeLinecap="round"/></svg>),
  pix:(c='currentColor',s=18)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 3.2l8.8 8.8L12 20.8 3.2 12z" stroke={c} strokeWidth="2" strokeLinejoin="round"/></svg>),
  lock:(c='currentColor',s=13)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" stroke={c} strokeWidth="2"/><path d="M8 10.5V8a4 4 0 018 0v2.5" stroke={c} strokeWidth="2"/></svg>),
  users:(c='currentColor',s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke={c} strokeWidth="2"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke={c} strokeWidth="2" strokeLinecap="round"/><path d="M16 6.2A3 3 0 0118 12M17 14.5c2.4.4 4 2.3 4 4.5" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>),
  clipboard:(c='currentColor',s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="5" y="5" width="14" height="16" rx="2.5" stroke={c} strokeWidth="2"/><rect x="9" y="3" width="6" height="4" rx="1.5" stroke={c} strokeWidth="2"/><path d="M9 12h6M9 16h4" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>),
  chart:(c='currentColor',s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 20V4M4 20h16" stroke={c} strokeWidth="2" strokeLinecap="round"/><path d="M8 16v-3M12 16v-7M16 16v-5" stroke={c} strokeWidth="2.4" strokeLinecap="round"/></svg>),
  list:(c='currentColor',s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M9 6h11M9 12h11M9 18h11" stroke={c} strokeWidth="2" strokeLinecap="round"/><path d="M4 6h.01M4 12h.01M4 18h.01" stroke={c} strokeWidth="2.4" strokeLinecap="round"/></svg>),
  chevR:(c='currentColor',s=18)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  eye:(c='currentColor',s=20)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke={c} strokeWidth="2"/></svg>),
  mail:(c='currentColor',s=20)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" stroke={c} strokeWidth="2"/><path d="M4 7l8 6 8-6" stroke={c} strokeWidth="2" strokeLinejoin="round"/></svg>),
  phone:(c='currentColor',s=20)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 4h4l2 5-3 2a12 12 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" stroke={c} strokeWidth="2" strokeLinejoin="round"/></svg>),
  key:(c='currentColor',s=20)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="8" cy="8" r="4.5" stroke={c} strokeWidth="2"/><path d="M11 11l8 8M16 16l2-2M18 18l2-2" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>),
  leaf:(c='currentColor',s=20)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M20 4S6 4 5 14a6 6 0 008 5c8-2 7-15 7-15z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><path d="M9 16c2-4 5-6 8-7" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>),
  edit:(c='currentColor',s=18)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 20h4L18 10l-4-4L4 16z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><path d="M14 6l4 4" stroke={c} strokeWidth="2"/></svg>),
  trash:(c='currentColor',s=18)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  trophy:(c='currentColor',s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M7 4h10v5a5 5 0 01-10 0z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><path d="M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3M10 14h4M9 20h6M12 14v6" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>),
  school:(c='currentColor',s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 4L2 9l10 5 10-5z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><path d="M6 11v5c0 1 3 2.5 6 2.5S18 17 18 16v-5" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>),
  clock:(c='currentColor',s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2"/><path d="M12 7v5l3.5 2.5" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>),
  copy:(c='currentColor',s=18)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="12" height="12" rx="3" stroke={c} strokeWidth="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" stroke={c} strokeWidth="2"/></svg>),
  cake:(c='currentColor',s=20)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 20h16v-6a3 3 0 00-3-3H7a3 3 0 00-3 3z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><path d="M4 16c2 0 2 1.5 4 1.5S10 16 12 16s2 1.5 4 1.5 2-1.5 4-1.5M12 11V7M9 7V5M15 7V5" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>),
  dollar:(c='currentColor',s=20)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 3v18M16 7.5C16 6 14 5 12 5S8 6 8 8s2 3 4 3.5 4 1.5 4 3.5-2 3-4 3-4-1-4-2.5" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>),
  bell:(c='currentColor',s=20)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M6 10a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><path d="M10 20a2 2 0 004 0" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>),
  insta:(c='currentColor',s=20)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke={c} strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke={c} strokeWidth="2"/><circle cx="17" cy="7" r="1.2" fill={c}/></svg>),
  whats:(c='currentColor',s=20)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M3 21l1.6-5A8 8 0 1112 20a8 8 0 01-4-1z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><path d="M9 9c0 4 2 6 6 6 0-1.5 0-1.5-1-2l-1.5.8C11 13 11 12 10.2 10.5L11 9c-.5-1-.5-1-2-1z" fill={c}/></svg>),
  camera:(c='currentColor',s=20)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><circle cx="12" cy="13" r="3.2" stroke={c} strokeWidth="2"/></svg>),
  info:(c='currentColor',s=18)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2"/><path d="M12 11v5M12 7.5v.5" stroke={c} strokeWidth="2.2" strokeLinecap="round"/></svg>),
  arrowUp:(c='currentColor',s=14)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 19V5M6 11l6-6 6 6" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  shield:(c='currentColor',s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  chat:(c='currentColor',s=20)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H9l-4 4v-4H4a1 1 0 01-1-1V6a1 1 0 011-1z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><path d="M8 10h8M8 13h5" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>),
  sad:(c='currentColor',s=40)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2"/><path d="M8.5 15.5c1-1.2 2.2-1.8 3.5-1.8s2.5.6 3.5 1.8" stroke={c} strokeWidth="2" strokeLinecap="round"/><path d="M9 9.5v.5M15 9.5v.5" stroke={c} strokeWidth="2.4" strokeLinecap="round"/></svg>),
  rocket:(c='currentColor',s=40)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 3c4 1 6 5 6 9l-3 2H9l-3-2c0-4 2-8 6-9z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><circle cx="12" cy="9" r="1.8" stroke={c} strokeWidth="2"/><path d="M9 16l-2 4 4-2M15 16l2 4-4-2" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  coins:(c='currentColor',s=40)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="6" rx="7" ry="3" stroke={c} strokeWidth="2"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" stroke={c} strokeWidth="2"/></svg>),
  wallet:(c='currentColor',s=40)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="13" rx="3" stroke={c} strokeWidth="2"/><path d="M3 9h13a2 2 0 012 2v2a2 2 0 01-2 2H3" stroke={c} strokeWidth="2"/><circle cx="16" cy="12.5" r="1.3" fill={c}/></svg>),
};

// soft tinted photo placeholder (user drops real photo here)
function Photo({label, tint='var(--cream-2)', style={}}){
  return (
    <div className="ph" style={{width:'100%',height:'100%',...style}}>
      <span className="cap">{label}</span>
    </div>
  );
}

// little round ingredient/initial avatar
function Dot({children, bg, color='#fff', cls=''}){
  return <div className={cls} style={{background:bg,color}}>{children}</div>;
}

// bottom tab bar (active = one of home/recipes/sales/more)
function TabBar({active='home'}){
  const tab=(key,label,icon)=>{
    const on=active===key;
    return (
      <div className={'tab'+(on?' on':'')}>
        {icon(on?'var(--pink)':'#C4B0BB')}
        <span className="tl">{label}</span>
      </div>
    );
  };
  return (
    <div className="tabbar">
      {tab('home','Início',(c)=>Ico.home(c,23))}
      {tab('recipes','Receitas',(c)=>Ico.book(c,23))}
      <div className="tab-fab">{Ico.plus('#fff',26)}</div>
      {tab('sales','Vendas',(c)=>Ico.cart(c,23))}
      {tab('more','Mais',(c)=>Ico.grid(c,23))}
    </div>
  );
}

window.Ico = Ico;
window.Photo = Photo;
window.Dot = Dot;
window.TabBar = TabBar;
