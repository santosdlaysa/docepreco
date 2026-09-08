import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

// Troque a chave quando houver um novo conjunto de novidades a apresentar.
const STORAGE_KEY = '@docepreco_whats_new_purchases_2026_09';

interface Props {
  enabled: boolean;
  onExplore: () => void;
  onVisibleChange?: (visible: boolean) => void;
}

const NEWS: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  background: string;
}> = [
  {
    icon: 'document-text-outline',
    title: 'Notas de compra',
    description: 'Registre fornecedor, itens, pagamento, desconto e frete em um só lugar.',
    color: colors.purple,
    background: colors.purpleBg,
  },
  {
    icon: 'cube-outline',
    title: 'Estoque automático',
    description: 'Cada ingrediente da compra entra no estoque assim que a nota é salva.',
    color: colors.blue,
    background: '#E9F6FF',
  },
  {
    icon: 'pricetag-outline',
    title: 'Precificação atualizada',
    description: 'Use os preços da compra para atualizar custos e manter suas receitas lucrativas.',
    color: colors.primary,
    background: colors.pinkBg3,
  },
  {
    icon: 'stats-chart-outline',
    title: 'Novo fluxo financeiro',
    description: 'Veja compras pagas, despesas e o saldo estimado sem duplicar custos no DRE.',
    color: colors.green,
    background: '#E8F7EE',
  },
];

export const WhatsNewModal: React.FC<Props> = ({ enabled, onExplore, onVisibleChange }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setVisible(false);
      return () => { active = false; };
    }
    AsyncStorage.getItem(STORAGE_KEY)
      .then(seen => {
        if (!active) return;
        const shouldShow = !seen;
        setVisible(shouldShow);
        onVisibleChange?.(shouldShow);
      })
      .catch(() => {
        if (!active) return;
        setVisible(true);
        onVisibleChange?.(true);
      });
    return () => { active = false; };
  }, [enabled]);

  const close = () => {
    setVisible(false);
    onVisibleChange?.(false);
    void AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
  };

  const explore = () => {
    close();
    onExplore();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <Pressable style={s.backdrop} onPress={close}>
        <Pressable style={s.card} onPress={() => {}}>
          <View style={s.hero}>
            <View style={s.sparkle}><Ionicons name="sparkles" size={24} color="#fff" /></View>
            <TouchableOpacity onPress={close} style={s.close} hitSlop={10}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,.9)" />
            </TouchableOpacity>
            <Text style={s.eyebrow}>NOVIDADES NO DOCE PREÇO</Text>
            <Text style={s.title}>Suas compras agora trabalham por você</Text>
            <Text style={s.subtitle}>Mais controle do dinheiro, do estoque e do preço de cada receita.</Text>
          </View>

          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            {NEWS.map(item => (
              <View key={item.title} style={s.newsRow}>
                <View style={[s.newsIcon, { backgroundColor: item.background }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.newsTitle}>{item.title}</Text>
                  <Text style={s.newsDescription}>{item.description}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={s.primaryButton} onPress={explore} activeOpacity={0.85}>
              <Text style={s.primaryText}>Conhecer no Financeiro</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.laterButton} onPress={close} activeOpacity={0.7}>
              <Text style={s.laterText}>Ver depois</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(45,27,38,.62)' },
  card: { width: '100%', maxWidth: 410, maxHeight: '90%', borderRadius: 26, overflow: 'hidden', backgroundColor: colors.surface, elevation: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: .22, shadowRadius: 24 },
  hero: { backgroundColor: colors.purple, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 20 },
  sparkle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.18)', marginBottom: 14 },
  close: { position: 'absolute', top: 17, right: 17, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: 'rgba(255,255,255,.72)', fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#fff', fontSize: 22, lineHeight: 27, fontWeight: '800', marginTop: 6, paddingRight: 20 },
  subtitle: { color: 'rgba(255,255,255,.82)', fontSize: 13, lineHeight: 19, marginTop: 7 },
  content: { padding: 20 },
  newsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  newsIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  newsTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  newsDescription: { color: colors.textSecondary, fontSize: 11.8, lineHeight: 16.5, marginTop: 2 },
  primaryButton: { marginTop: 4, height: 50, borderRadius: 15, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { color: '#fff', fontSize: 14.5, fontWeight: '800' },
  laterButton: { alignItems: 'center', paddingTop: 13, paddingBottom: 1 },
  laterText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
});
