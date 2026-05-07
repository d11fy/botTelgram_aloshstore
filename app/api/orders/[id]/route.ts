import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { status, admin_notes } = body;

  const updateData: any = { updated_at: new Date().toISOString() };
  if (status) updateData.status = status;
  if (admin_notes !== undefined) updateData.admin_notes = admin_notes;

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update(updateData)
    .eq("id", params.id)
    .select("*, users(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send Telegram notification to customer
  if (data?.users?.telegram_id && process.env.BOT_TOKEN) {
    const statusMessages: Record<string, string> = {
      paid: "✅ تم تأكيد دفع طلبك وجاري التنفيذ",
      processing: "⚙️ طلبك قيد التنفيذ الآن",
      completed: "🎉 تم تنفيذ طلبك بنجاح! استمتع بخدمتك",
      rejected: "❌ للأسف تم رفض طلبك. للاستفسار تواصل مع الدعم",
    };
    const msg = statusMessages[status];
    if (msg) {
      try {
        await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: data.users.telegram_id,
            text: `${msg}\n\n🔖 رقم الطلب: \`${data.order_number}\`\n📦 الخدمة: ${data.product_name}`,
            parse_mode: "Markdown",
          }),
        });
      } catch {}
    }
  }

  return NextResponse.json(data);
}
