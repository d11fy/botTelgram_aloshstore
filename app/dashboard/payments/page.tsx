"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import Modal from "@/components/ui/Modal";
import { PaymentMethod } from "@/lib/types";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, CreditCard } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const PAYMENT_ICONS = ["🏦", "💰", "📲", "🪙", "🟡", "💳", "🏧", "💵"];
const TYPES = [
  { value: "bank", label: "بنك" },
  { value: "wallet", label: "محفظة إلكترونية" },
  { value: "crypto", label: "كريبتو" },
];

export default function PaymentsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<PaymentMethod>>({
    name: "", type: "bank", value: "", beneficiary_name: "",
    instructions: "", icon: "💳", status: true, sort_order: 0,
  });
  const [saving, setSaving] = useState(false);

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("payment_methods").select("*").order("sort_order");
    setMethods((data || []) as PaymentMethod[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMethods(); }, [fetchMethods]);

  function openAdd() {
    setEditing({ name: "", type: "bank", value: "", beneficiary_name: "", instructions: "", icon: "💳", status: true, sort_order: 0 });
    setModalOpen(true);
  }
  function openEdit(m: PaymentMethod) { setEditing({ ...m }); setModalOpen(true); }

  async function handleSave() {
    if (!editing.name || !editing.value) return toast.error("يرجى ملء الحقول المطلوبة");
    setSaving(true);
    const data = {
      name: editing.name, type: editing.type, value: editing.value,
      beneficiary_name: editing.beneficiary_name || null,
      instructions: editing.instructions || null,
      icon: editing.icon || "💳", status: editing.status ?? true,
      sort_order: Number(editing.sort_order || 0),
    };

    if (editing.id) {
      const { error } = await supabase.from("payment_methods").update(data).eq("id", editing.id);
      if (error) toast.error("خطأ"); else toast.success("تم التحديث");
    } else {
      const { error } = await supabase.from("payment_methods").insert(data);
      if (error) toast.error("خطأ"); else toast.success("تمت الإضافة");
    }
    setSaving(false);
    setModalOpen(false);
    fetchMethods();
  }

  async function toggleStatus(id: string, status: boolean) {
    await supabase.from("payment_methods").update({ status: !status }).eq("id", id);
    fetchMethods();
  }

  async function deleteMethod(id: string, name: string) {
    if (!confirm(`حذف "${name}"؟`)) return;
    const { error } = await supabase.from("payment_methods").delete().eq("id", id);
    if (error) toast.error("خطأ في الحذف");
    else { toast.success("تم الحذف"); fetchMethods(); }
  }

  const typeLabels: Record<string, string> = { bank: "🏦 بنك", wallet: "💰 محفظة", crypto: "🪙 كريبتو" };

  return (
    <>
      <Header title="طرق الدفع" subtitle="إدارة طرق الدفع المتاحة في المتجر" />
      <div className="flex justify-end mb-6">
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> إضافة طريقة دفع
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="glass rounded-2xl p-5 animate-pulse h-20" />)}
        </div>
      ) : methods.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <CreditCard size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">لا توجد طرق دفع</p>
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map(m => (
            <div key={m.id} className={cn(
              "glass rounded-2xl p-5 border flex items-center gap-4 card-hover",
              m.status ? "border-primary-700/30" : "border-gray-700/30 opacity-60"
            )}>
              <div className="w-12 h-12 rounded-xl bg-primary-800/50 flex items-center justify-center text-2xl flex-shrink-0">
                {m.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-semibold">{m.name}</h3>
                  <span className="text-xs bg-blue-400/10 text-blue-400 px-2 py-0.5 rounded-full">
                    {typeLabels[m.type] || m.type}
                  </span>
                </div>
                <p className="text-gray-400 text-sm font-mono truncate">{m.value}</p>
                {m.beneficiary_name && <p className="text-gray-500 text-xs">المستفيد: {m.beneficiary_name}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleStatus(m.id, m.status)}>
                  {m.status ? <ToggleRight size={24} className="text-green-400" /> : <ToggleLeft size={24} className="text-gray-500" />}
                </button>
                <button onClick={() => openEdit(m)} className="w-9 h-9 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Edit2 size={15} />
                </button>
                <button onClick={() => deleteMethod(m.id, m.name)} className="w-9 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing.id ? "تعديل طريقة الدفع" : "إضافة طريقة دفع"} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">الاسم *</label>
              <input value={editing.name || ""} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} className="input-dark" placeholder="Bank of Palestine" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">النوع *</label>
              <select value={editing.type || "bank"} onChange={e => setEditing(p => ({ ...p, type: e.target.value as any }))} className="input-dark">
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">الرقم / العنوان / ID *</label>
            <input value={editing.value || ""} onChange={e => setEditing(p => ({ ...p, value: e.target.value }))} className="input-dark" placeholder="رقم الحساب أو العنوان..." />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">اسم المستفيد</label>
            <input value={editing.beneficiary_name || ""} onChange={e => setEditing(p => ({ ...p, beneficiary_name: e.target.value }))} className="input-dark" placeholder="علوش ستور" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">التعليمات</label>
            <textarea value={editing.instructions || ""} onChange={e => setEditing(p => ({ ...p, instructions: e.target.value }))} className="input-dark resize-none" rows={2} placeholder="تعليمات الدفع..." />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">الأيقونة</label>
            <div className="flex gap-2 flex-wrap">
              {PAYMENT_ICONS.map(icon => (
                <button key={icon} onClick={() => setEditing(p => ({ ...p, icon }))}
                  className={cn("w-10 h-10 rounded-xl text-xl transition-all", editing.icon === icon ? "bg-blue-600" : "glass hover:bg-primary-700/50")}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? "..." : editing.id ? "حفظ" : "إضافة"}
            </button>
            <button onClick={() => setModalOpen(false)} className="btn-ghost">إلغاء</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
