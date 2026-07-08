import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Cake, ChefHat, Calculator, FileText, BarChart3, Users,
  ShoppingBag, Check, Smartphone, Star, Sparkles, Heart,
  TrendingUp, Shield, Zap, ArrowRight, Play, LogIn, Home,
  Store, ClipboardList, CalendarDays, Wallet, Package, Lightbulb,
  Link2, Bell, CreditCard, Truck, MessageCircle,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

const FEATURES = [
  { icon: ShoppingBag, title: 'Ingredientes', desc: 'Cadastre ingredientes com preços atualizados, unidades de medida e histórico de preços.', iconColor: '#ec4899', bg: 'bg-pink-50 dark:bg-pink-900/10', master: false },
  { icon: ChefHat, title: 'Receitas', desc: 'Monte receitas com cálculo automático do custo por unidade.', iconColor: '#8b5cf6', bg: 'bg-violet-50 dark:bg-violet-900/10', master: false },
  { icon: Calculator, title: 'Precificação', desc: 'Defina margens, mão de obra e embalagem para o preço ideal.', iconColor: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-900/10', master: false },
  { icon: FileText, title: 'PDF Profissional', desc: 'Gere fichas técnicas e orçamentos em PDF com seu logo, prontos para enviar.', iconColor: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-900/10', master: false },
  { icon: BarChart3, title: 'Relatórios', desc: 'Acompanhe vendas, lucro e produtos mais rentáveis com gráficos e análises.', iconColor: '#3b82f6', bg: 'bg-blue-50 dark:bg-blue-900/10', master: false },
  { icon: Users, title: 'Clientes', desc: 'Gerencie sua carteira de clientes, aniversários e histórico de pedidos.', iconColor: '#e91e8c', bg: 'bg-primary-50 dark:bg-primary-900/10', master: false },
  { icon: ClipboardList, title: 'Encomendas', desc: 'Controle entregas com número de pedido, status de acompanhamento e pagamento.', iconColor: '#22c55e', bg: 'bg-green-50 dark:bg-green-900/10', master: false },
  { icon: CalendarDays, title: 'Épocas', desc: 'Ajuste sazonal de preços para datas especiais como Páscoa e Natal.', iconColor: '#c8870b', bg: 'bg-yellow-50 dark:bg-yellow-900/10', master: false },
  { icon: Store, title: 'Loja Online', desc: 'Cardápio digital com link compartilhável para receber pedidos dos seus clientes.', iconColor: '#7c3aed', bg: 'bg-violet-50 dark:bg-violet-900/10', master: true },
  { icon: Package, title: 'Estoque', desc: 'Controle de estoque com baixa automática a cada venda registrada.', iconColor: '#2ba7dd', bg: 'bg-sky-50 dark:bg-sky-900/10', master: true },
  { icon: Wallet, title: 'Financeiro', desc: 'Resultado do negócio e DRE completa com receitas e despesas.', iconColor: '#7c3aed', bg: 'bg-purple-50 dark:bg-purple-900/10', master: true },
  { icon: Lightbulb, title: 'Dicas de vendas', desc: 'Precificação inteligente e modelos de story prontos para o Instagram.', iconColor: '#d99a00', bg: 'bg-amber-50 dark:bg-amber-900/10', master: true },
];

const STORE_HIGHLIGHTS = [
  { icon: Link2, title: 'Link compartilhável', desc: 'Sua loja com endereço próprio para divulgar no WhatsApp e Instagram.' },
  { icon: Smartphone, title: 'Pedido pelo navegador', desc: 'Cliente escolhe os produtos e pede direto do celular, sem instalar nada.' },
  { icon: Bell, title: 'Notificação na hora', desc: 'Você recebe um push no app assim que um novo pedido chega.' },
  { icon: Truck, title: 'Acompanhamento de entrega', desc: 'Timeline do pedido: recebido, em preparo, saiu para entrega e entregue.' },
  { icon: CreditCard, title: 'Pagamento na entrega', desc: 'Dinheiro com troco, PIX ou cartão — o cliente escolhe ao fechar o pedido.' },
  { icon: TrendingUp, title: 'Venda automática', desc: 'Pedido entregue e pago vira venda registrada, com baixa no estoque.' },
];

const STEPS = [
  { num: '01', title: 'Cadastre seus ingredientes', desc: 'Adicione os ingredientes que voce usa com o preco de compra.', icon: ShoppingBag },
  { num: '02', title: 'Monte suas receitas', desc: 'Selecione os ingredientes e quantidades de cada receita.', icon: ChefHat },
  { num: '03', title: 'Veja o preco ideal', desc: 'O app calcula o custo e sugere o preco de venda com sua margem.', icon: TrendingUp },
];

const TESTIMONIALS = [
  { name: 'Ana Paula', role: 'Confeiteira em Sao Paulo', text: 'Eu nao sabia que estava vendendo meus brigadeiros com prejuizo. O DocePreco mudou meu negocio.', initials: 'AP', color: 'from-primary-400 to-pink-500' },
  { name: 'Mariana Costa', role: 'Cake Designer no Rio', text: 'Finalmente consigo precificar meus bolos com confianca. O calculo automatico e perfeito.', initials: 'MC', color: 'from-violet-400 to-purple-500' },
  { name: 'Julia Santos', role: 'Doceira em BH', text: 'O PDF de orcamento impressiona minhas clientes. Parece super profissional.', initials: 'JS', color: 'from-amber-400 to-orange-500' },
];

const PLANS = [
  {
    name: 'Gratuito', price: 'R$ 0', priceAnnual: 'R$ 0', period: '/mes', desc: 'Para quem esta comecando',
    features: ['Ate 10 receitas', 'Ingredientes ilimitados', 'Calculo de custo', 'Geracao de PDF'],
    highlighted: false,
  },
  {
    name: 'Premium', price: 'R$ 14,90', priceAnnual: 'R$ 120,00', period: '/mes', desc: 'Para quem quer crescer',
    features: ['Receitas e ingredientes ilimitados', 'Seu logo personalizado no PDF', 'Relatórios avançados com gráficos', 'Gestão de clientes e aniversários', 'Sistema de encomendas e entregas', 'Precificação sazonal avançada', 'Histórico de preços de ingredientes', 'Suporte prioritário'],
    highlighted: true,
  },
  {
    name: 'Master', price: 'R$ 30,00', priceAnnual: 'R$ 200,00', period: '/mes', desc: 'Solucao completa para seu negocio',
    features: ['Tudo do Premium', 'Loja online com link compartilhável', 'Pedidos com notificação em tempo real', 'Controle de estoque com baixa automática', 'Gestão financeira completa (DRE)', 'Dicas de vendas e precificação', 'Suporte premium'],
    highlighted: false,
  },
];

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k+`;
  return `${n}+`;
}

const DEMO_SCREENS = [
  { title: 'Home', icon: Home, desc: 'Dashboard com resumo de vendas', image: '/mobile-screen-2.jpg' },
  { title: 'Receitas', icon: ChefHat, desc: 'Gerencie suas receitas', image: '/mobile-screen-3.jpg' },
  { title: 'Ingredientes', icon: ShoppingBag, desc: 'Controle de ingredientes', image: '/mobile-screen-4.jpg' },
  { title: 'Vendas', icon: TrendingUp, desc: 'Registre e acompanhe vendas', image: '/mobile-screen-5.jpg' },
  { title: 'Relatórios', icon: BarChart3, desc: 'Análise detalhada de dados', image: '/mobile-screen-1.jpg' },
];

export function LandingPage() {
  const [apiStats, setApiStats] = useState<{ totalUsers: number; totalRecipes: number } | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [demoScreenIndex, setDemoScreenIndex] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE}/public/stats`)
      .then(r => r.json())
      .then(json => { if (json.data) setApiStats(json.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    DEMO_SCREENS.forEach(({ image }) => {
      const preload = new Image();
      preload.src = image;
    });
  }, []);

  const userCount = apiStats ? formatCount(apiStats.totalUsers) : '100+';
  const recipeCount = apiStats ? formatCount(apiStats.totalRecipes) : '500+';

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 overflow-x-hidden">
      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-gray-950/70 backdrop-blur-xl border-b border-gray-100/80 dark:border-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-pink-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Cake size={18} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">DocePreco</span>
          </div>
          <nav className="flex items-center gap-8">
            <a href="#funcionalidades" className="hidden sm:block text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Funcionalidades</a>
            <a href="#loja-online" className="hidden md:block text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Loja Online</a>
            <a href="#planos" className="hidden sm:block text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Planos</a>
            <Link to="/app"
              className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <LogIn size={14} />
              Entrar
            </Link>
            <div className="flex items-center gap-2">
              <a href="https://apps.apple.com/us/app/docepre%C3%A7o/id6761034172" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm">
                <Smartphone size={14} />
                iOS
              </a>
              <a href="https://play.google.com/store/apps/details?id=com.orgenyx" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 dark:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors shadow-sm">
                <Smartphone size={14} />
                Android
              </a>
            </div>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
        {/* Blurs */}
        <div className="absolute top-20 left-[-10%] w-[500px] h-[500px] bg-primary-200/40 dark:bg-primary-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-40 right-[-5%] w-[400px] h-[400px] bg-pink-200/30 dark:bg-pink-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-100/30 dark:bg-violet-500/5 rounded-full blur-[120px]" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Text */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold px-4 py-2 rounded-full mb-8 shadow-sm">
                <Sparkles size={14} className="text-primary-500" />
                O app que toda confeiteira precisa
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-gray-900 dark:text-white tracking-tight leading-[1.08]">
                Pare de vender{' '}
                <br className="hidden sm:block" />
                seus doces{' '}
                <span className="relative">
                  <span className="bg-gradient-to-r from-primary-500 via-pink-500 to-rose-500 bg-clip-text text-transparent">no prejuizo</span>
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none"><path d="M1 5.5C40 2 80 1 100 3C120 5 160 6 199 3" stroke="#e91e8c" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" /></svg>
                </span>
              </h1>

              <p className="mt-6 text-lg text-gray-500 dark:text-gray-400 max-w-lg leading-relaxed lg:mx-0 mx-auto">
                Calcule o custo real de cada receita e descubra quanto cobrar para ter lucro de verdade.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-4">
                <a href="https://apps.apple.com/us/app/docepre%C3%A7o/id6761034172" target="_blank" rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-2xl text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-xl shadow-gray-900/20 hover:shadow-2xl hover:-translate-y-0.5">
                  <Smartphone size={18} />
                  Baixar na App Store
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.orgenyx" target="_blank" rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 bg-emerald-600 dark:bg-emerald-500 text-white px-8 py-4 rounded-2xl text-sm font-bold hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-600/20 hover:shadow-2xl hover:-translate-y-0.5">
                  <Smartphone size={18} />
                  Baixar no Google Play
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </a>
              </div>

              {/* Mini social proof */}
              <div className="mt-10 flex items-center lg:justify-start justify-center gap-4">
                <div className="flex -space-x-2">
                  {['AP', 'MC', 'JS', 'LR'].map((initials, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-pink-500 border-2 border-white dark:border-gray-950 flex items-center justify-center text-white text-[10px] font-bold">
                      {initials}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} size={12} className="text-yellow-400 fill-yellow-400" />)}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{userCount} confeiteiras usam</p>
                </div>
              </div>
            </div>

            {/* App Preview */}
            <div className="flex-1 relative max-w-sm sm:max-w-md">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-pink-500/20 rounded-[3rem] blur-3xl scale-90" />
              <img src="/app-preview.png" alt="DocePreco - Telas do aplicativo" className="relative w-full drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 sm:py-20 border-y border-gray-100 dark:border-gray-800/50 bg-gray-50/80 dark:bg-gray-900/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: userCount, label: 'Confeiteiras', icon: Heart, color: 'text-pink-500' },
              { value: recipeCount, label: 'Receitas criadas', icon: ChefHat, color: 'text-violet-500' },
              { value: '5.0', label: 'Nota na App Store', icon: Star, color: 'text-yellow-500' },
              { value: '100%', label: 'Gratuito para comecar', icon: Zap, color: 'text-emerald-500' },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 text-center hover:shadow-md transition-shadow">
                <s.icon size={22} className={`${s.color} mx-auto mb-3`} />
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{s.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── App Demo ── */}
      <section className="py-24 sm:py-32 relative bg-white dark:bg-gray-950">
        <div className="pointer-events-none absolute top-20 right-0 w-[300px] h-[300px] bg-primary-100/20 dark:bg-primary-500/5 rounded-full blur-[100px]" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-primary-500 uppercase tracking-[0.2em]">Demonstração</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Veja na prática como funciona
            </h2>
            <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
              Explore o aplicativo e conheça todas as funcionalidades.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-12 justify-center">
            {/* Mockup do Celular */}
            <div className="relative">
              {/* Glow */}
              <div className="pointer-events-none absolute -inset-4 bg-gradient-to-r from-primary-500/20 to-pink-500/20 rounded-[2rem] blur-2xl" />

              {/* Celular */}
              <div className="relative w-72 bg-black rounded-[3rem] p-3 shadow-2xl" style={{ aspectRatio: '9/19' }}>
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-8 bg-black rounded-b-3xl z-10" />

                {/* Tela */}
                <div className="relative w-full h-full bg-white dark:bg-gray-950 rounded-[2.5rem] overflow-hidden">
                  {/* Conteúdo da tela */}
                  {DEMO_SCREENS.map((screen, index) => (
                    <img
                      key={screen.title}
                      src={screen.image}
                      alt={`Tela de ${screen.title} do DocePreco`}
                      aria-hidden={demoScreenIndex !== index}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                        demoScreenIndex === index ? 'opacity-100' : 'pointer-events-none opacity-0'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Controles */}
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">Explore as funcionalidades:</p>
                <div className="flex flex-col gap-3">
                  {DEMO_SCREENS.map((screen, i) => (
                    <button
                      key={screen.title}
                      type="button"
                      onClick={() => setDemoScreenIndex(i)}
                      aria-pressed={demoScreenIndex === i}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all text-left ${
                        demoScreenIndex === i
                          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <screen.icon size={18} className="inline mr-2" />
                      {screen.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Navegação de telas */}
              <div className="flex gap-2 justify-center lg:justify-start">
                <button
                  type="button"
                  aria-label="Tela anterior"
                  onClick={() => setDemoScreenIndex((prev) => (prev === 0 ? DEMO_SCREENS.length - 1 : prev - 1))}
                  className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                >
                  ←
                </button>
                <div className="flex gap-1 flex-1 items-center justify-center">
                  {DEMO_SCREENS.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Abrir tela ${DEMO_SCREENS[i].title}`}
                      onClick={() => setDemoScreenIndex(i)}
                      className={`h-2 rounded-full transition-all ${
                        demoScreenIndex === i ? 'w-6 bg-primary-500' : 'w-2 bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Próxima tela"
                  onClick={() => setDemoScreenIndex((prev) => (prev === DEMO_SCREENS.length - 1 ? 0 : prev + 1))}
                  className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 sm:py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-primary-500 uppercase tracking-[0.2em]">Como funciona</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Simples como fazer um bolo
            </h2>
            <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg max-w-md mx-auto">
              Em tres passos voce descobre o preco certo dos seus produtos.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={i} className="relative">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute top-12 left-[60%] w-[80%] border-t-2 border-dashed border-gray-200 dark:border-gray-700" />
                )}
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-lg transition-all text-center group hover:-translate-y-1">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-pink-600 text-white mb-5 shadow-lg shadow-primary-500/20 group-hover:scale-110 transition-transform">
                    <step.icon size={24} />
                  </div>
                  <span className="block text-xs font-bold text-primary-500 mb-2">{step.num}</span>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{step.title}</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="funcionalidades" className="py-24 sm:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50/80 dark:from-gray-900/50 to-white dark:to-gray-950" />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-primary-100/30 dark:bg-primary-500/5 rounded-full blur-[100px]" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-primary-500 uppercase tracking-[0.2em]">Funcionalidades</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Tudo para sua confeitaria crescer
            </h2>
            <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
              Ferramentas profissionais pensadas para quem produz doces artesanais.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="relative bg-white dark:bg-gray-800/80 rounded-2xl p-7 border border-gray-100 dark:border-gray-700/50 hover:shadow-xl hover:shadow-gray-200/40 dark:hover:shadow-none transition-all duration-300 group hover:-translate-y-1 hover:border-gray-200 dark:hover:border-gray-600">
                  {f.master && (
                    <span className="absolute top-5 right-5 inline-flex items-center gap-1 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                      <Sparkles size={10} />
                      Master
                    </span>
                  )}
                  <div className={`w-12 h-12 rounded-2xl ${f.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={22} style={{ color: f.iconColor }} />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">{f.title}</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Loja Online ── */}
      <section id="loja-online" className="py-24 sm:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white dark:from-gray-950 to-violet-50/60 dark:to-violet-950/20" />
        <div className="absolute top-40 left-[-5%] w-[400px] h-[400px] bg-violet-200/30 dark:bg-violet-500/10 rounded-full blur-[120px]" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wide">
              <Sparkles size={14} />
              Novidade · Plano Master
            </span>
            <h2 className="mt-6 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Sua loja online com pedidos direto no app
            </h2>
            <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              Monte seu cardápio digital, compartilhe o link com seus clientes e gerencie os pedidos
              do recebimento até a entrega — tudo pelo DocePreco.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {STORE_HIGHLIGHTS.map((h, i) => {
              const Icon = h.icon;
              return (
                <div key={i} className="bg-white dark:bg-gray-800/80 rounded-2xl p-7 border border-violet-100 dark:border-violet-900/40 hover:shadow-xl hover:shadow-violet-100/50 dark:hover:shadow-none transition-all duration-300 group hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    <Icon size={22} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">{h.title}</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{h.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 sm:py-32 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(233,30,140,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(139,92,246,0.08),transparent_60%)]" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-primary-400 uppercase tracking-[0.2em]">Depoimentos</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Quem usa, recomenda
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-7 hover:border-gray-700 transition-colors">
                <div className="flex items-center gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Plans ── */}
      <section id="planos" className="py-24 sm:py-32 relative">
        <div className="absolute top-20 left-0 w-[300px] h-[300px] bg-primary-100/20 dark:bg-primary-500/5 rounded-full blur-[100px]" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-primary-500 uppercase tracking-[0.2em]">Planos</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Simples, sem surpresa
            </h2>
            <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
              Comece de graca e faca upgrade quando quiser, direto pelo app.
            </p>

            <div className="mt-8 flex items-center justify-center gap-4">
              <span className={`text-sm font-semibold ${!isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>Mensal</span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  isAnnual ? 'bg-primary-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    isAnnual ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-semibold ${isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>Anual</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {PLANS.map((plan, i) => (
              <div key={i} className={`rounded-2xl p-6 sm:p-7 transition-all relative ${
                plan.highlighted
                  ? 'bg-gray-950 dark:bg-white/5 text-white ring-1 ring-gray-800 dark:ring-gray-700 shadow-2xl shadow-gray-900/30'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600'
              }`}>
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-500 to-pink-500 text-white text-[11px] font-bold px-5 py-1 rounded-full shadow-lg shadow-primary-500/25">
                    Mais popular
                  </div>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${plan.highlighted ? 'bg-white/10' : 'bg-primary-50 dark:bg-primary-900/20'}`}>
                    {plan.highlighted ? <Sparkles size={16} className="text-primary-400" /> : <Shield size={16} className="text-primary-500" />}
                  </div>
                  <h3 className={`font-bold text-base ${plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{plan.name}</h3>
                </div>
                <p className={`text-xs mb-4 ${plan.highlighted ? 'text-gray-400' : 'text-gray-500'}`}>{plan.desc}</p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-4xl font-extrabold tracking-tight ${plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {isAnnual ? plan.priceAnnual : plan.price}
                  </span>
                  <span className={`text-xs ${plan.highlighted ? 'text-gray-400' : 'text-gray-400'}`}>
                    {isAnnual ? '/ano' : plan.period}
                  </span>
                </div>
                {plan.highlighted && (
                  <div className={`text-xs mb-2 ${isAnnual ? 'text-gray-400' : 'text-gray-400'}`}>
                    {isAnnual ? `ou ${plan.price} por mês` : `ou ${plan.priceAnnual} por ano`}
                  </div>
                )}

                <div className={`h-px mb-6 ${plan.highlighted ? 'bg-gray-800' : 'bg-gray-100 dark:bg-gray-700'}`} />

                <ul className="space-y-2.5">
                  {plan.features.map((feat, j) => (
                    <li key={j} className={`flex items-center gap-2 text-xs ${plan.highlighted ? 'text-gray-300' : 'text-gray-600 dark:text-gray-300'}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.highlighted ? 'bg-primary-500/20' : 'bg-primary-50 dark:bg-primary-900/20'}`}>
                        <Check size={12} className={plan.highlighted ? 'text-primary-400' : 'text-primary-500'} />
                      </div>
                      {feat}
                    </li>
                  ))}
                </ul>

                <p className={`mt-8 text-xs text-center ${plan.highlighted ? 'text-gray-500' : 'text-gray-400'}`}>
                  {plan.highlighted ? 'Disponivel para assinatura dentro do app' : 'Incluso ao baixar o app'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-24 sm:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-pink-500 to-rose-600" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.1),transparent_50%)]" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-8">
            <Cake size={28} className="text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Pronta para lucrar<br />com seus doces?
          </h2>
          <p className="mt-6 text-lg text-white/80 max-w-lg mx-auto">
            Baixe o DocePreco agora e descubra em minutos quanto realmente cobrar.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://apps.apple.com/us/app/docepre%C3%A7o/id6761034172" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-2xl text-sm font-bold hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5">
              <Smartphone size={18} />
              App Store
              <ArrowRight size={16} />
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.orgenyx" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-2xl text-sm font-bold hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5">
              <Smartphone size={18} />
              Google Play
              <ArrowRight size={16} />
            </a>
          </div>
          <p className="mt-5 text-sm text-white/60">Gratis para comecar. Sem cartao de credito.</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-pink-600 flex items-center justify-center shadow-sm">
                <Cake size={14} className="text-white" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                &copy; {new Date().getFullYear()} DocePreco. Todos os direitos reservados.
              </span>
            </div>
            <Link to="/admin" className="text-sm text-gray-400 hover:text-primary-500 transition-colors">
              Painel Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
