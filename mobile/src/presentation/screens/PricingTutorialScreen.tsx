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
const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const CREAM = '#FFF6F0';
const LINE = '#F1E2DA';
const PINK = '#EA4B92';
const GREEN = '#43BE6E';
const BLUE = '#2BA7DD';
const ORANGE = '#F5A623';

const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 4,
};

interface Example {
  icon: string;
  title: string;
  subtitle: string;
  item: string;
  quantity: string;
  unit: string;
  price: string;
  notes?: string[];
  packageType?: string;
  packageWeight?: string;
}

const EXAMPLES: Example[] = [
  {
    icon: '📦',
    title: 'Farinha',
    subtitle: 'Ingrediente seco',
    item: 'Farinha de trigo',
    packageType: 'Nenhuma',
    quantity: '1000',
    unit: 'g',
    price: 'R$ 5,89',
    notes: ['Compra: 1 kg', 'Quantidade total comprada'],
  },
  {
    icon: '🥛',
    title: 'Leite',
    subtitle: 'Ingrediente líquido',
    item: 'Leite integral',
    packageType: 'Nenhuma',
    quantity: '1000',
    unit: 'ml',
    price: 'R$ 5,99',
    notes: ['Compra: 1 litro', 'Sempre em mililitros'],
  },
  {
    icon: '🍶',
    title: 'Óleo',
    subtitle: 'Ingrediente líquido',
    item: 'Óleo de soja',
    packageType: 'Nenhuma',
    quantity: '1000',
    unit: 'ml',
    price: 'R$ 6,57',
    notes: ['Compra: 1 litro', 'Converter para ml'],
  },
  {
    icon: '⚪',
    title: 'Fermento',
    subtitle: 'Ingrediente seco (pequeno)',
    item: 'Fermento químico',
    packageType: 'Nenhuma',
    quantity: '100',
    unit: 'g',
    price: 'R$ 5,20',
    notes: ['Compra exata: 100 g', 'Sem conversão necessária'],
  },
  {
    icon: '🥫',
    title: 'Leite Condensado',
    subtitle: 'Ingrediente em embalagem',
    item: 'Leite condensado',
    packageType: 'Lata',
    packageWeight: '395 g',
    quantity: '1',
    unit: 'un',
    price: 'R$ 7,50',
    notes: ['Tipo: Lata', 'Peso: 395 g por lata', 'Quantidade: 1 lata comprada'],
  },
  {
    icon: '🍓',
    title: 'Morango',
    subtitle: 'Ingrediente em bandeja',
    item: 'Morango fresco',
    packageType: 'Bandeja',
    packageWeight: '380 g',
    quantity: '1',
    unit: 'un',
    price: 'R$ 12,90',
    notes: ['Tipo: Bandeja', 'Peso: 380 g por bandeja', 'Na receita: use em gramas'],
  },
];

