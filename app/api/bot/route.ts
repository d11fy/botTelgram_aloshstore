import { NextRequest, NextResponse } from 'next/server';
import { handleUpdate } from '@/lib/bot/handler';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    // Don't await — return 200 immediately, process in background
    handleUpdate(update).catch(console.error);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Bot webhook active ✅' });
}
