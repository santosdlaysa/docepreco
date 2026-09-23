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

const previewSource = fs.readFileSync(path.join(__dirname, '../src/user/adminRecipePricing.ts'), 'utf8');
const previewModule = { exports: {}, require: () => context.exports };
vm.runInNewContext(ts.transpileModule(previewSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, previewModule);
const { calculateAdminRecipePreview } = previewModule.exports;
const packageIngredient = { id: 'box', purchaseQuantity: 1, purchaseUnitWeight: 10, purchasePrice: 60, unit: 'unit' };
test('edição administrativa atualiza totais, rendimento e margem', () => {
  const preview = calculateAdminRecipePreview(
    [{ ingredientId: 'box', quantityUsed: 2, unit: 'unit' }],
    [packageIngredient], [{ name: 'Mão de obra', value: 8 }], [], [], '2', '30');
  assert.equal(preview.ingredientsCost, 12);
  assert.equal(preview.totalCost, 20);
  assert.equal(preview.costPerUnit, 10);
  assert.equal(preview.suggestedPrice, 13);
  assert.equal(preview.profit, 6);
});
test('edição administrativa soma receitas adicionadas em unidades e peso', () => {
  const sub = { id: 'filling', totalCost: 20, yield: 4, baseQuantityProduced: 1000 };
  const preview = calculateAdminRecipePreview([], [], [], [
    { subRecipeId: 'filling', quantityUsed: 2, unit: 'un' },
    { subRecipeId: 'filling', quantityUsed: 0.25, unit: 'kg' },
  ], [sub], '1', '0');
  assert.equal(preview.subRecipesCost, 15);
  assert.equal(preview.totalCost, 15);
});
test('edição administrativa avisa quando o rendimento é inválido', () => {
  assert.ok(calculateAdminRecipePreview([], [], [], [], [], '0', '30').error);
});

test('embalagem por unidade acompanha o rendimento na prévia administrativa', () => {
  const costs = [{ name: 'Embalagem', value: 3.1, costType: 'unit' }, { name: 'Outros custos do lote', value: 51.22 }];
  const preview = calculateAdminRecipePreview([], [], costs, [], [], '7', '70');
  assert.ok(Math.abs(preview.totalCost - 72.92) < 1e-9);
  assert.equal(preview.suggestedPrice.toFixed(2), '17.71');
  assert.ok(Math.abs(calculateAdminRecipePreview([], [], costs, [], [], '14', '70').totalCost - 94.62) < 1e-9);
});
test('edição administrativa avisa quando a unidade é incompatível', () => {
  assert.ok(calculateAdminRecipePreview([{ ingredientId: 'box', quantityUsed: 1, unit: 'g' }], [packageIngredient], [], [], [], '1', '0').error);
});

const subSource = fs.readFileSync(path.join(__dirname, '../src/user/subRecipePricing.ts'), 'utf8');
const subModule = { exports: {}, require: () => context.exports };
vm.runInNewContext(ts.transpileModule(subSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, subModule);
const { getSubRecipeUsageCost } = subModule.exports;
const fillingIngredient = { id: 'milk', purchaseQuantity: 1, purchaseUnitWeight: 1000, purchasePrice: 16, unit: 'g' };
const filling = { yield: 4, ingredients: [{ ingredientId: 'milk', quantityUsed: 1000, unit: 'g' }], additionalCosts: [{ name: 'Energia', value: 4 }] };
test('prévia de sub-receitas inclui custos adicionais e converte unidades e peso', () => {
  assert.equal(getSubRecipeUsageCost(filling, [fillingIngredient], 2, 'un'), 10);
  assert.equal(getSubRecipeUsageCost(filling, [fillingIngredient], 0.25, 'kg'), 5);
  assert.equal(getSubRecipeUsageCost(filling, [fillingIngredient], 250, 'g'), 5);
});

test('prévia de sub-receitas inclui custo por unidade no custo total', () => {
  const packaged = { ...filling, additionalCosts: [...filling.additionalCosts, { name: 'Embalagem', value: 3.1, costType: 'unit' }] };
  assert.ok(Math.abs(getSubRecipeUsageCost(packaged, [fillingIngredient], 2, 'un') - 16.2) < 1e-9);
});
test('prévia não ignora sub-receita com ingrediente ausente ou sem rendimento', () => {
  assert.throws(() => getSubRecipeUsageCost(filling, [], 1, 'un'), /não encontrado/);
  assert.throws(() => getSubRecipeUsageCost({ ...filling, yield: 0 }, [fillingIngredient], 1, 'un'), /rendimento/);
  assert.throws(() => getSubRecipeUsageCost({ yield: 1, ingredients: [], additionalCosts: [] }, [], 1, 'g'), /rendimento/);
});
