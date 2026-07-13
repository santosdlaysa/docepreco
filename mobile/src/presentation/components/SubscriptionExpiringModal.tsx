import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface Props {
  visible: boolean;
  /** Dias restantes até a expiração (0 = expira hoje). */
  daysLeft: number;
  onRenew: () => void;
  onLater: () => void;
}

const expiryLabel = (daysLeft: number): string => {
  if (daysLeft <= 0) return 'Sua assinatura expira hoje.';
  if (daysLeft === 1) return 'Sua assinatura expira amanhã.';
  return `Sua assinatura expira em ${daysLeft} dias.`;
};

/**
 * Modal exibido quando a assinatura premium está perto de expirar,
 * incentivando a renovação antes de perder o acesso aos recursos pagos.
 */
export const SubscriptionExpiringModal: React.FC<Props> = ({ visible, daysLeft, onRenew, onLater }) => {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onLater}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="alarm-outline" size={32} color={colors.primary} />
          </View>

          <Text style={styles.title}>Sua assinatura está expirando</Text>
          <Text style={styles.message}>
            {expiryLabel(daysLeft)} Renove agora para não perder o acesso aos
            recursos premium.
          </Text>

          <View style={styles.benefits}>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.benefitText}>Continue precificando sem limites</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.benefitText}>Mantenha seus relatórios e recursos exclusivos</Text>
            </View>
          </View>

          <TouchableOpacity onPress={onRenew} style={styles.ctaBtn} activeOpacity={0.85}>
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.ctaBtnText}>Renovar agora</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onLater} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Agora não</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 360,
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
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  benefits: {
    width: '100%',
    backgroundColor: colors.cream,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 14,
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
