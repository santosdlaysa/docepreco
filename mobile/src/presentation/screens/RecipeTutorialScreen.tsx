import { colors } from '../theme/colors';
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Design tokens
const INK = colors.text;
const INK2 = colors.textSecondary;
const INK3 = colors.textMuted;
const CREAM = colors.pinkBg3;
const LINE = colors.border;
const PINK = colors.primary;
const GREEN = colors.green;
const BLUE = colors.blue;
const ORANGE = '#F5A623';

const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 4,
};

export const RecipeTutorialScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={INK} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Como Cadastrar?</Text>
          <Text style={s.headerSub}>Aprenda a criar receitas com precisão</Text>
        </View>
      </View>

      <ScrollView
        style={s.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Passo 1 */}
        <View style={s.section}>
          <View style={s.stepHeader}>
            <View style={s.stepBadge}>
              <Text style={s.stepNumber}>1</Text>
            </View>
            <Text style={s.sectionTitle}>Dados Básicos</Text>
          </View>

          <View style={s.card}>
            <View style={s.cardRow}>
              <Ionicons name="text-outline" size={20} color={PINK} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.cardLabel}>Nome da Receita</Text>
                <Text style={s.cardHint}>Seja descritivo (ex: "Bolo de Chocolate Belga")</Text>
              </View>
            </View>

            <View style={[s.cardRow, { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: LINE }]}>
              <Ionicons name="documents-outline" size={20} color={GREEN} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.cardLabel}>Descrição (Opcional)</Text>
                <Text style={s.cardHint}>Ingredientes principais, informações nutricionais</Text>
              </View>
            </View>

            <View style={[s.cardRow, { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: LINE }]}>
              <Ionicons name="bar-chart-outline" size={20} color={BLUE} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.cardLabel}>Rendimento</Text>
                <Text style={s.cardHint}>Quantas porções/unidades a receita produz</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Passo 2 */}
        <View style={s.section}>
          <View style={s.stepHeader}>
            <View style={s.stepBadge}>
              <Text style={s.stepNumber}>2</Text>
            </View>
            <Text style={s.sectionTitle}>Ingredientes</Text>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Para cada ingrediente:</Text>

            <View style={s.checkItem}>
              <View style={s.checkMark}>
                <Text style={s.checkMarkText}>✓</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.checkLabel}>Selecione o ingrediente</Text>
                <Text style={s.checkDesc}>Do seu cadastro principal</Text>
              </View>
            </View>

            <View style={s.checkItem}>
              <View style={s.checkMark}>
                <Text style={s.checkMarkText}>✓</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.checkLabel}>Digite a quantidade usada</Text>
                <Text style={s.checkDesc}>Na mesma unidade que cadastrou (g, ml, un, etc)</Text>
              </View>
            </View>

            <View style={s.checkItem}>
              <View style={s.checkMark}>
                <Text style={s.checkMarkText}>✓</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.checkLabel}>Pronto!</Text>
                <Text style={s.checkDesc}>O preço será calculado automaticamente</Text>
              </View>
            </View>

            <View style={[s.infoBanner, { backgroundColor: '#E8F8F0', borderLeftColor: GREEN }]}>
              <Ionicons name="bulb" size={16} color={GREEN} />
              <Text style={[s.bannerText, { color: INK }]}>
                <Text style={{ fontWeight: '700' }}>Dica:</Text> Se cadastrou um ingrediente com embalagem (ex: lata de leite), use a unidade correta (ex: "4 un" = 4 latas)
              </Text>
            </View>
          </View>
        </View>

        {/* Passo 3 */}
        <View style={s.section}>
          <View style={s.stepHeader}>
            <View style={s.stepBadge}>
              <Text style={s.stepNumber}>3</Text>
            </View>
            <Text style={s.sectionTitle}>Custos Adicionais</Text>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Custos que não são ingredientes:</Text>

            <View style={s.costItem}>
              <Text style={s.costIcon}>📦</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.costLabel}>Embalagem</Text>
                <Text style={s.costHint}>Caixas, sacolas, fitas. Ex: 10 unidades = R$15</Text>
              </View>
            </View>

            <View style={s.costItem}>
              <Text style={s.costIcon}>🔥</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.costLabel}>Gás / Energia</Text>
                <Text style={s.costHint}>Divida sua conta pelo nº de receitas/mês</Text>
              </View>
            </View>

            <View style={s.costItem}>
              <Text style={s.costIcon}>👷</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.costLabel}>Mão de Obra</Text>
                <Text style={s.costHint}>Quanto você quer ganhar por hora × tempo gasto</Text>
              </View>
            </View>

            <View style={[s.infoBanner, { backgroundColor: '#FFF4E6', borderLeftColor: ORANGE }]}>
              <Ionicons name="information-circle" size={16} color={ORANGE} />
              <Text style={[s.bannerText, { color: INK }]}>
                Deixe em branco se não aplicar. O custo é opcional!
              </Text>
            </View>
          </View>
        </View>

        {/* Passo 4 */}
        <View style={s.section}>
          <View style={s.stepHeader}>
            <View style={s.stepBadge}>
              <Text style={s.stepNumber}>4</Text>
            </View>
            <Text style={s.sectionTitle}>Defina o Preço</Text>
          </View>

          <View style={s.card}>
            <View style={s.priceStep}>
              <View style={s.priceStepNum}>
                <Text style={s.priceStepNumText}>A</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.priceStepLabel}>Veja o Custo Calculado</Text>
                <Text style={s.priceStepDesc}>
                  Soma de todos os ingredientes + custos adicionais
                </Text>
              </View>
            </View>

            <View style={s.priceStep}>
              <View style={s.priceStepNum}>
                <Text style={s.priceStepNumText}>B</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.priceStepLabel}>Escolha uma Margem</Text>
                <Text style={s.priceStepDesc}>
                  Presets recomendados: 30% (básico), 50% (padrão), 70% (recomendado)
                </Text>
              </View>
            </View>

            <View style={s.priceStep}>
              <View style={s.priceStepNum}>
                <Text style={s.priceStepNumText}>C</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.priceStepLabel}>Ou defina manualmente</Text>
                <Text style={s.priceStepDesc}>
                  Clique no campo de preço para editar do seu jeito
                </Text>
              </View>
            </View>

            <View style={[s.infoBanner, { backgroundColor: '#FFF0F8', borderLeftColor: PINK }]}>
              <Ionicons name="star" size={16} color={PINK} />
              <Text style={[s.bannerText, { color: INK }]}>
                <Text style={{ fontWeight: '700' }}>Dica de negócio:</Text> 70% de margem é ideal para a maioria dos doces artesanais
              </Text>
            </View>
          </View>
        </View>

        {/* Dicas Finais */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="warning-outline" size={20} color="#E74C3C" />
            <Text style={s.sectionTitle}>Erros Comuns</Text>
          </View>

          <View style={s.errorCard}>
            <View style={s.errorItem}>
              <Text style={s.errorIcon}>❌</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.errorTitle}>Esquecer de adicionar custos</Text>
                <Text style={s.errorDesc}>
                  Embalagem e mão de obra fazem diferença no preço final
                </Text>
              </View>
            </View>

            <View style={s.errorItem}>
              <Text style={s.errorIcon}>❌</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.errorTitle}>Margem muito baixa</Text>
                <Text style={s.errorDesc}>
                  Menos de 30% não cobre imprevistos e não gera lucro real
                </Text>
              </View>
            </View>

            <View style={s.errorItem}>
              <Text style={s.errorIcon}>❌</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.errorTitle}>Quantidades aproximadas</Text>
                <Text style={s.errorDesc}>
                  Medidas precisas = preço preciso = receita replicável
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Exemplo Prático */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="checkmark-circle" size={20} color={GREEN} />
            <Text style={s.sectionTitle}>Exemplo Completo</Text>
          </View>

          <View style={s.exampleCard}>
            <Text style={s.exampleTitle}>Bolo de Chocolate</Text>

            <View style={s.exampleData}>
              <View style={s.exampleRow}>
                <Text style={s.exampleLabel}>Rendimento:</Text>
                <Text style={s.exampleValue}>12 fatias</Text>
              </View>
              <View style={s.exampleRow}>
                <Text style={s.exampleLabel}>Ingredientes:</Text>
                <Text style={s.exampleValue}>Chocolate 200g, Ovos 3un, Farinha 150g...</Text>
              </View>
              <View style={s.exampleRow}>
                <Text style={s.exampleLabel}>Custo Total:</Text>
                <Text style={s.exampleValue}>R$ 25,50</Text>
              </View>
              <View style={s.exampleRow}>
                <Text style={s.exampleLabel}>+ Embalagem:</Text>
                <Text style={s.exampleValue}>R$ 3,00</Text>
              </View>
              <View style={s.exampleRow}>
                <Text style={s.exampleLabel}>+ Mão de Obra:</Text>
                <Text style={s.exampleValue}>R$ 15,00</Text>
              </View>

              <View style={s.exampleSeparator} />

              <View style={s.exampleRow}>
                <Text style={[s.exampleLabel, { fontWeight: '700' }]}>Custo Final:</Text>
                <Text style={[s.exampleValue, { color: PINK, fontWeight: '700' }]}>R$ 43,50</Text>
              </View>

              <View style={s.exampleRow}>
                <Text style={s.exampleLabel}>Margem (70%):</Text>
                <Text style={s.exampleValue}>+R$ 30,45</Text>
              </View>

              <View style={s.exampleRow}>
                <Text style={[s.exampleLabel, { fontWeight: '700', fontSize: 15 }]}>Preço Final:</Text>
                <Text style={[s.exampleValue, { color: GREEN, fontWeight: '700', fontSize: 16 }]}>R$ 73,95</Text>
              </View>

              <View style={s.exampleRow}>
                <Text style={s.exampleLabel}>Por fatia:</Text>
                <Text style={s.exampleValue}>R$ 6,17</Text>
              </View>
            </View>
          </View>
        </View>

        {/* CTA */}
        <View style={s.section}>
          <View style={s.ctaCard}>
            <Ionicons name="sparkles" size={32} color={PINK} />
            <Text style={s.ctaTitle}>Tudo pronto!</Text>
            <Text style={s.ctaDesc}>
              Agora você sabe como criar receitas com preço justo e lucrativo. O sistema calcula
              tudo automaticamente para você!
            </Text>
            <TouchableOpacity
              style={s.ctaBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={s.ctaBtnText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: INK,
  },
  headerSub: {
    fontSize: 12,
    color: INK2,
    fontWeight: '500',
    marginTop: 2,
  },
  body: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: INK,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    ...SHADOW,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: INK,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: INK,
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 12,
    color: INK2,
    fontWeight: '500',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 14,
  },
  checkMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E8F8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMarkText: {
    fontSize: 18,
    color: GREEN,
    fontWeight: '700',
  },
  checkLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: INK,
    marginBottom: 2,
  },
  checkDesc: {
    fontSize: 12,
    color: INK2,
    fontWeight: '500',
  },
  costItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 14,
  },
  costIcon: {
    fontSize: 28,
    marginTop: 2,
  },
  costLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: INK,
    marginBottom: 2,
  },
  costHint: {
    fontSize: 12,
    color: INK2,
    fontWeight: '500',
  },
  priceStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 14,
  },
  priceStepNum: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceStepNumText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  priceStepLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: INK,
    marginBottom: 2,
  },
  priceStepDesc: {
    fontSize: 12,
    color: INK2,
    fontWeight: '500',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    color: INK2,
  },
  errorCard: {
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    ...SHADOW,
  },
  errorItem: {
    flexDirection: 'row',
    gap: 12,
  },
  errorIcon: {
    fontSize: 24,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: INK,
    marginBottom: 2,
  },
  errorDesc: {
    fontSize: 12,
    color: INK2,
    fontWeight: '500',
    lineHeight: 18,
  },
  exampleCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    ...SHADOW,
  },
  exampleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: INK,
    marginBottom: 14,
  },
  exampleData: {
    gap: 8,
  },
  exampleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exampleLabel: {
    fontSize: 12,
    color: INK2,
    fontWeight: '600',
  },
  exampleValue: {
    fontSize: 12,
    color: INK,
    fontWeight: '600',
  },
  exampleSeparator: {
    height: 1,
    backgroundColor: LINE,
    marginVertical: 8,
  },
  ctaCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    ...SHADOW,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: INK,
    marginTop: 12,
    marginBottom: 8,
  },
  ctaDesc: {
    fontSize: 13,
    color: INK2,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  ctaBtn: {
    backgroundColor: PINK,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    ...SHADOW,
    shadowColor: PINK,
    shadowOpacity: 0.3,
  },
  ctaBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
