import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { required_info_type, required_info_prompt, ...safe } = body;

  // Try with extra columns if they were set
  if (required_info_type && required_info_type !== 'none') {
    const { error } = await supabaseAdmin.from('products')
      .update({ ...safe, required_info_type, required_info_prompt })
      .eq('id', params.id);
    if (!error) return NextResponse.json({ ok: true });
  }

  // Fallback: update without extra columns
  const { error } = await supabaseAdmin.from('products').update(safe).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabaseAdmin.from('products').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
