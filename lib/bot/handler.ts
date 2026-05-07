import { getSupabase, formatPrice, generateOrderNumber, getOrCreateUser, sendTelegram, editTelegram, answerCallback, notifyAdmins } from './helpers';
import { getSession, setSession, clearSession, adminReplySessions } from './sessions';

const TOKEN = () => process.env.BOT_TOKEN!;
const ADMIN_IDS = () => (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

function isAdmin(userId: number) {
  return ADMIN_IDS().includes(String(userId));
}

async function tg(method: string, body: any) {
  await fetch(`https://api.telegram.org/bot${TOKEN()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Main Menu ───────────────────────────────────────────────────────────────
async function showMainMenu(chatId: number, name: string, messageId?: number) {
  const supabase = getSupabase();
  const { data: settings } = await supabase.from('settings').select('key,value').in('key', ['welcome_message']);
  const welcome = settings?.find(s => s.key === 'welcome_message')?.value || 'مرحباً بك في علوش ستور 🌟';

  const text = `${welcome}\n\nأهلاً *${name}* 👋\n\nاختر من القائمة:`;
  const keyboard = {
    inline_keyboard: [
      [{ text: '🛒 تصفح الاشتراكات', callback_data: 'browse_products' }, { text: '🔥 العروض', callback_data: 'current_offers' }],
      [{ text: '📦 طلباتي', callback_data: 'my_orders' }, { text: '💳 طرق الدفع', callback_data: 'payment_methods' }],
      [{ text: '🛠 الدعم الفني', callback_data: 'support' }, { text: '📞 تواصل معنا', callback_data: 'contact_admin' }],
    ],
  };

  if (messageId) {
    await tg('editMessageText', { chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown', reply_markup: keyboard });
  } else {
    await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown', reply_markup: keyboard });
  }
}

// ─── Categories ──────────────────────────────────────────────────────────────
async function showCategories(chatId: number, messageId: number, cbId: string) {
  const { data: cats } = await getSupabase().from('categories').select('*').eq('status', true).order('sort_order');
  if (!cats?.length) return answerCallback(cbId, 'لا توجد تصنيفات', true);

  await editTelegram(chatId, messageId, '📂 *اختر التصنيف:*', {
    reply_markup: {
      inline_keyboard: [
        ...cats.map(c => [{ text: `${c.icon} ${c.name}`, callback_data: `cat_${c.id}` }]),
        [{ text: '🔙 رجوع', callback_data: 'main_menu' }],
      ],
    },
  });
  await answerCallback(cbId);
}

async function showProductsByCategory(chatId: number, messageId: number, categoryId: string, cbId: string) {
  const supabase = getSupabase();
  const [{ data: cat }, { data: prods }] = await Promise.all([
    supabase.from('categories').select('name,icon').eq('id', categoryId).single(),
    supabase.from('products').select('id,name,price,duration').eq('category_id', categoryId).eq('status', true).order('sort_order'),
  ]);

  if (!prods?.length) return answerCallback(cbId, 'لا توجد منتجات في هذا التصنيف', true);

  await editTelegram(chatId, messageId, `${cat?.icon || '📦'} *${cat?.name || 'المنتجات'}*\n\nاختر الاشتراك:`, {
    reply_markup: {
      inline_keyboard: [
        ...prods.map(p => [{ text: `${p.name} — ${formatPrice(p.price)} / ${p.duration}`, callback_data: `product_${p.id}` }]),
        [{ text: '🔙 التصنيفات', callback_data: 'browse_products' }],
      ],
    },
  });
  await answerCallback(cbId);
}

async function showProductDetails(chatId: number, messageId: number, productId: string, cbId: string) {
  const { data: p } = await getSupabase().from('products').select('*').eq('id', productId).single();
  if (!p) return answerCallback(cbId, 'المنتج غير موجود', true);

  const text =
    `━━━━━━━━━━━━━━━━━━\n📦 *${p.name}*\n━━━━━━━━━━━━━━━━━━\n` +
    (p.description ? `📝 ${p.description}\n\n` : '') +
    `💵 *السعر:* ${formatPrice(p.price)}\n⏱ *المدة:* ${p.duration}\n` +
    (p.activation_method ? `⚡ *التفعيل:* ${p.activation_method}\n` : '') +
    (p.warranty ? `🛡 *الضمان:* ${p.warranty}\n` : '') +
    (p.notes ? `📌 ${p.notes}\n` : '') + `━━━━━━━━━━━━━━━━━━`;

  await editTelegram(chatId, messageId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🛒 اطلب الآن', callback_data: `order_start_${p.id}` }],
        [{ text: '🔙 رجوع', callback_data: `cat_${p.category_id}` }],
      ],
    },
  });
  await answerCallback(cbId);
}

// ─── Order Flow ───────────────────────────────────────────────────────────────
async function startOrder(chatId: number, messageId: number, productId: string, userId: number, cbId: string) {
  const { data: p } = await getSupabase().from('products').select('*').eq('id', productId).single();
  if (!p) return answerCallback(cbId, 'المنتج غير موجود', true);

  const { data: payments } = await getSupabase().from('payment_methods').select('*').eq('status', true).order('sort_order');
  if (!payments?.length) return answerCallback(cbId, 'لا توجد طرق دفع متاحة', true);

  setSession(userId, { productId, product: p, step: 'payment_method' });

  await editTelegram(chatId, messageId,
    `🛒 *طلب جديد*\n━━━━━━━━━━━━━━━━━━\n📦 ${p.name}\n💵 ${formatPrice(p.price)}\n⏱ ${p.duration}\n━━━━━━━━━━━━━━━━━━\n\n💳 *اختر طريقة الدفع:*`,
    {
      reply_markup: {
        inline_keyboard: [
          ...payments.map(pm => [{ text: `${pm.icon} ${pm.name}`, callback_data: `select_payment_${pm.id}` }]),
          [{ text: '❌ إلغاء', callback_data: 'cancel_order' }],
        ],
      },
    }
  );
  await answerCallback(cbId);
}

async function selectPayment(chatId: number, messageId: number, paymentId: string, userId: number, cbId: string) {
  const session = getSession(userId);
  const { data: pm } = await getSupabase().from('payment_methods').select('*').eq('id', paymentId).single();
  if (!pm) return answerCallback(cbId, 'طريقة الدفع غير موجودة', true);

  setSession(userId, { ...session, paymentId, payment: pm, step: pm.type === 'crypto' ? 'waiting_txid' : 'waiting_proof' });

  const isCrypto = pm.type === 'crypto';
  const text =
    `💳 *تفاصيل الدفع*\n━━━━━━━━━━━━━━━━━━\n` +
    `📦 ${session.product.name}\n💵 *${formatPrice(session.product.price)}*\n━━━━━━━━━━━━━━━━━━\n` +
    `${pm.icon} *${pm.name}*\n` +
    (pm.beneficiary_name ? `👤 ${pm.beneficiary_name}\n` : '') +
    `📋 \`${pm.value}\`\n` +
    (pm.instructions ? `\n📌 ${pm.instructions}\n` : '') +
    `━━━━━━━━━━━━━━━━━━\n` +
    (isCrypto ? `\nأرسل TXID بعد التحويل ⬇️` : `\nأرسل صورة الإيصال بعد التحويل ⬇️`);

  await editTelegram(chatId, messageId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 تغيير طريقة الدفع', callback_data: `order_start_${session.productId}` }],
        [{ text: '❌ إلغاء', callback_data: 'cancel_order' }],
      ],
    },
  });
  await answerCallback(cbId);
}

