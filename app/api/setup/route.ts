import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// One-time setup endpoint — create the first admin account
export async function POST(req: NextRequest) {
  const setupKey = req.headers.get("x-setup-key");
  if (setupKey !== process.env.API_SECRET_KEY) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { username, password, name, telegramId } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const hash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase.from("admins").insert({
    username,
    password_hash: hash,
    name,
    telegram_id: telegramId || null,
    role: "admin",
    is_active: true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, id: data.id });
}
