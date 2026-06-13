import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Auto-saves form state to AsyncStorage with debounce.
 * On mount, loads any saved draft.
 * Use clearDraft() when the form is successfully submitted.
 */
export function useDraft<T>(key: string, enabled: boolean) {
  const [draft, setDraft] = useState<T | null>(null);
  const [isDraftLoading, setIsDraftLoading] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsDraftLoading(false);
      return;
    }
    AsyncStorage.getItem(key)
      .then(raw => {
        if (raw) {
          try { setDraft(JSON.parse(raw)); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setIsDraftLoading(false));
  }, [key, enabled]);

  const saveDraft = useCallback((state: T) => {
    if (!enabled) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(key, JSON.stringify(state)).catch(() => {});
    }, 800);
  }, [key, enabled]);

  const clearDraft = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    AsyncStorage.removeItem(key).catch(() => {});
    setDraft(null);
  }, [key]);

  return { draft, isDraftLoading, saveDraft, clearDraft };
}
