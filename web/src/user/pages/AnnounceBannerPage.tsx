import { useEffect, useState } from 'react';
import { Megaphone, ImagePlus, Copy, Check, Loader2, X } from 'lucide-react';
import { ToastFn } from '../../components';
import { Header, FormField, inputClass } from './IngredientsPage';
import { engagementApi, AdBannerPeriod, BannerPurchase } from '../engagementApi';
import { imageFileToJpegDataUrl } from '../../lib/image';

const FALLBACK_PERIODS: AdBannerPeriod[] = [
  { days: 7, amountCents: 990, priceLabel: 'R$ 9,90' },
  { days: 15, amountCents: 1790, priceLabel: 'R$ 17,90' },
  { days: 30, amountCents: 2990, priceLabel: 'R$ 29,90' },
];

/** Anunciar no carrossel do app — mesma tela do app (AnnounceBannerScreen). */
export function AnnounceBannerPage({ toast, onDone }: { toast: ToastFn; onDone: () => void }) {
  const [periods, setPeriods] = useState<AdBannerPeriod[]>(FALLBACK_PERIODS);
  const [enabled, setEnabled] = useState(true);
  const [days, setDays] = useState(7);
  const [image, setImage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [purchase, setPurchase] = useState<BannerPurchase | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    engagementApi.getAdBannerConfig().then(cfg => {
      if (!cfg) return;
      setEnabled(cfg.enabled);
      if (cfg.periods.length > 0) {
        setPeriods(cfg.periods);
        setDays(cfg.periods[0].days);
      }
    });
  }, []);

  // Confere o pagamento a cada 5s enquanto o QR está na tela.
  useEffect(() => {
    if (!purchase) return;
    const id = setInterval(async () => {
      try {
        const status = await engagementApi.getBannerPurchaseStatus(purchase.pixRequestId);
        if (status === 'approved') {
          clearInterval(id);
          toast.success('Anúncio no ar! Seu banner já aparece no app 🎉');
          onDone();
        } else if (status === 'rejected') {
          clearInterval(id);
          toast.error('Pagamento não confirmado.');
          setPurchase(null);
        }
      } catch { /* tenta de novo */ }
    }, 5000);
    return () => clearInterval(id);
  }, [purchase, toast, onDone]);

  const selected = periods.find(p => p.days === days) ?? periods[0];

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    imageFileToJpegDataUrl(file, 1280, 0.7).then(setImage).catch(err => toast.error((err as Error).message));
  };

  const buy = async () => {
    if (!image) return toast.warning('Escolha a arte do seu anúncio.');
    if (!selected) return;
    setSending(true);
    try {
      setPurchase(await engagementApi.purchaseBanner({
        imageBase64: image,
        periodDays: selected.days,
        actionUrl: actionUrl.trim() || undefined,
        title: title.trim() || undefined,
      }));
    } catch (err) {
      toast.error((err as Error).message || 'Erro ao criar anúncio.');
    } finally {
      setSending(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  const card = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5';

  return (
    <div className="max-w-xl">
      <Header title="Anunciar no app" subtitle="Divulgue sua confeitaria no carrossel do DocePreço" />

      {!enabled ? (
        <div className={`${card} text-center`}>
          <Megaphone size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">A venda de anúncios está pausada no momento. Volte em breve!</p>
        </div>
      ) : purchase ? (
        <div className={`${card} text-center space-y-3`}>
          <p className="font-semibold text-gray-900 dark:text-white">Pague o PIX para publicar ({purchase.priceLabel})</p>
          {purchase.mp_qr_code_base64 && (
            <img src={`data:image/png;base64,${purchase.mp_qr_code_base64}`} alt="QR Code PIX" className="w-44 h-44 mx-auto rounded-lg border border-gray-200 dark:border-gray-700" />
          )}
          {purchase.mp_qr_code && (
            <button onClick={() => copy(purchase.mp_qr_code!)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary-300 px-4 py-2 text-sm font-semibold text-primary-600">
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copiado!' : 'Copiar PIX copia e cola'}
            </button>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5">
            <Loader2 size={13} className="animate-spin" /> Aguardando confirmação do pagamento…
          </p>
        </div>
      ) : (
        <div className={`${card} space-y-4`}>
          <FormField label="Arte do anúncio (formato paisagem, 16:9)">
            {image ? (
              <div className="relative">
                <img src={image} alt="Prévia do anúncio" className="w-full aspect-video object-cover rounded-lg" />
                <button onClick={() => setImage(null)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1" aria-label="Remover imagem">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1 aspect-video rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer text-gray-400 hover:border-primary-400">
                <ImagePlus size={24} />
                <span className="text-sm">Escolher imagem</span>
                <input type="file" accept="image/*" className="hidden" onChange={pickImage} />
              </label>
            )}
          </FormField>
          <FormField label="Nome da confeitaria (opcional)">
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={60} placeholder="Ex.: Confeitaria da Ana" className={inputClass} />
          </FormField>
          <FormField label="Link ao tocar no anúncio (opcional)">
            <input value={actionUrl} onChange={e => setActionUrl(e.target.value)} placeholder="https://instagram.com/sua_confeitaria" className={inputClass} />
          </FormField>
          <FormField label="Período">
            <div className="grid grid-cols-3 gap-2">
              {periods.map(p => (
                <button key={p.days} type="button" onClick={() => setDays(p.days)}
                  className={`rounded-xl border-2 p-2.5 text-center ${days === p.days ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-600'}`}>
                  <span className="block text-sm font-bold text-gray-900 dark:text-white">{p.days} dias</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{p.priceLabel}</span>
                </button>
              ))}
            </div>
          </FormField>
          <button onClick={buy} disabled={sending}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg py-2.5 flex items-center justify-center gap-2">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
            Gerar PIX {selected ? `de ${selected.priceLabel}` : ''}
          </button>
        </div>
      )}
    </div>
  );
}
