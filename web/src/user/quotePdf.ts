import { Recipe, CalculationResult } from './userApi';
import { PdfSettings } from './localPrefs';
import i18n, { getLang } from '../i18n';

const tr = (key: string, opts?: Record<string, unknown>) => i18n.t(`recipes:${key}`, opts);

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Gera e imprime um orçamento em PDF da receita (via janela de impressão do
 * navegador). Porta o layout do app mobile (utils/pdfQuote.ts).
 */
export function printRecipeQuote(
  recipe: Recipe,
  calc: CalculationResult,
  companyName?: string,
  pdf?: PdfSettings,
): boolean {
  // Cor/logo/slogan/marca d'água vêm da personalização (Premium), igual ao app.
  const BRAND = /^#[0-9a-fA-F]{6}$/.test(pdf?.brandColor ?? '') ? pdf!.brandColor : '#E91E63';
  const logoHtml = pdf?.logoBase64?.startsWith('data:image/')
    ? `<img src="${esc(pdf.logoBase64)}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;margin-right:12px" />`
    : '';
  const dateLabel = new Date().toLocaleDateString(getLang() === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const ingredientRows = (recipe.ingredients ?? [])
    .map(
      (ri, i) => `<tr>
        <td style="color:#bbb;width:28px">${i + 1}</td>
        <td>${esc(ri.ingredientName || tr('pdfIngredient'))}</td>
        <td style="text-align:right">${ri.quantityUsed} ${esc(ri.unit)}</td>
      </tr>`
    )
    .join('');

  const additionalRows = (recipe.additionalCosts ?? [])
    .map(
      c => `<tr><td colspan="2">${esc(c.name)}</td>
        <td style="text-align:right;color:${BRAND};font-weight:600">${fmt(c.value)} ${c.costType === 'unit' ? tr('pdfPerUnit') : tr('pdfPerRecipe')}</td></tr>`
    )
    .join('');

  const breakdownRow = (label: string, value: string, strong = false) => `
    <tr${strong ? ' style="border-top:2px solid #eee"' : ''}>
      <td style="${strong ? 'font-weight:700' : 'color:#555'}">${label}</td>
      <td style="text-align:right;${strong ? `font-weight:700;color:${BRAND}` : 'font-weight:600'}">${value}</td>
    </tr>`;

  const html = `<!doctype html><html lang="${getLang() === 'en' ? 'en' : 'pt-BR'}"><head><meta charset="utf-8"/>
  <title>${esc(tr('pdfTitle', { name: recipe.name }))}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #333; padding: 36px; max-width: 800px; margin: 0 auto; }
    .brand { color: ${BRAND}; font-size: 22px; font-weight: 800; }
    .company { font-size: 14px; color: #666; margin-top: 2px; }
    .date { font-size: 12px; color: #999; margin-top: 2px; }
    h1 { font-size: 24px; margin: 24px 0 2px; }
    .sub { color: #888; font-size: 13px; margin-bottom: 20px; }
    .meta { display: flex; gap: 12px; margin-bottom: 20px; }
    .meta .card { flex: 1; background: #FFF0F5; border-radius: 10px; padding: 12px 14px; }
    .meta .lbl { font-size: 11px; color: #999; }
    .meta .val { font-size: 18px; font-weight: 700; color: #333; }
    .hl { display: flex; gap: 12px; margin-bottom: 24px; }
    .hl .box { flex: 1; border-radius: 12px; padding: 16px; color: #fff; }
    .hl .box.p { background: ${BRAND}; }
    .hl .box.g { background: #16a34a; }
    .hl .lbl { font-size: 12px; opacity: .9; }
    .hl .val { font-size: 26px; font-weight: 800; margin-top: 2px; }
    h2 { font-size: 14px; color: #555; border-bottom: 2px solid #F8BBD0; padding-bottom: 6px; margin: 22px 0 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td { padding: 7px 8px; border-bottom: 1px solid #f0f0f0; }
    .footer { margin-top: 40px; font-size: 11px; color: #bbb; text-align: center; }
    @media print { body { padding: 12px; } }
  </style></head><body>
    <div style="display:flex;align-items:center">
      ${logoHtml}
      <div>
        <div class="brand">DocePreço</div>
        ${companyName ? `<div class="company">${esc(companyName)}</div>` : ''}
        ${pdf?.companySlogan ? `<div class="company" style="font-style:italic">${esc(pdf.companySlogan)}</div>` : ''}
        <div class="date">${esc(tr('pdfGeneratedOn', { date: dateLabel }))}</div>
      </div>
    </div>

    <h1>${esc(recipe.name)}</h1>
    <div class="sub">${tr('pdfSubtitle')}</div>

    <div class="meta">
      <div class="card"><div class="lbl">${tr('pdfYield')}</div><div class="val">${recipe.yield}</div></div>
      <div class="card"><div class="lbl">${tr('pdfMarkup')}</div><div class="val">${recipe.profitMargin}%</div></div>
      <div class="card"><div class="lbl">${tr('pdfIngredients')}</div><div class="val">${recipe.ingredients?.length ?? 0}</div></div>
    </div>

    <div class="hl">
      <div class="box p"><div class="lbl">${tr('pdfSuggested')}</div><div class="val">${fmt(calc.suggestedPrice)}</div></div>
      <div class="box g"><div class="lbl">${tr('pdfProfit')}</div><div class="val">${fmt(calc.estimatedProfit)}</div></div>
    </div>

    ${ingredientRows ? `<h2>${tr('pdfIngredients')}</h2><table>${ingredientRows}</table>` : ''}
    ${additionalRows ? `<h2>${tr('pdfAdditional')}</h2><table>${additionalRows}</table>` : ''}

    <h2>${tr('pdfSummary')}</h2>
    <table>
      ${breakdownRow(tr('pdfIngredientsCost'), fmt(calc.ingredientsCost))}
      ${calc.subRecipesCost > 0 ? breakdownRow(tr('pdfSubCost'), fmt(calc.subRecipesCost)) : ''}
      ${calc.additionalCostTotal > 0 ? breakdownRow(tr('pdfAdditional'), fmt(calc.additionalCostTotal)) : ''}
      ${breakdownRow(tr('pdfCostPerUnit'), fmt(calc.costPerUnit))}
      ${breakdownRow(tr('pdfTotalCost'), fmt(calc.totalCost), true)}
    </table>

    ${pdf?.hideWatermark ? '' : `<div class="footer">${tr('pdfFooter')}</div>`}
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
  return true;
}
