const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/user/ingredientPricing.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const context = { exports: {} };
vm.runInNewContext(compiled.outputText, context);
const { getIngredientUsageCost, getEffectivePurchaseQuantity } = context.exports;

const cases = [
  ['uma unidade de pacote com 10', 1, 10, 'unit', 60, 1, 'unit', 6],
  ['três unidades de pacote com 10', 1, 10, 'unit', 60, 3, 'unit', 18],
  ['dois pacotes com 10', 2, 10, 'unit', 120, 1, 'unit', 6],
  ['130g de pacote de 2000g', 1, 2000, 'g', 150, 130, 'g', 9.75],
  ['0,13kg de pacote de 2000g', 1, 2000, 'g', 150, 0.13, 'kg', 9.75],
  ['130g de compra de 2kg', 2, undefined, 'kg', 150, 130, 'g', 9.75],
  ['0,13kg de compra de 2000g', 2000, undefined, 'g', 150, 0.13, 'kg', 9.75],
  ['uma lata inteira de 395g', 1, 395, 'g', 7.5, 1, 'unit', 7.5],
  ['metade de lata de 395g', 1, 395, 'g', 7.5, 197.5, 'g', 3.75],
  ['250ml de 1l', 1, undefined, 'l', 8, 250, 'ml', 2],
  ['0,25l de 1000ml', 1000, undefined, 'ml', 8, 0.25, 'l', 2],
  ['250ml de duas garrafas de 1l', 2, 1000, 'ml', 16, 250, 'ml', 2],
];
for (const [name, purchaseQuantity, purchaseUnitWeight, unit, purchasePrice, used, usedUnit, expected] of cases) {
  test(name, () => {
    const ingredient = { purchaseQuantity, purchaseUnitWeight, unit, purchasePrice };
    assert.ok(Math.abs(getIngredientUsageCost(ingredient, used, usedUnit) - expected) < 1e-9);
    assert.equal(getEffectivePurchaseQuantity(ingredient), purchaseQuantity * (purchaseUnitWeight || 1));
  });
}
test('recusa converter peso em volume sem equivalência', () => {
  assert.throws(() => getIngredientUsageCost({ purchaseQuantity: 1000, purchasePrice: 10, unit: 'g' }, 100, 'ml'), /incompatível/);
});
