import i18n from '../i18n';

/**
 * Tutorial de cadastro de ingredientes (texto em web/src/i18n/locales/<lang>/recipes.json,
 * chave `pricingTutorial`). Exportado como binding "vivo": quem importa
 * PRICING_TUTORIAL sempre lê o texto no idioma atual.
 */
// eslint-disable-next-line import/no-mutable-exports
export let PRICING_TUTORIAL = '';

const update = () => {
  PRICING_TUTORIAL = i18n.t('recipes:pricingTutorial');
};
if (i18n.isInitialized) update();
i18n.on('initialized', update);
i18n.on('languageChanged', update);
