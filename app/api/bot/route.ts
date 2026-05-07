import { NextRequest, NextResponse } from 'next/server';
import { handleUpdate } from '@/lib/bot/handler';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    await handleUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('webhook error:', err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Bot webhook active ✅' });
}