export const PricingTutorialScreen: React.FC = () => {
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
          <Text style={s.headerSub}>Aprenda a preencher corretamente</Text>
        </View>
      </View>

      <ScrollView
        style={s.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Regra Fundamental */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="alert-circle" size={20} color={PINK} />
            <Text style={s.sectionTitle}>Regra Fundamental</Text>
          </View>
          <View style={[s.ruleCard, { borderLeftColor: PINK }]}>
            <Text style={s.ruleText}>
              Sempre cadastre a{' '}
              <Text style={{ fontWeight: '700', color: PINK }}>COMPRA REAL</Text>, não a quantidade
              da receita.
            </Text>
          </View>
        </View>

        {/* O que preencher */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="checkbox-outline" size={20} color={GREEN} />
            <Text style={s.sectionTitle}>O que Preencher</Text>
          </View>

          <View style={s.checkList}>
            <View style={s.checkItem}>
              <View style={s.checkMark}>
                <Text style={s.checkMarkText}>✓</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.checkLabel}>Quantidade</Text>
                <Text style={s.checkDesc}>Total da embalagem/compra inteira</Text>
              </View>
            </View>

            <View style={s.checkItem}>
              <View style={s.checkMark}>
                <Text style={s.checkMarkText}>✓</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.checkLabel}>Preço</Text>
                <Text style={s.checkDesc}>Valor pago na embalagem inteira</Text>
              </View>
            </View>

            <View style={s.checkItem}>
              <View style={s.checkMark}>
                <Text style={s.checkMarkText}>✓</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.checkLabel}>Unidade</Text>
                <Text style={s.checkDesc}>A unidade que será usada nas receitas</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Exemplos */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="bulb" size={20} color={ORANGE} />
            <Text style={s.sectionTitle}>Exemplos Práticos</Text>
          </View>

          {EXAMPLES.map((example, idx) => (
            <View key={idx} style={s.exampleCard}>
              <View style={s.exampleHeader}>
                <Text style={s.exampleIcon}>{example.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.exampleTitle}>{example.title}</Text>
                  <Text style={s.exampleSubtitle}>{example.subtitle}</Text>
                </View>
              </View>

              <View style={s.exampleContent}>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Ingrediente:</Text>
                  <Text style={s.infoValue}>{example.item}</Text>
                </View>

                {example.packageType && (
                  <>
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>Tipo:</Text>
                      <Text style={s.infoValue}>{example.packageType}</Text>
                    </View>
                    {example.packageWeight && (
                      <View style={s.infoRow}>
                        <Text style={s.infoLabel}>Peso:</Text>
                        <Text style={s.infoValue}>{example.packageWeight}</Text>
                      </View>
                    )}
                  </>
                )}

                <View style={s.highlight}>
                  <View style={s.highlightRow}>
                    <Text style={s.highlightLabel}>Quantidade</Text>
                    <Text style={s.highlightValue}>{example.quantity}</Text>
                  </View>
                  <View style={s.highlightRow}>
                    <Text style={s.highlightLabel}>Unidade</Text>
                    <Text style={s.highlightValue}>{example.unit}</Text>
                  </View>
                  <View style={s.highlightRow}>
                    <Text style={s.highlightLabel}>Preço</Text>
                    <Text style={s.highlightValue}>{example.price}</Text>
                  </View>
                </View>

                {example.notes && example.notes.length > 0 && (
                  <View style={s.notesSection}>
                    {example.notes.map((note, i) => (
                      <Text key={i} style={s.noteItem}>
                        • {note}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Dicas */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="star" size={20} color={BLUE} />
            <Text style={s.sectionTitle}>Dicas Importantes</Text>
          </View>

          <View style={s.tipsContainer}>
            <View style={s.tipCard}>
              <Text style={s.tipIcon}>📊</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.tipTitle}>Ingredientes Secos</Text>
                <Text style={s.tipDesc}>Use gramas (g) como unidade padrão</Text>
              </View>
            </View>

            <View style={s.tipCard}>
              <Text style={s.tipIcon}>💧</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.tipTitle}>Ingredientes Líquidos</Text>
                <Text style={s.tipDesc}>Use mililitros (ml) como unidade padrão</Text>
              </View>
            </View>

            <View style={s.tipCard}>
              <Text style={s.tipIcon}>📦</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.tipTitle}>Itens Individuais</Text>
                <Text style={s.tipDesc}>Use "un" quando compra e uso são iguais</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Erros Comuns */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="warning" size={20} color="#E74C3C" />
            <Text style={s.sectionTitle}>Erros Comuns</Text>
          </View>

          <View style={s.errorCard}>
            <Text style={s.errorTitle}>❌ Não faça isso:</Text>
            <Text style={s.errorItem}>• Cadastre "1 g com R$ 5,89" quando comprou 1 kg</Text>
            <Text style={s.errorItem}>• Use "un" se há conversão de peso/volume</Text>
            <Text style={s.errorItem}>• Cadastre quantidade da receita como comprada</Text>
          </View>
        </View>

        {/* Call to action */}
        <View style={s.section}>
          <View style={s.ctaCard}>
            <Ionicons name="checkmark-circle" size={32} color={GREEN} />
            <Text style={s.ctaTitle}>Pronto para começar?</Text>
            <Text style={s.ctaDesc}>
              Agora você sabe como cadastrar ingredientes corretamente e o sistema calculará
              automaticamente o preço por unidade!
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
    marginBottom: 28,
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

  // Rule Card
  ruleCard: {
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderRadius: 14,
    padding: 16,
    ...SHADOW,
  },
  ruleText: {
    fontSize: 15,
    color: INK,
    lineHeight: 22,
    fontWeight: '500',
  },

  // Check List
  checkList: {
    gap: 12,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    ...SHADOW,
  },
  checkMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8F8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMarkText: {
    fontSize: 20,
    color: GREEN,
    fontWeight: '700',
  },
  checkLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: INK,
    marginBottom: 4,
  },
  checkDesc: {
    fontSize: 12,
    color: INK2,
    fontWeight: '500',
  },

  // Example Card
  exampleCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    ...SHADOW,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  exampleIcon: {
    fontSize: 32,
  },
  exampleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: INK,
  },
  exampleSubtitle: {
    fontSize: 12,
    color: INK2,
    fontWeight: '500',
    marginTop: 2,
  },
  exampleContent: {
    padding: 14,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 12,
    color: INK2,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 12,
    color: INK,
    fontWeight: '700',
  },
  highlight: {
    backgroundColor: CREAM,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  highlightLabel: {
    fontSize: 13,
    color: INK2,
    fontWeight: '600',
  },
  highlightValue: {
    fontSize: 14,
    fontWeight: '700',
    color: PINK,
  },
  notesSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: LINE,
    gap: 6,
  },
  noteItem: {
    fontSize: 12,
    color: INK2,
    fontWeight: '500',
  },

  // Tips
  tipsContainer: {
    gap: 10,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    ...SHADOW,
  },
  tipIcon: {
    fontSize: 28,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: INK,
    marginBottom: 2,
  },
  tipDesc: {
    fontSize: 12,
    color: INK2,
    fontWeight: '500',
  },

  // Error Card
  errorCard: {
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
    borderRadius: 14,
    padding: 14,
    ...SHADOW,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: INK,
    marginBottom: 10,
  },
  errorItem: {
    fontSize: 12,
    color: INK2,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 6,
  },

  // CTA
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
