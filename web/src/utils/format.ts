export const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Aguardando', color: '#D97706', bg: '#FEF3C7' },
  in_progress: { label: 'Em produção', color: '#7C3AED', bg: '#EDE9FE' },
  done:        { label: 'Saiu para entrega', color: '#7C3AED', bg: '#EDE9FE' },
  delivered:   { label: 'Entregue',   color: '#059669', bg: '#D1FAE5' },
  cancelled:   { label: 'Cancelado',  color: '#DC2626', bg: '#FEE2E2' },
};
