import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import brandLogo from '../assets/docepreco-logo.png';

const LAST_UPDATE = '05 de novembro de 2026';
const SITE_URL = 'https://www.doceprecoapp.com.br';
const SUPPORT_EMAIL = 'santosdlaysa@gmail.com';
const PRIVACY_URL = `${SITE_URL}/privacy.html`;
// Preencher com os dados do responsável legal; linhas vazias não são exibidas.
const RESPONSIBLE_NAME = '';
const RESPONSIBLE_DOCUMENT = '';

type Section = { title: string; content: React.ReactNode };

function P({ children }: { children: React.ReactNode }) {
  return <p className="leading-relaxed text-gray-600 dark:text-gray-300">{children}</p>;
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-gray-600 marker:text-primary-500 dark:text-gray-300">
      {items.map(item => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-gray-600 dark:text-gray-300">
      <strong className="text-gray-900 dark:text-white">{label}:</strong> {children}
    </p>
  );
}

const ExternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="break-all text-primary-600 underline-offset-2 hover:underline dark:text-primary-400">
    {children}
  </a>
);

const contactFields = (
  <>
    <Field label="Site">
      <ExternalLink href={SITE_URL}>{SITE_URL}</ExternalLink>
    </Field>
    <Field label="E-mail">
      <ExternalLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</ExternalLink>
    </Field>
    {RESPONSIBLE_NAME && <Field label="Responsável">{RESPONSIBLE_NAME}</Field>}
  </>
);

