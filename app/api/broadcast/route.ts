import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: 'الرسالة فارغة' }, { status: 400 });

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('telegram_id')
    .not('telegram_id', 'is', null);

  if (!users?.length) return NextResponse.json({ sent: 0 });

  const token = process.env.BOT_TOKEN;
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: user.telegram_id,
          text: message,
          parse_mode: 'Markdown',
        }),
      });
      const data = await res.json();
      if (data.ok) sent++; else failed++;
    } catch {
      failed++;
    }
    // Small delay to avoid Telegram rate limits
    await new Promise(r => setTimeout(r, 50));
  }

  return NextResponse.json({ sent, failed, total: users.length });
}
