import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Wifi, WifiOff, RefreshCw, QrCode, Loader2 } from 'lucide-react';

type ToastFn = { success: (m: string) => void; error: (m: string) => void };

export function WhatsAppPage({ toast }: { toast: ToastFn }) {
  const [status, setStatus] = useState<string>('unknown');
  const [qr, setQr] = useState<{ base64: string; code: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrLoading, setQrLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.whatsappGetStatus();
      setStatus(res.state);
      return res.state;
    } catch {
      setStatus('disconnected');
      return 'disconnected';
    }
  }, []);

  const fetchQr = useCallback(async () => {
    setQrLoading(true);
    try {
      const res = await api.whatsappGetQrCode();
      setQr(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao obter QR code');
    } finally {
      setQrLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const state = await fetchStatus();
      if (state !== 'open') await fetchQr();
      setLoading(false);
    })();
  }, [fetchStatus, fetchQr]);

  // Poll status every 10s when not connected
  useEffect(() => {
    if (status === 'open') return;
    const interval = setInterval(async () => {
      const state = await fetchStatus();
      if (state === 'open') {
        setQr(null);
        toast.success('WhatsApp conectado!');
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [status, fetchStatus, toast]);

  const handleRefreshQr = async () => {
    await fetchQr();
    toast.success('QR code atualizado');
  };

  const connected = status === 'open';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">WhatsApp</h1>
        <p className="text-sm text-gray-500 mt-1">Conexao com a Evolution API para envio de mensagens</p>
      </div>

      {/* Status card */}
      <div className={`rounded-xl border p-5 flex items-center gap-4 ${connected ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-red-50 dark:bg-red-900/20 border-red-200'}`}>
        {connected ? <Wifi size={24} className="text-green-600" /> : <WifiOff size={24} className="text-red-500" />}
        <div className="flex-1">
          <p className={`font-semibold text-sm ${connected ? 'text-green-800' : 'text-red-800'}`}>
            {connected ? 'Conectado' : 'Desconectado'}
          </p>
          <p className={`text-xs ${connected ? 'text-green-600' : 'text-red-600'}`}>
            {connected ? 'WhatsApp pronto para enviar mensagens' : 'Escaneie o QR code abaixo para conectar'}
          </p>
        </div>
        <button
          onClick={fetchStatus}
          className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          title="Atualizar status"
        >
          <RefreshCw size={16} className={connected ? 'text-green-600' : 'text-red-500'} />
        </button>
      </div>

      {/* QR Code */}
      {!connected && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <QrCode size={18} className="text-gray-500 dark:text-gray-400" />
              <h2 className="font-semibold text-gray-900 text-sm">QR Code</h2>
            </div>
            <button
              onClick={handleRefreshQr}
              disabled={qrLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={qrLoading ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>

          <div className="flex flex-col items-center gap-4">
            {qrLoading ? (
              <div className="w-64 h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
                <Loader2 size={32} className="animate-spin text-gray-400" />
              </div>
            ) : qr?.base64 ? (
              <img
                src={qr.base64.startsWith('data:') ? qr.base64 : `data:image/png;base64,${qr.base64}`}
                alt="WhatsApp QR Code"
                className="w-64 h-64 rounded-lg border border-gray-100 dark:border-gray-700"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-gray-50 rounded-lg text-gray-400 text-sm">
                QR code indisponivel
              </div>
            )}

            <div className="text-center max-w-xs">
              <p className="text-sm text-gray-700 font-medium">Como conectar:</p>
              <ol className="text-xs text-gray-500 mt-2 space-y-1 text-left">
                <li>1. Abra o WhatsApp no celular</li>
                <li>2. Toque em <strong>Configuracoes</strong> → <strong>Dispositivos conectados</strong></li>
                <li>3. Toque em <strong>Conectar dispositivo</strong></li>
                <li>4. Escaneie o QR code acima</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {connected && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
          <Wifi size={40} className="text-green-500 mx-auto mb-3" />
          <p className="text-sm text-gray-700 font-medium">Tudo certo!</p>
          <p className="text-xs text-gray-500 mt-1">Voce ja pode enviar mensagens pelo painel de usuarios.</p>
        </div>
      )}
    </div>
  );
}
