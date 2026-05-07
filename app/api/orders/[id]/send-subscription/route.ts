import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { subscriptionData } = await req.json();
  if (!subscriptionData) return NextResponse.json({ error: 'No data' }, { status: 400 });

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('*, users(*)')
    .eq('id', params.id)
    .single();

  if (!order?.users?.telegram_id) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const message =
    `🎉 *بيانات اشتراكك جاهزة!*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📦 *${order.product_name}*\n` +
    `🔖 الطلب: \`${order.order_number}\`\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `${subscriptionData}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `شكراً لثقتك بعلوش ستور ❤️`;

  const res = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: order.users.telegram_id,
      text: message,
      parse_mode: 'Markdown',
    }),
  });

  const result = await res.json();
  if (!result.ok) return NextResponse.json({ error: result.description }, { status: 500 });

  // Mark order as completed
  await supabaseAdmin.from('orders').update({ status: 'completed' }).eq('id', params.id);

  return NextResponse.json({ success: true });
}
