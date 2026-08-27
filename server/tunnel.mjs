/**
 * Публичный доступ к Video Generator через ngrok — библиотека (@ngrok/ngrok).
 *
 * Запуск: npm run tunnel
 * Требует NGROK_AUTHTOKEN в server/.env
 */
import ngrok from '@ngrok/ngrok';
import dotenv from 'dotenv';

dotenv.config();

// ngrok считает системный http(s)_proxy платной фичей; убираем прокси для туннеля
['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'].forEach(k => delete process.env[k]);

const authtoken = process.env.NGROK_AUTHTOKEN;
const domain = process.env.NGROK_DOMAIN || undefined;
const addr = Number(process.env.PORT || 3001);

if (!authtoken) {
  console.error('\n❌ Не задан NGROK_AUTHTOKEN (добавьте в server/.env).');
  process.exit(1);
}

try {
  const listener = await ngrok.forward({ addr, authtoken, ...(domain ? { domain } : {}) });
  console.log('\n✅ Туннель поднят:');
  console.log('   ' + listener.url());
  console.log(`   → проксирует на http://localhost:${addr}`);
  console.log('\nДержите это окно открытым. Ctrl+C — остановить.\n');
} catch (e) {
  console.error('\n❌ Не удалось поднять туннель:');
  console.error('   ' + (e && e.message ? e.message : String(e)));
  process.exit(1);
}

const keep = setInterval(() => {}, 1 << 30);
const stop = async () => {
  clearInterval(keep);
  try { await ngrok.disconnect(); } catch { /* ignore */ }
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
