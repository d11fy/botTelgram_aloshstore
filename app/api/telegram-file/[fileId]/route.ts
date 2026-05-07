import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: { fileId: string } }) {
  const token = process.env.BOT_TOKEN;
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 500 });

  const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${params.fileId}`);
  const data = await res.json();

  if (!data.ok) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  const fileUrl = `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
  return NextResponse.redirect(fileUrl);
}
