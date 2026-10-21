import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

type ToastFn = { success: (m: string) => void; error: (m: string) => void };

export function WhatsAppPage({ toast }: { toast: ToastFn }) {
  const [state, setState] = useState<'configured' | 'not_configured' | 'unknown'>('unknown');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await api.whatsappGetStatus();
      setState(result.state === 'configured' ? 'configured' : 'not_configured');
    } catch (error) {
      setState('unknown');
      toast.error(error instanceof Error ? error.message : 'Não foi possível verificar a Cloud API.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void refresh(); }, [refresh]);
  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-gray-400" /></div>;

  const ready = state === 'configured';
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">WhatsApp oficial</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Integração pela WhatsApp Cloud API da Meta — sem sessão do WhatsApp Web e sem QR Code.</p>
      </div>

      <div className={`rounded-xl border p-5 flex items-center gap-4 ${ready ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200'}`}>
        {ready ? <CheckCircle2 size={25} className="text-green-600" /> : <AlertTriangle size={25} className="text-amber-600" />}
        <div className="flex-1">
          <p className={`font-semibold text-sm ${ready ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'}`}>{ready ? 'Cloud API configurada' : 'Cloud API aguardando configuração'}</p>
          <p className={`text-xs mt-0.5 ${ready ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>{ready ? 'O backend possui token e ID do número configurados.' : 'Cadastre as credenciais da Meta no ambiente do backend antes de ativar envios.'}</p>
        </div>
        <button onClick={() => void refresh()} className="p-2 rounded-lg hover:bg-white/50" title="Atualizar status"><RefreshCw size={16} /></button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex gap-3"><ShieldCheck className="text-green-600 shrink-0" size={22} /><div><h2 className="font-semibold text-sm text-gray-900 dark:text-white">Proteções ativas</h2><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">O sistema só aceita templates aprovados para envio automático. Campanhas de win-back exigem opt-in de marketing salvo para o contato.</p></div></div>
        <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-2 list-disc pl-5">
          <li>Webhook assinado pela Meta para status de entrega, leitura e falha.</li>
          <li>Sem reconexão, QR Code ou instância Evolution/Baileys.</li>
          <li>Mensagens manuais continuam disponíveis pelo botão “Abrir no WhatsApp”, sem automação pelo sistema.</li>
        </ul>
      </div>
    </div>
  );
}
