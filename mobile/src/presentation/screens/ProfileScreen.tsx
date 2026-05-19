import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Linking, Platform, Switch, ScrollView, TextInput, ActivityIndicator, Image, RefreshControl, KeyboardAvoidingView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { usePremium } from '../context/PremiumContext';
import { tokenStorage } from '../../data/storage/tokenStorage';
import { authApi } from '../../data/api/authApi';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { getNotificationsEnabled, setNotificationsEnabled } from '../utils/notifications';
import { useTranslation } from 'react-i18next';

const SUPPORT_WHATSAPP = '5595981273912'; // Número do WhatsApp para suporte (com código do país, sem + ou zeros à frente)

export const ProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { logout, deleteAccount, isDemoMode, companyLogo, setCompanyLogo } = useAuth();
  const { isPremium, premiumUntil, daysLeft, refresh } = usePremium();
  const [user, setUser] = useState<{ companyName: string; email: string; phone?: string | null; instagramHandle?: string | null } | null>(null);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [instagramInput, setInstagramInput] = useState('');
  const [savingInstagram, setSavingInstagram] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [sendingSuggestion, setSendingSuggestion] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const u = await tokenStorage.getUser();
      setUser(u);
      setInstagramInput(u?.instagramHandle || '');
      setPhoneInput(u?.phone || '');
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    tokenStorage.getUser().then((u) => {
      setUser(u);
      setInstagramInput(u?.instagramHandle || '');
      setPhoneInput(u?.phone || '');
    });
    void refresh();
    getNotificationsEnabled().then(setNotificationsOn);
  }, []);

  const premiumUntilLabel = premiumUntil
    ? new Date(premiumUntil).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const handleSaveInstagram = async () => {
    const handle = instagramInput.replace(/^@/, '').trim();
    if (handle && !/^[a-zA-Z0-9._]+$/.test(handle)) {
      Alert.alert(t('profile.instagramInvalid'), t('profile.instagramHint'));
      return;
    }
    setSavingInstagram(true);
    try {
      const updated = await authApi.updateProfile({ instagramHandle: handle || null });
      setUser(updated);
      setInstagramInput(updated.instagramHandle || '');
      Alert.alert(t('profile.saved'), t('profile.instagramUpdated'));
    } catch {
      Alert.alert(t('common.error'), t('common.saveError'));
    } finally {
      setSavingInstagram(false);
    }
  };

  const handleSavePhone = async () => {
    const digits = phoneInput.replace(/\D/g, '');
    if (digits && (digits.length < 10 || digits.length > 13)) {
      Alert.alert(t('profile.phoneInvalid'), t('profile.phoneHint'));
      return;
    }
    setSavingPhone(true);
    try {
      const updated = await authApi.updateProfile({ phone: digits || null });
      setUser(updated);
      setPhoneInput(updated.phone || '');
      Alert.alert(t('profile.saved'), t('profile.phoneUpdated'));
    } catch {
      Alert.alert(t('common.error'), t('common.saveError'));
    } finally {
      setSavingPhone(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('common.error'), t('profile.fillAllFields'));
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('profile.passwordMin'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('profile.passwordMismatch'));
      return;
    }
    setSavingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      Alert.alert('', t('profile.passwordChanged'));
      setShowPasswordSection(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      const msg = e?.response?.data?.error || t('profile.passwordError');
      Alert.alert(t('common.error'), msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const phoneChanged = (phoneInput.replace(/\D/g, '')) !== (user?.phone || '');
  const instagramChanged = (instagramInput.replace(/^@/, '').trim()) !== (user?.instagramHandle || '');

  const pickCompanyLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const asset = result.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      setCompanyLogo(`data:${mime};base64,${asset.base64}`);
    }
  };

  const removeCompanyLogo = () => {
    Alert.alert(t('profile.removeLogo'), t('profile.removeLogoMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.remove'), style: 'destructive', onPress: () => setCompanyLogo(null) },
    ]);
  };

  const handleSendSuggestion = async () => {
    const text = suggestionText.trim();
    if (!text) {
      Alert.alert(t('common.error'), t('profile.suggestionEmpty'));
      return;
    }
    setSendingSuggestion(true);
    try {
      await authApi.sendSuggestion(text);
      Alert.alert('', t('profile.suggestionSent'));
      setSuggestionText('');
    } catch {
      Alert.alert(t('common.error'), t('profile.suggestionError'));
    } finally {
      setSendingSuggestion(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(t('profile.logoutTitle'), t('profile.logoutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logoutTitle'), style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccountTitle'),
      t('profile.deleteAccountMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.deleteAccountConfirm'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('profile.deleteAccountFinalTitle'),
              t('profile.deleteAccountFinalMessage'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('profile.deleteAccountFinalConfirm'),
                  style: 'destructive',
                  onPress: async () => {
                    setDeletingAccount(true);
                    try {
                      await deleteAccount();
                    } catch {
                      Alert.alert(t('common.error'), t('profile.deleteAccountError'));
                      setDeletingAccount(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleSupport = async () => {
    const who = user?.companyName ? ` da ${user.companyName}` : '';
    const message = `Olá! Sou${who} e preciso de ajuda com o app DocePreço.`;
    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        t('common.error'),
        t('profile.whatsappError')
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title={t('profile.title')} showBack onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <Card style={styles.card}>
          <View style={styles.avatarRow}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={pickCompanyLogo}
              onLongPress={companyLogo ? removeCompanyLogo : undefined}
              activeOpacity={0.7}
            >
              {companyLogo ? (
                <Image source={{ uri: companyLogo }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Ionicons name="storefront" size={32} color={colors.primary} />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
            <View style={styles.userInfo}>
              <Text style={styles.companyName}>{user?.companyName || '—'}</Text>
              <View style={styles.emailRow}>
                <Text style={styles.email}>{user?.email || '—'}</Text>
                {isDemoMode && (
                  <View style={styles.demoBadge}>
                    <Text style={styles.demoBadgeText}>Demo</Text>
                  </View>
                )}
                {isPremium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="sparkles" size={10} color="#fff" />
                    <Text style={styles.premiumBadgeText}>Premium</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.menuItem}>
            <View style={[styles.iconBadge, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="call-outline" size={20} color="#1976D2" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuText}>{t('profile.phone')}</Text>
              <View style={styles.instagramRow}>
                <TextInput
                  style={[styles.instagramInput, { marginLeft: 0 }]}
                  placeholder="(99) 99999-9999"
                  placeholderTextColor={colors.textMuted}
                  value={phoneInput}
                  onChangeText={setPhoneInput}
                  keyboardType="phone-pad"
                  maxLength={20}
                />
                {phoneChanged && (
                  <TouchableOpacity
                    style={styles.instagramSaveBtn}
                    onPress={handleSavePhone}
                    disabled={savingPhone}
                  >
                    {savingPhone ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.menuItem}>
            <View style={[styles.iconBadge, { backgroundColor: '#FCE4EC' }]}>
              <Ionicons name="logo-instagram" size={20} color="#E1306C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuText}>{t('profile.instagram')}</Text>
              <View style={styles.instagramRow}>
                <Text style={styles.instagramAt}>@</Text>
                <TextInput
                  style={styles.instagramInput}
                  placeholder="seu_usuario"
                  placeholderTextColor={colors.textMuted}
                  value={instagramInput}
                  onChangeText={setInstagramInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={30}
                />
                {instagramChanged && (
                  <TouchableOpacity
                    style={styles.instagramSaveBtn}
                    onPress={handleSaveInstagram}
                    disabled={savingInstagram}
                  >
                    {savingInstagram ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Card>

        {(isPremium ? (
          <Card style={styles.premiumActiveCard}>
            <View style={styles.premiumActiveRow}>
              <View style={styles.premiumIconWrap}>
                <Ionicons name="sparkles" size={22} color="#fff" />
              </View>
              <View style={styles.premiumActiveText}>
                <Text style={styles.premiumActiveTitle}>{t('profile.youArePremium')} ✨</Text>
                <Text style={styles.premiumActiveSubtitle}>
                  {premiumUntilLabel
                    ? daysLeft !== null && daysLeft <= 7
                      ? t('profile.renewsIn', { days: daysLeft, plural: daysLeft === 1 ? '' : 's', date: premiumUntilLabel })
                      : t('profile.validUntil', { date: premiumUntilLabel })
                    : t('profile.allFeaturesUnlocked')}
                </Text>
              </View>
            </View>
          </Card>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Paywall', { trigger: { kind: 'manual' } })}
          >
            <Card style={styles.premiumCtaCard}>
              <View style={styles.premiumCtaRow}>
                <View style={styles.premiumIconWrap}>
                  <Ionicons name="sparkles" size={22} color="#fff" />
                </View>
                <View style={styles.premiumCtaText}>
                  <Text style={styles.premiumCtaTitle}>{t('profile.goPremium')}</Text>
                  <Text style={styles.premiumCtaSubtitle}>
                    {t('profile.premiumDescription')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {isPremium && (
          <>
            <Text style={styles.sectionTitle}>{t('profile.premiumSection')}</Text>
            <Card style={styles.menuCard}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('PdfSettings')}
              >
                <View style={[styles.iconBadge, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuText}>{t('profile.customizePdf')}</Text>
                  <Text style={styles.menuSubtext}>{t('profile.customizePdfSub')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </Card>
          </>
        )}

        <Text style={styles.sectionTitle}>{t('profile.security')}</Text>
        <Card style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowPasswordSection(!showPasswordSection)}
          >
            <View style={[styles.iconBadge, { backgroundColor: '#EDE7F6' }]}>
              <Ionicons name="lock-closed-outline" size={20} color="#7B1FA2" />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuText}>{t('profile.changePassword')}</Text>
              <Text style={styles.menuSubtext}>{t('profile.changePasswordSub')}</Text>
            </View>
            <Ionicons name={showPasswordSection ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
          </TouchableOpacity>
          {showPasswordSection && (
            <View style={styles.passwordSection}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t('profile.currentPassword')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TextInput
                style={styles.passwordInput}
                placeholder={t('profile.newPassword')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TextInput
                style={styles.passwordInput}
                placeholder={t('profile.confirmPassword')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <Button
                title={savingPassword ? t('profile.savingPassword') : t('profile.changePasswordButton')}
                onPress={handleChangePassword}
                disabled={savingPassword}
                style={{ marginTop: 8 }}
              />
            </View>
          )}
        </Card>

        <Text style={styles.sectionTitle}>{t('profile.preferences')}</Text>
        <Card style={styles.menuCard}>
          <View style={styles.menuItem}>
            <View style={[styles.iconBadge, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="notifications-outline" size={20} color="#FF9800" />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuText}>{t('profile.notifications')}</Text>
              <Text style={styles.menuSubtext}>{t('profile.notificationsSub')}</Text>
            </View>
            <Switch
              value={notificationsOn}
              onValueChange={(value) => {
                setNotificationsOn(value);
                void setNotificationsEnabled(value);
              }}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={notificationsOn ? colors.primary : '#f4f3f4'}
            />
          </View>
        </Card>

        <Text style={styles.sectionTitle}>{t('profile.help')}</Text>
        <Card style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={handleSupport}>
            <View style={[styles.iconBadge, { backgroundColor: '#E7F9EF' }]}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuText}>{t('profile.whatsappSupport')}</Text>
              <Text style={styles.menuSubtext}>{t('profile.whatsappSupportSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        <Card style={styles.menuCard}>
          <View style={styles.menuItem}>
            <View style={[styles.iconBadge, { backgroundColor: '#E8EAF6' }]}>
              <Ionicons name="bulb-outline" size={20} color="#5C6BC0" />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuText}>{t('profile.suggestions')}</Text>
              <Text style={styles.menuSubtext}>{t('profile.suggestionsSub')}</Text>
            </View>
          </View>
          <TextInput
            style={styles.suggestionInput}
            placeholder={t('profile.suggestionPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={suggestionText}
            onChangeText={setSuggestionText}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.suggestionSendBtn, !suggestionText.trim() && { opacity: 0.5 }]}
            onPress={handleSendSuggestion}
            disabled={sendingSuggestion || !suggestionText.trim()}
          >
            {sendingSuggestion ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={16} color="#fff" />
                <Text style={styles.suggestionSendText}>{t('profile.suggestionSend')}</Text>
              </>
            )}
          </TouchableOpacity>
        </Card>

        <Text style={styles.sectionTitle}>{t('profile.about')}</Text>
        <Card style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <View style={[styles.iconBadge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuText}>{t('profile.privacyPolicy')}</Text>
              <Text style={styles.menuSubtext}>{t('profile.privacyPolicySub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        <Card style={styles.dangerCard}>
          <Button
            title={t('profile.logout')}
            onPress={handleLogout}
            variant="outline"
            style={styles.logoutBtn}
          />
        </Card>

        {!isDemoMode && (
          <TouchableOpacity
            style={styles.deleteAccountBtn}
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
          >
            {deletingAccount ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={styles.deleteAccountText}>{t('profile.deleteAccount')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 20 },
  card: { marginBottom: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 18,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  userInfo: { flex: 1 },
  companyName: { ...typography.h3, color: colors.text },
  email: { ...typography.bodySmall, color: colors.textSecondary },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  demoBadge: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  demoBadgeText: { fontSize: 11, fontWeight: '700', color: '#6D5000' },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  premiumBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  premiumActiveCard: {
    marginBottom: 16,
    backgroundColor: colors.cream,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  premiumActiveRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  premiumActiveText: { flex: 1 },
  premiumActiveTitle: { ...typography.h4, color: colors.text },
  premiumActiveSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  premiumCtaCard: {
    marginBottom: 16,
    backgroundColor: colors.cream,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  premiumCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  premiumCtaText: { flex: 1 },
  premiumCtaTitle: { ...typography.h4, color: colors.text },
  premiumCtaSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  premiumIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: { marginBottom: 16 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  menuSubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  instagramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 2,
  },
  instagramAt: {
    ...typography.body,
    color: colors.textMuted,
    fontSize: 15,
  },
  instagramInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  instagramSaveBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  passwordSection: {
    marginTop: 12,
    gap: 10,
  },
  passwordInput: {
    ...typography.body,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  suggestionInput: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    minHeight: 80,
    marginTop: 8,
  },
  suggestionSendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#5C6BC0',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 10,
  },
  suggestionSendText: {
    ...typography.button,
    color: '#fff',
    fontSize: 13,
  },
  dangerCard: { borderColor: '#FFCDD2', backgroundColor: '#FFF5F5' },
  logoutBtn: { borderColor: colors.error },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginBottom: 32,
  },
  deleteAccountText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: '600',
  },
});
