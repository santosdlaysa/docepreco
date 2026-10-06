import { createDemoDb, DemoDb } from './demoData';

/**
 * Modo demonstração (igual ao do app: mobile/src/data/demo/demoMode.ts).
 * Fica no sessionStorage: some ao fechar a aba e nunca se mistura com uma conta real.
 */
const FLAG_KEY = 'docepreco_demo';
const DB_KEY = 'docepreco_demo_db';
/** Pedido para abrir a tela de cadastro depois de sair da demonstração. */
export const OPEN_REGISTER_KEY = 'docepreco_open_register';
/** Evento disparado quando uma ação é bloqueada na demonstração (UserApp mostra o convite). */
export const DEMO_BLOCKED_EVENT = 'docepreco-demo-blocked';

const read = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => {
  try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch { /* ignora */ }
};

let db: DemoDb | null = null;

export const isDemoMode = (): boolean => read(FLAG_KEY) === '1';

export function enterDemo(): void {
  db = createDemoDb();
  write(FLAG_KEY, '1');
  saveDemoDb();
}

export function exitDemo(openRegister = false): void {
  db = null;
  write(FLAG_KEY, null);
  write(DB_KEY, null);
  if (openRegister) write(OPEN_REGISTER_KEY, '1');
}

/** Há pedido de abrir o cadastro (vindo de "Criar conta grátis" na demonstração)? */
export function wantsOpenRegister(): boolean {
  return read(OPEN_REGISTER_KEY) === '1';
}

/**
 * Limpa o pedido. Separado da leitura de propósito: ler e limpar no
 * inicializador do useState quebra no StrictMode (o React monta duas vezes e a
 * segunda montagem já não encontrava o pedido → abria o login).
 */
export function clearOpenRegister(): void {
  write(OPEN_REGISTER_KEY, null);
}

export function getDemoDb(): DemoDb {
  if (!db) {
    const raw = read(DB_KEY);
    try { db = raw ? (JSON.parse(raw) as DemoDb) : createDemoDb(); } catch { db = createDemoDb(); }
  }
  return db;
}

export function saveDemoDb(): void {
  if (db) write(DB_KEY, JSON.stringify(db));
}
