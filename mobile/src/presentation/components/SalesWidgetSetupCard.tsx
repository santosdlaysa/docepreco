import React from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isSalesWidgetAvailable } from '../hooks/useSalesWidget';
import { colors } from '../theme/colors';

export function SalesWidgetSetupCard() {
  const { t } = useTranslation();
  if (!isSalesWidgetAvailable) return null;

  const showInstructions = () => {
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    Alert.alert(t('salesWidget.title'), t(`salesWidget.${platform}`), [{ text: t('common.close') }]);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={t('salesWidget.title')}
      accessibilityHint={t('salesWidget.action')}
      onPress={showInstructions}
    >
      <View style={styles.icon} accessible={false}>
        <Ionicons name="grid-outline" size={22} color={colors.primaryDark} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{t('salesWidget.title')}</Text>
        <Text style={styles.description}>{t('salesWidget.description')}</Text>
        <Text style={styles.action}>{t('salesWidget.action')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.primaryDark} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 18,
    marginBottom: 14,
    padding: 14,
    backgroundColor: colors.pinkBg2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.pinkBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: 3 },
  title: { color: colors.text, fontSize: 15, fontWeight: '800' },
  description: { color: colors.text, fontSize: 13, lineHeight: 18 },
  action: { color: colors.primaryDark, fontSize: 13, fontWeight: '700' },
});
