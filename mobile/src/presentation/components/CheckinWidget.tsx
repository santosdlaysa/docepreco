import { colors } from '../theme/colors';
import React, { useCallback, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { checkinApi, CheckinReward, CheckinStatus } from '../../data/api/checkinApi';
import { checkinStorage } from '../../data/storage/checkinStorage';
import { isDemoMode } from '../../data/demo/demoMode';
import { usePremium } from '../context/PremiumContext';

const TIER_LABEL: Record<string, string> = { premium: 'Premium', master: 'Master' };
/** Acima disso as bolinhas não cabem numa linha — mostramos uma barra. */
const MAX_DOTS = 10;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const rewardLabel = (s: Pick<CheckinStatus, 'rewardDays' | 'rewardTier'>) =>
  `${s.rewardDays === 7 ? '1 semana' : `${s.rewardDays} ${s.rewardDays === 1 ? 'dia' : 'dias'}`} de ${TIER_LABEL[s.rewardTier]} grátis`;

/**
 * Check-in diário: card na Home + modal. Ao completar os dias configurados no
 * painel, o servidor libera o plano e o app atualiza o acesso na hora.
 */
export const CheckinWidget: React.FC = () => {
  const { refresh } = usePremium();
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reward, setReward] = useState<CheckinReward | null>(null);

  const load = useCallback(async () => {
    if (isDemoMode()) return;
    try {
      const s = await checkinApi.getStatus();
      setStatus(s);
      if (s.enabled && s.eligible && s.canEarnMore && !s.checkedInToday && !(await checkinStorage.wasShownToday())) {
        setVisible(true);
        void checkinStorage.markShown();
      }
    } catch {
      // sem check-in se a API falhar — não atrapalha a Home
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const close = () => {
    setVisible(false);
    setError(null);
    setReward(null);
  };

  const doCheckIn = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await checkinApi.checkIn();
      setStatus(result.status);
      if (result.reward) {
        setReward(result.reward);
        void refresh();
      }
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Não foi possível fazer o check-in. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quem acabou de ganhar continua vendo a comemoração mesmo sem poder ganhar de novo.
  if (!status || !status.enabled || (!reward && (!status.eligible || !status.canEarnMore))) return null;

  const { daysRequired, progress, checkedInToday, consecutive } = status;

  return (
    <>
      {!reward && (
        <TouchableOpacity style={styles.card} onPress={() => setVisible(true)} activeOpacity={0.85}>
          <View style={styles.cardIcon}>
            <Ionicons name={checkedInToday ? 'checkmark-done' : 'calendar-outline'} size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{status.title}</Text>
            <Text style={styles.cardSub}>
              {progress}/{daysRequired} dias · {rewardLabel(status)}
            </Text>
          </View>
          <View style={[styles.cardBtn, checkedInToday && styles.cardBtnDone]}>
            <Text style={[styles.cardBtnText, checkedInToday && styles.cardBtnTextDone]}>
              {checkedInToday ? 'Feito hoje' : 'Check-in'}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {reward ? (
              <>
                <View style={[styles.iconCircle, { backgroundColor: colors.cream }]}>
                  <Ionicons name="gift" size={34} color={colors.amber} />
                </View>
                <Text style={styles.title}>Parabéns! 🎉</Text>
                <Text style={styles.message}>
                  Você completou {daysRequired} dias de check-in e ganhou{' '}
                  <Text style={styles.bold}>{reward.days} dias de {TIER_LABEL[reward.tier]}</Text>.
                  {'\n'}Aproveite até {fmtDate(reward.premiumUntil)}!
                </Text>
                <TouchableOpacity style={styles.ctaBtn} onPress={close} activeOpacity={0.85}>
                  <Text style={styles.ctaBtnText}>Aproveitar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.iconCircle}>
                  <Ionicons name="calendar" size={32} color={colors.primary} />
                </View>
                <Text style={styles.title}>{status.title}</Text>
                <Text style={styles.message}>{status.message}</Text>

                {daysRequired <= MAX_DOTS ? (
                  <View style={styles.dots}>
                    {Array.from({ length: daysRequired }, (_, i) => {
                      const done = i < progress;
                      const isNext = !checkedInToday && i === progress;
                      return (
                        <View key={i} style={styles.dotWrap}>
                          <View style={[styles.dot, done && styles.dotDone, isNext && styles.dotNext]}>
                            {done
                              ? <Ionicons name="checkmark" size={16} color="#fff" />
                              : i === daysRequired - 1
                                ? <Ionicons name="gift-outline" size={15} color={isNext ? colors.primary : colors.textMuted} />
                                : <Text style={[styles.dotText, isNext && { color: colors.primary }]}>{i + 1}</Text>}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.barWrap}>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.min(100, (progress / daysRequired) * 100)}%` }]} />
                    </View>
                    <Text style={styles.barText}>{progress} de {daysRequired} dias</Text>
                  </View>
                )}

                <View style={styles.rewardBox}>
                  <Ionicons name="gift-outline" size={18} color={colors.amber} />
                  <Text style={styles.rewardText}>
                    Prêmio: <Text style={styles.bold}>{rewardLabel(status)}</Text>
                  </Text>
                </View>
                {consecutive && (
                  <Text style={styles.hint}>Faça check-in todo dia: se pular um dia, a contagem recomeça.</Text>
                )}

                {error && <Text style={styles.error}>{error}</Text>}

                {checkedInToday ? (
                  <View style={[styles.ctaBtn, styles.ctaBtnDone]}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <Text style={[styles.ctaBtnText, { color: colors.success }]}>Check-in de hoje feito · volte amanhã</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.ctaBtn} onPress={doCheckIn} disabled={submitting} activeOpacity={0.85}>
                    {submitting
                      ? <ActivityIndicator color="#fff" />
                      : <>
                          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                          <Text style={styles.ctaBtnText}>Fazer check-in de hoje</Text>
                        </>}
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={close} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>{checkedInToday ? 'Fechar' : 'Agora não'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cardBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  cardBtnDone: { backgroundColor: colors.primaryLight },
  cardBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cardBtnTextDone: { color: colors.primary },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  bold: { fontWeight: '700', color: colors.text },
  dots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 18 },
  dotWrap: { alignItems: 'center' },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotNext: { borderColor: colors.primary, borderStyle: 'dashed' },
  dotText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  barWrap: { width: '100%', marginBottom: 18 },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: colors.primaryLight, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 5 },
  barText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 6 },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: colors.cream,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  rewardText: { fontSize: 13, color: colors.text, flex: 1 },
  hint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: 14 },
  error: { fontSize: 13, color: colors.redDark, textAlign: 'center', marginBottom: 12 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
    width: '100%',
    marginTop: 6,
  },
  ctaBtnDone: { backgroundColor: colors.primaryLight },
  ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { marginTop: 12, paddingVertical: 8 },
  cancelText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
});
