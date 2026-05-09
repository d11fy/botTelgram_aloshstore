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

const REPLY_KEYBOARD = {
  keyboard: [
    [{ text: '🛍 المنتجات' }, { text: '📦 طلباتي' }],
    [{ text: '❓ الأسئلة الشائعة' }],
    [{ text: '💬 الدعم الفني' }, { text: '💳 طرق الدفع' }],
  ],
  resize_keyboard: true,
  persistent: true,
};

// ─── Main Menu ───────────────────────────────────────────────────────────────
async function showMainMenu(chatId: number, name: string, messageId?: number) {
  const s = await getSettings();
  const storeName = s.store_name || 'علوش ستور';
  const welcomeTemplate = s.welcome_message ||
    `👋 أهلاً *{name}* في *${storeName}*!\n\n🛍 متجر الخدمات الرقمية\n⚡ سرعة – أمان – احتراف\n\n👇 اختر من القائمة بالأسفل`;
  const text = welcomeTemplate.replace('{name}', name);

  if (messageId) {
    await tg('editMessageText', { chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown' });
  } else {
    await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown', reply_markup: REPLY_KEYBOARD });
  }
}

async function showCategoriesAsMessage(chatId: number) {
  const { data: cats } = await getSupabase().from('categories').select('*').eq('status', true).order('sort_order');
  if (!cats?.length) return sendTelegram(chatId, '❌ لا توجد تصنيفات');
  await tg('sendMessage', {
    chat_id: chatId,
    text: '📂 *اختر التصنيف:*',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        ...cats.map(c => [{ text: `${c.icon} ${c.name}`, callback_data: `cat_${c.id}` }]),
      ],
    },
  });
}

async function getSettings(): Promise<Record<string, string>> {
  const { data } = await getSupabase().from('settings').select('key,value');
  const map: Record<string, string> = {};
  data?.forEach(s => { map[s.key] = s.value || ''; });
  return map;
}

async function showMyOrders(chatId: number, userId: number) {
  const { data: dbUser } = await getSupabase().from('users').select('id').eq('telegram_id', userId).single();
  if (!dbUser) return sendTelegram(chatId, '📦 لا توجد طلبات بعد');
  const { data: orders } = await getSupabase().from('orders').select('*').eq('user_id', dbUser.id).order('created_at', { ascending: false }).limit(5);
  const statusEmoji: any = { pending: '⏳', paid: '💰', processing: '⚙️', completed: '✅', rejected: '❌', cancelled: '🚫' };
  let txt = `📦 *طلباتك الأخيرة:*\n━━━━━━━━━━━━━━━━━━\n\n`;
  if (!orders?.length) txt += 'لا توجد طلبات بعد';
  else orders.forEach((o, i) => { txt += `${i + 1}. ${statusEmoji[o.status] || '❓'} *${o.product_name}*\n   #${o.order_number} | ${formatPrice(o.price)}\n\n`; });
  return sendTelegram(chatId, txt);
}

async function showFaq(chatId: number) {
  const s = await getSettings();
  const text = s.faq_text ||
    `❓ *الأسئلة الشائعة*\n━━━━━━━━━━━━━━━━━━\n\n` +
    `*كيف أطلب؟*\n اضغط المنتجات، اختر الخدمة، ادفع وأرسل الإيصال\n\n` +
    `*متى يصل الاشتراك؟*\n خلال دقائق بعد تأكيد الدفع\n\n` +
    `*هل الدفع آمن؟*\n نعم، نراجع كل طلب يدوياً قبل التسليم`;
  return sendTelegram(chatId, text);
}

async function showSupport(chatId: number) {
  const s = await getSettings();
  const text = s.support_message ||
    `💬 *الدعم الفني*\n━━━━━━━━━━━━━━━━━━\n\n` +
    `للتواصل المباشر: ${s.support_username || '@AloshSupport'}\n⏰ متاحون 24/7`;
  return sendTelegram(chatId, text);
}