const SECTIONS: Section[] = [
  {
    title: 'Identificação do serviço',
    content: (
      <>
        <P>O DocePreço é uma plataforma digital de gestão e precificação para profissionais e empreendedores do setor de confeitaria.</P>
        <Field label="Site oficial">
          <ExternalLink href={SITE_URL}>{SITE_URL}</ExternalLink>
        </Field>
        {RESPONSIBLE_NAME && <Field label="Responsável pelo serviço">{RESPONSIBLE_NAME}</Field>}
        {RESPONSIBLE_DOCUMENT && <Field label="CPF/CNPJ">{RESPONSIBLE_DOCUMENT}</Field>}
        <Field label="Contato de suporte">
          <ExternalLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</ExternalLink>
        </Field>
      </>
    ),
  },
  {
    title: 'Funcionalidades do aplicativo',
    content: (
      <>
        <P>O DocePreço disponibiliza funcionalidades que podem variar conforme o plano contratado, incluindo:</P>
        <List
          items={[
            'Cadastro de ingredientes e receitas.',
            'Cálculo de custos de produção.',
            'Precificação de produtos e sugestão de preços de venda.',
            'Controle de estoque e vendas.',
            'Emissão de orçamentos em PDF.',
            'Relatórios financeiros e gerenciais.',
            'Criação de catálogo e loja online.',
            'Recebimento e gerenciamento de pedidos.',
          ]}
        />
        <P>As funcionalidades estão sujeitas às limitações do plano utilizado e às atualizações do aplicativo.</P>
      </>
    ),
  },
  {
    title: 'Planos e assinaturas',
    content: (
      <>
        <P>O DocePreço disponibiliza uma modalidade gratuita e planos pagos.</P>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { name: 'Gratuito', price: 'R$ 0', desc: 'Permite utilizar funcionalidades básicas, respeitando os limites apresentados no aplicativo.' },
            { name: 'Premium', price: 'R$ 19,99/mês', desc: 'Inclui recursos avançados de precificação, gestão de vendas, estoque, relatórios e emissão de documentos.' },
            { name: 'Master', price: 'R$ 39,99/mês', desc: 'Inclui os benefícios do Premium e funcionalidades adicionais, como loja online, catálogo digital, gerenciamento de pedidos e recursos financeiros ampliados.' },
          ].map(plan => (
            <div key={plan.name} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
              <p className="font-bold text-gray-900 dark:text-white">Plano {plan.name}</p>
              <p className="mb-2 text-sm font-semibold text-primary-600 dark:text-primary-400">{plan.price}</p>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{plan.desc}</p>
            </div>
          ))}
        </div>
        <P>Os valores informados são referências dos planos oferecidos diretamente pelo DocePreço e podem variar conforme a plataforma de contratação, região, tributos ou condições promocionais.</P>
        <P>O preço definitivo, a periodicidade e as condições de cobrança serão apresentados antes da confirmação da assinatura.</P>
      </>
    ),
  },
  {
    title: 'Pagamentos e renovação',
    content: (
      <>
        <P>As assinaturas podem ser processadas por plataformas de pagamento autorizadas, conforme o canal de contratação.</P>
        <P>Quando houver renovação automática, o usuário será informado previamente sobre a periodicidade, o valor e as condições aplicáveis.</P>
        <P>A assinatura será renovada conforme as condições aceitas na contratação, até que seja cancelada.</P>
        <P>O processamento e a confirmação dos pagamentos poderão depender das instituições financeiras e plataformas responsáveis.</P>
      </>
    ),
  },
  {
    title: 'Cancelamento de assinaturas',
    content: (
      <>
        <P>O usuário poderá solicitar o cancelamento da renovação automática de sua assinatura.</P>
        <P>O cancelamento impede novas cobranças recorrentes, respeitando os prazos de processamento da plataforma responsável.</P>
        <P>Em regra, o usuário continuará com acesso aos benefícios pagos até o encerramento do período já contratado, salvo condições específicas informadas na contratação ou exigências legais.</P>
        <P>A desinstalação do aplicativo não implica o cancelamento automático da assinatura.</P>
        <P>Assinaturas realizadas por lojas de aplicativos deverão ser gerenciadas conforme os procedimentos disponibilizados pela respectiva loja.</P>
      </>
    ),
  },
  {
    title: 'Reembolsos e direito de arrependimento',
    content: (
      <>
        <P>As solicitações de reembolso serão analisadas conforme a legislação de defesa do consumidor aplicável, as condições da contratação e as políticas da plataforma responsável pelo pagamento.</P>
        <P>Nas contratações sujeitas à legislação brasileira, será respeitado o direito de arrependimento previsto no artigo 49 do Código de Defesa do Consumidor, quando aplicável.</P>
        <P>Após o prazo legal, pedidos de reembolso por simples desistência poderão ser avaliados conforme as condições contratadas, sem prejuízo dos direitos assegurados por lei.</P>
        <P>Falhas na prestação do serviço, cobranças indevidas e outras situações previstas na legislação serão tratadas de acordo com os direitos do consumidor.</P>
      </>
    ),
  },
  {
    title: 'Responsabilidades do usuário',
    content: (
      <>
        <P>O usuário compromete-se a:</P>
        <List
          items={[
            'Fornecer informações verdadeiras durante o cadastro.',
            'Manter a segurança de suas credenciais.',
            'Utilizar o aplicativo para finalidades lícitas.',
            'Cadastrar corretamente os custos, ingredientes e demais informações necessárias aos cálculos.',
            'Não tentar acessar indevidamente contas, sistemas ou informações de terceiros.',
          ]}
        />
      </>
    ),
  },
  {
    title: 'Precisão dos cálculos',
    content: (
      <>
        <P>O DocePreço oferece ferramentas de apoio à formação de preços e à gestão financeira.</P>
        <P>Os resultados dependem das informações cadastradas pelo usuário, incluindo custos de ingredientes, embalagens, mão de obra e demais despesas.</P>
        <P>Os preços sugeridos são estimativas e não constituem garantia de lucro, faturamento ou resultado financeiro.</P>
        <P>Cabe ao usuário conferir os dados e considerar as particularidades de seu negócio antes de tomar decisões comerciais.</P>
      </>
    ),
  },
  {
    title: 'Loja online e pedidos',
    content: (
      <>
        <P>As funcionalidades de catálogo, loja online e gerenciamento de pedidos são ferramentas destinadas a auxiliar os usuários na comercialização de seus produtos.</P>
        <P>O usuário responsável pela loja deverá garantir a veracidade das informações anunciadas, os preços, a disponibilidade dos produtos, o atendimento aos consumidores e o cumprimento das obrigações legais aplicáveis.</P>
        <P>O DocePreço atua como fornecedor da ferramenta tecnológica, não sendo automaticamente o vendedor dos produtos anunciados pelos usuários.</P>
      </>
    ),
  },
  {
    title: 'Privacidade e proteção de dados',
    content: (
      <>
        <P>O DocePreço realiza o tratamento de dados pessoais necessários ao funcionamento da plataforma, conforme sua Política de Privacidade e a legislação aplicável, incluindo a Lei Geral de Proteção de Dados Pessoais (LGPD).</P>
        <P>As informações sobre coleta, utilização, armazenamento, compartilhamento e direitos dos titulares deverão ser consultadas na Política de Privacidade disponibilizada pelo aplicativo.</P>
        <Field label="Política de Privacidade">
          <ExternalLink href={PRIVACY_URL}>{PRIVACY_URL}</ExternalLink>
        </Field>
      </>
    ),
  },
  {
    title: 'Disponibilidade e atualizações',
    content: (
      <>
        <P>O DocePreço poderá realizar atualizações, correções e melhorias para garantir o funcionamento e a segurança da plataforma.</P>
        <P>Interrupções temporárias poderão ocorrer em razão de manutenção, problemas de infraestrutura ou circunstâncias externas.</P>
        <P>Alterações relevantes que afetem os direitos dos usuários serão comunicadas quando exigido pela legislação aplicável.</P>
      </>
    ),
  },
  {
    title: 'Propriedade intelectual',
    content: (
      <>
        <P>O nome DocePreço, sua identidade visual, códigos, interfaces e demais elementos próprios da plataforma são protegidos pela legislação de propriedade intelectual aplicável.</P>
        <P>É proibida a reprodução, distribuição ou exploração não autorizada desses elementos.</P>
        <P>As receitas, imagens, descrições e demais conteúdos inseridos pelo usuário continuam pertencendo aos respectivos titulares.</P>
      </>
    ),
  },
  {
    title: 'Suspensão e encerramento de contas',
    content: (
      <>
        <P>O DocePreço poderá adotar medidas proporcionais de restrição ou suspensão de contas em situações de fraude, uso indevido, violação destes Termos ou exigência legal.</P>
        <P>Sempre que apropriado, o usuário será informado sobre a medida e poderá solicitar esclarecimentos.</P>
        <P>O encerramento da conta e o tratamento dos dados associados observarão a legislação aplicável e a Política de Privacidade.</P>
      </>
    ),
  },
  {
    title: 'Alterações dos Termos de Serviço',
    content: (
      <>
        <P>Estes Termos poderão ser atualizados para refletir mudanças legais, operacionais ou nas funcionalidades do aplicativo.</P>
        <P>A versão vigente permanecerá disponível publicamente no site oficial do DocePreço.</P>
        <P>Quando necessário, alterações relevantes serão comunicadas aos usuários antes de sua aplicação.</P>
      </>
    ),
  },
  {
    title: 'Legislação aplicável',
    content: (
      <P>Estes Termos serão interpretados conforme a legislação aplicável, respeitando as normas obrigatórias de proteção ao consumidor e os direitos dos usuários em suas respectivas jurisdições.</P>
    ),
  },
  {
    title: 'Atendimento e contato',
    content: (
      <>
        <P>Para dúvidas, solicitações de cancelamento, questões relacionadas a pagamentos ou exercício de direitos, o usuário poderá entrar em contato pelos canais oficiais de atendimento.</P>
        {contactFields}
      </>
    ),
  },
];

