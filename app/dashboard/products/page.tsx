"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import Modal from "@/components/ui/Modal";
import { Product, Category } from "@/lib/types";
import { formatPrice, formatDate } from "@/lib/utils";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Package } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const emptyProduct: Partial<Product> = {
  name: "", description: "", category_id: "", price: 0, cost: 0,
  duration: "", activation_method: "", warranty: "", notes: "", status: true, sort_order: 0,
  required_info_type: "none", required_info_prompt: "" as string | undefined,
};

const INFO_TYPES = [
  { value: "none", label: "لا يحتاج معلومات" },
  { value: "email", label: "📧 إيميل" },
  { value: "email_password", label: "📧 إيميل + باسورد" },
  { value: "link", label: "🔗 رابط" },
  { value: "custom", label: "✏️ سؤال مخصص" },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Product>>(emptyProduct);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from("products").select("*, categories(name, icon)").order("sort_order").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").eq("status", true).order("sort_order"),
    ]);
    setProducts((prods || []) as Product[]);
    setCategories((cats || []) as Category[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openAdd() { setEditing(emptyProduct); setModalOpen(true); }
  function openEdit(p: Product) { setEditing({ ...p }); setModalOpen(true); }

  async function handleSave() {
    if (!editing.name || !editing.price || !editing.duration) {
      return toast.error("يرجى ملء الحقول المطلوبة");
    }
    setSaving(true);
    const data: any = {
      name: editing.name, description: editing.description || null,
      category_id: editing.category_id || null,
      price: Number(editing.price), cost: Number(editing.cost || 0),
      duration: editing.duration, activation_method: editing.activation_method || null,
      warranty: editing.warranty || null, notes: editing.notes || null,
      status: editing.status ?? true, sort_order: Number(editing.sort_order || 0),
    };
    if (editing.required_info_type && editing.required_info_type !== "none") {
      data.required_info_type = editing.required_info_type;
      data.required_info_prompt = editing.required_info_prompt || null;
    }

    if (editing.id) {
      const res = await fetch(`/api/products/${editing.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || "خطأ في التحديث"); }
      else toast.success("تم التحديث");
    } else {
      const res = await fetch("/api/products", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || "خطأ في الإضافة"); }
      else toast.success("تمت الإضافة");
    }

    setSaving(false);
    setModalOpen(false);
    fetchData();
  }

  async function toggleStatus(id: string, status: boolean) {
    await fetch(`/api/products/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: !status }),
    });
    fetchData();
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`هل أنت متأكد من حذف "${name}"؟`)) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (!res.ok) toast.error("لا يمكن حذف منتج مرتبط بطلبات");
    else { toast.success("تم الحذف"); fetchData(); }
  }

  return (
    <>
      <Header title="الاشتراكات" subtitle="إدارة منتجات وخدمات المتجر" />

      <div className="flex justify-end mb-6">
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> إضافة اشتراك
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass rounded-2xl p-6 animate-pulse">
              <div className="h-5 bg-primary-800/50 rounded mb-3 w-3/4" />
              <div className="h-4 bg-primary-800/50 rounded mb-2 w-1/2" />
              <div className="h-4 bg-primary-800/50 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Package size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">لا توجد منتجات بعد</p>
          <button onClick={openAdd} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus size={16} /> أضف أول منتج
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className={cn(
              "glass rounded-2xl p-5 border card-hover",
              p.status ? "border-primary-700/30" : "border-gray-700/30 opacity-60"
            )}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                      {(p as any).categories?.icon} {(p as any).categories?.name || "بلا تصنيف"}
                    </span>
                  </div>
                  <h3 className="text-white font-semibold">{p.name}</h3>
                </div>
                <button onClick={() => toggleStatus(p.id, p.status)} className="text-gray-400 hover:text-blue-400 transition-colors">
                  {p.status ? <ToggleRight size={24} className="text-green-400" /> : <ToggleLeft size={24} />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                <div className="bg-primary-900/50 rounded-xl p-2 text-center">
                  <p className="text-yellow-400 font-bold">{formatPrice(p.price)}</p>
                  <p className="text-gray-500 text-xs">السعر</p>
                </div>
                <div className="bg-primary-900/50 rounded-xl p-2 text-center">
                  <p className="text-blue-400 font-medium">{p.duration}</p>
                  <p className="text-gray-500 text-xs">المدة</p>
                </div>
              </div>

              {p.warranty && (
                <p className="text-gray-400 text-xs mb-3">🛡 {p.warranty}</p>
              )}

              <div className="flex gap-2">
                <button onClick={() => openEdit(p)} className="flex-1 btn-ghost text-sm py-1.5 flex items-center justify-center gap-1">
                  <Edit2 size={14} /> تعديل
                </button>
                <button onClick={() => deleteProduct(p.id, p.name)} className="w-10 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing.id ? "تعديل الاشتراك" : "إضافة اشتراك جديد"} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">اسم الاشتراك *</label>
              <input value={editing.name || ""} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} className="input-dark" placeholder="مثال: Netflix Premium" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">السعر (دولار) *</label>
              <input type="number" step="0.01" value={editing.price || ""} onChange={e => setEditing(p => ({ ...p, price: Number(e.target.value) }))} className="input-dark" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">التكلفة (للربح)</label>
              <input type="number" step="0.01" value={editing.cost || ""} onChange={e => setEditing(p => ({ ...p, cost: Number(e.target.value) }))} className="input-dark" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">المدة *</label>
              <input value={editing.duration || ""} onChange={e => setEditing(p => ({ ...p, duration: e.target.value }))} className="input-dark" placeholder="شهر / سنة / ..." />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">التصنيف</label>
              <select value={editing.category_id || ""} onChange={e => setEditing(p => ({ ...p, category_id: e.target.value }))} className="input-dark">
                <option value="">بلا تصنيف</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">طريقة التفعيل</label>
              <input value={editing.activation_method || ""} onChange={e => setEditing(p => ({ ...p, activation_method: e.target.value }))} className="input-dark" placeholder="إيميل وباسورد / رابط..." />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">الضمان</label>
              <input value={editing.warranty || ""} onChange={e => setEditing(p => ({ ...p, warranty: e.target.value }))} className="input-dark" placeholder="ضمان شهر..." />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">الوصف</label>
              <textarea value={editing.description || ""} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} className="input-dark resize-none" rows={2} placeholder="وصف الاشتراك..." />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">ملاحظات</label>
              <textarea value={editing.notes || ""} onChange={e => setEditing(p => ({ ...p, notes: e.target.value }))} className="input-dark resize-none" rows={2} placeholder="أي ملاحظات إضافية..." />
            </div>

            {/* Required info from customer */}
            <div className="sm:col-span-2 border-t border-primary-800/40 pt-4">
              <label className="block text-sm text-white font-medium mb-2">📋 معلومات مطلوبة من العميل عند الطلب</label>
              <select
                value={editing.required_info_type || "none"}
                onChange={e => setEditing(p => ({ ...p, required_info_type: e.target.value }))}
                className="input-dark mb-3"
              >
                {INFO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>

              {editing.required_info_type && editing.required_info_type !== "none" && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">رسالة للعميل (اختياري)</label>
                  <input
                    value={editing.required_info_prompt || ""}
                    onChange={e => setEditing(p => ({ ...p, required_info_prompt: e.target.value }))}
                    className="input-dark"
                    placeholder={
                      editing.required_info_type === "email" ? "أرسل الإيميل الذي تريد التفعيل عليه" :
                      editing.required_info_type === "email_password" ? "أرسل الإيميل وكلمة السر" :
                      editing.required_info_type === "link" ? "أرسل الرابط المطلوب" :
                      "اكتب سؤالك للعميل..."
                    }
                  />
                  <p className="text-gray-600 text-xs mt-1">اتركه فارغاً لاستخدام الرسالة الافتراضية</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-gray-400 text-sm">الحالة:</label>
            <button
              onClick={() => setEditing(p => ({ ...p, status: !p.status }))}
              className={cn("px-4 py-1.5 rounded-xl text-sm font-medium transition-all", editing.status ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400")}
            >
              {editing.status ? "✅ مفعل" : "⛔ مخفي"}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? "جاري الحفظ..." : editing.id ? "حفظ التعديلات" : "إضافة الاشتراك"}
            </button>
            <button onClick={() => setModalOpen(false)} className="btn-ghost">إلغاء</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
