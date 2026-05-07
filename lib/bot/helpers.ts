import { createClient } from '@supabase/supabase-js';

export function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!
  );
}

export function formatPrice(price: number): string {
  return `${parseFloat(String(price)).toFixed(2)} ₪`;
}

export function generateOrderNumber(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `AS${y}${m}${day}${rand}`;
}

export async function getOrCreateUser(telegramUser: any) {
  const supabase = getSupabase();
  const name = `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim();

  const { data: existing } = await supabase
    .from('users').select('*').eq('telegram_id', telegramUser.id).single();

  if (existing) {
    await supabase.from('users').update({ name, username: telegramUser.username || null })
      .eq('telegram_id', telegramUser.id);
    return existing;
  }

  const { data: newUser } = await supabase.from('users').insert({
    telegram_id: telegramUser.id,
    name,
    username: telegramUser.username || null,
  }).select().single();
  return newUser;
}

export async function sendTelegram(chatId: number | string, text: string, extra?: any) {
  const token = process.env.BOT_TOKEN;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', ...extra }),
  });
  return res.json();
}

export async function editTelegram(chatId: number | string, messageId: number, text: string, extra?: any) {
  const token = process.env.BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown', ...extra }),
  });
}

export async function answerCallback(callbackQueryId: string, text?: string, showAlert = false) {
  const token = process.env.BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: showAlert }),
  });
}

export async function notifyAdmins(order: any, user: any, proofFileId?: string) {
  const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').filter(Boolean);
  const token = process.env.BOT_TOKEN;

  const msg =
    `🔔 *طلب جديد #${order.order_number}*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 ${order.customer_name || user?.name || '—'}\n` +
    `📱 ${user?.username ? `@${user.username}` : `ID: ${user?.telegram_id}`}\n` +
    `📞 ${order.customer_phone || '—'}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📦 ${order.product_name} — ${order.product_duration}\n` +
    `💵 ${formatPrice(order.price)}\n` +
    `💳 ${order.payment_method_name}\n` +
    (order.txid ? `🔗 TXID: \`${order.txid}\`\n` : '') +
    `━━━━━━━━━━━━━━━━━━`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ تأكيد الدفع', callback_data: `admin_confirm_${order.id}` },
        { text: '❌ رفض', callback_data: `admin_reject_${order.id}` },
      ],
      [{ text: '📊 فتح لوحة التحكم', url: `${process.env.NEXTAUTH_URL}/dashboard/orders` }],
    ],
  };

  for (const adminId of adminIds) {
    try {
      if (proofFileId) {
        await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: adminId.trim(), photo: proofFileId, caption: msg, parse_mode: 'Markdown', reply_markup: keyboard }),
        });
      } else {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: adminId.trim(), text: msg, parse_mode: 'Markdown', reply_markup: keyboard }),
        });
      }
    } catch {}
  }
}
