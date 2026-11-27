const listeners = new Set<() => void>();

export function subscribeToSalesChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function notifySalesChanges() {
  listeners.forEach(listener => listener());
}
