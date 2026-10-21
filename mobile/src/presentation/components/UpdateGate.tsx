import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Linking, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://docepreco.onrender.com/api';
const DISMISS_KEY = '@update_alert_dismissed_version';
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.orgenyx';
const IOS_STORE_URL = 'https://apps.apple.com/us/app/docepre%C3%A7o/id6761034172';

type UpdateInfo = {
  latestVersionCode?: number;
  minVersionCode?: number;
  storeUrl?: string;
};

/**
 * Consulta a versão publicada no backend e, se o app instalado estiver
 * desatualizado, mostra um aviso para atualizar na loja correspondente.
 * O backend controla o número da versão e a versão mínima suportada,
 * então o alerta pode ser disparado sem publicar um build novo.
 */
export function UpdateGate() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [latestVersion, setLatestVersion] = useState<number | null>(null);
  const [storeUrl, setStoreUrl] = useState(Platform.OS === 'ios' ? IOS_STORE_URL : ANDROID_STORE_URL);
  const [forceUpdate, setForceUpdate] = useState(false);

  useEffect(() => {
    const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null;
    if (!platform) return;

    let cancelled = false;

    (async () => {
      try {
        const installed = Number(
          platform === 'android'
            ? Constants.expoConfig?.android?.versionCode
            : Constants.expoConfig?.ios?.buildNumber,
        );
        if (!Number.isFinite(installed)) return;

        const res = await fetch(`${BASE_URL}/app-version`);
        if (!res.ok) return;
        const data = await res.json();
        const update = data?.[platform] as UpdateInfo | undefined;
        const latest = Number(update?.latestVersionCode);
        if (!Number.isFinite(latest)) return;

        // App atualizado: nada a fazer.
        if (installed >= latest) return;

        const minimum = Number(update?.minVersionCode) || 0;
        const mandatory = minimum > 0 && installed < minimum;

        // Já dispensou este mesmo número de versão? Não incomoda de novo.
        if (!mandatory) {
          const dismissed = Number(await AsyncStorage.getItem(`${DISMISS_KEY}:${platform}`));
          if (Number.isFinite(dismissed) && dismissed >= latest) return;
        }

        if (!cancelled) {
          if (update?.storeUrl) setStoreUrl(String(update.storeUrl));
          setLatestVersion(latest);
          setForceUpdate(mandatory);
          setVisible(true);
        }
      } catch {
        // silencioso: nunca bloquear o app por causa da checagem
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpdate = () => {
    void Linking.openURL(storeUrl);
  };

  const handleDismiss = () => {
    if (forceUpdate) return;

    // Não incomoda de novo até sair uma versão ainda mais nova.
    if (latestVersion != null) {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      void AsyncStorage.setItem(`${DISMISS_KEY}:${platform}`, String(latestVersion));
    }
    setVisible(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={forceUpdate ? () => undefined : handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.iconCircle}>
            <Ionicons name="rocket" size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>{t(forceUpdate ? 'updateAlert.requiredTitle' : 'updateAlert.title')}</Text>
          <Text style={styles.body}>{t(forceUpdate ? 'updateAlert.requiredBody' : 'updateAlert.body')}</Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleUpdate} activeOpacity={0.85}>
            <Ionicons name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-google-playstore'} size={18} color="#fff" />
            <Text style={styles.primaryText}>{t('updateAlert.updateNow')}</Text>
          </TouchableOpacity>

          {!forceUpdate && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleDismiss} activeOpacity={0.7}>
              <Text style={styles.secondaryText}>{t('updateAlert.later')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: {
    ...typography.button,
    color: '#fff',
    fontSize: 14,
  },
  secondaryBtn: {
    paddingVertical: 12,
    marginTop: 4,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
