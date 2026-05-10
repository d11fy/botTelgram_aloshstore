"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import Modal from "@/components/ui/Modal";
import { Category } from "@/lib/types";
import { Plus, Edit2, Trash2, Grid } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const ICONS = ["🤖", "🎬", "🎨", "🎮", "📚", "📱", "🔧", "💼", "🌐", "🎵", "🏋️", "💰"];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Category>>({ name: "", name_en: "", icon: "📦", sort_order: 0, status: true });
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    setCategories((data || []) as Category[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  function openAdd() {
    setEditing({ name: "", name_en: "", icon: "📦", sort_order: 0, status: true });
    setModalOpen(true);
  }
  function openEdit(c: Category) { setEditing({ ...c }); setModalOpen(true); }

  async function handleSave() {
    if (!editing.name) return toast.error("أدخل اسم التصنيف");
    setSaving(true);
    const data = { name: editing.name, name_en: editing.name_en || null, icon: editing.icon || "📦", sort_order: Number(editing.sort_order || 0), status: editing.status ?? true };

    if (editing.id) {
      const { error } = await supabaseAdmin.from("categories").update(data).eq("id", editing.id);
      if (error) toast.error("خطأ"); else toast.success("تم التحديث");
    } else {
      const { error } = await supabaseAdmin.from("categories").insert(data);
      if (error) toast.error("خطأ"); else toast.success("تمت الإضافة");
    }
    setSaving(false);
    setModalOpen(false);
    fetchCategories();
  }

  async function deleteCategory(id: string, name: string) {
    if (!confirm(`حذف "${name}"؟`)) return;
    const { error } = await supabaseAdmin.from("categories").delete().eq("id", id);
    if (error) toast.error("لا يمكن حذف تصنيف مرتبط بمنتجات");
    else { toast.success("تم الحذف"); fetchCategories(); }
  }

  return (
    <>
      <Header title="التصنيفات" subtitle="إدارة تصنيفات الاشتراكات" />
      <div className="flex justify-end mb-6">
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> إضافة تصنيف
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="glass rounded-2xl p-6 animate-pulse h-32" />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Grid size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">لا توجد تصنيفات</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className={cn(
              "glass rounded-2xl p-5 border card-hover text-center",
              cat.status ? "border-primary-700/30" : "border-gray-700/30 opacity-50"
            )}>
              <div className="text-4xl mb-2">{cat.icon}</div>
              <h3 className="text-white font-semibold">{cat.name}</h3>
              {cat.name_en && <p className="text-gray-500 text-xs mt-0.5">{cat.name_en}</p>}
              <div className="flex gap-2 mt-4">
                <button onClick={() => openEdit(cat)} className="flex-1 btn-ghost text-xs py-1.5 flex items-center justify-center gap-1">
                  <Edit2 size={12} /> تعديل
                </button>
                <button onClick={() => deleteCategory(cat.id, cat.name)} className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing.id ? "تعديل التصنيف" : "إضافة تصنيف"} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">الاسم بالعربي *</label>
            <input value={editing.name || ""} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} className="input-dark" placeholder="مثال: ذكاء اصطناعي" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">الاسم بالإنجليزي</label>
            <input value={editing.name_en || ""} onChange={e => setEditing(p => ({ ...p, name_en: e.target.value }))} className="input-dark" placeholder="AI" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">الأيقونة</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(icon => (
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
