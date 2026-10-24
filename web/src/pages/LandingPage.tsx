import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  Check,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Heart,
  Menu,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  TrendingUp,
  X,
} from "lucide-react";
import homeScreen from "../assets/demo-screens/mobile-screen-2.jpg";
import storeScreen from "../assets/demo-screens/mobile-screen-loja.jpg";
import menuScreen from "../assets/demo-screens/mobile-screen-cardapio.jpg";
import recipesScreen from "../assets/demo-screens/mobile-screen-3.jpg";
import ingredientsScreen from "../assets/demo-screens/mobile-screen-4.jpg";
import salesScreen from "../assets/demo-screens/mobile-screen-5.jpg";
import reportsScreen from "../assets/demo-screens/mobile-screen-1.jpg";
import brigadeiroDecor from "../assets/hero-brigadeiros.png";
import strawberryCakeDecor from "../assets/hero-strawberry-cake.png";
import brandLogo from "../assets/docepreco-logo.png";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
const APP_STORE_URL =
  "https://apps.apple.com/us/app/docepre%C3%A7o/id6761034172";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.orgenyx";

const SCREENS = [
  {
    title: "Visão geral",
    description: "Veja o que acontece no seu negócio em um só lugar.",
    image: homeScreen,
    icon: BarChart3,
  },
  {
    title: "Receitas",
    description: "Organize ingredientes, rendimentos e custos de cada receita.",
    image: recipesScreen,
    icon: ChefHat,
  },
  {
    title: "Ingredientes",
    description: "Acompanhe o preço de compra e o custo de cada ingrediente.",
    image: ingredientsScreen,
    icon: ShoppingBag,
  },
  {
    title: "Vendas",
    description: "Registre suas vendas e saiba o que realmente dá resultado.",
    image: salesScreen,
    icon: TrendingUp,
  },
  {
    title: "Relatórios",
    description: "Entenda faturamento, lucro e produtos mais rentáveis.",
    image: reportsScreen,
    icon: BarChart3,
  },
  {
    title: "Loja online",
    description: "Compartilhe o cardápio e receba pedidos pelo navegador.",
    image: storeScreen,
    icon: Store,
  },
  {
    title: "Cardápio",
    description: "Seu cliente escolhe e faz o pedido pelo celular.",
    image: menuScreen,
    icon: Smartphone,
  },
];

const JOURNEY = [
  {
    number: "01",
    icon: ShoppingBag,
    title: "Conheça seu custo",
    description:
      "Cadastre ingredientes e monte receitas com o custo calculado por unidade.",
    details: "Ingredientes · Receitas · Fichas técnicas",
  },
  {
    number: "02",
    icon: Calculator,
    title: "Defina seu preço",
    description:
      "Considere mão de obra, embalagem e margem antes de decidir quanto cobrar.",
    details: "Precificação · Margem · Orçamentos",
  },
  {
    number: "03",
    icon: ClipboardList,
    title: "Venda com organização",
    description:
      "Acompanhe clientes, encomendas, entregas e vendas no mesmo fluxo.",
    details: "Clientes · Pedidos · Loja online",
  },
  {
    number: "04",
    icon: BarChart3,
    title: "Enxergue o resultado",
    description: "Veja o que vende, o que dá lucro e onde ajustar a operação.",
    details: "Relatórios · Estoque · Financeiro",
  },
];

const PLANS = [
  {
    name: "Gratuito",
    description: "Para começar",
    price: "R$ 0",
    annualPrice: "R$ 0",
    features: [
      "Até 10 receitas",
      "Ingredientes ilimitados",
      "Cálculo de custo",
      "Geração de PDF",
    ],
  },
  {
    name: "Premium",
    description: "Para crescer",
    price: "R$ 19,99",
    annualPrice: "R$ 120,00",
    features: [
      "Receitas ilimitadas",
      "Relatórios avançados",
      "Clientes e encomendas",
      "Precificação sazonal",
      "Seu logo nos PDFs",
    ],
  },
  {
    name: "Master",
    description: "Para ir mais longe",
    price: "R$ 39,99",
    annualPrice: "R$ 200,00",
    features: [
      "Tudo do Premium",
      "Loja online e cardápio",
      "Pedidos em tempo real",
      "Estoque automático",
      "Gestão financeira",
    ],
  },
];

