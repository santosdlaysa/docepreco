import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Linking, Platform, Switch, ScrollView, TextInput, ActivityIndicator, Image, RefreshControl } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
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
import { getNotificationsEnabled, setNotificationsEnabled } from '../utils/notifications';
import { useTranslation } from 'react-i18next';

const SUPPORT_WHATSAPP = '5595981273912';

/* ─── Design tokens ─── */
const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const PINK = '#EA4B92';
const GREEN = '#43BE6E';
const CREAM = '#FFF6F0';
const LINE = '#F1E2DA';
const SHADOW = { shadowColor: INK, shadowOffset: { width: 0, height: 2 } as const, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 };

export const ProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { logout, isDemoMode, companyLogo, setCompanyLogo } = useAuth();
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
    try { const u = await tokenStorage.getUser(); setUser(u); setInstagramInput(u?.instagramHandle || ''); setPhoneInput(u?.phone || ''); await refresh(); }
    finally { setRefreshing(false); }
  };

  useEffect(() => {
    tokenStorage.getUser().then((u) => { setUser(u); setInstagramInput(u?.instagramHandle || ''); setPhoneInput(u?.phone || ''); });
    void refresh(); getNotificationsEnabled().then(setNotificationsOn);
  }, []);

  const premiumUntilLabel = premiumUntil ? new Date(premiumUntil).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : null;
  // Assinatura que já foi ativa e venceu (premiumUntil no passado e não está mais premium)
  const isExpired = !isPremium && !!premiumUntil && new Date(premiumUntil).getTime() <= Date.now();
  // Texto do tempo restante para expirar
  const expiryLabel = daysLeft == null
    ? 'Todos os recursos liberados'
    : daysLeft === 0
      ? `Expira hoje${premiumUntilLabel ? ` · ${premiumUntilLabel}` : ''}`
      : `Expira em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}${premiumUntilLabel ? ` · ${premiumUntilLabel}` : ''}`;
  const expiringSoon = daysLeft != null && daysLeft <= 3;

  const handleSaveInstagram = async () => {
    const handle = instagramInput.replace(/^@/, '').trim();
    if (handle && !/^[a-zA-Z0-9._]+$/.test(handle)) { Alert.alert('Instagram inválido', 'Use apenas letras, números, pontos e underlines.'); return; }
    setSavingInstagram(true);
    try { const updated = await authApi.updateProfile({ instagramHandle: handle || null }); setUser(updated); setInstagramInput(updated.instagramHandle || ''); Alert.alert('Salvo!', 'Instagram atualizado.'); }
    catch { Alert.alert('Erro', 'Não foi possível salvar.'); }
    finally { setSavingInstagram(false); }
  };

  const handleSavePhone = async () => {
    const digits = phoneInput.replace(/\D/g, '');
    setSavingPhone(true);
    try { const updated = await authApi.updateProfile({ phone: digits || null }); setUser(updated); setPhoneInput(updated.phone || ''); Alert.alert('Salvo!', 'Telefone atualizado.'); }
    catch { Alert.alert('Erro', 'Não foi possível salvar.'); }
    finally { setSavingPhone(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) { Alert.alert('Erro', 'Preencha todos os campos.'); return; }
    if (newPassword.length < 6) { Alert.alert('Erro', 'A nova senha deve ter pelo menos 6 caracteres.'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Erro', 'As senhas não coincidem.'); return; }
    setSavingPassword(true);
    try { await authApi.changePassword(currentPassword, newPassword); Alert.alert('', 'Senha alterada com sucesso!'); setShowPasswordSection(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }
    catch (e: any) { Alert.alert('Erro', e?.response?.data?.error || 'Erro ao alterar senha.'); }
    finally { setSavingPassword(false); }
  };

  const pickCompanyLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
    if (!result.canceled && result.assets[0]?.base64) { const a = result.assets[0]; setCompanyLogo(`data:${a.mimeType || 'image/jpeg'};base64,${a.base64}`); }
  };

  const handleSendSuggestion = async () => {
    if (!suggestionText.trim()) { Alert.alert('Erro', 'Escreva sua sugestão.'); return; }
    setSendingSuggestion(true);
    try { await authApi.sendSuggestion(suggestionText.trim()); Alert.alert('', 'Sugestão enviada! Obrigado!'); setSuggestionText(''); }
    catch { Alert.alert('Erro', 'Não foi possível enviar.'); }
    finally { setSendingSuggestion(false); }
  };

  const handleLogout = () => Alert.alert('Sair', 'Deseja sair da sua conta?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Sair', style: 'destructive', onPress: logout }]);

  const handleDeleteAccount = () => {
    Alert.alert('Excluir conta', 'Todos os seus dados serão apagados permanentemente.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => {
        Alert.alert('Tem certeza?', 'Essa ação não pode ser desfeita.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sim, excluir', style: 'destructive', onPress: async () => {
            setDeletingAccount(true);
            try { await authApi.deleteAccount(); Alert.alert('Conta excluída', 'Seus dados foram removidos.', [{ text: 'OK', onPress: logout }]); }
            catch { Alert.alert('Erro', 'Não foi possível excluir.'); }
            finally { setDeletingAccount(false); }
          }},
        ]);
      }},
    ]);
  };

  const handleSupport = async () => {
    const who = user?.companyName ? ` da ${user.companyName}` : '';
    try { await Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Olá! Sou${who} e preciso de ajuda com o app DocePreço.`)}`); }
    catch { Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.'); }
  };

  const instagramChanged = (instagramInput.replace(/^@/, '').trim()) !== (user?.instagramHandle || '');
  const phoneChanged = (phoneInput.replace(/\D/g, '')) !== (user?.phone?.replace(/\D/g, '') || '');
  const initials = user?.companyName ? user.companyName.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') : '?';

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PINK]} tintColor={PINK} />}
        contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Back button ── */}
        <View style={st.backRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.bk}>
            <Ionicons name="arrow-back" size={20} color={INK} />
          </TouchableOpacity>
        </View>

        {/* ── Avatar + Name ── */}
        <View style={st.avatarSection}>
          <TouchableOpacity onPress={pickCompanyLogo} onLongPress={companyLogo ? () => Alert.alert('Remover foto?', '', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Remover', style: 'destructive', onPress: () => setCompanyLogo(null) }]) : undefined} activeOpacity={0.7}>
            <View style={st.avatarWrap}>
              {companyLogo ? (
                <Image source={{ uri: companyLogo }} style={st.avatarImg} />
              ) : (
                <LinearGradient colors={['#FF8FB6', PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.avatarGrad}>
                  <Text style={st.avatarInitials}>{initials}</Text>
                </LinearGradient>
              )}
              <View style={st.cameraBadge}><Ionicons name="camera" size={16} color={INK2} /></View>
            </View>
          </TouchableOpacity>
          <Text style={st.companyName}>{user?.companyName || '—'}</Text>
          <Text style={st.email}>{user?.email || '—'}</Text>
          {isPremium && (
            <LinearGradient colors={['#FFC53D', '#FFB01F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.proChip}>
              <Ionicons name="trophy" size={14} color="#7A4E00" />
              <Text style={st.proChipText}>PRO ativo</Text>
            </LinearGradient>
          )}
        </View>

        <View style={st.body}>
          {/* ── Phone + Instagram ── */}
          <View style={st.gcard}>
            <View style={st.grow}>
              <View style={[st.gi, { backgroundColor: '#EEF8FD' }]}><Ionicons name="call-outline" size={18} color="#2BA7DD" /></View>
              <View style={{ flex: 1 }}>
                <Text style={st.growB}>Telefone</Text>
                <TextInput style={st.inlineInput} value={phoneInput} onChangeText={setPhoneInput} placeholder="+55 (11) 99999-9999" placeholderTextColor={INK3} keyboardType="phone-pad" />
              </View>
              {phoneChanged && (
                <TouchableOpacity onPress={handleSavePhone} disabled={savingPhone} style={st.saveSmall}>
                  {savingPhone ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              )}
            </View>
            <View style={[st.grow, { borderTopWidth: 1, borderTopColor: LINE }]}>
              <View style={[st.gi, { backgroundColor: '#FFF0F6' }]}><Ionicons name="logo-instagram" size={18} color={PINK} /></View>
              <View style={{ flex: 1 }}>
                <Text style={st.growB}>Instagram</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: INK3, fontSize: 14 }}>@</Text>
                  <TextInput style={[st.inlineInput, { marginLeft: 2 }]} value={instagramInput} onChangeText={setInstagramInput} placeholder="docesdamarina" placeholderTextColor={INK3} autoCapitalize="none" />
                </View>
              </View>
              {instagramChanged && (
                <TouchableOpacity onPress={handleSaveInstagram} disabled={savingInstagram} style={st.saveSmall}>
                  {savingInstagram ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Premium CTA / Status ── */}
          {isPremium ? (
            <TouchableOpacity activeOpacity={expiringSoon ? 0.85 : 1} disabled={!expiringSoon} onPress={expiringSoon ? () => navigation.navigate('PixPayment', { plan: 'monthly' }) : undefined}>
              <LinearGradient colors={['#FFF1CE', '#FFE3EF']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={st.proCta}>
                <View style={st.proCtaIco}><Ionicons name="trophy" size={24} color={PINK} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={st.proCtaTitle}>Plano PRO ativo</Text>
                  <Text style={[st.proCtaSub, expiringSoon && { color: '#C0392B', fontWeight: '700' }]}>{expiryLabel}</Text>
                  {expiringSoon && <Text style={st.proCtaRenew}>Toque para renovar →</Text>}
                </View>
                {expiringSoon && <Ionicons name="refresh-circle" size={22} color={PINK} />}
              </LinearGradient>
            </TouchableOpacity>
          ) : isExpired ? (
            <TouchableOpacity onPress={() => navigation.navigate('PixPayment', { plan: 'monthly' })} activeOpacity={0.85}>
              <LinearGradient colors={['#FFE3EF', '#FFD0DD']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[st.proCta, { borderColor: '#FFC2D2' }]}>
                <View style={st.proCtaIco}><Ionicons name="refresh-circle" size={24} color={PINK} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={st.proCtaTitle}>Renove sua assinatura</Text>
                  <Text style={[st.proCtaSub, { color: '#C0392B', fontWeight: '700' }]}>
                    {premiumUntilLabel ? `Sua assinatura expirou em ${premiumUntilLabel}` : 'Sua assinatura expirou'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={PINK} />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => navigation.navigate('Paywall', { trigger: { kind: 'manual' } })} activeOpacity={0.85}>
              <LinearGradient colors={['#FFF1CE', '#FFE3EF']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={st.proCta}>
                <View style={st.proCtaIco}><Ionicons name="trophy" size={24} color={PINK} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={st.proCtaTitle}>Seja PRO</Text>
                  <Text style={st.proCtaSub}>Receitas ilimitadas e muito mais</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={PINK} />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* ── Conta ── */}
          <Text style={st.secLabel}>Conta</Text>
          <View style={st.gcard}>
            {isPremium && (
              <TouchableOpacity style={st.grow} onPress={() => navigation.navigate('PdfSettings')} activeOpacity={0.7}>
                <View style={[st.gi, { backgroundColor: '#FFF0F6' }]}><Ionicons name="document-text-outline" size={18} color={PINK} /></View>
                <View style={{ flex: 1 }}><Text style={st.growB}>Personalizar PDF</Text></View>
                <Ionicons name="chevron-forward" size={16} color={INK3} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[st.grow, isPremium && { borderTopWidth: 1, borderTopColor: LINE }]} onPress={() => setShowPasswordSection(!showPasswordSection)} activeOpacity={0.7}>
              <View style={[st.gi, { backgroundColor: '#FCEFE6' }]}><Ionicons name="key-outline" size={18} color={INK2} /></View>
              <View style={{ flex: 1 }}><Text style={st.growB}>Alterar senha</Text></View>
              <Ionicons name={showPasswordSection ? 'chevron-up' : 'chevron-forward'} size={16} color={INK3} />
            </TouchableOpacity>
            {showPasswordSection && (
              <View style={{ paddingHorizontal: 15, paddingBottom: 13, gap: 8 }}>
                <TextInput style={st.passInput} placeholder="Senha atual" placeholderTextColor={INK3} secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
                <TextInput style={st.passInput} placeholder="Nova senha" placeholderTextColor={INK3} secureTextEntry value={newPassword} onChangeText={setNewPassword} />
                <TextInput style={st.passInput} placeholder="Confirmar nova senha" placeholderTextColor={INK3} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
                <TouchableOpacity onPress={handleChangePassword} disabled={savingPassword} activeOpacity={0.85}>
                  <LinearGradient colors={['#FF6AAE', PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.passBtn}>
                    {savingPassword ? <ActivityIndicator color="#fff" /> : <Text style={st.passBtnText}>Alterar senha</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
            <View style={[st.grow, { borderTopWidth: 1, borderTopColor: LINE }]}>
              <View style={[st.gi, { backgroundColor: '#FFF1CE' }]}><Ionicons name="notifications-outline" size={18} color="#C8870B" /></View>
              <View style={{ flex: 1 }}><Text style={st.growB}>Notificações</Text></View>
              <Switch value={notificationsOn} onValueChange={(v) => { setNotificationsOn(v); void setNotificationsEnabled(v); }}
                trackColor={{ false: INK3, true: '#DCF6E5' }} thumbColor={notificationsOn ? GREEN : '#f4f3f4'} />
            </View>
          </View>

          {/* ── Ajuda ── */}
          <Text style={st.secLabel}>Ajuda</Text>
          <View style={st.gcard}>
            <TouchableOpacity style={st.grow} onPress={() => navigation.navigate('SupportChat')} activeOpacity={0.7}>
              <View style={[st.gi, { backgroundColor: '#EEF8FD' }]}><Ionicons name="chatbubbles-outline" size={18} color="#2BA7DD" /></View>
              <View style={{ flex: 1 }}><Text style={st.growB}>Chat de suporte</Text></View>
              <Ionicons name="chevron-forward" size={16} color={INK3} />
            </TouchableOpacity>
            <TouchableOpacity style={[st.grow, { borderTopWidth: 1, borderTopColor: LINE }]} onPress={handleSupport} activeOpacity={0.7}>
              <View style={[st.gi, { backgroundColor: '#DCF6E5' }]}><Ionicons name="logo-whatsapp" size={18} color={GREEN} /></View>
              <View style={{ flex: 1 }}><Text style={st.growB}>WhatsApp do suporte</Text></View>
              <Ionicons name="chevron-forward" size={16} color={INK3} />
            </TouchableOpacity>
            <View style={[st.grow, { borderTopWidth: 1, borderTopColor: LINE, flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[st.gi, { backgroundColor: '#FFF0F6' }]}><Ionicons name="sparkles-outline" size={18} color={PINK} /></View>
                <Text style={st.growB}>Enviar sugestão</Text>
              </View>
              <TextInput style={st.suggestionInput} value={suggestionText} onChangeText={setSuggestionText}
                placeholder="Sua ideia ou feedback..." placeholderTextColor={INK3} multiline maxLength={500} textAlignVertical="top" />
              <TouchableOpacity onPress={handleSendSuggestion} disabled={sendingSuggestion || !suggestionText.trim()} activeOpacity={0.85}
                style={[st.suggestionBtn, !suggestionText.trim() && { opacity: 0.5 }]}>
                {sendingSuggestion ? <ActivityIndicator size="small" color="#fff" /> : (
                  <><Ionicons name="send" size={14} color="#fff" /><Text style={st.suggestionBtnText}>Enviar</Text></>
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[st.grow, { borderTopWidth: 1, borderTopColor: LINE }]} onPress={() => navigation.navigate('PrivacyPolicy')} activeOpacity={0.7}>
              <View style={[st.gi, { backgroundColor: '#FCEFE6' }]}><Ionicons name="shield-checkmark-outline" size={18} color={INK2} /></View>
              <View style={{ flex: 1 }}><Text style={st.growB}>Política de privacidade</Text></View>
              <Ionicons name="chevron-forward" size={16} color={INK3} />
            </TouchableOpacity>
          </View>

          {/* ── Logout ── */}
          <TouchableOpacity style={st.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={st.logoutText}>Sair da conta</Text>
          </TouchableOpacity>

          {!isDemoMode && (
            <TouchableOpacity style={st.deleteBtn} onPress={handleDeleteAccount} disabled={deletingAccount}>
              {deletingAccount ? <ActivityIndicator size="small" color="#C0392B" /> : <Text style={st.deleteText}>Excluir minha conta</Text>}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/* ──────────────────────── STYLES ──────────────────────── */
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },
  body: { paddingHorizontal: 18, gap: 14 },

  /* back */
  backRow: { paddingHorizontal: 16, paddingTop: 8 },
  bk: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW },

  /* avatar section */
  avatarSection: { alignItems: 'center', paddingTop: 8, paddingBottom: 20 },
  avatarWrap: { position: 'relative' },
  avatarGrad: { width: 88, height: 88, borderRadius: 30, alignItems: 'center', justifyContent: 'center', ...SHADOW, shadowColor: PINK, shadowOpacity: 0.3, shadowRadius: 12 },
  avatarImg: { width: 88, height: 88, borderRadius: 30 },
  avatarInitials: { fontSize: 34, fontWeight: '800', color: '#fff' },
  cameraBadge: { position: 'absolute', right: -4, bottom: -4, width: 32, height: 32, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  companyName: { fontSize: 22, fontWeight: '700', color: INK, marginTop: 12 },
  email: { fontSize: 13, color: INK2, fontWeight: '600' },
  proChip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 11, borderRadius: 999, marginTop: 10, ...SHADOW, shadowColor: '#FFB01F', shadowOpacity: 0.35 },
  proChipText: { fontSize: 12.5, fontWeight: '700', color: '#7A4E00' },

  /* pro cta */
  proCta: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, padding: 15, paddingHorizontal: 16, borderWidth: 1, borderColor: '#FFE3EF' },
  proCtaIco: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW, shadowOpacity: 0.04 },
  proCtaTitle: { fontSize: 15.5, fontWeight: '700', color: INK },
  proCtaSub: { fontSize: 12, color: INK2, fontWeight: '500' },
  proCtaRenew: { fontSize: 12.5, color: PINK, fontWeight: '700', marginTop: 3 },

  /* section label */
  secLabel: { fontSize: 13, fontWeight: '700', color: INK2, marginTop: 2, marginLeft: 4 },

  /* grouped card (.gcard + .grow) */
  gcard: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', ...SHADOW },
  grow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, paddingHorizontal: 15 },
  gi: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  growB: { fontSize: 14.5, fontWeight: '600', color: INK },
  inlineInput: { fontSize: 14, color: INK, padding: 0, marginTop: 2 },
  saveSmall: { width: 32, height: 32, borderRadius: 10, backgroundColor: PINK, alignItems: 'center', justifyContent: 'center' },

  /* password */
  passInput: { backgroundColor: CREAM, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: INK },
  passBtn: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  passBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  /* suggestion */
  suggestionInput: { backgroundColor: CREAM, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: INK, minHeight: 70 },
  suggestionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#5C6BC0', borderRadius: 10, paddingVertical: 10 },
  suggestionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  /* logout / delete */
  logoutBtn: { backgroundColor: '#fff', borderRadius: 16, height: 50, alignItems: 'center', justifyContent: 'center', ...SHADOW },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#C0392B' },
  deleteBtn: { alignItems: 'center', paddingVertical: 14 },
  deleteText: { fontSize: 12.5, fontWeight: '600', color: INK3 },
});
