import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  action?: ToastAction;
  /** Called when the toast disappears without the action being triggered. */
  onDismiss?: () => void;
}

interface ToastContextData {
  showToast: (message: string, typeOrOptions?: ToastType | ToastOptions) => void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export const useToast = () => useContext(ToastContext);

const ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  warning: 'warning',
  info: 'information-circle',
};

const BG: Record<ToastType, string> = {
  success: colors.success,
  error: colors.error,
  warning: colors.warning,
  info: colors.primary,
};

const DEFAULT_DURATION = 3000;
const UNDO_DURATION = 5000;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('success');
  const [visible, setVisible] = useState(false);
  const [action, setAction] = useState<ToastAction | null>(null);
  const translateY = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissCallback = useRef<(() => void) | null>(null);
  const actionTriggered = useRef(false);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 120, duration: 280, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      // Se não houve clique na ação, dispara o onDismiss (pra confirmar a exclusão, por ex.)
      if (!actionTriggered.current && dismissCallback.current) {
        dismissCallback.current();
      }
      dismissCallback.current = null;
      actionTriggered.current = false;
      setAction(null);
    });
  }, [opacity, translateY]);

  const showToast = useCallback(
    (msg: string, typeOrOptions?: ToastType | ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);

      // dispara o dismiss do toast anterior antes de trocar, se houver
      if (visible && !actionTriggered.current && dismissCallback.current) {
        dismissCallback.current();
        dismissCallback.current = null;
      }

      const options: ToastOptions =
        typeof typeOrOptions === 'string' || typeOrOptions === undefined
          ? { type: typeOrOptions }
          : typeOrOptions;

      const toastType = options.type ?? 'success';
      const duration =
        options.duration ?? (options.action ? UNDO_DURATION : DEFAULT_DURATION);

      setMessage(msg);
      setType(toastType);
      setAction(options.action ?? null);
      dismissCallback.current = options.onDismiss ?? null;
      actionTriggered.current = false;
      setVisible(true);

      translateY.setValue(120);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      timer.current = setTimeout(hide, duration);
    },
    [hide, opacity, translateY, visible]
  );

  const handleActionPress = () => {
    if (!action) return;
    actionTriggered.current = true;
    action.onPress();
    if (timer.current) clearTimeout(timer.current);
    hide();
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: BG[type] },
            { transform: [{ translateY }], opacity },
          ]}
        >
          <Ionicons name={ICONS[type]} size={22} color="#fff" />
          <Text style={styles.text}>{message}</Text>
          {action && (
            <TouchableOpacity
              onPress={handleActionPress}
              style={styles.actionButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.actionText}>{action.label.toUpperCase()}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 96,
    left: 20,
    right: 20,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 9999,
  },
  text: {
    ...typography.body,
    color: '#fff',
    flex: 1,
    fontWeight: '600',
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
