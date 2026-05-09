"use client";
import { useState } from "react";
import Header from "@/components/layout/Header";
import { Send, Users, Megaphone } from "lucide-react";
import toast from "react-hot-toast";

const TEMPLATES = [
  { label: "عرض خاص", text: "🔥 *عرض خاص من علوش ستور!*\n━━━━━━━━━━━━━━━━━━\n\n" },
  { label: "خصم", text: "💥 *خصم حصري لعملائنا!*\n━━━━━━━━━━━━━━━━━━\n\n" },
  { label: "منتج جديد", text: "✨ *منتج جديد متوفر الآن!*\n━━━━━━━━━━━━━━━━━━\n\n" },
  { label: "إشعار", text: "📢 *إشعار من علوش ستور:*\n━━━━━━━━━━━━━━━━━━\n\n" },
];

export default function BroadcastPage() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  async function handleSend() {
    if (!message.trim()) return toast.error("الرسالة فارغة");
    if (!confirm(`هل أنت متأكد من إرسال الرسالة لجميع العملاء؟`)) return;

    setSending(true);
    setResult(null);
    const res = await fetch("/api/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (res.ok) {
      setResult(data);
      toast.success(`تم الإرسال لـ ${data.sent} عميل`);
      setMessage("");
    } else {
      toast.error(data.error || "خطأ في الإرسال");
    }
    setSending(false);
  }

  return (
    <>
      <Header title="رسالة جماعية" subtitle="إرسال رسالة لجميع العملاء" />

      <div className="max-w-2xl space-y-6">
        {/* Templates */}
        <div className="glass rounded-2xl p-5">
          <p className="text-gray-400 text-sm mb-3 flex items-center gap-2">
            <Megaphone size={15} /> قوالب جاهزة
          </p>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map(t => (
              <button key={t.label} onClick={() => setMessage(t.text)}
                className="glass hover:bg-primary-700/30 text-gray-300 hover:text-white text-sm py-2 px-3 rounded-xl transition-all text-right">
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message input */}
        <div className="glass rounded-2xl p-5">
          <p className="text-gray-400 text-sm mb-3">محتوى الرسالة</p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={8}
            className="input-dark resize-none mb-1 font-mono text-sm"
            placeholder="اكتب رسالتك هنا...&#10;&#10;يمكنك استخدام *نص عريض* و_مائل_"
          />
          <p className="text-gray-600 text-xs">يمكن استخدام تنسيق Markdown: *عريض* _مائل_ `كود`</p>
        </div>

        {/* Preview */}
        {message && (
          <div className="glass rounded-2xl p-5 border border-blue-500/20">
            <p className="text-blue-400 text-xs mb-3">معاينة الرسالة</p>
            <div className="bg-primary-900/50 rounded-xl p-4 text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
              {message}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="glass rounded-2xl p-5 border border-green-500/20">
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{result.sent}</p>
                <p className="text-gray-400 text-xs">تم الإرسال</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{result.failed}</p>
                <p className="text-gray-400 text-xs">فشل</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">{result.total}</p>
                <p className="text-gray-400 text-xs">إجمالي العملاء</p>
              </div>
            </div>
          </div>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="btn-primary w-full flex items-center justify-center gap-3 py-4 text-base"
        >
          {sending ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              جاري الإرسال...
            </>
          ) : (
            <>
              <Send size={18} />
              إرسال لجميع العملاء
              <Users size={16} className="opacity-60" />
            </>
          )}
        </button>
      </div>
    </>
  );
}
