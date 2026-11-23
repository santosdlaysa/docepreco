import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function AuthHero({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={['#FFF3E8', '#FBDDE9']} style={{ paddingTop: insets.top + 14 }}>
      <View style={styles.brandRow}>
        <View style={styles.brandIcon}><Image source={require('../../../assets/icon.png')} style={styles.logo} /></View>
        <Text style={styles.brand}>Doce Preço<Text style={styles.brandDot}>.</Text></Text>
      </View>
      <View style={[styles.scene, { minHeight: compact ? 142 : 180 }]}>
        <View style={styles.copy}>
          <View style={styles.accent} />
          <Text style={[styles.title, { fontSize: compact ? 25 : 30 }]}>{t('login.headline')}</Text>
        </View>
        <View pointerEvents="none" style={styles.halo} />
        <Image accessible={false} source={require('../../../assets/auth-cake.png')} style={styles.cake} resizeMode="contain" />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  brandRow: { width: '100%', maxWidth: 480, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 26 },
  brandIcon: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 5 },
  logo: { width: 30, height: 30, borderRadius: 10 },
  brand: { fontSize: 21, fontWeight: '800', letterSpacing: -0.8, color: '#542936' },
  brandDot: { color: '#C62871' },
  scene: { width: '100%', maxWidth: 480, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 24, marginTop: 12, overflow: 'hidden' },
  copy: { width: '54%', zIndex: 2, paddingVertical: 10 },
  accent: { width: 28, height: 3, borderRadius: 2, backgroundColor: '#C62871', marginBottom: 10 },
  title: { fontFamily: 'PlayfairDisplay_700Bold', color: '#542936', letterSpacing: -1 },
  halo: { position: 'absolute', right: -8, width: 190, height: 190, borderRadius: 95, backgroundColor: '#FFFFFF50' },
  cake: { position: 'absolute', width: '54%', height: '100%', right: -8, bottom: 8, transform: [{ rotate: '-10deg' }] },
});
