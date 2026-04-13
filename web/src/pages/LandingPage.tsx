import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Cake,
  ChefHat,
  Calculator,
  FileText,
  BarChart3,
  Users,
  ShoppingBag,
  Check,
  Smartphone,
  Star,
  Sparkles,
  Heart,
  TrendingUp,
  Shield,
  Zap,
  ArrowDown,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

const FEATURES = [
  { icon: ShoppingBag, title: 'Ingredientes', desc: 'Cadastre ingredientes com preços atualizados e unidades de medida.', color: 'from-pink-500 to-rose-500' },
  { icon: ChefHat, title: 'Receitas', desc: 'Monte receitas com cálculo automático do custo por unidade.', color: 'from-violet-500 to-purple-500' },
  { icon: Calculator, title: 'Precificação', desc: 'Defina margens, mão de obra e embalagem para o preço ideal.', color: 'from-amber-500 to-orange-500' },
  { icon: FileText, title: 'PDF Profissional', desc: 'Gere fichas técnicas e orçamentos em PDF prontos para enviar.', color: 'from-emerald-500 to-green-500' },
  { icon: BarChart3, title: 'Dashboard', desc: 'Acompanhe vendas, lucro e produtos mais rentáveis.', color: 'from-blue-500 to-cyan-500' },
  { icon: Users, title: 'Clientes', desc: 'Gerencie sua carteira de clientes e histórico de pedidos.', color: 'from-primary-500 to-pink-500' },
];

const STEPS = [
  { num: '1', title: 'Cadastre seus ingredientes', desc: 'Adicione os ingredientes que você usa com o preço de compra.' },
  { num: '2', title: 'Monte suas receitas', desc: 'Selecione os ingredientes e quantidades de cada receita.' },
  { num: '3', title: 'Veja o preço ideal', desc: 'O app calcula o custo e sugere o preço de venda com sua margem.' },
];

const STATIC_STATS = [
  { key: 'users', label: 'Confeiteiras', icon: Heart },
  { key: 'recipes', label: 'Receitas criadas', icon: ChefHat },
  { key: 'rating', label: 'Nota na App Store', icon: Star },
  { key: 'free', label: 'Gratuito para começar', icon: Zap },
] as const;