async function showPaymentMethods(chatId: number) {
  const { data: pms } = await getSupabase().from('payment_methods').select('*').eq('status', true);
  let txt = `💳 *طرق الدفع المتاحة:*\n━━━━━━━━━━━━━━━━━━\n\n`;
  pms?.forEach(pm => { txt += `${pm.icon} *${pm.name}*\n📋 \`${pm.value}\`\n` + (pm.instructions ? `📌 ${pm.instructions}\n` : '') + '\n'; });
  return sendTelegram(chatId, txt);
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

  // fetch full product including required_info fields
  const { data: fullProduct } = await getSupabase().from('products').select('*').eq('id', productId).single();
  setSession(userId, { productId, product: fullProduct || p, step: 'payment_method' });

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

async function askRequiredInfo(chatId: number, userId: number, session: any) {
  const type = session.product.required_info_type || 'none';
  const customPrompt = session.product.required_info_prompt;

  const prompts: Record<string, string> = {
    email: customPrompt || '📧 أرسل الإيميل الذي تريد التفعيل عليه:',
    email_password: customPrompt || '📧 أرسل الإيميل وكلمة السر مفصولين بمسافة أو سطر جديد:',
    link: customPrompt || '🔗 أرسل الرابط المطلوب:',
    custom: customPrompt || 'أرسل المعلومات المطلوبة:',
  };

  setSession(userId, { ...session, step: `waiting_info_${type}` });
  return sendTelegram(chatId, prompts[type] || 'أرسل المعلومات المطلوبة:', { parse_mode: 'Markdown' });
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

  // Reply keyboard buttons + commands
  if (!session.step) {
    if (text === '🛍 المنتجات' || text === '/products') return showCategoriesAsMessage(chatId);
    if (text === '📦 طلباتي' || text === '/orders') return showMyOrders(chatId, userId);
    if (text === '❓ الأسئلة الشائعة' || text === '/faq') return showFaq(chatId);
    if (text === '💬 الدعم الفني' || text === '/support') return showSupport(chatId);
    if (text === '💳 طرق الدفع') return showPaymentMethods(chatId);
    return;
  }

  // Order flow
  if (session.step === 'waiting_txid') {
    if (!text || text.length < 5) return sendTelegram(chatId, '❌ أدخل TXID صحيح');
    const next = { ...session, txid: text };
    if (session.product?.required_info_type && session.product.required_info_type !== 'none') {
      return askRequiredInfo(chatId, userId, next);
    }
    await submitOrder(chatId, userId, user, next);
    return;
  }

  if (session.step === 'waiting_proof') {
    if (!photo) return sendTelegram(chatId, '❌ أرسل صورة الإيصال');
    const fileId = photo[photo.length - 1].file_id;
    const next = { ...session, proofFileId: fileId };
    if (session.product?.required_info_type && session.product.required_info_type !== 'none') {
      return askRequiredInfo(chatId, userId, next);
    }
    await submitOrder(chatId, userId, user, next);
    return;
  }

  if (session.step?.startsWith('waiting_info_')) {
    if (!text || text.length < 1) return sendTelegram(chatId, '❌ يرجى إرسال المعلومات المطلوبة');
    await submitOrder(chatId, userId, user, { ...session, customerNotes: text });
    return;
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
    customer_name: user?.name || null,
    customer_phone: null,
    customer_email: null,
    customer_notes: session.customerNotes || null,
    status: 'pending',
  }).select().single();

  if (error || !order) {
    return sendTelegram(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى');
  }

  const s = await getSettings();
  const successTemplate = s.order_success_message ||
    `✅ *تم استلام طلبك!*\n━━━━━━━━━━━━━━━━━━\n🔖 رقم الطلب: \`{order_number}\`\n📦 {product_name}\n💵 {price}\n⏳ قيد المراجعة\n━━━━━━━━━━━━━━━━━━\nسيتم التواصل معك قريباً ✨`;
  const successMsg = successTemplate
    .replace('{order_number}', orderNumber)
    .replace('{product_name}', order.product_name)
    .replace('{price}', formatPrice(order.price));

  await sendTelegram(chatId, successMsg,
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
    await showSupport(chatId);
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
      if (text === '/start' || text === '/menu') return showMainMenu(chatId, name);
      if (text === '/products') return showCategoriesAsMessage(chatId);
      if (text === '/orders') return showMyOrders(chatId, telegramUser.id);
      if (text === '/faq') return showFaq(chatId);
      if (text === '/support') return showSupport(chatId);
      return handleMessage(update, user);
    }

    if (update.callback_query) {
      return handleCallback(update, user);
    }
  } catch (err: any) {
    console.error('handleUpdate error:', err.message);
  }
}
