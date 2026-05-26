import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Recipe } from '../../domain/entities/Recipe';
import { CalculationResult } from '../../domain/entities/Calculation';
import { PdfSettings } from '../../data/storage/pdfSettingsStorage';

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (d: Date) =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export interface QuoteInput {
  recipe: Recipe;
  calculation: CalculationResult;
  companyName?: string;
}

const buildHtml = ({ recipe, calculation, companyName }: QuoteInput, pdfSettings?: PdfSettings): string => {
  const company = companyName?.trim() ? escapeHtml(companyName) : 'DocePreço';
  const date = formatDate(new Date());
  const brandColor = pdfSettings?.brandColor || '#E91E63';
  const ingredientsRows = recipe.ingredients
    .map(
      (i, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(i.ingredientName || `Ingrediente ${idx + 1}`)}</td>
          <td class="right">${i.quantityUsed} ${escapeHtml(i.unit)}</td>
        </tr>`
    )
    .join('');

  const additionalCostsRows = recipe.additionalCosts
    .map(
      c => `
        <tr>
          <td>${escapeHtml(c.name)}</td>
          <td class="right">${formatCurrency(c.value)}</td>
        </tr>`
    )
    .join('');

  const logoHtml = pdfSettings?.logoBase64
    ? `<img src="${pdfSettings.logoBase64}" style="width:48px;height:48px;border-radius:8px;margin-right:12px;" />`
    : '';

  const sloganHtml = pdfSettings?.companySlogan
    ? `<div class="slogan">${escapeHtml(pdfSettings.companySlogan)}</div>`
    : '';

  const footerHtml = pdfSettings?.hideWatermark
    ? ''
    : `<div class="footer">
    Orçamento gerado por <strong>DocePreço</strong> — calculadora de preços para confeitaria
  </div>`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Orçamento - ${escapeHtml(recipe.name)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #2D2D2D;
    margin: 0;
    padding: 32px 40px;
    background: #ffffff;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 20px;
    border-bottom: 3px solid ${brandColor};
    margin-bottom: 28px;
  }
  .header-left {
    display: flex;
    align-items: center;
  }
  .brand {
    font-size: 22px;
    font-weight: 800;
    color: ${brandColor};
    letter-spacing: -0.5px;
  }
  .company {
    font-size: 13px;
    color: #7A7A7A;
    margin-top: 4px;
  }
  .slogan {
    font-size: 11px;
    color: #999;
    margin-top: 2px;
    font-style: italic;
  }
  .date {
    font-size: 12px;
    color: #7A7A7A;
    text-align: right;
  }
  h1 {
    font-size: 28px;
    margin: 0 0 4px 0;
    color: #2D2D2D;
    font-weight: 800;
  }
  .subtitle {
    font-size: 14px;
    color: #7A7A7A;
    margin-bottom: 24px;
  }
  .meta-grid {
    display: flex;
    gap: 12px;
    margin-bottom: 28px;
  }
  .meta-card {
    flex: 1;
    background: #FFF5F8;
    border: 1px solid #FCE4EC;
    border-radius: 12px;
    padding: 16px;
    text-align: center;
  }
  .meta-label {
    font-size: 11px;
    color: #7A7A7A;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .meta-value {
    font-size: 22px;
    font-weight: 800;
    color: #2D2D2D;
  }
  .highlight-box {
    background: linear-gradient(135deg, #FFF5F8 0%, #FCE4EC 100%);
    border: 2px solid ${brandColor};
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 28px;
    display: flex;
    justify-content: space-around;
  }
  .highlight-item {
    text-align: center;
    flex: 1;
  }
  .highlight-item + .highlight-item {
    border-left: 1px solid #F8BBD0;
  }
  .highlight-label {
    font-size: 12px;
    color: #7A7A7A;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }
  .highlight-value {
    font-size: 30px;
    font-weight: 800;
    color: ${brandColor};
  }
  .highlight-value.success {
    color: #2E7D32;
  }
  .highlight-sub {
    font-size: 11px;
    color: #7A7A7A;
    margin-top: 4px;
  }
  .section {
    margin-bottom: 24px;
  }
  .section-title {
    font-size: 15px;
    font-weight: 800;
    color: #2D2D2D;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #EEE;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th {
    text-align: left;
    padding: 8px 10px;
    background: #FAFAFA;
    color: #7A7A7A;
    font-weight: 700;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  td {
    padding: 10px;
    border-bottom: 1px solid #F0F0F0;
    color: #2D2D2D;
  }
  .right { text-align: right; }
  .breakdown {
    background: #FAFAFA;
    border-radius: 12px;
    padding: 16px 20px;
  }
  .breakdown-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 14px;
  }
  .breakdown-row + .breakdown-row {
    border-top: 1px solid #EEE;
  }
  .breakdown-label { color: #7A7A7A; }
  .breakdown-value { color: #2D2D2D; font-weight: 600; }
  .breakdown-row.total {
    border-top: 2px solid ${brandColor};
    margin-top: 4px;
    padding-top: 12px;
  }
  .breakdown-row.total .breakdown-label,
  .breakdown-row.total .breakdown-value {
    font-size: 16px;
    font-weight: 800;
    color: #2D2D2D;
  }
  .footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid #EEE;
    text-align: center;
    font-size: 11px;
    color: #9A9A9A;
  }
  .footer strong { color: ${brandColor}; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${logoHtml}
      <div>
        <div class="brand">DocePreço</div>
        <div class="company">${company}</div>
        ${sloganHtml}
      </div>
    </div>
    <div class="date">Gerado em<br/><strong>${date}</strong></div>
  </div>

  <h1>${escapeHtml(recipe.name)}</h1>
  <div class="subtitle">Orçamento detalhado de produção</div>

  <div class="meta-grid">
    <div class="meta-card">
      <div class="meta-label">Rendimento</div>
      <div class="meta-value">${recipe.yield}</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">Margem</div>
      <div class="meta-value">${recipe.profitMargin}%</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">Ingredientes</div>
      <div class="meta-value">${recipe.ingredients.length}</div>
    </div>
  </div>

  <div class="highlight-box">
    <div class="highlight-item">
      <div class="highlight-label">Preço Sugerido</div>
      <div class="highlight-value">${formatCurrency(calculation.suggestedPrice)}</div>
      <div class="highlight-sub">por unidade</div>
    </div>
    <div class="highlight-item">
      <div class="highlight-label">Lucro Estimado</div>
      <div class="highlight-value success">${formatCurrency(calculation.estimatedProfit)}</div>
      <div class="highlight-sub">total</div>
    </div>
  </div>

  ${
    recipe.ingredients.length > 0
      ? `
  <div class="section">
    <div class="section-title">Ingredientes</div>
    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Nome</th>
          <th class="right">Quantidade</th>
        </tr>
      </thead>
      <tbody>${ingredientsRows}</tbody>
    </table>
  </div>`
      : ''
  }

  ${
    recipe.additionalCosts.length > 0
      ? `
  <div class="section">
    <div class="section-title">Custos Adicionais</div>
    <table>
      <tbody>${additionalCostsRows}</tbody>
    </table>
  </div>`
      : ''
  }

  <div class="section">
    <div class="section-title">Resumo Financeiro</div>
    <div class="breakdown">
      <div class="breakdown-row">
        <span class="breakdown-label">Custo dos ingredientes</span>
        <span class="breakdown-value">${formatCurrency(calculation.ingredientsCost)}</span>
      </div>
      ${
        calculation.subRecipesCost > 0
          ? `
      <div class="breakdown-row">
        <span class="breakdown-label">Custo sub-receitas</span>
        <span class="breakdown-value">${formatCurrency(calculation.subRecipesCost)}</span>
      </div>`
          : ''
      }
      ${
        calculation.additionalCostTotal > 0
          ? `
      <div class="breakdown-row">
        <span class="breakdown-label">Custos adicionais</span>
        <span class="breakdown-value">${formatCurrency(calculation.additionalCostTotal)}</span>
      </div>`
          : ''
      }
      <div class="breakdown-row">
        <span class="breakdown-label">Custo por unidade</span>
        <span class="breakdown-value">${formatCurrency(calculation.costPerUnit)}</span>
      </div>
      <div class="breakdown-row total">
        <span class="breakdown-label">Custo total</span>
        <span class="breakdown-value">${formatCurrency(calculation.totalCost)}</span>
      </div>
    </div>
  </div>

  ${footerHtml}
</body>
</html>
  `.trim();
};

export async function shareRecipeQuote(input: QuoteInput, pdfSettings?: PdfSettings): Promise<void> {
  const html = buildHtml(input, pdfSettings);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Compartilhamento não está disponível neste dispositivo');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Orçamento - ${input.recipe.name}`,
    UTI: 'com.adobe.pdf',
  });
}
