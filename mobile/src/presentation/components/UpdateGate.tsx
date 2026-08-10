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

/**
 * Consulta a versão publicada no backend e, se o app instalado estiver
 * desatualizado, mostra um aviso DISPENSÁVEL sugerindo atualizar na Play Store.
 * O backend controla o número da versão (env APP_ANDROID_LATEST_VERSION_CODE),
 * então o alerta pode ser disparado sem publicar um build novo.
 */
export function UpdateGate() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [latestVersion, setLatestVersion] = useState<number | null>(null);
  const [storeUrl, setStoreUrl] = useState('https://play.google.com/store/apps/details?id=com.orgenyx');

  useEffect(() => {
    // Por enquanto o alerta é só para Android.
    if (Platform.OS !== 'android') return;

    let cancelled = false;

    (async () => {
      try {
        const installed = Number(Constants.expoConfig?.android?.versionCode);
        if (!Number.isFinite(installed)) return;

        const res = await fetch(`${BASE_URL}/app-version`);
        if (!res.ok) return;
        const data = await res.json();
        const latest = Number(data?.android?.latestVersionCode);
        if (!Number.isFinite(latest)) return;

        if (data?.android?.storeUrl) setStoreUrl(String(data.android.storeUrl));

        // App atualizado: nada a fazer.
        if (installed >= latest) return;

        // Já dispensou este mesmo número de versão? Não incomoda de novo.
        const dismissed = Number(await AsyncStorage.getItem(DISMISS_KEY));
        if (Number.isFinite(dismissed) && dismissed >= latest) return;

        if (!cancelled) {
          setLatestVersion(latest);
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
    // Não incomoda de novo até sair uma versão ainda mais nova.
    if (latestVersion != null) {
      void AsyncStorage.setItem(DISMISS_KEY, String(latestVersion));
    }
    setVisible(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.iconCircle}>
            <Ionicons name="rocket" size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>{t('updateAlert.title')}</Text>
          <Text style={styles.body}>{t('updateAlert.body')}</Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleUpdate} activeOpacity={0.85}>
            <Ionicons name="logo-google-playstore" size={18} color="#fff" />
            <Text style={styles.primaryText}>{t('updateAlert.updateNow')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleDismiss} activeOpacity={0.7}>
            <Text style={styles.secondaryText}>{t('updateAlert.later')}</Text>
          </TouchableOpacity>
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
