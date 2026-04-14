import { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

/* ── Skeleton ──────────────────────────────────────────────────────────── */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Toast System ──────────────────────────────────────────────────────── */

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'warning';
  text: string;
}

let toastId = 0;

export interface ToastFn {
  (text: string): void;
  success: (text: string) => void;
  error: (text: string) => void;
  warning: (text: string) => void;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastMessage['type'], text: string) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const toast = useCallback(((text: string) => addToast('success', text)) as ToastFn, [addToast]);
  toast.success = (text: string) => addToast('success', text);
  toast.error = (text: string) => addToast('error', text);
  toast.warning = (text: string) => addToast('warning', text);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, toast, removeToast };
}

const TOAST_ICON = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
} as const;

const TOAST_STYLES = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
} as const;

export function ToastContainer({ toasts, onRemove }: { toasts: ToastMessage[]; onRemove: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
      {toasts.map(t => {
        const Icon = TOAST_ICON[t.type];
        return (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg animate-slide-up ${TOAST_STYLES[t.type]}`}
          >
            <Icon size={18} className="shrink-0" />
            <span className="text-sm font-medium flex-1">{t.text}</span>
            <button onClick={() => onRemove(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ── Confirm Modal ─────────────────────────────────────────────────────── */

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: 'red' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ open, title, message, confirmLabel = 'Confirmar', confirmColor = 'red', onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null;

  const btnClass = confirmColor === 'red'
    ? 'bg-red-500 hover:bg-red-600 text-white'
    : 'bg-primary-500 hover:bg-primary-600 text-white';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4 animate-fade-in" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
        <p className="text-sm text-gray-600 mt-2">{message}</p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="text-sm px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${btnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Animated Modal Wrapper ────────────────────────────────────────────── */

export function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 md:p-4 animate-fade-in" onClick={onClose}>
      <div className="animate-scale-in w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/* ── Page Transition ───────────────────────────────────────────────────── */

export function PageTransition({ children, pageKey }: { children: React.ReactNode; pageKey: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, [pageKey]);

  return (
    <div className={`transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {children}
    </div>
  );
}
