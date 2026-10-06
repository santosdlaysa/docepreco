import { useEffect } from 'react';
import { useCurrency, isValidCurrency } from '../../context/CurrencyContext';
import { useUnitSystem } from '../../context/UnitSystemContext';
import { preferencesApi } from '../../data/api/preferencesApi';
import { pdfSettingsStorage } from '../../data/storage/pdfSettingsStorage';
import { isDemoMode } from '../../data/demo/demoMode';

/**
 * Ao entrar no app: aplica as preferências salvas na conta (moeda, unidades,
 * PDF) — as mesmas da web. Se a conta ainda não tem nada, sobe as deste
 * aparelho (migração única). Não renderiza nada.
 */
export function PreferencesSync() {
  const { currency, setCurrency, loading: currencyLoading } = useCurrency();
  const { unitSystem, setUnitSystem, loading: unitLoading } = useUnitSystem();

  useEffect(() => {
    if (currencyLoading || unitLoading || isDemoMode()) return;
    let active = true;
    (async () => {
      try {
        const server = await preferencesApi.get();
        if (!active) return;
        if (Object.keys(server).length === 0) {
          const pdf = await pdfSettingsStorage.get();
          await preferencesApi.push({ currency, unitSystem, pdf: { ...pdf, logoBase64: pdf.logoBase64 ?? null } });
          return;
        }
        if (server.currency && isValidCurrency(server.currency) && server.currency !== currency) {
          await setCurrency(server.currency, { sync: false });
        }
        if (server.unitSystem && server.unitSystem !== unitSystem) {
          await setUnitSystem(server.unitSystem, { sync: false });
        }
        if (server.pdf) {
          const local = await pdfSettingsStorage.get();
          const { logoBase64, ...rest } = server.pdf;
          await pdfSettingsStorage.saveLocal({ ...local, ...rest, logoBase64: logoBase64 ?? undefined });
        }
      } catch { /* sem rede: segue com o que está no aparelho */ }
    })();
    return () => { active = false; };
    // Só uma vez por sessão, depois que as preferências locais carregaram.
  }, [currencyLoading, unitLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
