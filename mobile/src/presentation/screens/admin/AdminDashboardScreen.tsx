import { colors } from '../../theme/colors';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Platform, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminApi, AdminStats, SubscriptionDashboard, AdminLogEntry } from '../../../data/api/adminApi';
import { AdminStackParamList } from './types';

type Nav = NativeStackNavigationProp<AdminStackParamList>;

const PINK  = colors.primary;
const INK   = colors.text;
const INK2  = colors.textSecondary;
const CREAM = colors.pinkBg3;
const GREEN = '#16A34A';
const RED   = '#DC2626';

const fmtBRL = (n: number) =>
  `R$ ${(n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Retorna a data (YYYY-MM-DD) da segunda-feira da semana ISO daquele dia
function weekStartOf(dateStr: string): string | null {
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const day = d.getDay(); // 0 (dom) .. 6 (sáb)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

// Agrupa o timeseries diário (até 90 pontos, dias sem atividade omitidos) em
// buckets semanais, mantendo só as últimas ~12 semanas — igual em espírito ao
// agrupamento mensal usado no ReportsScreen, mas por semana.
function bucketWeekly(timeseries: { date: string; totalBRL: number }[]): { label: string; value: number }[] {
  const totals = new Map<string, number>();
  for (const point of timeseries) {
    const weekStart = weekStartOf(point.date);
    if (!weekStart) continue;
    totals.set(weekStart, (totals.get(weekStart) ?? 0) + point.totalBRL);
  }
  return Array.from(totals.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([weekStart, value]) => ({
      label: new Date(`${weekStart}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value,
    }));
}

// ── Sino de notificações (mesmo feed de eventos do admin web) ────────────────
const EVENT_CONFIG: Record<AdminLogEntry['type'], {
  icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; label: string;
}> = {
  new_user:    { icon: 'person-add-outline',  color: '#16A34A',       bg: '#F0FDF4', label: 'Novo cadastro' },
  sale:        { icon: 'cart-outline',        color: '#2563EB',       bg: '#EFF6FF', label: 'Nova venda' },
  premium_on:  { icon: 'star',                color: colors.primary,  bg: colors.primaryLight, label: 'Novo premium' },
  premium_off: { icon: 'star-outline',        color: '#6B7280',       bg: '#F3F4F6', label: 'Cancelou premium' },
  suggestion:  { icon: 'chatbubbles-outline', color: '#6366F1',       bg: '#EEF2FF', label: 'Nova sugestão' },
  pix_request: { icon: 'qr-code-outline',     color: '#CA8A04',       bg: '#FEFCE8', label: 'Solicitação PIX' },
};