// ─── Text/Photo messages ──────────────────────────────────────────────────────
async function handleMessage(update: any, user: any) {
  const chatId = update.message.chat.id;
  const userId = update.message.from.id;
  const text = update.message.text || '';
  const photo = update.message.photo;
  const session = getSession(userId);

  // Admin replying to customer
  if (isAdmin(userId) && adminReplySessions.has(userId)) {
    if (text === '/cancel') {
      adminReplySessions.delete(userId);
      return sendTelegram(chatId, '❌ تم إلغاء الرسالة');
    }
    const adminSession = adminReplySessions.get(userId)!;
    adminReplySessions.delete(userId);
    await sendTelegram(adminSession.customerTelegramId, `📩 *رسالة من الإدارة:*\n\n${text}`);
    return sendTelegram(chatId, '✅ تم إرسال الرسالة للعميل');
  }

  if (!session.step) return;

  // Order flow
  if (session.step === 'waiting_txid') {
    if (!text || text.length < 5) return sendTelegram(chatId, '❌ أدخل TXID صحيح');
    setSession(userId, { ...session, txid: text, step: 'waiting_name' });
    return sendTelegram(chatId, '👤 *أدخل اسمك الكامل:*', { parse_mode: 'Markdown' });
  }

  if (session.step === 'waiting_proof') {
    if (!photo) return sendTelegram(chatId, '❌ أرسل صورة الإيصال');
    const fileId = photo[photo.length - 1].file_id;
    setSession(userId, { ...session, proofFileId: fileId, step: 'waiting_name' });
    return sendTelegram(chatId, '👤 *أدخل اسمك الكامل:*', { parse_mode: 'Markdown' });
  }

  if (session.step === 'waiting_name') {
    if (!text || text.length < 2) return sendTelegram(chatId, '❌ أدخل اسمك الكامل');
    setSession(userId, { ...session, customerName: text, step: 'waiting_phone' });
    return sendTelegram(chatId, '📞 *أدخل رقم هاتفك:*', { parse_mode: 'Markdown' });
  }

  if (session.step === 'waiting_phone') {
    if (!text || text.length < 7) return sendTelegram(chatId, '❌ أدخل رقم هاتف صحيح');
    setSession(userId, { ...session, customerPhone: text, step: 'waiting_email' });
    return sendTelegram(chatId, '📧 *أدخل إيميلك (اختياري)*\nأو أرسل /skip', { parse_mode: 'Markdown' });
  }

  if (session.step === 'waiting_email') {
    const email = text === '/skip' ? null : text;
    await submitOrder(chatId, userId, user, { ...session, customerEmail: email });
  }
}

