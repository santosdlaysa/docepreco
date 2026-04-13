import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import { pushTokenApi } from '../../data/api/pushTokenApi';
import { tipApi } from '../../data/api/tipApi';
import { notificationTemplateApi, NotificationTemplate } from '../../data/api/notificationTemplateApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoTipApi, demoNotificationTemplateApi } from '../../data/demo/demoApi';

const LAST_OPEN_KEY = '@docepreco:lastAppOpen';
const NOTIFICATIONS_ENABLED_KEY = '@docepreco:notificationsEnabled';

const FALLBACK_TIPS = [
  'Dica: revise seus preços a cada 15 dias para acompanhar a variacao dos ingredientes!',
  'Voce sabia? Embalar bem seus doces pode aumentar o valor percebido em ate 30%!',
  'Lembre-se: seu tempo tambem e um ingrediente! Nao esqueca de incluir a mao de obra.',
  'Precificar corretamente e o primeiro passo para um negocio lucrativo. Voce esta no caminho certo!',
];

const FALLBACK_TEMPLATES: Record<string, { title: string; body: string }> = {
  inactivity_2d: { title: 'Sentimos sua falta! 🧁', body: 'Suas receitas estao te esperando! Abra o DocePreco e confira seus calculos.' },
  inactivity_5d: { title: 'Faz tempo! 🍰', body: 'Faz tempo que voce nao aparece! Seus doces precisam de precos atualizados.' },
  daily_sales: { title: 'Hora do registro! 📝', body: 'Ja registrou as vendas de hoje? Mantenha seu controle em dia!' },
  weekly_reminder: { title: 'Começo de semana! 📊', body: 'Confira se os precos dos ingredientes mudaram. Manter tudo atualizado é o segredo!' },
};

async function fetchTemplates(): Promise<Map<string, NotificationTemplate>> {
  try {
    const api = isDemoMode() ? demoNotificationTemplateApi : notificationTemplateApi;
    const templates = await api.getActive();
    const map = new Map<string, NotificationTemplate>();
    for (const t of templates) {
      map.set(t.slug, t);
    }
    return map;
  } catch {
    // Offline — return empty map (will use fallback)
    return new Map();
  }
}

function getTemplate(
  templates: Map<string, NotificationTemplate>,
  slug: string
): { title: string; body: string; active: boolean } {
  const t = templates.get(slug);
  if (t) return { title: t.title, body: t.body, active: true };
  const fallback = FALLBACK_TEMPLATES[slug];
  if (fallback) return { title: fallback.title, body: fallback.body, active: true };
  return { title: '', body: '', active: false };
}

async function fetchRandomTip(): Promise<string> {
  try {
    const api = isDemoMode() ? demoTipApi : tipApi;
    const tips = await api.getActive();
    if (tips.length > 0) {
      return tips[Math.floor(Math.random() * tips.length)].message;
    }
  } catch {
    // Offline ou erro — usa fallback
  }
  return FALLBACK_TIPS[Math.floor(Math.random() * FALLBACK_TIPS.length)];
}

export async function getNotificationsEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  // Habilitado por padrao (null = nunca definido = habilitado)
  return stored !== '0';
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? '1' : '0');
  if (enabled) {
    await scheduleAllNotifications();
  } else {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function trackAppOpen(): Promise<void> {
  await AsyncStorage.setItem(LAST_OPEN_KEY, String(Date.now()));
}

async function scheduleInactivityNotifications(templates: Map<string, NotificationTemplate>): Promise<void> {
  // 2 dias de inatividade
  const t2d = getTemplate(templates, 'inactivity_2d');
  if (t2d.active) {
    await Notifications.scheduleNotificationAsync({
      content: { title: t2d.title, body: t2d.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 48 * 60 * 60,
      },
    });
  }

  // 5 dias de inatividade
  const t5d = getTemplate(templates, 'inactivity_5d');
  if (t5d.active) {
    await Notifications.scheduleNotificationAsync({
      content: { title: t5d.title, body: t5d.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 120 * 60 * 60,
      },
    });
  }
}

function getNextWeekday(targetDay: number, targetHour: number, targetMinute: number): Date {
  const now = new Date();
  const result = new Date(now);
  result.setHours(targetHour, targetMinute, 0, 0);

  // Avanca para o proximo dia da semana desejado
  const currentDay = now.getDay();
  let daysUntil = targetDay - currentDay;
  if (daysUntil < 0 || (daysUntil === 0 && now >= result)) {
    daysUntil += 7;
  }
  result.setDate(result.getDate() + daysUntil);
  return result;
}

async function scheduleRecurringNotifications(templates: Map<string, NotificationTemplate>): Promise<void> {
  // Lembrete de vendas - todo dia as 19h
  const daily = getTemplate(templates, 'daily_sales');
  if (daily.active) {
    await Notifications.scheduleNotificationAsync({
      content: { title: daily.title, body: daily.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 19,
        minute: 0,
      },
    });
  }

  // Lembrete semanal - toda segunda as 9h
  const weekly = getTemplate(templates, 'weekly_reminder');
  if (weekly.active) {
    await Notifications.scheduleNotificationAsync({
      content: { title: weekly.title, body: weekly.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 2, // Segunda-feira (1=Domingo, 2=Segunda, ...)
        hour: 9,
        minute: 0,
      },
    });
  }
}

async function scheduleMotivationalTip(): Promise<void> {
  // Dica motivacional a cada 3 dias
  const tip = await fetchRandomTip();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Dica DocePreco 💡',
      body: tip,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3 * 24 * 60 * 60,
    },
  });
}

async function scheduleAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const templates = await fetchTemplates();
  await scheduleInactivityNotifications(templates);
  await scheduleRecurringNotifications(templates);
  await scheduleMotivationalTip();

  if (__DEV__) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`[Notifications] ${scheduled.length} notificacoes agendadas`);
  }
}

export async function registerPushToken(): Promise<void> {
  try {
    const granted = await requestPermissions();
    if (!granted) return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await pushTokenApi.register(token, Platform.OS);
    if (__DEV__) {
      console.log('[Notifications] Push token registrado:', token);
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[Notifications] Falha ao registrar push token:', err);
    }
  }
}

export async function initializeNotifications(): Promise<void> {
  try {
    // Configura como as notificacoes aparecem quando o app esta em primeiro plano
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Configura canal Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'DocePreco',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    // Listener: quando o usuário toca na notificação
    Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.url && typeof data.url === 'string') {
        Linking.openURL(data.url).catch(() => {});
      }
    });

    // Registrar push token no backend (pode falhar se usuario nao estiver logado)
    await registerPushToken();

    const enabled = await getNotificationsEnabled();
    if (!enabled) return;

    await trackAppOpen();
    await scheduleAllNotifications();
  } catch {
    // Silencioso — nunca quebrar o app por causa de notificacoes
  }
}

export async function onAppForeground(): Promise<void> {
  try {
    // Re-registra push token (garante que esta atualizado no backend)
    await registerPushToken();

    const enabled = await getNotificationsEnabled();
    if (!enabled) return;

    await trackAppOpen();
    await scheduleAllNotifications();
  } catch {
    // silencioso
  }
}
