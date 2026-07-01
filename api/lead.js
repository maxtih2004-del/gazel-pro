// Vercel serverless function: принимает заявку с лендинга и шлёт её в Telegram.
// Токен бота и chat_id живут на сервере и в браузер НЕ попадают.
// По умолчанию берутся из переменных окружения Vercel (BOT_TOKEN / CHAT_ID),
// с запасным значением ниже — чтобы работало сразу, без настройки.
const BOT_TOKEN = process.env.BOT_TOKEN || '8236755512:AAFI0oGrGQAvSHbIdRlXPm0B67CUC4LbpQA';
const CHAT_ID   = process.env.CHAT_ID   || '964349873';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    // honeypot: если бот заполнил скрытое поле — делаем вид, что всё ок, но не шлём
    if (body['bot-field']) {
      res.status(200).json({ ok: true });
      return;
    }

    const name   = String(body.name   || '—').slice(0, 200);
    const phone  = String(body.phone  || '—').slice(0, 100);
    const timing = String(body.timing || '—').slice(0, 100);

    const text =
      '🚚 Новая заявка — Газель Про\n\n' +
      '👤 Имя: ' + name + '\n' +
      '📞 Телефон: ' + phone + '\n' +
      '🗓 Когда нужна: ' + timing;

    const tg = await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text })
    });
    const data = await tg.json();

    if (!data.ok) {
      res.status(502).json({ ok: false, error: 'telegram_failed' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'server_error' });
  }
};
