"use client";
import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Save, Store, MessageSquare, HelpCircle, Phone, Bot, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const DEFAULTS: Record<string, string> = {
  store_name: "علوش ستور",
  store_username: "@AloshStore",
  welcome_message: "👋 أهلاً {name} في علوش ستور!\n\n🛍 متجر الخدمات الرقمية\n⚡ سرعة – أمان – احتراف\n\n👇 اختر من القائمة بالأسفل",
  support_username: "@AloshSupport",
  support_message: "💬 الدعم الفني\n━━━━━━━━━━━━━━━━━━\n\nللتواصل: @AloshSupport\n⏰ متاحون 24/7",
  faq_text: "❓ الأسئلة الشائعة\n━━━━━━━━━━━━━━━━━━\n\nكيف أطلب؟\n اختر الخدمة، ادفع وأرسل الإيصال\n\nمتى يصل الاشتراك؟\n خلال دقائق بعد تأكيد الدفع\n\nهل الدفع آمن؟\n نعم، نراجع كل طلب يدوياً",
  order_success_message: "✅ تم استلام طلبك!\n━━━━━━━━━━━━━━━━━━\n🔖 رقم الطلب: {order_number}\n📦 {product_name}\n💵 {price}\n⏳ قيد المراجعة\n━━━━━━━━━━━━━━━━━━\nسيتم التواصل معك قريباً ✨",
};

type Section = {
  title: string;
  icon: any;
  color: string;
  fields: { key: string; label: string; type: "text" | "textarea"; placeholder?: string; hint?: string }[];
};

const SECTIONS: Section[] = [
  {
    title: "معلومات المتجر",
    icon: Store,
    color: "text-blue-400",
    fields: [
      { key: "store_name", label: "اسم المتجر", type: "text", placeholder: "علوش ستور" },
      { key: "store_username", label: "يوزر المتجر (تلجرام)", type: "text", placeholder: "@AloshStore" },
    ],
  },
  {
    title: "رسالة البداية /start",
    icon: Bot,
    color: "text-green-400",
    fields: [
      {
        key: "welcome_message",
        label: "نص الرسالة",
        type: "textarea",
        placeholder: DEFAULTS.welcome_message,
        hint: "استخدم {name} لاسم العميل",
      },
    ],
  },
  {
    title: "الدعم الفني",
    icon: Phone,
    color: "text-purple-400",
    fields: [
      { key: "support_username", label: "يوزر الدعم", type: "text", placeholder: "@AloshSupport" },
      {
        key: "support_message",
        label: "رسالة الدعم الفني",
        type: "textarea",
        placeholder: DEFAULTS.support_message,
      },
    ],
  },
  {
    title: "الأسئلة الشائعة /faq",
    icon: HelpCircle,
    color: "text-yellow-400",
    fields: [
      {
        key: "faq_text",
        label: "محتوى الأسئلة الشائعة",
        type: "textarea",
        placeholder: DEFAULTS.faq_text,
        hint: "يدعم تنسيق Markdown: *عريض* _مائل_",
      },
    ],
  },
  {
    title: "رسالة تأكيد الطلب",
    icon: CheckCircle,
    color: "text-emerald-400",
    fields: [
      {
        key: "order_success_message",
        label: "رسالة بعد إرسال الطلب",
        type: "textarea",
        placeholder: DEFAULTS.order_success_message,
        hint: "متغيرات: {order_number} {product_name} {price}",
      },
    ],
  },
  {
    title: "رسالة بيانات الاشتراك",
    icon: MessageSquare,
    color: "text-pink-400",
    fields: [
      {
        key: "subscription_footer",
        label: "تذييل رسالة الاشتراك",
        type: "text",
        placeholder: "شكراً لثقتك بعلوش ستور ❤️",
      },
    ],
  },
];

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => { setValues({ ...DEFAULTS, ...data }); setLoading(false); });
  }, []);

  function set(key: string, val: string) {
    setValues(v => ({ ...v, [key]: val }));
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) toast.success("✅ تم حفظ الإعدادات");
    else toast.error("خطأ في الحفظ");
    setSaving(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <Header title="إعدادات البوت" subtitle="تعديل كل نصوص وإعدادات البوت" />

      <div className="max-w-3xl space-y-6">
        {SECTIONS.map(section => (
          <div key={section.title} className="glass rounded-2xl p-6 border border-primary-800/30">
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-9 h-9 rounded-xl bg-primary-800/50 flex items-center justify-center ${section.color}`}>
                <section.icon size={18} />
              </div>
              <h2 className="text-white font-semibold">{section.title}</h2>
            </div>

            <div className="space-y-4">
              {section.fields.map(field => (
                <div key={field.key}>
                  <label className="block text-gray-400 text-xs mb-1.5">{field.label}</label>
                  {field.type === "textarea" ? (
                    <textarea
                      value={values[field.key] ?? ""}
                      onChange={e => set(field.key, e.target.value)}
                      rows={5}
                      className="input-dark resize-none font-mono text-sm"
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      value={values[field.key] ?? ""}
                      onChange={e => set(field.key, e.target.value)}
                      className="input-dark"
                      placeholder={field.placeholder}
                    />
                  )}
                  {field.hint && <p className="text-gray-600 text-xs mt-1">{field.hint}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={save}
          disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base sticky bottom-6"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : <Save size={18} />}
          {saving ? "جاري الحفظ..." : "حفظ جميع الإعدادات"}
        </button>
      </div>
    </>
  );
}