const slug = (i: number) => `secao-${i + 1}`;

export function TermsPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Termos de Serviço — DocePreço';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-primary-600 dark:text-gray-300">
            <ArrowLeft size={18} />
            Voltar
          </Link>
          <img src={brandLogo} alt="DocePreço" className="h-10 w-auto" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">Termos de Serviço</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Última atualização: {LAST_UPDATE}</p>
        </div>

        <div className="mb-8 space-y-3 rounded-3xl bg-white p-6 shadow-sm dark:bg-gray-800 sm:p-8">
          <p className="font-semibold text-gray-900 dark:text-white">Bem-vindo ao DocePreço!</p>
          <P>Estes Termos de Serviço estabelecem as condições de utilização do aplicativo DocePreço, uma plataforma digital desenvolvida para auxiliar confeiteiros, empreendedores e profissionais do setor alimentício na precificação de produtos, organização de receitas, controle de vendas e gestão de seus negócios.</P>
          <P>Ao criar uma conta ou utilizar o aplicativo, o usuário declara estar ciente destes Termos de Serviço.</P>
        </div>

        <nav aria-label="Sumário" className="mb-8 rounded-3xl bg-white p-6 shadow-sm dark:bg-gray-800 sm:p-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Sumário</p>
          <ol className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {SECTIONS.map((s, i) => (
              <li key={s.title}>
                <a href={`#${slug(i)}`} className="text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-6">
          {SECTIONS.map((s, i) => (
            <section
              key={s.title}
              id={slug(i)}
              className="scroll-mt-20 space-y-3 rounded-3xl bg-white p-6 shadow-sm dark:bg-gray-800 sm:p-8"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                <span className="text-primary-500">{i + 1}.</span> {s.title}
              </h2>
              {s.content}
            </section>
          ))}
        </div>

        <p className="mt-10 text-center font-semibold text-gray-700 dark:text-gray-300">
          DocePreço — Sua confeitaria mais organizada e lucrativa.
        </p>
      </main>
    </div>
  );
}