const NOTIF_LAST_SEEN_KEY = '@docepreco_admin_notif_last_seen';

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<AdminLogEntry[]>([]);
  const [unread, setUnread] = useState(0);
  // null = ainda não carregado do AsyncStorage; '' = carregado, mas nunca visto
  const lastSeenRef = useRef<string | null>(null);
  const [seenAtOpen, setSeenAtOpen] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      if (lastSeenRef.current === null) {
        lastSeenRef.current = (await AsyncStorage.getItem(NOTIF_LAST_SEEN_KEY)) ?? '';
      }
      const data = await adminApi.getLogs(20);
      setLogs(data);
      if (lastSeenRef.current) {
        setUnread(data.filter(l => l.ts > lastSeenRef.current!).length);
      } else {
        setUnread(0);
        if (data.length > 0) {
          lastSeenRef.current = data[0].ts;
          await AsyncStorage.setItem(NOTIF_LAST_SEEN_KEY, data[0].ts);
        }
      }
    } catch { /* silencioso, igual ao web */ }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const handleOpen = () => {
    setSeenAtOpen(lastSeenRef.current || null);
    setOpen(true);
    if (logs.length > 0) {
      lastSeenRef.current = logs[0].ts;
      AsyncStorage.setItem(NOTIF_LAST_SEEN_KEY, logs[0].ts).catch(() => {});
      setUnread(0);
    }
  };

  return (
    <>
      <TouchableOpacity onPress={handleOpen} hitSlop={8} style={bell.btn}>
        <Ionicons name="notifications-outline" size={22} color="rgba(255,255,255,0.9)" />
        {unread > 0 && (
          <View style={bell.badge}>
            <Text style={bell.badgeText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={bell.overlay} onPress={() => setOpen(false)}>
          {/* View (em vez de Pressable) para capturar apenas o toque e não
              bloquear o gesto de arrasto do ScrollView interno no Android.
              onStartShouldSetResponder impede que tocar dentro feche o modal. */}
          <View style={bell.panel} onStartShouldSetResponder={() => true}>
            <View style={bell.panelHeader}>
              <Text style={bell.panelTitle}>Notificações</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }} nestedScrollEnabled showsVerticalScrollIndicator>
              {logs.length === 0 ? (
                <Text style={bell.empty}>Nenhuma notificação</Text>
              ) : (
                logs.map((l, i) => {
                  const cfg = EVENT_CONFIG[l.type] ?? EVENT_CONFIG.new_user;
                  const isNew = seenAtOpen ? l.ts > seenAtOpen : false;
                  return (
                    <View key={`${l.ts}-${i}`} style={[bell.row, isNew && bell.rowNew, i > 0 && bell.rowBorder]}>
                      <View style={[bell.iconWrap, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={bell.rowType}>{cfg.label}</Text>
                        <Text style={bell.rowLabel} numberOfLines={1}>{l.label}</Text>
                        {!!l.detail && <Text style={bell.rowDetail} numberOfLines={1}>{l.detail}</Text>}
                      </View>
                      <Text style={bell.rowTime}>{formatTimeAgo(l.ts)}</Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const bell = StyleSheet.create({
  btn:         { padding: 6 },
  badge:       { position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText:   { color: '#fff', fontSize: 9, fontWeight: '800' },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'flex-end', paddingTop: Platform.OS === 'ios' ? 96 : 72, paddingHorizontal: 16 },
  panel:       { width: 320, maxWidth: '100%', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  panelTitle:  { fontSize: 14, fontWeight: '700', color: colors.text },
  empty:       { textAlign: 'center', color: colors.textMuted, fontSize: 13, paddingVertical: 32 },
  row:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  rowNew:      { backgroundColor: colors.primaryLight + '55' },
  rowBorder:   { borderTopWidth: 1, borderTopColor: colors.border },
  iconWrap:    { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowType:     { fontSize: 10.5, fontWeight: '700', color: colors.textMuted },
  rowLabel:    { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 1 },
  rowDetail:   { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  rowTime:     { fontSize: 10.5, color: colors.textMuted, marginTop: 2 },
});

// ── Stat Hero (big card no topo) ─────────────────────────────────────────────
function HeroStat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={hero.wrap}>
      <Text style={hero.value}>{value}</Text>
      <Text style={hero.label}>{label}</Text>
    </View>
  );
}

const hero = StyleSheet.create({
  wrap:  { alignItems: 'center', flex: 1 },
  value: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  label: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontWeight: '600' },
});

// ── Stat Mini Card ────────────────────────────────────────────────────────────
function MiniCard({ label, value, icon, bg, iconColor }: {
  label: string; value: string | number;
  icon: keyof typeof Ionicons.glyphMap; bg: string; iconColor: string;
}) {
  return (
    <View style={[mini.card, { backgroundColor: bg }]}>
      <View style={[mini.iconWrap, { backgroundColor: iconColor + '22' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={mini.value}>{value}</Text>
      <Text style={mini.label}>{label}</Text>
    </View>
  );
}

const mini = StyleSheet.create({
  card:     { flex: 1, borderRadius: 16, padding: 14, gap: 8 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  value:    { fontSize: 20, fontWeight: '800', color: INK },
  label:    { fontSize: 11, color: INK2, fontWeight: '600' },
});

// ── Nav Tile ─────────────────────────────────────────────────────────────────
function NavTile({ icon, label, sub, badge, color, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; sub: string;
  badge?: number; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ flex: 1 }}>
      <View style={[tile.card, { borderTopColor: color, borderTopWidth: 3 }]}>
        <View style={[tile.iconWrap, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon} size={22} color={color} />
          {!!badge && (
            <View style={tile.badge}>
              <Text style={tile.badgeText}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          )}
        </View>
        <Text style={tile.label}>{label}</Text>
        <Text style={tile.sub} numberOfLines={1}>{sub}</Text>
      </View>
    </TouchableOpacity>
  );
}

const tile = StyleSheet.create({
  card:      { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 6, borderWidth: 1, borderColor: colors.border, minHeight: 100 },
  iconWrap:  { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  label:     { fontSize: 14, fontWeight: '700', color: INK },
  sub:       { fontSize: 11, color: INK2 },
  badge:     { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: PINK, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});

// ── Main ─────────────────────────────────────────────────────────────────────
interface Props { onLogout: () => void; }

export const AdminDashboardScreen: React.FC<Props> = ({ onLogout }) => {
  const navigation = useNavigation<Nav>();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [subDash, setSubDash] = useState<SubscriptionDashboard | null>(null);
  const [installedPlatforms, setInstalledPlatforms] = useState({ ios: 0, android: 0, unknown: 0 });
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Stats, subDash e unread são independentes: uma falha não pode zerar as outras
    try {
      const s = await adminApi.getStats();
      setStats(s);
      setError(null);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        setError('Acesso negado ao admin (verifique o ADMIN_SECRET).');
      } else {
        setError(e?.response?.data?.error || e?.message || 'Falha ao carregar dados do admin.');
      }
    }
    try {
      setSubDash(await adminApi.getSubscriptionDashboard());
    } catch {}
    try {
      const users = await adminApi.listUsers();
      setInstalledPlatforms({
        ios: users.filter(user => user.signupPlatform === 'ios').length,
        android: users.filter(user => user.signupPlatform === 'android').length,
        unknown: users.filter(user => !user.signupPlatform).length,
      });
    } catch {}
    try {
      setUnread(await adminApi.getUnreadCount());
    } catch {}
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const premiumPct = stats && stats.totalUsers > 0
    ? Math.round((stats.premiumUsers / stats.totalUsers) * 100)
    : 0;

  const weeklyRevenue = useMemo(() => bucketWeekly(subDash?.timeseries ?? []), [subDash]);
  const maxWeeklyRevenue = Math.max(...weeklyRevenue.map(w => w.value), 1);
  const momPositive = (subDash?.overview.momGrowth ?? 0) >= 0;

  return (
    <SafeAreaView style={st.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        {/* ── Gradient Header ── */}
        <LinearGradient colors={['#E91E8C', '#C2185B']} style={st.gradient}>
          {/* top row */}
          <View style={st.headerRow}>
            <View style={st.shieldWrap}>
              <Ionicons name="shield-checkmark" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.headerTitle}>Painel Admin</Text>
              <Text style={st.headerSub}>Doce Preço</Text>
            </View>
            <NotificationBell />
            <TouchableOpacity onPress={onLogout} hitSlop={8} style={st.logoutBtn}>
              <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>

          {/* Hero stats row */}
          {loading ? (
            <ActivityIndicator color="#fff" style={{ marginVertical: 24 }} />
          ) : (
            <View style={st.heroRow}>
              <HeroStat value={stats?.totalUsers ?? 0} label="Usuários" />
              <View style={st.heroDivider} />
              <HeroStat value={stats?.premiumUsers ?? 0} label="Premium" />
              <View style={st.heroDivider} />
              <HeroStat value={`${premiumPct}%`} label="Conversão" />
            </View>
          )}
        </LinearGradient>

        {/* ── Erro ── */}
        {!loading && error && (
          <View style={st.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
            <Text style={st.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Mini stats ── */}
        {!loading && (
          <View style={st.miniRow}>
            <MiniCard
              label="Hoje" value={stats?.newUsersToday ?? 0}
              icon="person-add-outline" bg="#F0FDF4" iconColor="#16A34A"
            />
            <MiniCard
              label="Esta semana" value={stats?.newUsersWeek ?? 0}
              icon="trending-up-outline" bg="#EFF6FF" iconColor={colors.indigo}
            />
            <MiniCard
              label="Este mês" value={stats?.newUsersMonth ?? 0}
              icon="calendar-outline" bg="#FFF7ED" iconColor="#EA580C"
            />
          </View>
        )}

        {/* ── Instalações do app ── */}
        {!loading && (
          <>
            <Text style={st.sectionLabel}>Instalações do app</Text>
            <View style={st.miniRow}>
              <MiniCard
                label="iOS" value={installedPlatforms.ios}
                icon="logo-apple" bg="#F3F4F6" iconColor="#111827"
              />
              <MiniCard
                label="Android" value={installedPlatforms.android}
                icon="logo-google-playstore" bg="#F0FDF4" iconColor="#16A34A"
              />
              <MiniCard
                label="Não identificado" value={installedPlatforms.unknown}
                icon="help-circle-outline" bg="#FFF7ED" iconColor="#EA580C"
              />
            </View>
          </>
        )}

        {/* ── Assinaturas: MRR/ARR/MoM ── */}
        {!loading && subDash && (
          <>
            <Text style={st.sectionLabel}>Assinaturas</Text>
            <View style={st.miniRow}>
              <MiniCard
                label="MRR" value={fmtBRL(subDash.overview.mrr)}
                icon="cash-outline" bg="#F5F3FF" iconColor={colors.purple}
              />
              <MiniCard
                label="ARR" value={fmtBRL(subDash.overview.arr)}
                icon="trending-up-outline" bg="#EFF6FF" iconColor={colors.indigo}
              />
              <MiniCard
                label="Cresc. mensal"
                value={`${momPositive ? '+' : ''}${(subDash.overview.momGrowth ?? 0).toFixed(1)}%`}
                icon={momPositive ? 'arrow-up' : 'arrow-down'}
                bg={momPositive ? '#F0FDF4' : '#FEF2F2'}
                iconColor={momPositive ? GREEN : RED}
              />
            </View>

            {/* Assinantes */}
            <View style={st.miniRow}>
              <MiniCard
                label="Ativos" value={subDash.overview.activeSubscribers}
                icon="checkmark-circle-outline" bg="#F0FDF4" iconColor={GREEN}
              />
              <MiniCard
                label="Expirando (7d)" value={subDash.overview.expiringSubscribers}
                icon="alert-circle-outline" bg="#FFFBEB" iconColor="#D97706"
              />
              <MiniCard
                label="Expirados" value={subDash.overview.expiredSubscribers}
                icon="close-circle-outline" bg="#FEF2F2" iconColor={RED}
              />
            </View>

            {/* Gráfico de receita semanal */}
            {weeklyRevenue.length > 0 && (
              <>
                <Text style={st.sectionLabel}>Receita ({weeklyRevenue.length} semanas)</Text>
                <View style={st.chartCard}>
                  <View style={st.chartContainer}>
                    {weeklyRevenue.map((week, idx) => {
                      const barHeight = Math.max((week.value / maxWeeklyRevenue) * 100, 6);
                      const isLast = idx === weeklyRevenue.length - 1;
                      return (
                        <View key={idx} style={st.barColumn}>
                          <View style={st.barTrack}>
                            {isLast ? (
                              <LinearGradient
                                colors={[colors.pinkBright, PINK, colors.primaryDark]}
                                style={[st.bar, { height: `${barHeight}%` }]}
                              />
                            ) : (
                              <View style={[st.bar, { height: `${barHeight}%`, backgroundColor: colors.pinkBg }]} />
                            )}
                          </View>
                          <Text style={st.barLabel}>{week.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            {/* Detalhamento por plataforma */}
            {subDash.byPlatform.length > 0 && (
              <>
                <Text style={st.sectionLabel}>Por plataforma</Text>
                <View style={st.listCard}>
                  {subDash.byPlatform.map((p, i) => (
                    <React.Fragment key={p.platform || i}>
                      {i > 0 && <View style={st.divider} />}
                      <View style={st.userRow}>
                        <View style={st.avatar}>
                          <Ionicons
                            name={
                              p.platform === 'ios' ? 'logo-apple'
                                : p.platform === 'android' ? 'logo-google-playstore'
                                : 'phone-portrait-outline'
                            }
                            size={18} color={PINK}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={st.userName} numberOfLines={1}>{p.platform || 'Desconhecido'}</Text>
                          <Text style={st.userEmail}>{p.subscriberCount} assinantes</Text>
                        </View>
                        <Text style={st.revenueText}>{fmtBRL(p.totalBRL)}</Text>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {/* ── Nav tiles ── */}
        <Text style={st.sectionLabel}>Gerenciar</Text>
        <View style={st.tilesRow}>
          <NavTile
            icon="people-outline" label="Usuários"
            sub={`${stats?.totalUsers ?? '—'} cadastrados`}
            color="#6366F1"
            onPress={() => navigation.navigate('AdminUsers')}
          />
          <NavTile
            icon="qr-code-outline" label="PIX"
            sub="Aprovar pagamentos"
            color="#16A34A"
            onPress={() => navigation.navigate('AdminPix')}
          />
        </View>
        <View style={[st.tilesRow, { marginTop: 10 }]}>
          <NavTile
            icon="chatbubbles-outline" label="Suporte"
            sub="Conversas abertas"
            color={PINK} badge={unread}
            onPress={() => navigation.navigate('AdminSupport')}
          />
          <NavTile
            icon="megaphone-outline" label="Banners"
            sub="Avisos no app"
            color="#F59E0B"
            onPress={() => navigation.navigate('AdminBanners')}
          />
        </View>
        <View style={[st.tilesRow, { marginTop: 10 }]}>
          <NavTile
            icon="notifications-outline" label="Notificações"
            sub="Push para usuários"
            color="#0EA5E9"
            onPress={() => navigation.navigate('AdminNotifications')}
          />
          <NavTile
            icon="pricetag-outline" label="Cupons"
            sub="Descontos promocionais"
            color={colors.purple}
            onPress={() => navigation.navigate('AdminCoupons')}
          />
        </View>

        {/* ── Últimos cadastros ── */}
        {(stats?.recentUsers?.length ?? 0) > 0 && (
          <>
            <Text style={st.sectionLabel}>Últimos cadastros</Text>
            <View style={st.listCard}>
              {stats!.recentUsers.map((u, i) => (
                <React.Fragment key={u.id}>
                  {i > 0 && <View style={st.divider} />}
                  <TouchableOpacity
                    onPress={() => navigation.navigate('AdminUserDetail', { userId: u.id })}
                    activeOpacity={0.75}
                    style={st.userRow}
                  >
                    <View style={st.avatar}>
                      <Text style={st.avatarText}>{(u.companyName?.[0] ?? '?').toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.userName} numberOfLines={1}>{u.companyName}</Text>
                      <Text style={st.userEmail} numberOfLines={1}>{u.email}</Text>
                    </View>
                    {u.isPremium
                      ? <View style={st.premiumBadge}><Text style={st.premiumText}>PRO</Text></View>
                      : <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    }
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </>
        )}

        {/* ── Top por receita ── */}
        {(stats?.topByRevenue?.length ?? 0) > 0 && (
          <>
            <Text style={st.sectionLabel}>Top receita (usuários)</Text>
            <View style={st.listCard}>
              {stats!.topByRevenue.slice(0, 5).map((u, i) => (
                <React.Fragment key={u.id}>
                  {i > 0 && <View style={st.divider} />}
                  <TouchableOpacity
                    onPress={() => navigation.navigate('AdminUserDetail', { userId: u.id })}
                    activeOpacity={0.75}
                    style={st.userRow}
                  >
                    <View style={[st.rankBadge]}>
                      <Text style={st.rankText}>#{i + 1}</Text>
                    </View>
                    <Text style={[st.userName, { flex: 1 }]} numberOfLines={1}>{u.companyName}</Text>
                    <Text style={st.revenueText}>
                      R$ {u.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  // gradient header
  gradient:    { paddingTop: Platform.OS === 'ios' ? 8 : 16, paddingBottom: 28, paddingHorizontal: 20 },
  headerRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  shieldWrap:  { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  logoutBtn:   { padding: 6 },
  heroRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18, paddingVertical: 20, paddingHorizontal: 8 },
  heroDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.25)' },

  // erro
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginHorizontal: 16, marginTop: 14 },
  errorText:   { flex: 1, fontSize: 12.5, color: '#B91C1C', fontWeight: '600' },

  // mini stats
  miniRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 14, marginBottom: 4 },

  // tiles
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: INK2, marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  tilesRow:     { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },

  // list card
  listCard:  { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 4 },
  divider:   { height: 1, backgroundColor: colors.border, marginLeft: 64 },
  userRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, gap: 12 },
  avatar:    { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText:{ fontSize: 15, fontWeight: '800', color: PINK },
  userName:  { fontSize: 14, fontWeight: '700', color: INK },
  userEmail: { fontSize: 11, color: INK2, marginTop: 1 },
  premiumBadge: { backgroundColor: PINK, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  premiumText:  { color: '#fff', fontSize: 10, fontWeight: '800' },
  rankBadge:    { width: 28, height: 28, borderRadius: 8, backgroundColor: '#F5F0FF', alignItems: 'center', justifyContent: 'center' },
  rankText:     { fontSize: 12, fontWeight: '800', color: colors.purple },
  revenueText:  { fontSize: 13, fontWeight: '700', color: '#16A34A' },

  // weekly revenue chart (mesmo padrão do ReportsScreen)
  chartCard:      { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 4 },
  chartContainer: { flexDirection: 'row', height: 140, alignItems: 'flex-end', gap: 4 },
  barColumn:      { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barTrack:       { flex: 1, width: '70%', justifyContent: 'flex-end', alignItems: 'center' },
  bar:            { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barLabel:       { fontSize: 9, color: INK2, marginTop: 6 },
});