async function submitOrder(chatId: number, userId: number, user: any, session: any) {
  const supabase = getSupabase();
  clearSession(userId);

  const orderNumber = generateOrderNumber();
  const { data: order, error } = await supabase.from('orders').insert({
    order_number: orderNumber,
    user_id: user?.id,
    product_id: session.productId,
    product_name: session.product.name,
    product_duration: session.product.duration,
    price: session.product.price,
    payment_method_id: session.paymentId,
    payment_method_name: session.payment.name,
    proof_image: session.proofFileId || null,
    txid: session.txid || null,
    customer_name: session.customerName,
    customer_phone: session.customerPhone,
    customer_email: session.customerEmail || null,
    status: 'pending',
  }).select().single();

  if (error || !order) {
    return sendTelegram(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى');
  }

  await sendTelegram(chatId,
    `✅ *تم استلام طلبك!*\n━━━━━━━━━━━━━━━━━━\n🔖 رقم الطلب: \`${orderNumber}\`\n📦 ${order.product_name}\n💵 ${formatPrice(order.price)}\n⏳ قيد المراجعة\n━━━━━━━━━━━━━━━━━━\nسيتم التواصل معك قريباً ✨`,
    { reply_markup: { inline_keyboard: [[{ text: '🏠 القائمة الرئيسية', callback_data: 'main_menu_new' }]] } }
  );

  await notifyAdmins(order, user, session.proofFileId);
}

// ─── Callback Queries ─────────────────────────────────────────────────────────
async function handleCallback(update: any, user: any) {
  const cb = update.callback_query;
  const data = cb.data;
  const chatId = cb.message.chat.id;
  const messageId = cb.message.message_id;
  const userId = cb.from.id;
  const cbId = cb.id;
  const name = cb.from.first_name || 'عزيزي';

  if (data === 'main_menu') return showMainMenu(chatId, name, messageId);
  if (data === 'main_menu_new') return showMainMenu(chatId, name);
  if (data === 'browse_products' || data === 'current_offers') return showCategories(chatId, messageId, cbId);
  if (data === 'payment_methods') {
    const { data: pms } = await getSupabase().from('payment_methods').select('*').eq('status', true);
    let text = `💳 *طرق الدفع المتاحة:*\n━━━━━━━━━━━━━━━━━━\n\n`;
    pms?.forEach(pm => {
      text += `${pm.icon} *${pm.name}*\n📋 \`${pm.value}\`\n` + (pm.instructions ? `📌 ${pm.instructions}\n` : '') + '\n';
    });
    await editTelegram(chatId, messageId, text, { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'main_menu' }]] } });
    return answerCallback(cbId);
  }
  if (data === 'support' || data === 'contact_admin') {
    await editTelegram(chatId, messageId,
      `🛠 *الدعم الفني*\n━━━━━━━━━━━━━━━━━━\nللتواصل: @AloshSupport\n⏰ متاحون 24/7`,
      { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'main_menu' }]] } }
    );
    return answerCallback(cbId);
  }
  if (data === 'my_orders') {
    const supabase = getSupabase();
    const { data: dbUser } = await supabase.from('users').select('id').eq('telegram_id', userId).single();
    if (!dbUser) return answerCallback(cbId, 'لا توجد طلبات', true);
    const { data: orders } = await supabase.from('orders').select('*').eq('user_id', dbUser.id).order('created_at', { ascending: false }).limit(5);
    const statusEmoji: any = { pending: '⏳', paid: '💰', processing: '⚙️', completed: '✅', rejected: '❌', cancelled: '🚫' };
    let text = `📦 *طلباتك الأخيرة:*\n━━━━━━━━━━━━━━━━━━\n\n`;
    if (!orders?.length) text += 'لا توجد طلبات بعد';
    else orders.forEach((o, i) => { text += `${i + 1}. ${statusEmoji[o.status] || '❓'} *${o.product_name}*\n   #${o.order_number} | ${formatPrice(o.price)}\n\n`; });
    await editTelegram(chatId, messageId, text, { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'main_menu' }]] } });
    return answerCallback(cbId);
  }
  if (data === 'cancel_order') {
    clearSession(userId);
    await editTelegram(chatId, messageId, '❌ *تم إلغاء الطلب*', { reply_markup: { inline_keyboard: [[{ text: '🏠 القائمة الرئيسية', callback_data: 'main_menu' }]] } });
    return answerCallback(cbId);
  }
  if (data.startsWith('cat_')) return showProductsByCategory(chatId, messageId, data.slice(4), cbId);
  if (data.startsWith('product_')) return showProductDetails(chatId, messageId, data.slice(8), cbId);
  if (data.startsWith('order_start_')) return startOrder(chatId, messageId, data.slice(12), userId, cbId);
  if (data.startsWith('select_payment_')) return selectPayment(chatId, messageId, data.slice(15), userId, cbId);

  // Admin actions
  if (data.startsWith('admin_confirm_') && isAdmin(userId)) {
    const orderId = data.slice(14);
    const { data: order } = await getSupabase().from('orders').update({ status: 'paid' }).eq('id', orderId).select('*, users(*)').single();
    await answerCallback(cbId, '✅ تم تأكيد الدفع', true);
    if (order?.users?.telegram_id) {
      await sendTelegram(order.users.telegram_id, `✅ *تم تأكيد دفع طلبك*\n🔖 \`${order.order_number}\`\n📦 ${order.product_name}\n⚙️ جاري التنفيذ...`);
    }
    return;
  }
  if (data.startsWith('admin_reject_') && isAdmin(userId)) {
    const orderId = data.slice(13);
    const { data: order } = await getSupabase().from('orders').update({ status: 'rejected' }).eq('id', orderId).select('*, users(*)').single();
    await answerCallback(cbId, '❌ تم الرفض', true);
    if (order?.users?.telegram_id) {
      await sendTelegram(order.users.telegram_id, `❌ *تم رفض طلبك*\n🔖 \`${order.order_number}\`\nللاستفسار: @AloshSupport`);
    }
    return;
  }

  await answerCallback(cbId);
}

// ─── Main Update Handler ──────────────────────────────────────────────────────
export async function handleUpdate(update: any) {
  try {
    const telegramUser = update.message?.from || update.callback_query?.from;
    if (!telegramUser) return;

    const user = await getOrCreateUser(telegramUser);
    const chatId = update.message?.chat.id || update.callback_query?.message?.chat?.id;
    const name = telegramUser.first_name || 'عزيزي';

    if (update.message) {
      const text = update.message.text || '';
      if (text === '/start' || text === '/menu') {
        return showMainMenu(chatId, name);
      }
      return handleMessage(update, user);
    }

    if (update.callback_query) {
      return handleCallback(update, user);
    }
  } catch (err: any) {
    console.error('handleUpdate error:', err.message);
  }
}
