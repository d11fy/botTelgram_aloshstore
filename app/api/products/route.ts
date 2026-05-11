import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

function cleanBody(body: any) {
  const safe = { ...body };
  // Try without extra columns first; add them only if migration was run
  delete safe.required_info_type;
  delete safe.required_info_prompt;
  return { safe, extra: { required_info_type: body.required_info_type, required_info_prompt: body.required_info_prompt } };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { safe, extra } = cleanBody(body);

  // Try with extra columns first
  if (extra.required_info_type && extra.required_info_type !== 'none') {
    const { error, data } = await supabaseAdmin.from('products').insert({ ...safe, ...extra }).select().single();
    if (!error) return NextResponse.json(data);
  }

  // Fallback: insert without extra columns
  const { error, data } = await supabaseAdmin.from('products').insert(safe).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