function StoreLinks({ light = false }: { light?: boolean }) {
  return (
    <div className="flex flex-col justify-center gap-3 sm:flex-row">
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5 ${light ? "bg-white text-gray-950" : "bg-gray-950 text-white"}`}
      >
        <Smartphone size={17} /> App Store <ArrowRight size={15} />
      </a>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5 ${light ? "border border-white/40 text-white hover:bg-white/10" : "border border-gray-200 bg-white text-gray-900 hover:border-gray-400"}`}
      >
        <Smartphone size={17} /> Google Play <ArrowRight size={15} />
      </a>
    </div>
  );
}

export function LandingPage() {
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalRecipes: number;
  } | null>(null);
  const [screenIndex, setScreenIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/public/stats`, { signal: controller.signal })
      .then((response) => response.json())
      .then((json) => {
        if (
          Number.isFinite(json?.data?.totalUsers) &&
          Number.isFinite(json?.data?.totalRecipes)
        )
          setStats(json.data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const currentScreen = SCREENS[screenIndex];
  const nav = [
    ["Como funciona", "#como-funciona"],
    ["O aplicativo", "#produto"],
    ["Loja online", "#loja-online"],
    ["Planos", "#planos"],
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fbfaf9] text-gray-950 dark:bg-gray-950 dark:text-white">
      <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-[#fbfaf9]/90 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <a
            href="#inicio"
            aria-label="DocePreço, voltar ao início"
            className="flex items-center"
          >
            <img src={brandLogo} alt="DocePreço" className="h-16 w-auto sm:h-20" />
          </a>
          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300 md:flex"
          >
            {nav.map(([label, href]) => (
              <a key={href} className="hover:text-primary-600" href={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/app"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Entrar
            </Link>
            <a
              href="#baixar"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-600"
            >
              Começar grátis <ArrowRight size={15} />
            </a>
          </div>
          <button
            type="button"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-xl border border-gray-200 p-2.5 dark:border-gray-700 md:hidden"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <nav
            aria-label="Navegação móvel"
            className="grid gap-1 border-t border-gray-100 bg-[#fbfaf9] px-5 py-3 text-sm font-semibold dark:border-gray-800 dark:bg-gray-950 md:hidden"
          >
            {[...nav, ["Baixar grátis", "#baixar"]].map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 hover:bg-primary-50 dark:hover:bg-gray-800"
              >
                {label}
              </a>
            ))}
            <Link
              to="/app"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5"
            >
              Entrar
            </Link>
          </nav>
        )}
      </header>
      <main>
        <section id="inicio" className="px-4 pt-5 sm:px-6 sm:pt-7">
          <div className="relative mx-auto max-w-[1500px] overflow-hidden rounded-[2rem] border border-primary-100 bg-[radial-gradient(ellipse_at_50%_35%,#fff_25%,#fff0f6_75%,#f4ecff_100%)] px-5 pt-16 text-center dark:border-primary-900/40 dark:bg-[radial-gradient(ellipse_at_50%_35%,#2b1830_0%,#16131c_75%,#111015_100%)] sm:pt-20">
            <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#e8aecf_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,transparent,black_70%)]" />
            <img src={brigadeiroDecor} alt="" aria-hidden="true" className="pointer-events-none absolute -left-24 bottom-0 w-64 rotate-[-12deg] opacity-[0.10] md:-left-44 md:top-52 md:bottom-auto md:w-[440px] md:opacity-[0.16] xl:-left-40 xl:w-[510px]" />
            <img src={strawberryCakeDecor} alt="" aria-hidden="true" className="pointer-events-none absolute -right-40 top-24 hidden w-[440px] rotate-[12deg] opacity-[0.14] md:-right-52 md:block xl:-right-40 xl:w-[500px]" />
            <div className="relative mx-auto max-w-5xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-700 dark:border-primary-800 dark:bg-gray-900/70 dark:text-primary-300">
                <Sparkles size={14} /> Sua confeitaria, mais rentável
              </span>
              <h1 className="mx-auto mt-7 max-w-4xl text-[clamp(2.75rem,6.6vw,6rem)] font-black leading-[1.03] tracking-[-0.065em]">
                Mais clareza no preço.
                <br />
                <span className="text-primary-500">
                  Mais lucro em cada doce.
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-xl">
                Do custo da receita à venda final, organize sua confeitaria e
                tome decisões com números que fazem sentido.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href="#baixar"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-primary-500/20 hover:bg-primary-600 sm:w-auto"
                >
                  Começar gratuitamente <ArrowRight size={17} />
                </a>
                <a
                  href="#produto"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white/75 px-7 py-4 text-sm font-bold text-gray-900 hover:bg-white dark:border-gray-700 dark:bg-gray-900 dark:text-white sm:w-auto"
                >
                  Ver o aplicativo
                </a>
              </div>
              <p className="mt-5 text-xs font-medium text-gray-500 dark:text-gray-400">
                Grátis para começar · Disponível para iOS e Android
              </p>
            </div>
            <div className="relative mx-auto mt-10 max-w-4xl sm:mt-14">
              <div className="absolute bottom-7 left-1/2 h-28 w-3/4 -translate-x-1/2 rounded-full bg-primary-400/30 blur-3xl" />
              <img
                src="/app-preview.png"
                alt="Prévia das telas do aplicativo DocePreço"
                fetchPriority="high"
                className="relative mx-auto max-h-[390px] w-auto max-w-[95%] object-contain drop-shadow-[0_25px_30px_rgba(80,34,66,0.2)] sm:max-h-[520px]"
              />
              <div className="absolute bottom-10 left-0 hidden rounded-2xl border border-white/80 bg-white/90 p-4 text-left shadow-xl backdrop-blur-sm md:block dark:border-gray-700 dark:bg-gray-900/90">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Custo por receita
                </p>
                <p className="mt-1 text-lg font-extrabold">Tudo calculado</p>
              </div>
              <div className="absolute right-0 top-14 hidden rounded-2xl border border-white/80 bg-white/90 p-4 text-left shadow-xl backdrop-blur-sm md:block dark:border-gray-700 dark:bg-gray-900/90">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Preço de venda
                </p>
                <p className="mt-1 text-lg font-extrabold text-primary-500">
                  Com sua margem
                </p>
              </div>
            </div>
          </div>
        </section>
        <section
          aria-label="Benefícios do DocePreço"
          className="border-b border-gray-200/70 py-8 dark:border-gray-800"
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-5 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 sm:justify-between sm:px-8">
            <span className="inline-flex items-center gap-2">
              <Calculator size={18} className="text-primary-500" /> Preços com
              margem
            </span>
            <span className="inline-flex items-center gap-2">
              <ChefHat size={18} className="text-primary-500" /> Receitas
              organizadas
            </span>
            <span className="inline-flex items-center gap-2">
              <Store size={18} className="text-primary-500" /> Pedidos no mesmo
              lugar
            </span>
            {stats && stats.totalUsers > 0 && (
              <span className="inline-flex items-center gap-2">
                <Heart size={18} className="text-primary-500" />{" "}
                {stats.totalUsers.toLocaleString("pt-BR")} pessoas cadastradas
              </span>
            )}
          </div>
        </section>

        <section
          id="como-funciona"
          className="scroll-mt-24 px-5 py-24 sm:px-8 sm:py-32"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-600">
                  Uma jornada completa
                </p>
                <h2 className="mt-4 max-w-xl text-4xl font-black leading-tight tracking-[-0.045em] sm:text-5xl">
                  Tudo se conecta para o seu negócio crescer.
                </h2>
              </div>
              <p className="max-w-xl text-lg leading-relaxed text-gray-600 dark:text-gray-300">
                O DocePreço acompanha o caminho inteiro: você entende o custo,
                define o preço, organiza os pedidos e acompanha o resultado.
              </p>
            </div>
            <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {JOURNEY.map((step) => (
                <div
                  key={step.number}
                  className="group flex min-h-72 flex-col rounded-3xl border border-gray-200 bg-white p-7 transition-all hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl hover:shadow-primary-900/5 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary-900"
                >
                  <div className="flex items-start justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                      <step.icon size={23} />
                    </span>
                    <span className="text-xs font-bold tracking-widest text-gray-400">
                      {step.number} / 04
                    </span>
                  </div>
                  <h3 className="mt-8 text-xl font-extrabold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {step.description}
                  </p>
                  <p className="mt-auto pt-7 text-xs font-semibold text-primary-600 dark:text-primary-300">
                    {step.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="produto"
          className="scroll-mt-24 bg-white px-5 py-24 dark:bg-gray-900 sm:px-8 sm:py-32"
        >
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-600">
                Veja por dentro
              </p>
              <h2 className="mt-4 max-w-lg text-4xl font-black leading-tight tracking-[-0.045em] sm:text-5xl">
                Seu trabalho mais simples, tela por tela.
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-gray-600 dark:text-gray-300">
                Explore as telas reais do aplicativo e descubra como cada parte
                ajuda na rotina da confeitaria.
              </p>
              <div
                role="group"
                aria-label="Telas do aplicativo"
                className="mt-8 flex flex-wrap gap-2"
              >
                {SCREENS.map((screen, index) => (
                  <button
                    key={screen.title}
                    type="button"
                    onClick={() => setScreenIndex(index)}
                    aria-pressed={screenIndex === index}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${screenIndex === index ? "border-primary-500 bg-primary-500 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-primary-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"}`}
                  >
                    {screen.title}
                  </button>
                ))}
              </div>
              <div className="mt-8 flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30">
                  <currentScreen.icon size={20} />
                </span>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {currentScreen.description}
                </p>
              </div>
              <div className="mt-7 flex gap-2">
                <button
                  type="button"
                  aria-label="Tela anterior"
                  onClick={() =>
                    setScreenIndex(
                      (screenIndex + SCREENS.length - 1) % SCREENS.length,
                    )
                  }
                  className="rounded-full border border-gray-200 p-2.5 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <ChevronLeft size={19} />
                </button>
                <button
                  type="button"
                  aria-label="Próxima tela"
                  onClick={() =>
                    setScreenIndex((screenIndex + 1) % SCREENS.length)
                  }
                  className="rounded-full border border-gray-200 p-2.5 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <ChevronRight size={19} />
                </button>
                <span className="self-center pl-2 text-xs font-bold tracking-widest text-gray-400">
                  {String(screenIndex + 1).padStart(2, "0")} /{" "}
                  {String(SCREENS.length).padStart(2, "0")}
                </span>
              </div>
            </div>
            <div className="relative flex min-h-[580px] items-center justify-center overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_50%_45%,#ffe5f1,#f8f0fa_65%,#f4f0f7)] p-8 dark:bg-[radial-gradient(circle_at_50%_45%,#4a203e,#1e1724_70%)]">
              <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(#e9aaca_1px,transparent_1px)] [background-size:20px_20px]" />
              <div className="relative w-[285px] rounded-[3rem] border-[9px] border-gray-950 bg-gray-950 p-1 shadow-[0_35px_70px_rgba(40,20,37,0.28)]">
                <div className="absolute left-1/2 top-3 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-gray-950" />
                <div className="aspect-[9/19] overflow-hidden rounded-[2.2rem] bg-white">
                  <img
                    key={currentScreen.image}
                    src={currentScreen.image}
                    alt={`Tela de ${currentScreen.title} do aplicativo DocePreço`}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <div className="absolute bottom-6 right-6 rounded-xl border border-white/80 bg-white/90 px-4 py-2 text-xs font-bold text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                {currentScreen.title}
              </div>
            </div>
          </div>
        </section>
        <section className="px-5 py-24 sm:px-8 sm:py-32">
          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2">
            <div className="rounded-[2rem] border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900 sm:p-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                Sem organização
              </p>
              <h2 className="mt-5 text-3xl font-black tracking-tight">
                O preço vira um palpite.
              </h2>
              <p className="mt-5 max-w-md text-gray-600 dark:text-gray-300">
                O custo fica espalhado, a embalagem passa despercebida e só no
                fim do mês aparece a dúvida: sobrou lucro?
              </p>
              <div className="mt-12 space-y-4 text-sm text-gray-500">
                <p>— Anotações em vários lugares</p>
                <p>— Margem difícil de acompanhar</p>
                <p>— Vendas sem visão do resultado</p>
              </div>
            </div>
            <div className="rounded-[2rem] bg-gray-950 p-8 text-white dark:bg-primary-950 sm:p-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-300">
                Com DocePreço
              </p>
              <h2 className="mt-5 text-3xl font-black tracking-tight">
                Cada decisão tem contexto.
              </h2>
              <p className="mt-5 max-w-md text-gray-300">
                Ingredientes, receitas, preço e vendas se conectam para você
                trabalhar com mais segurança.
              </p>
              <div className="mt-12 space-y-4 text-sm text-gray-200">
                <p className="flex gap-3">
                  <Check size={18} className="shrink-0 text-primary-300" />{" "}
                  Custo da receita calculado
                </p>
                <p className="flex gap-3">
                  <Check size={18} className="shrink-0 text-primary-300" />{" "}
                  Margem definida antes da venda
                </p>
                <p className="flex gap-3">
                  <Check size={18} className="shrink-0 text-primary-300" />{" "}
                  Resultado acompanhado em relatórios
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="loja-online"
          className="scroll-mt-24 px-5 pb-24 sm:px-8 sm:pb-32"
        >
          <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] bg-[#231328] text-white lg:grid-cols-2">
            <div className="p-8 sm:p-12 lg:p-16">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-300/30 bg-primary-400/10 px-4 py-2 text-xs font-bold text-primary-200">
                <Sparkles size={14} /> Plano Master
              </span>
              <h2 className="mt-7 max-w-lg text-4xl font-black leading-tight tracking-[-0.045em] sm:text-5xl">
                Sua vitrine aberta para novos pedidos.
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-gray-300">
                Crie seu cardápio online, compartilhe o link no WhatsApp ou
                Instagram e acompanhe cada pedido até a entrega.
              </p>
              <div className="mt-9 grid gap-4 text-sm sm:grid-cols-2">
                <p className="flex gap-2">
                  <Check size={17} className="shrink-0 text-primary-300" />{" "}
                  Pedido pelo navegador
                </p>
                <p className="flex gap-2">
                  <Check size={17} className="shrink-0 text-primary-300" />{" "}
                  Notificação no app
                </p>
                <p className="flex gap-2">
                  <Check size={17} className="shrink-0 text-primary-300" />{" "}
                  Acompanhamento de entrega
                </p>
                <p className="flex gap-2">
                  <Check size={17} className="shrink-0 text-primary-300" />{" "}
                  Venda integrada ao estoque
                </p>
              </div>
              <a
                href="#baixar"
                className="mt-10 inline-flex items-center gap-2 font-bold text-primary-200 hover:text-white"
              >
                Conhecer o DocePreço <ArrowRight size={17} />
              </a>
            </div>
            <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_50%,#aa3e83,#4a2048_55%,#241627)] p-10">
              <div className="absolute h-96 w-96 rounded-full border border-white/10" />
              <div className="absolute h-[550px] w-[550px] rounded-full border border-white/10" />
              <img
                src={storeScreen}
                loading="lazy"
                alt="Tela da loja online no DocePreço"
                className="relative z-10 h-[420px] w-auto rounded-[2rem] shadow-2xl shadow-black/40"
              />
              <img
                src={menuScreen}
                loading="lazy"
                alt="Cardápio digital visto pelo cliente"
                className="absolute bottom-[-40px] right-[8%] z-20 hidden h-[320px] w-auto rotate-12 rounded-[1.5rem] shadow-2xl shadow-black/40 sm:block"
              />
            </div>
          </div>
        </section>

        <section
          id="planos"
          className="scroll-mt-24 bg-white px-5 py-24 dark:bg-gray-900 sm:px-8 sm:py-32"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-600">
                Planos
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                Comece no seu ritmo.
              </h2>
              <p className="mt-5 text-lg text-gray-600 dark:text-gray-300">
                O plano gratuito já ajuda você a entender seus custos. Quando o
                negócio crescer, o DocePreço cresce junto.
              </p>
              <div className="mt-8 inline-flex rounded-full border border-gray-200 p-1 dark:border-gray-700">
                <button
                  type="button"
                  aria-pressed={!annual}
                  onClick={() => setAnnual(false)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold ${!annual ? "bg-primary-500 text-white" : "text-gray-600 dark:text-gray-300"}`}
                >
                  Mensal
                </button>
                <button
                  type="button"
                  aria-pressed={annual}
                  onClick={() => setAnnual(true)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold ${annual ? "bg-primary-500 text-white" : "text-gray-600 dark:text-gray-300"}`}
                >
                  Anual
                </button>
              </div>
            </div>
            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-3xl border p-8 ${plan.name === "Premium" ? "border-primary-500 bg-primary-50 shadow-xl shadow-primary-500/10 dark:bg-primary-950/20" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"}`}
                >
                  {plan.name === "Premium" && (
                    <span className="absolute -top-3 left-8 rounded-full bg-primary-500 px-4 py-1 text-xs font-bold text-white">
                      Mais escolhido
                    </span>
                  )}
                  <p className="text-xs font-bold uppercase tracking-widest text-primary-600">
                    {plan.description}
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold">{plan.name}</h3>
                  <div className="mt-7 flex items-baseline gap-1">
                    <strong className="text-4xl tracking-tight">
                      {annual ? plan.annualPrice : plan.price}
                    </strong>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      /{annual ? "ano" : "mês"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Assinatura disponível no aplicativo.
                  </p>
                  <div className="my-7 h-px bg-gray-200 dark:bg-gray-700" />
                  <ul className="flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <Check
                          size={17}
                          className="shrink-0 text-primary-500"
                        />{" "}
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#baixar"
                    className={`mt-9 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold ${plan.name === "Premium" ? "bg-primary-500 text-white hover:bg-primary-600" : "border border-gray-200 text-gray-900 hover:border-primary-300 dark:border-gray-700 dark:text-white"}`}
                  >
                    Começar com {plan.name} <ArrowRight size={16} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="baixar" className="scroll-mt-24 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-[1500px] overflow-hidden rounded-[2rem] bg-primary-500 px-6 py-20 text-center text-white sm:py-28">
            <div className="mx-auto max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                Seu próximo passo
              </p>
              <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.045em] sm:text-6xl">
                Seu talento merece um negócio que dá lucro.
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg text-white/85">
                Baixe o DocePreço e comece a organizar preços, receitas e vendas
                hoje.
              </p>
              <div className="mt-9">
                <StoreLinks light />
              </div>
              <p className="mt-6 text-sm text-white/80">
                Grátis para começar · Sem cartão de crédito
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 border-t border-gray-200 pt-8 text-sm text-gray-500 dark:border-gray-800 sm:flex-row">
          <img src={brandLogo} alt="DocePreço" className="h-20 w-auto" loading="lazy" />
          <p>
            © {new Date().getFullYear()} DocePreço. Todos os direitos
            reservados.
          </p>
          <nav aria-label="Links do rodapé" className="flex gap-5">
            <a
              href="https://www.instagram.com/doceprecoapp/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-500"
            >
              Instagram
            </a>
            <a href="/privacy.html" className="hover:text-primary-500">
              Privacidade
            </a>
            <Link to="/app" className="hover:text-primary-500">
              Entrar
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
