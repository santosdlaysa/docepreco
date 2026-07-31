import { X, ShieldCheck } from 'lucide-react';

/**
 * Texto de consentimento LGPD exibido no cadastro. Resume o tratamento de dados
 * e remete à Política de Privacidade. Reaproveitado entre o modal de aceite e a
 * página de política.
 */
export const LGPD_SECTIONS: { title: string; body: string; bullets?: string[] }[] = [
  {
    title: 'Quais dados tratamos',
    body: 'Para usar o DocePreço, tratamos os dados que você fornece e cadastra:',
    bullets: [
      'Dados de cadastro: nome da confeitaria, e-mail e telefone.',
      'Dados de uso do app: ingredientes, receitas, vendas, encomendas, clientes e estoque que você registra.',
    ],
  },
  {
    title: 'Como usamos',
    body: 'Utilizamos esses dados apenas para operar o serviço:',
    bullets: [
      'Autenticar seu acesso e proteger sua conta.',
      'Calcular custos, margens e preços das suas receitas e gerar relatórios.',
      'Enviar comunicações importantes relacionadas ao serviço.',
    ],
  },
  {
    title: 'Compartilhamento e segurança',
    body: 'Seus dados são armazenados em servidores seguros. Não vendemos, alugamos nem compartilhamos suas informações pessoais com terceiros, exceto quando exigido por lei ou por provedores que operam o app sob acordos de confidencialidade.',
  },
  {
    title: 'Seus direitos (LGPD)',
    body: 'Conforme a Lei Geral de Proteção de Dados (LGPD – Lei 13.709/2018), você pode a qualquer momento:',
    bullets: [
      'Acessar, corrigir e atualizar seus dados.',
      'Solicitar a exclusão dos seus dados pessoais.',
      'Solicitar a portabilidade dos seus dados.',
      'Revogar este consentimento pelo próprio app.',
    ],
  },
];

export function LgpdModal({
  onClose,
  onAccept,
  required,
}: {
  onClose: () => void;
  onAccept?: () => void;
  /** Quando true, o modal não pode ser fechado sem aceitar (aceite obrigatório). */
  required?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center p-4 animate-fade-in"
      onClick={required ? undefined : onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/40 flex items-center justify-center">
            <ShieldCheck size={18} className="text-primary-600 dark:text-primary-300" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight">Privacidade e proteção de dados</h3>
            <p className="text-xs text-gray-400">Lei Geral de Proteção de Dados (LGPD)</p>
          </div>
          {!required && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="px-6 py-4 overflow-y-auto space-y-4">
          {LGPD_SECTIONS.map(s => (
            <div key={s.title}>
              <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">{s.title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{s.body}</p>
              {s.bullets && (
                <ul className="mt-1.5 space-y-1">
                  {s.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="text-primary-500 mt-0.5">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <p className="text-xs text-gray-400 leading-relaxed pt-1">
            Ao aceitar, você concorda com o tratamento dos seus dados conforme descrito acima.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          {!required && (
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Fechar
            </button>
          )}
          {onAccept && (
            <button
              onClick={onAccept}
              className="text-sm px-4 py-2 rounded-lg font-semibold bg-primary-500 hover:bg-primary-600 text-white"
            >
              Li e aceito
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
