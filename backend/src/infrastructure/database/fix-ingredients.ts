/**
 * Script para corrigir ingredientes cadastrados com embalagem customizada
 * Converte para formato simples (sempre em g/ml) e remove confusão de unidades
 */

import { pool } from './connection';

export async function fixIngredientsFormat() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Corrigindo ingredientes cadastrados com embalagem customizada...\n');

    // Busca todos os ingredientes com embalagem customizada
    const result = await client.query(`
      SELECT id, name, purchase_quantity, unit, purchase_unit_weight, purchase_price
      FROM ingredients
      WHERE purchase_unit_weight IS NOT NULL
      ORDER BY name
    `);

    let fixed = 0;

    for (const ing of result.rows) {
      let newQuantity = ing.purchase_quantity;
      let newUnit = ing.unit;

      // Converte para g ou ml baseado na unidade atual
      if (ing.unit === 'kg') {
        // kg → g
        newQuantity = ing.purchase_quantity * 1000;
        newUnit = 'g';
        console.log(`✅ ${ing.name}`);
        console.log(`   Antes: ${ing.purchase_quantity}kg × ${ing.purchase_unit_weight} por R$${ing.purchase_price}`);
        console.log(`   Depois: ${newQuantity}g por R$${ing.purchase_price}\n`);
      } else if (ing.unit === 'l') {
        // l → ml
        newQuantity = ing.purchase_quantity * 1000;
        newUnit = 'ml';
        console.log(`✅ ${ing.name}`);
        console.log(`   Antes: ${ing.purchase_quantity}l × ${ing.purchase_unit_weight} por R$${ing.purchase_price}`);
        console.log(`   Depois: ${newQuantity}ml por R$${ing.purchase_price}\n`);
      } else if (ing.unit === 'g' && ing.purchase_unit_weight) {
        // g com weight customizado: multiplica e remove weight
        newQuantity = ing.purchase_quantity * ing.purchase_unit_weight;
        console.log(`✅ ${ing.name}`);
        console.log(`   Antes: ${ing.purchase_quantity}g × ${ing.purchase_unit_weight} por R$${ing.purchase_price}`);
        console.log(`   Depois: ${newQuantity}g por R$${ing.purchase_price}\n`);
      } else if (ing.unit === 'ml' && ing.purchase_unit_weight) {
        // ml com weight customizado: multiplica e remove weight
        newQuantity = ing.purchase_quantity * ing.purchase_unit_weight;
        console.log(`✅ ${ing.name}`);
        console.log(`   Antes: ${ing.purchase_quantity}ml × ${ing.purchase_unit_weight} por R$${ing.purchase_price}`);
        console.log(`   Depois: ${newQuantity}ml por R$${ing.purchase_price}\n`);
      }

      // Atualiza o ingrediente
      await client.query(
        `UPDATE ingredients
         SET purchase_quantity = $1, unit = $2, purchase_unit_label = NULL, purchase_unit_weight = NULL
         WHERE id = $3`,
        [newQuantity, newUnit, ing.id]
      );

      fixed++;
    }

    await client.query('COMMIT');
    console.log(`\n✨ ${fixed} ingrediente(s) corrigido(s) com sucesso!\n`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao corrigir ingredientes:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  fixIngredientsFormat().then(() => process.exit(0)).catch(() => process.exit(1));
}
