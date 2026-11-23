import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { apiClient } from '../../data/api/client';
import { colors } from '../theme/colors';

type Result = { text: string; simulation: { unitPrice: number; revenue: number; cost: number; profit: number; belowCost: boolean } };

export function RecipeAssistant({ recipeId, currency, formatCurrency }: {
  recipeId: string; currency: string; formatCurrency: (value: number) => string;
}) {
  const [discount, setDiscount] = useState('0');
  const [quantity, setQuantity] = useState('1');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const analyze = async () => {
    const d = Number(discount.replace(',', '.'));
    const q = Number(quantity);
    if (!discount.trim() || !quantity.trim() || !Number.isFinite(d) || d < 0 || d > 100 || !Number.isSafeInteger(q) || q < 1 || q > 100000) {
      setError('Informe desconto entre 0 e 100 e quantidade inteira entre 1 e 100000.'); return;
    }
    setBusy(true); setError(''); setResult(null);
    try {
      const response = await apiClient.post(`/recipes/${recipeId}/assistant`, { discount: d, quantity: q, currency });
      setResult(response.data.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível analisar.'); }
    finally { setBusy(false); }
  };
  return <View style={{ padding: 18, borderWidth: 1, borderColor: colors.border, borderRadius: 16, marginVertical: 16, gap: 12 }}>
    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Assistente de precificação e vendas</Text>
    <Text style={{ color: colors.textSecondary }}>Simule com os custos cadastrados e receba uma análise e um texto para divulgar. Os dados desta receita serão enviados à IA. Revise antes de usar.</Text>
    <Text style={{ color: colors.text }}>Quantidade de unidades</Text>
    <TextInput accessibilityLabel="Quantidade de unidades" editable={!busy} value={quantity} onChangeText={v => { setQuantity(v); setResult(null); }} keyboardType="number-pad" style={{ borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 8, color: colors.text }} />
    <Text style={{ color: colors.text }}>Desconto (%)</Text>
    <TextInput accessibilityLabel="Desconto percentual" editable={!busy} value={discount} onChangeText={v => { setDiscount(v); setResult(null); }} keyboardType="decimal-pad" style={{ borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 8, color: colors.text }} />
    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={analyze} style={{ backgroundColor: colors.primary, padding: 14, borderRadius: 10, opacity: busy ? 0.6 : 1 }}>
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Analisar com IA</Text>}
    </TouchableOpacity>
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.text }}>{error}</Text>}
    {result && <>
      <Text style={{ color: colors.text }}>Preço simulado por unidade: {formatCurrency(result.simulation.unitPrice)}{'\n'}Total da venda: {formatCurrency(result.simulation.revenue)}{'\n'}Custo cadastrado: {formatCurrency(result.simulation.cost)}{'\n'}Resultado sobre os custos cadastrados: {formatCurrency(result.simulation.profit)}</Text>
      {result.simulation.belowCost && <Text style={{ fontWeight: '700', color: colors.text }}>Atenção: o preço simulado está abaixo do custo cadastrado.</Text>}
      <Text selectable style={{ color: colors.text, lineHeight: 23 }}>{result.text}</Text>
      <Text style={{ color: colors.textSecondary }}>Sugestão gerada por IA. Confira embalagem, mão de obra, perdas e taxas. Nenhum preço foi alterado.</Text>
      <TouchableOpacity accessibilityRole="button" onPress={async () => { try { await Share.share({ message: result.text }); } catch { setError('Não foi possível compartilhar.'); } }}><Text style={{ color: colors.primary, fontWeight: '700', paddingVertical: 10 }}>Compartilhar análise e sugestão</Text></TouchableOpacity>
    </>}
  </View>;
}
