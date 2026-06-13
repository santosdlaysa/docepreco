// Telegram bot que repassa mensagens para o Claude Code CLI
// Uso: TELEGRAM_BOT_TOKEN=xxx ALLOWED_CHAT_IDS=123456 node telegram-bot.js

const { spawn } = require('child_process');
const path = require('path');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_IDS = new Set(
  (process.env.ALLOWED_CHAT_IDS || '').split(',').map(Number).filter(Boolean)
);
const PROJECT_DIR = path.resolve(__dirname);
const TIMEOUT_MS = 5 * 60 * 1000;

async function getUpdates(offset) {
  const url = `https://api.telegram.org/bot${TOKEN}/getUpdates?timeout=30${offset != null ? `&offset=${offset}` : ''}`;
  const res = await fetch(url);
  return res.json();
}

async function sendMessage(chatId, text) {
  for (let i = 0; i < text.length; i += 4000) {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(i, i + 4000) }),
    });
  }
}

function runClaude(prompt) {
  return new Promise((resolve) => {
    let output = '';
    const proc = spawn('claude', ['-p', prompt, '--dangerously-skip-permissions'], {
      cwd: PROJECT_DIR,
      shell: true,
    });
    proc.stdout.on('data', (d) => { output += d.toString(); });
    proc.stderr.on('data', (d) => { output += d.toString(); });
    proc.on('close', () => resolve(output.trim() || 'Sem saida.'));
    setTimeout(() => { proc.kill(); resolve('Timeout: operacao demorou mais de 5 minutos.'); }, TIMEOUT_MS);
  });
}

async function main() {
  if (!TOKEN) {
    console.error('Erro: defina TELEGRAM_BOT_TOKEN no ambiente.');
    process.exit(1);
  }
  if (ALLOWED_IDS.size === 0) {
    console.warn('Aviso: ALLOWED_CHAT_IDS nao definido — qualquer pessoa pode usar o bot!');
  }

  console.log('Bot iniciado. Aguardando mensagens...');
  let offset;

  while (true) {
    try {
      const data = await getUpdates(offset);
      for (const update of data.result || []) {
        offset = update.update_id + 1;
        const msg = update.message;
        if (!msg?.text || msg.text.startsWith('/start')) continue;

        const chatId = msg.chat.id;
        if (ALLOWED_IDS.size > 0 && !ALLOWED_IDS.has(chatId)) {
          await sendMessage(chatId, 'Acesso nao autorizado.');
          continue;
        }

        console.log(`[${chatId}] ${msg.text}`);
        await sendMessage(chatId, 'Executando...');
        const result = await runClaude(msg.text);
        await sendMessage(chatId, result);
      }
    } catch (err) {
      console.error('Erro no polling:', err.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

main();
