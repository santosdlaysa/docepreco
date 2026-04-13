import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import { pushTokenApi } from '../../data/api/pushTokenApi';
import { tipApi } from '../../data/api/tipApi';
import { isDemoMode } from '../../data/demo/demoMode';
import { demoTipApi } from '../../data/demo/demoApi';

const LAST_OPEN_KEY = '@docepreco:lastAppOpen';
const NOTIFICATIONS_ENABLED_KEY = '@docepreco:notificationsEnabled';

const FALLBACK_TIPS = [
  'Dica: revise seus preços a cada 15 dias para acompanhar a variacao dos ingredientes!',
  'Voce sabia? Embalar bem seus doces pode aumentar o valor percebido em ate 30%!',
  'Lembre-se: seu tempo tambem e um ingrediente! Nao esqueca de incluir a mao de obra.',
  'Precificar corretamente e o primeiro passo para um negocio lucrativo. Voce esta no caminho certo!',
];

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

async function scheduleInactivityNotifications(): Promise<void> {
  // 2 dias de inatividade
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Sentimos sua falta! 🧁',
      body: 'Suas receitas estao te esperando! Abra o DocePreco e confira seus calculos.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 48 * 60 * 60,
    },
  });

  // 5 dias de inatividade
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Faz tempo! 🍰',
      body: 'Faz tempo que voce nao aparece! Seus doces precisam de precos atualizados.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 120 * 60 * 60,
    },
  });
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

async function scheduleRecurringNotifications(): Promise<void> {
  // Lembrete de vendas - todo dia as 19h
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Hora do registro! 📝',
      body: 'Ja registrou as vendas de hoje? Mantenha seu controle em dia!',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 19,
      minute: 0,
    },
  });

  // Lembrete semanal - toda segunda as 9h
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Começo de semana! 📊',
      body: 'Confira se os precos dos ingredientes mudaram. Manter tudo atualizado é o segredo!',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 2, // Segunda-feira (1=Domingo, 2=Segunda, ...)
      hour: 9,
      minute: 0,
    },
  });
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
  await scheduleInactivityNotifications();
  await scheduleRecurringNotifications();
  await scheduleMotivationalTip();

  if (__DEV__) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`[Notifications] ${scheduled.length} notificacoes agendadas`);
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

    const granted = await requestPermissions();
    if (!granted) return;

    // Registrar push token no backend
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (projectId) {
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        await pushTokenApi.register(token, Platform.OS);
      }
    } catch {
      // Silencioso — registro de token não deve impedir o fluxo
    }

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
    const enabled = await getNotificationsEnabled();
    if (!enabled) return;

    await trackAppOpen();
    await scheduleAllNotifications();
  } catch {
    // silencioso
  }
}
