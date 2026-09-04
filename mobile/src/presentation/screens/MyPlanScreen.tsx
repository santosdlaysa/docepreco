import { colors } from '../theme/colors';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { usePremium } from '../context/PremiumContext';
import { RootStackParamList } from '../navigation/types';
import { stripeApi } from '../../data/api/stripeApi';
import { pixApi, PixSubscription } from '../../data/api/pixApi';
import { useToast } from '../context/ToastContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PREMIUM_FEATS = [
  'Ingredientes e receitas ilimitados',
  'Seu logo personalizado no PDF',
  'Relatórios avançados com gráficos',
  'Gestão de clientes e aniversários',
  'Sistema de encomendas e entregas',
  'Cálculo de mão de obra',
  'Templates de receitas prontos',
  'Precificação sazonal avançada',
  'Histórico de preços de ingredientes',
];

const MASTER_FEATS = [
  'Loja online com link para clientes',
  'Gestão financeira completa (DRE)',
  'Controle de estoque com baixa automática',
  'Dicas de vendas e precificação',
];

/** Onde a assinatura foi contratada decide onde ela pode ser cancelada. */
const STORE_SUBSCRIPTIONS_URL = Platform.select({
  ios: 'https://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
  default: 'https://play.google.com/store/account/subscriptions',
}) as string;

const INK = colors.text;
const INK2 = colors.textSecondary;
const INK3 = colors.textMuted;
const PINK = colors.primary;
const LINE = colors.border;
const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 2 } as const,
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
};

