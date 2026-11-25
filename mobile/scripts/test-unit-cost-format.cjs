const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/presentation/utils/currency.ts'), 'utf8');
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: mod.exports, module: mod });
const { formatCurrencyUnit, formatCurrency, CURRENCY_INFO } = mod.exports;
const compact = text => text.replace(/\s/g, '');

// Known cost-per-gram examples. Only their presentation is rounded.
assert.equal(compact(formatCurrencyUnit(10 / 1000)), 'R$0,01');
assert.equal(compact(formatCurrencyUnit(5 / 10000)), 'R$0,0005');
assert.equal(compact(formatCurrencyUnit(1 / 100000)), 'R$0,00001');
assert.equal(compact(formatCurrencyUnit(0.00005678)), 'R$0,000057');
assert.equal(compact(formatCurrencyUnit(0.00000001)), 'R$0,00000001');
assert.equal(compact(formatCurrencyUnit(0.000000001)), '<R$0,00000001');
assert.equal(compact(formatCurrencyUnit(-0.000000001)), '>-R$0,00000001');
assert.equal(compact(formatCurrencyUnit(0)), 'R$0,00');
assert.equal(compact(formatCurrencyUnit(NaN)), 'R$0,00');
assert.equal(compact(formatCurrencyUnit(Infinity)), 'R$0,00');
assert.equal(compact(formatCurrencyUnit(12.345)), 'R$12,35');
assert.equal(compact(formatCurrencyUnit(-0.00001)), '-R$0,00001');

for (const currency of Object.keys(CURRENCY_INFO)) {
  const locale = CURRENCY_INFO[currency].locale;
  const value = 1 / 100000;
  const expected = value.toLocaleString(locale, {
    style: 'currency', currency, minimumFractionDigits: 4, maximumFractionDigits: 6,
  });
  assert.equal(formatCurrencyUnit(value, currency), expected);
  // Final sale/package prices keep their original currency formatting.
  for (const price of [0, 0.00001, 0.01, 1.99, 12.345, 1000]) {
    assert.equal(formatCurrency(price, currency), price.toLocaleString(locale, { style: 'currency', currency }));
  }
}

const ingredient = fs.readFileSync(path.join(root, 'src/presentation/screens/CreateIngredientScreen.tsx'), 'utf8');
assert.ok(ingredient.includes('formatCurrencyUnit(pricePerUnit)'));
assert.ok(ingredient.includes('const pricePerUnit = qty > 0 ? price / qty : 0;'));
console.log('PASS: 12 fractional/zero/invalid/negative unit-cost cases; all 9 currencies and 54 unchanged final-price cases; ingredient preview still uses unrounded price/quantity.');
console.log('Local formatter regression only; no device, customer data, API or stored values used.');
