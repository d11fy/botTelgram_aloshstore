import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data } = await supabaseAdmin.from('settings').select('key,value,description');
  const map: Record<string, string> = {};
  data?.forEach(s => { map[s.key] = s.value || ''; });
  return NextResponse.json(map);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: Record<string, string> = await req.json();

  const rows = Object.entries(body).map(([key, value]) => ({ key, value }));
  for (const row of rows) {
    await supabaseAdmin
      .from('settings')
      .upsert({ key: row.key, value: row.value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  }

  return NextResponse.json({ ok: true });
}
