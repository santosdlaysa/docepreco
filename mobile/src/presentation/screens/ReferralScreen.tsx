import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ClipboardModule from 'expo-clipboard';
import { referralApi, ReferralData, ReferralStatus } from '../../data/api/referralApi';

/* ─── Design tokens (alinhados ao ProfileScreen) ─── */
const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const PINK = '#EA4B92';
const GREEN = '#43BE6E';
const AMBER = '#C8870B';
const CREAM = '#FFF6F0';
const LINE = '#F1E2DA';
const SHADOW = { shadowColor: INK, shadowOffset: { width: 0, height: 2 } as const, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 };

const STATUS_META: Record<ReferralStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'Aguardando 1ª receita', color: AMBER, bg: '#FFF1CE', icon: 'hourglass-outline' },
  valid: { label: 'Validada', color: GREEN, bg: '#DCF6E5', icon: 'checkmark-circle-outline' },
  rewarded: { label: 'Recompensada', color: PINK, bg: '#FFF0F6', icon: 'gift-outline' },
  invalid: { label: 'Cancelada', color: INK3, bg: '#F1E2DA', icon: 'close-circle-outline' },
};

export const ReferralScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await referralApi.getMe();
      setData(d);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar suas indicações. Tente novamente.');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const buildMessage = (code: string) =>
    `🧁 Eu uso o DocePreço para precificar meus doces e está me ajudando demais!\n\n` +
    `Baixe o app e use meu código de indicação *${code}* no cadastro. 💖`;

  const handleShare = async () => {
    if (!data?.code) return;
    try {
      await Share.share({ message: buildMessage(data.code) });
    } catch {
      /* usuário cancelou */
    }
  };

  const handleCopy = async () => {
    if (!data?.code) return;
    await ClipboardModule.setStringAsync(data.code);
    Alert.alert('', 'Código copiado!');
  };

  if (loading) {
    return (
      <SafeAreaView style={[st.safe, st.center]}>
        <ActivityIndicator size="large" color={PINK} />
      </SafeAreaView>
    );
  }

  const target = data?.target ?? 5;
  const cycle = data?.cycle ?? 0;
  const remaining = data?.remainingToReward ?? target;
  const rewardsEarned = data?.rewardsEarned ?? 0;

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PINK]} tintColor={PINK} />}
      >
        {/* ── Back ── */}
        <View style={st.backRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.bk}>
            <Ionicons name="arrow-back" size={20} color={INK} />
          </TouchableOpacity>
        </View>

        {/* ── Hero ── */}
        <View style={st.hero}>
          <View style={st.heroIco}>
            <Ionicons name="gift" size={30} color={PINK} />
          </View>
          <Text style={st.heroTitle}>Indique e ganhe</Text>
          <Text style={st.heroSub}>
            A cada {target} amigos que se cadastrarem com seu código e criarem a 1ª receita, você ganha{' '}
            <Text style={{ fontWeight: '800', color: INK }}>30 dias grátis</Text>.
          </Text>
        </View>

        <View style={st.body}>
          {/* ── Código ── */}
          <View style={st.codeCard}>
            <Text style={st.codeLabel}>SEU CÓDIGO</Text>
            <Text style={st.code}>{data?.code ?? '—'}</Text>
            <View style={st.codeBtns}>
              <TouchableOpacity style={[st.codeBtn, st.codeBtnGhost]} onPress={handleCopy} activeOpacity={0.85}>
                <Ionicons name="copy-outline" size={18} color={PINK} />
                <Text style={[st.codeBtnText, { color: PINK }]}>Copiar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.codeBtn} onPress={handleShare} activeOpacity={0.85}>
                <Ionicons name="share-social-outline" size={18} color="#fff" />
                <Text style={st.codeBtnText}>Compartilhar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Progresso ── */}
          <View style={st.gcard}>
            <View style={st.progressHead}>
              <Text style={st.progressTitle}>Progresso para o próximo prêmio</Text>
              <Text style={st.progressCount}>{cycle}/{target}</Text>
            </View>
            <View style={st.dots}>
              {Array.from({ length: target }).map((_, i) => (
                <View key={i} style={[st.dot, i < cycle && st.dotOn]}>
                  {i < cycle && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              ))}
            </View>
            <Text style={st.progressHint}>
              {remaining === target
                ? `Falta${target === 1 ? '' : 'm'} ${target} indicaç${target === 1 ? 'ão' : 'ões'} válida${target === 1 ? '' : 's'} para 30 dias grátis.`
                : `Falta${remaining === 1 ? '' : 'm'} só ${remaining} para ganhar 30 dias grátis! 🎉`}
            </Text>
          </View>

          {/* ── Resumo ── */}
          <View style={st.statsRow}>
            <View style={st.statBox}>
              <Text style={st.statNum}>{data?.validCount ?? 0}</Text>
              <Text style={st.statLabel}>Validadas</Text>
            </View>
            <View style={st.statBox}>
              <Text style={st.statNum}>{data?.pendingCount ?? 0}</Text>
              <Text style={st.statLabel}>Pendentes</Text>
            </View>
            <View style={st.statBox}>
              <Text style={[st.statNum, { color: PINK }]}>{rewardsEarned}</Text>
              <Text style={st.statLabel}>Prêmios</Text>
            </View>
          </View>

          {/* ── Histórico ── */}
          <Text style={st.secLabel}>Suas indicações</Text>
          {data && data.history.length > 0 ? (
            <View style={st.gcard}>
              {data.history.map((h, idx) => {
                const meta = STATUS_META[h.status];
                return (
                  <View key={idx} style={[st.row, idx > 0 && { borderTopWidth: 1, borderTopColor: LINE }]}>
                    <View style={[st.rowIco, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon} size={18} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.rowName} numberOfLines={1}>{h.companyName}</Text>
                      <Text style={st.rowEmail} numberOfLines={1}>{h.emailMasked}</Text>
                    </View>
                    <Text style={[st.rowStatus, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[st.gcard, st.empty]}>
              <Ionicons name="people-outline" size={32} color={INK3} />
              <Text style={st.emptyText}>Você ainda não indicou ninguém.{'\n'}Compartilhe seu código e comece a ganhar!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, gap: 14 },

  backRow: { paddingHorizontal: 16, paddingTop: 8 },
  bk: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW },

  hero: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 4, paddingBottom: 22 },
  heroIco: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#FFF0F6', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: INK },
  heroSub: { fontSize: 13.5, color: INK2, textAlign: 'center', marginTop: 6, lineHeight: 19 },

  codeCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', ...SHADOW },
  codeLabel: { fontSize: 11, fontWeight: '800', color: INK3, letterSpacing: 1.5 },
  code: { fontSize: 36, fontWeight: '800', color: INK, letterSpacing: 4, marginTop: 6, marginBottom: 16 },
  codeBtns: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  codeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: PINK, borderRadius: 14, paddingVertical: 13 },
  codeBtnGhost: { backgroundColor: '#FFF0F6' },
  codeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  gcard: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', ...SHADOW },
  progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16 },
  progressTitle: { fontSize: 14, fontWeight: '700', color: INK, flex: 1 },
  progressCount: { fontSize: 15, fontWeight: '800', color: PINK },
  dots: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  dot: { flex: 1, height: 38, borderRadius: 12, backgroundColor: CREAM, borderWidth: 1.5, borderColor: LINE, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: GREEN, borderColor: GREEN },
  progressHint: { fontSize: 12.5, color: INK2, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, fontWeight: '500' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, alignItems: 'center', ...SHADOW },
  statNum: { fontSize: 24, fontWeight: '800', color: INK },
  statLabel: { fontSize: 12, color: INK2, fontWeight: '600', marginTop: 2 },

  secLabel: { fontSize: 13, fontWeight: '700', color: INK2, marginTop: 2, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, paddingHorizontal: 15 },
  rowIco: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowName: { fontSize: 14.5, fontWeight: '600', color: INK },
  rowEmail: { fontSize: 12, color: INK2, marginTop: 1 },
  rowStatus: { fontSize: 11.5, fontWeight: '700', maxWidth: 92, textAlign: 'right' },

  empty: { alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  emptyText: { fontSize: 13, color: INK2, textAlign: 'center', lineHeight: 19 },
});
