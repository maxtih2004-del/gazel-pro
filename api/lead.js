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

    const clip = (v, n) => String(v || '').slice(0, n);
    const type   = clip(body.type || 'Заявка', 60);
    const name   = clip(body.name, 200)  || '—';
    const phone  = clip(body.phone, 100) || '—';
    const fleet  = clip(body.fleet, 60);
    const reason = clip(body.reason, 120);
    const kuzov  = clip(body.body, 60);
    const how    = clip(body.how, 80);
    const source = clip(body.source, 200);

    const isStep1 = type === 'Шаг 1';
    let text;
    if (isStep1) {
      // первый шаг формы: только ответы, без персональных данных
      text = '👣 Ответили на вопросы (шаг 1) — Газель Про';
    } else {
      text = (type === 'Чек-лист' ? '📋 Скачали чек-лист' : '🚚 Заявка на подбор') + ' — Газель Про\n\n' +
             '👤 Имя: ' + name + '\n' +
             '📞 Телефон: ' + phone;
    }

    if (fleet)  text += '\n🚐 Машин сейчас: ' + fleet;
    if (reason) text += '\n🎯 Повод: ' + reason;
    if (kuzov)  text += '\n📦 Кузов: ' + kuzov;
    if (how)    text += '\n🧭 Как оформлять: ' + how;
    if (source) text += '\n\n🔗 Источник: ' + source;

    // фиксируем факт и время согласия на обработку ПД (152-ФЗ); на шаге 1 ПД нет
    if (!isStep1) {
      if (body.consent === true) {
        const ts = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
        text += '\n✅ Согласие на обработку ПД получено ' + ts + ' (МСК)';
      } else {
        text += '\n⚠️ Согласие на обработку ПД НЕ отмечено';
      }
    }

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