const PLANS = [
  {
    name: 'Gratuito',
    price: 'R$ 0',
    period: '/mês',
    desc: 'Para quem está começando',
    features: ['Até 10 receitas', 'Ingredientes ilimitados', 'Cálculo de custo', 'Geração de PDF'],
    highlighted: false,
  },
  {
    name: 'Premium',
    price: 'R$ 14,90',
    period: '/mês',
    desc: 'Para quem quer crescer',
    features: ['Receitas ilimitadas', 'Ingredientes ilimitados', 'Dashboard completo', 'Gestão de clientes', 'Relatórios avançados', 'Suporte prioritário'],
    highlighted: true,
  },
];

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k+`;
  return `${n}+`;
}

export function LandingPage() {
  const [apiStats, setApiStats] = useState<{ totalUsers: number; totalRecipes: number } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/public/stats`)
      .then(r => r.json())
      .then(json => { if (json.data) setApiStats(json.data); })
      .catch(() => {});
  }, []);

  const statsValues: Record<string, string> = {
    users: apiStats ? formatCount(apiStats.totalUsers) : '100+',
    recipes: apiStats ? formatCount(apiStats.totalRecipes) : '500+',
    rating: '5.0',
    free: '100%',
  };

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-pink-600 flex items-center justify-center shadow-md shadow-primary-500/30">
              <Cake size={18} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">DocePreço</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#funcionalidades" className="hidden sm:block text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Funcionalidades</a>
            <a href="#planos" className="hidden sm:block text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Planos</a>
            <Link
              to="/admin"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Painel Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50/80 via-white to-white" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-gradient-to-t from-violet-100/20 to-transparent rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12 sm:pt-24 sm:pb-16">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Text */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-50 to-pink-50 border border-primary-100 text-primary-700 text-xs font-semibold px-4 py-2 rounded-full mb-8 animate-fade-in shadow-sm">
                <Sparkles size={14} className="text-primary-500" />
                O app que toda confeiteira precisa
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.1] animate-slide-up">
                Pare de vender<br />
                seus doces<br />
                <span className="bg-gradient-to-r from-primary-500 via-pink-500 to-rose-500 bg-clip-text text-transparent">no prejuízo</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-xl leading-relaxed animate-slide-up lg:mx-0 mx-auto">
                Calcule o custo real de cada receita e descubra quanto cobrar para ter lucro de verdade.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-4 animate-slide-up">
                <a
                  href="https://apps.apple.com/us/app/docepre%C3%A7o/id6761034172"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-2xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-xl shadow-gray-900/20 hover:shadow-2xl hover:shadow-gray-900/30 hover:-translate-y-0.5"
                >
                  <Smartphone size={20} />
                  Baixar na App Store
                </a>
                <span className="inline-flex items-center gap-2.5 text-gray-400 px-6 py-4 rounded-2xl text-sm font-medium">
                  <Smartphone size={18} />
                  Google Play em breve
                </span>
              </div>
            </div>

            {/* App Preview */}
            <div className="flex-1 relative animate-slide-up max-w-sm sm:max-w-md lg:max-w-lg">
              <img
                src="/app-preview.png"
                alt="DocePreço - Telas do aplicativo mostrando o dashboard e cadastro de ingredientes"
                className="w-full drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="flex justify-center mt-8 animate-fade-in">
            <a href="#stats" className="text-gray-300 hover:text-primary-400 transition-colors">
              <ArrowDown size={24} className="animate-bounce" />
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-16 sm:py-20 border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
            {STATIC_STATS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-50 mb-4">
                    <Icon size={22} className="text-primary-500" />
                  </div>
                  <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">{statsValues[s.key]}</p>
                  <p className="text-sm text-gray-500 mt-1 font-medium">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-primary-500 uppercase tracking-widest">Como funciona</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Simples como fazer um bolo
            </h2>
            <p className="mt-4 text-gray-500 text-lg max-w-lg mx-auto">
              Em três passos você descobre o preço certo dos seus produtos.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {STEPS.map((step, i) => (
              <div key={i} className="relative text-center group">
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute top-10 left-[60%] w-[80%] border-t-2 border-dashed border-primary-200" />
                )}
                <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-pink-600 text-white text-2xl font-extrabold mb-6 shadow-lg shadow-primary-500/25 group-hover:scale-110 transition-transform">
                  {step.num}
                </div>
                <h3 className="font-bold text-gray-900 text-lg">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-100/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-100/20 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-primary-500 uppercase tracking-widest">Funcionalidades</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Tudo para sua confeitaria crescer
            </h2>
            <p className="mt-4 text-gray-500 text-lg max-w-xl mx-auto">
              Ferramentas profissionais pensadas para quem produz doces artesanais.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-7 border border-gray-100 hover:border-gray-200 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 group hover:-translate-y-1"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">{f.title}</h3>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-1.5 mb-8">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={20} className="text-yellow-400 fill-yellow-400" />
            ))}
          </div>
          <blockquote className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-snug">
            "Eu não sabia que estava vendendo meus brigadeiros com prejuízo.
            <span className="text-primary-400"> O DocePreço mudou meu negócio.</span>"
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">Ana Paula</p>
              <p className="text-gray-400 text-xs">Confeiteira em São Paulo</p>
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="planos" className="py-20 sm:py-28 relative">
        <div className="absolute top-20 left-0 w-72 h-72 bg-primary-100/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-0 w-72 h-72 bg-pink-100/20 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-primary-500 uppercase tracking-widest">Planos</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Simples, sem surpresa
            </h2>
            <p className="mt-4 text-gray-500 text-lg max-w-xl mx-auto">
              Comece de graça e faça upgrade quando quiser, direto pelo app.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {PLANS.map((plan, i) => (
              <div
                key={i}
                className={`rounded-3xl p-8 sm:p-10 transition-all ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-2xl shadow-gray-900/30 relative ring-4 ring-primary-500/20'
                    : 'bg-white border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-500 to-pink-500 text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-lg shadow-primary-500/30">
                    Mais popular
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    plan.highlighted
                      ? 'bg-primary-500/20'
                      : 'bg-primary-50'
                  }`}>
                    {plan.highlighted
                      ? <Sparkles size={20} className="text-primary-400" />
                      : <Shield size={20} className="text-primary-500" />}
                  </div>
                  <h3 className={`font-bold text-lg ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                </div>
                <p className={`text-sm ${plan.highlighted ? 'text-gray-400' : 'text-gray-500'}`}>{plan.desc}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className={`text-5xl font-extrabold tracking-tight ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? 'text-gray-400' : 'text-gray-400'}`}>{plan.period}</span>
                </div>
                <div className={`my-8 h-px ${plan.highlighted ? 'bg-gray-700' : 'bg-gray-100'}`} />
                <ul className="space-y-4">
                  {plan.features.map((feat, j) => (
                    <li key={j} className={`flex items-center gap-3 text-sm ${plan.highlighted ? 'text-gray-300' : 'text-gray-600'}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        plan.highlighted ? 'bg-primary-500/20' : 'bg-primary-50'
                      }`}>
                        <Check size={12} className={plan.highlighted ? 'text-primary-400' : 'text-primary-500'} />
                      </div>
                      {feat}
                    </li>
                  ))}
                </ul>
                <p className={`mt-8 text-xs text-center ${plan.highlighted ? 'text-gray-500' : 'text-gray-400'}`}>
                  {plan.highlighted
                    ? 'Disponível para assinatura dentro do app'
                    : 'Incluso ao baixar o app'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-pink-500 to-rose-600" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-8">
            <TrendingUp size={28} className="text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Pronta para lucrar<br />com seus doces?
          </h2>
          <p className="mt-6 text-lg text-white/80 max-w-lg mx-auto">
            Baixe o DocePreço agora e descubra em minutos quanto realmente cobrar.
          </p>
          <div className="mt-10">
            <a
              href="https://apps.apple.com/us/app/docepre%C3%A7o/id6761034172"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-2xl text-sm font-bold hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
            >
              <Smartphone size={20} />
              Baixar na App Store
            </a>
          </div>
          <p className="mt-4 text-sm text-white/60">Grátis para começar. Sem cartão de crédito.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-pink-600 flex items-center justify-center shadow-sm">
                <Cake size={14} className="text-white" />
              </div>
              <span className="text-sm text-gray-500">
                &copy; {new Date().getFullYear()} DocePreço. Todos os direitos reservados.
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link
                to="/admin"
                className="text-sm text-gray-400 hover:text-primary-500 transition-colors"
              >
                Painel Admin
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