export const MyPlanScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isPremium, isMaster, planTier, premiumUntil, premiumPlatform, daysLeft, refresh } = usePremium();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  // Pagamento PIX pode ser avulso: só há o que cancelar se houver recorrência autorizada.
  const [pixSub, setPixSub] = useState<PixSubscription | null>(null);

  useEffect(() => {
    if (premiumPlatform !== 'pix') return;
    pixApi.getSubscription().then(setPixSub).catch(() => setPixSub(null));
  }, [premiumPlatform]);

  const untilLabel = premiumUntil
    ? new Date(premiumUntil).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  const planName = isMaster ? 'Master' : 'Premium';
  const feats = isMaster ? [...PREMIUM_FEATS, ...MASTER_FEATS] : PREMIUM_FEATS;

  const origin: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
    card: { label: 'Cartão de crédito', icon: 'card-outline' },
    pix: { label: 'PIX', icon: 'qr-code-outline' },
    ios: { label: 'Assinatura da App Store', icon: 'logo-apple' },
    android: { label: 'Assinatura da Google Play', icon: 'logo-google-playstore' },
    manual: { label: 'Liberado pelo suporte', icon: 'gift-outline' },
  };
  const source = origin[premiumPlatform ?? ''] ?? { label: 'Não identificada', icon: 'help-circle-outline' };

  const openStripePortal = async () => {
    setBusy(true);
    try {
      const url = await stripeApi.openPortal();
      await Linking.openURL(url);
    } catch {
      showToast('Não foi possível abrir o gerenciamento da assinatura.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const cancelPix = () => {
    Alert.alert(
      'Cancelar renovação automática',
      'Seu plano continua ativo até o fim do período já pago. Deseja mesmo cancelar a renovação automática?',
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Cancelar renovação',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await pixApi.cancelSubscription();
              setPixSub(null);
              await refresh();
              showToast('Renovação automática cancelada.', 'success');
            } catch {
              showToast('Não foi possível cancelar. Tente novamente.', 'error');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const openStore = () => {
    Linking.openURL(STORE_SUBSCRIPTIONS_URL).catch(() =>
      showToast('Não foi possível abrir as assinaturas da loja.', 'error')
    );
  };

  /** O botão de cancelar muda de destino conforme onde a assinatura foi feita. */
  const renderCancelAction = () => {
    if (premiumPlatform === 'card') {
      return (
        <Action
          icon="card-outline"
          title="Gerenciar assinatura"
          subtitle="Trocar o cartão ou cancelar no Stripe"
          onPress={openStripePortal}
          busy={busy}
        />
      );
    }

    if (premiumPlatform === 'pix') {
      if (pixSub?.status === 'authorized') {
        return (
          <Action
            icon="close-circle-outline"
            title="Cancelar renovação automática"
            subtitle="O acesso continua até o fim do período pago"
            onPress={cancelPix}
            busy={busy}
            danger
          />
        );
      }
      return (
        <Action
          icon="information-circle-outline"
          title="Pagamento avulso por PIX"
          subtitle="Não há renovação automática para cancelar — o acesso vale até a data acima"
          onPress={() => navigation.navigate('Paywall', { trigger: { kind: 'manual' } })}
        />
      );
    }

    if (premiumPlatform === 'ios' || premiumPlatform === 'android') {
      const store = premiumPlatform === 'ios' ? 'App Store' : 'Google Play';
      return (
        <Action
          icon={premiumPlatform === 'ios' ? 'logo-apple' : 'logo-google-playstore'}
          title={`Gerenciar na ${store}`}
          subtitle={`Assinaturas contratadas na ${store} só podem ser canceladas por lá`}
          onPress={openStore}
        />
      );
    }

    // 'manual' (cortesia do suporte) ou origem desconhecida: não há o que cancelar.
    return (
      <Action
        icon="chatbubble-ellipses-outline"
        title="Falar com o suporte"
        subtitle="Este acesso foi liberado pelo suporte — fale com a gente para alterá-lo"
        onPress={() => navigation.navigate('SupportChat')}
      />
    );
  };

  if (!isPremium) {
    return (
      <SafeAreaView style={s.safe}>
        <Header onBack={() => navigation.goBack()} />
        <View style={s.emptyWrap}>
          <View style={s.emptyIco}>
            <Ionicons name="trophy-outline" size={30} color={PINK} />
          </View>
          <Text style={s.emptyTitle}>Você ainda não tem um plano</Text>
          <Text style={s.emptySub}>
            {untilLabel ? `Sua assinatura expirou em ${untilLabel}.` : 'Assine para liberar todos os recursos.'}
          </Text>
          <TouchableOpacity
            style={s.cta}
            onPress={() => navigation.navigate('Paywall', { trigger: { kind: 'manual' } })}
            activeOpacity={0.85}
          >
            <Text style={s.ctaText}>Ver planos</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <Header onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <LinearGradient
          colors={isMaster ? ['#EDE4FF', colors.pinkBg] : [colors.amberBg, colors.pinkBg]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={s.hero}
        >
          <View style={s.heroIco}>
            <Ionicons name="trophy" size={26} color={isMaster ? colors.purple : PINK} />
          </View>
          <Text style={s.heroTitle}>Plano {planName} ativo</Text>
          {untilLabel && (
            <Text style={s.heroSub}>
              {daysLeft === 0 ? 'Expira hoje' : `Renova em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`} · {untilLabel}
            </Text>
          )}
        </LinearGradient>

        <View style={s.card}>
          <View style={s.row}>
            <View style={s.rowIco}>
              <Ionicons name={source.icon} size={18} color={INK2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>Forma de pagamento</Text>
              <Text style={s.rowSub}>{source.label}</Text>
            </View>
          </View>
        </View>

        <Text style={s.sectionLabel}>O que está incluído</Text>
        <View style={s.card}>
          {feats.map((feat, i) => (
            <View key={feat} style={[s.featRow, i > 0 && s.featBorder]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.green} />
              <Text style={s.featText}>{feat}</Text>
            </View>
          ))}
        </View>

        {!isMaster && (
          <TouchableOpacity
            style={s.upgrade}
            onPress={() => navigation.navigate('Paywall', { trigger: { kind: 'manual' } })}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles" size={18} color={colors.purple} />
            <View style={{ flex: 1 }}>
              <Text style={s.upgradeTitle}>Conhecer o Master</Text>
              <Text style={s.upgradeSub}>Loja online, DRE, estoque e dicas de vendas</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={INK3} />
          </TouchableOpacity>
        )}

        {daysLeft !== null && daysLeft <= 7 && (
          <TouchableOpacity
            style={s.renew}
            onPress={() => navigation.navigate('Paywall', { trigger: { kind: 'manual' } })}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh-circle" size={20} color="#fff" />
            <Text style={s.renewText}>Renovar agora</Text>
          </TouchableOpacity>
        )}

        <Text style={s.sectionLabel}>Assinatura</Text>
        <View style={s.card}>{renderCancelAction()}</View>

        <Text style={s.footNote}>
          {planTier === 'free'
            ? ''
            : 'Ao cancelar, você continua com acesso até o fim do período já pago.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const Header: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <View style={s.header}>
    <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.7}>
      <Ionicons name="arrow-back" size={20} color={INK} />
    </TouchableOpacity>
    <View style={{ flex: 1 }}>
      <Text style={s.title}>Meu plano</Text>
      <Text style={s.subtitle}>Benefícios, cobrança e cancelamento</Text>
    </View>
  </View>
);

const Action: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  busy?: boolean;
  danger?: boolean;
}> = ({ icon, title, subtitle, onPress, busy, danger }) => (
  <TouchableOpacity style={s.row} onPress={onPress} disabled={busy} activeOpacity={0.75}>
    <View style={s.rowIco}>
      {busy ? (
        <ActivityIndicator size="small" color={INK2} />
      ) : (
        <Ionicons name={icon} size={18} color={danger ? colors.error : INK2} />
      )}
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[s.rowTitle, danger && { color: colors.error }]}>{title}</Text>
      <Text style={s.rowSub}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={INK3} />
  </TouchableOpacity>
);

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  title: { fontSize: 22, fontWeight: '800', color: INK },
  subtitle: { fontSize: 13, fontWeight: '600', color: INK2, marginTop: 2 },

  content: { paddingHorizontal: 18, paddingBottom: 40 },

  hero: { borderRadius: 20, padding: 18, alignItems: 'center', marginBottom: 18 },
  heroIco: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: INK },
  heroSub: { fontSize: 13, fontWeight: '600', color: INK2, marginTop: 4, textAlign: 'center' },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: INK3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', marginBottom: 18, ...SHADOW },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 14 },
  rowIco: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.pinkBg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 14.5, fontWeight: '700', color: INK },
  rowSub: { fontSize: 12.5, fontWeight: '600', color: INK2, marginTop: 2 },

  featRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, paddingVertical: 11 },
  featBorder: { borderTopWidth: 1, borderTopColor: LINE },
  featText: { flex: 1, fontSize: 13.5, fontWeight: '600', color: INK },

  upgrade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F6F1FF',
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 18,
  },
  upgradeTitle: { fontSize: 14.5, fontWeight: '800', color: colors.purple },
  upgradeSub: { fontSize: 12.5, fontWeight: '600', color: INK2, marginTop: 2 },

  renew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PINK,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 18,
  },
  renewText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  footNote: { fontSize: 12, color: INK3, textAlign: 'center', marginTop: 2, paddingHorizontal: 10 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  emptyIco: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.pinkBg2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: INK, textAlign: 'center' },
  emptySub: { fontSize: 13.5, fontWeight: '600', color: INK2, textAlign: 'center' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PINK,
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 14,
    marginTop: 8,
  },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
