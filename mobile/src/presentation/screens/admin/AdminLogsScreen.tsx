import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { adminApi, AdminEventLog, AdminRequestLog, AdminRouteLog } from '../../../data/api/adminApi';
import { colors } from '../../theme/colors';
import { AdminStackParamList } from './types';

type Nav = NativeStackNavigationProp<AdminStackParamList>;
type Tab = 'errors' | 'http' | 'routes' | 'events';

const TABS: { key: Tab; label: string }[] = [
  { key: 'errors', label: 'Erros' },
  { key: 'http', label: 'HTTP' },
  { key: 'routes', label: 'Por rota' },
  { key: 'events', label: 'Eventos' },
];

const EVENT_LABELS: Record<AdminEventLog['type'], string> = {
  new_user: 'Novo usuário',
  sale: 'Venda registrada',
  premium_on: 'Premium ativado',
  premium_off: 'Premium removido',
  suggestion: 'Nova sugestão',
  pix_request: 'Solicitação PIX',
};

const formatDate = (value: string) => new Date(value).toLocaleString('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

const errorText = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 401 || status === 403) return 'Sua conta não tem acesso aos logs do admin.';
  return 'Não foi possível carregar os logs. Tente atualizar.';
};

export const AdminLogsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('errors');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [hours, setHours] = useState(24);
  const [requestLogs, setRequestLogs] = useState<AdminRequestLog[]>([]);
  const [routeLogs, setRouteLogs] = useState<AdminRouteLog[]>([]);
  const [eventLogs, setEventLogs] = useState<AdminEventLog[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    (async () => {
      try {
        if (tab === 'errors' || tab === 'http') {
          const data = await adminApi.getRequestLogs({ limit: 100, onlyErrors: tab === 'errors', search: debouncedSearch || undefined });
          if (active) setRequestLogs(data);
        } else if (tab === 'routes') {
          const data = await adminApi.getRouteLogs(hours);
          if (active) setRouteLogs(data);
        } else {
          const data = await adminApi.getEventLogs();
          if (active) setEventLogs(data);
        }
      } catch (cause) {
        if (active) setError(errorText(cause));
      } finally {
        if (active) { setLoading(false); setRefreshing(false); }
      }
    })();
    return () => { active = false; };
  }, [tab, debouncedSearch, hours, reloadKey]);

  const refresh = () => { setRefreshing(true); setReloadKey(key => key + 1); };
  const showRequests = tab === 'errors' || tab === 'http';

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.title}>Logs da aplicação</Text>
          <Text style={s.subtitle}>Erros, requisições e eventos</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Atualizar logs" onPress={refresh} hitSlop={10}>
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.tabs}>
          {TABS.map(item => (
            <TouchableOpacity
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected: tab === item.key }}
              onPress={() => { setTab(item.key); setExpandedId(null); }}
              style={[s.tab, tab === item.key && s.tabSelected]}
            >
              <Text style={[s.tabText, tab === item.key && s.tabTextSelected]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {showRequests && (
          <TextInput
            accessibilityLabel="Buscar rota HTTP"
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar rota, ex.: /recipes/"
            placeholderTextColor={colors.textMuted}
            style={s.search}
            autoCapitalize="none"
          />
        )}
        {tab === 'routes' && (
          <View style={s.periods}>
            {([24, 168, 720] as const).map(value => (
              <TouchableOpacity key={value} onPress={() => setHours(value)} style={[s.period, hours === value && s.periodSelected]}>
                <Text style={[s.periodText, hours === value && s.periodTextSelected]}>{value === 24 ? '24 horas' : value === 168 ? '7 dias' : '30 dias'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {loading && !refreshing ? <ActivityIndicator style={s.loading} color={colors.primary} /> : null}
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}

        {!loading && !error && showRequests && (
          <>
            <Text style={s.count}>{requestLogs.length} {tab === 'errors' ? 'erros recentes' : 'requisições recentes'}</Text>
            {requestLogs.length === 0 && <Text style={s.empty}>Nenhum registro encontrado.</Text>}
            {requestLogs.map(log => {
              const expanded = expandedId === log.id;
              const failed = log.statusCode >= 400;
              return (
                <View key={log.id} style={s.card}>
                  <TouchableOpacity accessibilityRole="button" onPress={() => setExpandedId(expanded ? null : log.id)} activeOpacity={0.75}>
                    <View style={s.requestTop}>
                      <Text style={s.method}>{log.method}</Text>
                      <Text style={[s.status, failed && s.failedStatus]}>{log.statusCode}</Text>
                      <Text style={s.duration}>{log.durationMs} ms</Text>
                      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={colors.textMuted} />
                    </View>
                    <Text style={s.path} selectable>{log.path}</Text>
                    <Text style={s.date}>{formatDate(log.ts)}</Text>
                    {failed && !!log.errorMessage && <Text style={s.errorSummary} numberOfLines={expanded ? undefined : 2}>{log.errorMessage}</Text>}
                  </TouchableOpacity>
                  {expanded && (
                    <View style={s.details}>
                      <Detail label="IP" value={log.ip} />
                      <Detail label="E-mail" value={log.bodyEmail} />
                      <Detail label="Erro" value={log.errorMessage} />
                      <Detail label="Parâmetros" value={log.requestBody} />
                      <Detail label="Resposta" value={log.responseBody} />
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {!loading && !error && tab === 'routes' && (
          <>
            <Text style={s.count}>{routeLogs.length} rotas acessadas no período</Text>
            {routeLogs.length === 0 && <Text style={s.empty}>Nenhuma rota encontrada.</Text>}
            {routeLogs.map(log => (
              <View key={`${log.method}:${log.route}`} style={s.card}>
                <View style={s.requestTop}>
                  <Text style={s.method}>{log.method}</Text>
                  <Text style={s.routeCount}>{log.count} acessos</Text>
                </View>
                <Text style={s.path} selectable>{log.route}</Text>
                <Text style={s.date}>{log.err4xx} erros 4xx · {log.err5xx} erros 5xx · média {log.avgDurationMs} ms</Text>
                <Text style={s.date}>Último acesso: {formatDate(log.lastAccess)}</Text>
              </View>
            ))}
          </>
        )}

        {!loading && !error && tab === 'events' && (
          <>
            <Text style={s.count}>{eventLogs.length} eventos recentes</Text>
            {eventLogs.length === 0 && <Text style={s.empty}>Nenhum evento encontrado.</Text>}
            {eventLogs.map((log, index) => (
              <View key={`${log.ts}:${log.type}:${index}`} style={s.card}>
                <Text style={s.eventType}>{EVENT_LABELS[log.type] ?? log.type}</Text>
                <Text style={s.eventTitle}>{log.label || '—'}</Text>
                {!!log.detail && <Text style={s.date}>{log.detail}</Text>}
                <Text style={s.date}>{formatDate(log.ts)}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Detail = ({ label, value }: { label: string; value: string | null }) => {
  if (!value) return null;
  return <View style={s.detailRow}><Text style={s.detailLabel}>{label}</Text><Text selectable style={s.detailValue}>{value}</Text></View>;
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 12, backgroundColor: colors.surface },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  tab: { width: '48%', minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  tabSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '700', color: colors.text },
  tabTextSelected: { color: '#fff' },
  search: { minHeight: 46, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, marginBottom: 12 },
  periods: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  period: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  periodSelected: { borderColor: colors.primary, backgroundColor: colors.pinkBg3 },
  periodText: { fontSize: 13, color: colors.text },
  periodTextSelected: { fontWeight: '700', color: colors.primary },
  loading: { marginTop: 30 },
  error: { color: colors.error, marginVertical: 14, fontSize: 14 },
  count: { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: 32 },
  card: { padding: 14, marginBottom: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  requestTop: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 7 },
  method: { fontSize: 12, fontWeight: '800', color: colors.primary },
  status: { fontSize: 14, fontWeight: '800', color: colors.green },
  failedStatus: { color: colors.error },
  duration: { flex: 1, fontSize: 12, color: colors.textMuted },
  path: { fontSize: 13, color: colors.text, fontWeight: '600', lineHeight: 19 },
  date: { fontSize: 12, color: colors.textSecondary, marginTop: 5 },
  errorSummary: { fontSize: 12, color: colors.error, marginTop: 8, lineHeight: 17 },
  details: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10, gap: 9 },
  detailRow: { gap: 3 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  detailValue: { fontSize: 12, color: colors.text, lineHeight: 18 },
  routeCount: { fontSize: 12, color: colors.textSecondary },
  eventType: { fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 5 },
  eventTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
});
