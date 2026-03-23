import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { tokenStorage } from '../../data/storage/tokenStorage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { Button } from '../components/Button';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const [user, setUser] = useState<{ companyName: string; email: string } | null>(null);

  useEffect(() => {
    tokenStorage.getUser().then(setUser);
  }, []);

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Minha Conta" showBack onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <Card style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Ionicons name="storefront" size={32} color={colors.primary} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.companyName}>{user?.companyName || '—'}</Text>
              <Text style={styles.email}>{user?.email || '—'}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.dangerCard}>
          <Button
            title="Sair da conta"
            onPress={handleLogout}
            variant="outline"
            style={styles.logoutBtn}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 20 },
  card: { marginBottom: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: { flex: 1 },
  companyName: { ...typography.h3, color: colors.text },
  email: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  dangerCard: { borderColor: '#FFCDD2', backgroundColor: '#FFF5F5' },
  logoutBtn: { borderColor: colors.error },
});
