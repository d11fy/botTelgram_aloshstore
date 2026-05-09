"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import { formatPrice, formatDate, STATUS_MAP } from "@/lib/utils";
import { Order, OrderStatus } from "@/lib/types";
import { Eye, Search, RefreshCw, Send, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "all", label: "الكل" },
  { value: "pending", label: "⏳ منتظر" },
  { value: "paid", label: "💰 مدفوع" },
  { value: "processing", label: "⚙️ تنفيذ" },
  { value: "completed", label: "✅ مكتمل" },
  { value: "rejected", label: "❌ مرفوض" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [subType, setSubType] = useState<"email_pass"|"email"|"link"|"custom">("email_pass");
  const [subEmail, setSubEmail] = useState("");
  const [subPassword, setSubPassword] = useState("");
  const [subLink, setSubLink] = useState("");
  const [subCustom, setSubCustom] = useState("");
  const [sendingSubscription, setSendingSubscription] = useState(false);

  function buildSubData() {
    if (subType === "email_pass") return `📧 الإيميل: ${subEmail}\n🔑 الباسورد: ${subPassword}`;
    if (subType === "email") return `📧 الإيميل: ${subEmail}`;
    if (subType === "link") return `🔗 رابط الاشتراك:\n${subLink}`;
    return subCustom;
  }

  function isSubReady() {
    if (subType === "email_pass") return subEmail.trim() && subPassword.trim();
    if (subType === "email") return subEmail.trim();
    if (subType === "link") return subLink.trim();
    return subCustom.trim();
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select("*, users(name, username, telegram_id)")
      .order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    const { data } = await query;
    setOrders((data || []) as Order[]);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const filtered = orders.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return o.order_number.toLowerCase().includes(s) ||
      o.product_name.toLowerCase().includes(s) ||
      (o.customer_name || "").toLowerCase().includes(s) ||
      (o.customer_phone || "").includes(s) ||
      ((o as any).users?.username || "").toLowerCase().includes(s);
  });

  async function updateStatus(orderId: string, status: OrderStatus) {
    setUpdating(true);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success("تم تحديث الحالة");
      if (selectedOrder) setSelectedOrder({ ...selectedOrder, status });
      fetchOrders();
    } else toast.error("حدث خطأ");
    setUpdating(false);
  }

  async function sendSubscription() {
    if (!isSubReady() || !selectedOrder) return;
    setSendingSubscription(true);
    const res = await fetch(`/api/orders/${selectedOrder.id}/send-subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionData: buildSubData() }),
    });
    if (res.ok) {
      toast.success("✅ تم إرسال بيانات الاشتراك للعميل");
      setSubEmail(""); setSubPassword(""); setSubLink(""); setSubCustom("");
      setSelectedOrder({ ...selectedOrder, status: "completed" });
      fetchOrders();
    } else {
      const err = await res.json();
      toast.error(err.error || "خطأ في الإرسال");
    }
    setSendingSubscription(false);
  }

  const pendingCount = orders.filter(o => o.status === "pending").length;

  return (
    <>
      <Header
        title="الطلبات"
        subtitle={pendingCount > 0 ? `⚠️ ${pendingCount} طلب بانتظار المراجعة` : "جميع الطلبات"}
      />

      {/* Filters */}
      <div className="glass rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث..." className="input-dark pr-10"
          />
        </div>
        <button onClick={fetchOrders} className="btn-ghost flex items-center gap-2">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> تحديث
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {STATUSES.map(s => (
          <button key={s.value} onClick={() => setStatusFilter(s.value)}
            className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all",
              statusFilter === s.value ? "bg-blue-600 text-white shadow-lg" : "glass text-gray-400 hover:text-white"
            )}>
            {s.label}
            {s.value === "pending" && pendingCount > 0 && (
              <span className="mr-1 bg-red-500 text-white text-xs rounded-full px-1.5">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-primary-800/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-primary-800/30">
                {["رقم الطلب", "العميل", "تلجرام", "الخدمة", "المبلغ", "الحالة", "التاريخ", ""].map(h => (
                  <th key={h} className="text-right text-gray-400 text-xs font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-primary-900/30">
                    {[...Array(8)].map((_, j) => <td key={j} className="px-4 py-4"><div className="h-4 bg-primary-800/50 rounded animate-pulse" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center text-gray-500">لا توجد طلبات</td></tr>
              ) : filtered.map(order => (
                <tr key={order.id}
                  className={cn("border-b border-primary-900/30 hover:bg-primary-800/20 transition-colors",
                    order.status === "pending" && "bg-yellow-500/5"
                  )}>
                  <td className="px-4 py-3 text-blue-400 font-mono text-sm">#{order.order_number}</td>
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{order.customer_name || "—"}</p>
                    <p className="text-gray-500 text-xs">{order.customer_phone || ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    {(order as any).users?.username ? (
                      <a href={`https://t.me/${(order as any).users.username}`} target="_blank"
                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
                        @{(order as any).users.username}
                        <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-gray-500 text-xs">ID: {(order as any).users?.telegram_id || "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{order.product_name}</td>
                  <td className="px-4 py-3 text-yellow-400 font-medium text-sm">{formatPrice(order.price)}</td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setSelectedOrder(order); setSubType("email_pass"); setSubEmail(""); setSubPassword(""); setSubLink(""); setSubCustom(""); }}
                      className="w-8 h-8 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 flex items-center justify-center text-blue-400 transition-all">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`طلب #${selectedOrder?.order_number}`} size="xl">
        {selectedOrder && (
          <div className="space-y-5">
            {/* Customer & Telegram info */}
            <div className="glass rounded-xl p-4 border border-blue-500/20">
              <p className="text-blue-400 text-xs font-medium mb-3">معلومات العميل</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-400 text-xs">الاسم</p><p className="text-white">{selectedOrder.customer_name || "—"}</p></div>
                <div><p className="text-gray-400 text-xs">الهاتف</p><p className="text-white">{selectedOrder.customer_phone || "—"}</p></div>
                <div><p className="text-gray-400 text-xs">الإيميل</p><p className="text-white">{selectedOrder.customer_email || "—"}</p></div>
                <div>
                  <p className="text-gray-400 text-xs">تلجرام</p>
                  {(selectedOrder as any).users?.username ? (
                    <a href={`https://t.me/${(selectedOrder as any).users.username}`} target="_blank"
                      className="text-blue-400 hover:underline flex items-center gap-1">
                      @{(selectedOrder as any).users.username} <ExternalLink size={11} />
                    </a>
                  ) : (
                    <p className="text-white">ID: {(selectedOrder as any).users?.telegram_id || "—"}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Order info */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "الخدمة", value: selectedOrder.product_name },
                { label: "المدة", value: selectedOrder.product_duration },
                { label: "المبلغ", value: formatPrice(selectedOrder.price) },
                { label: "طريقة الدفع", value: selectedOrder.payment_method_name },
                { label: "TXID", value: selectedOrder.txid },
                { label: "📋 معلومات العميل", value: (selectedOrder as any).customer_notes },
              ].filter(f => f.value).map(f => (
                <div key={f.label} className="glass rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-1">{f.label}</p>
                  <p className="text-white text-sm break-all">{f.value}</p>
                </div>
              ))}
            </div>

            {/* Payment proof */}
            {selectedOrder.proof_image && (
              <div className="glass rounded-xl p-3">
                <p className="text-gray-400 text-xs mb-2">إثبات الدفع</p>
                <a
                  href={`/api/telegram-file/${selectedOrder.proof_image}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={`/api/telegram-file/${selectedOrder.proof_image}`}
                    alt="إثبات الدفع"
                    className="rounded-xl max-h-72 w-full object-contain border border-primary-700/40 cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </a>
                <p className="text-gray-500 text-xs mt-1 text-center">اضغط للتكبير</p>
              </div>
            )}

            {/* Status */}
            <div>
              <p className="text-gray-400 text-xs mb-2">الحالة الحالية</p>
              <StatusBadge status={selectedOrder.status} />
            </div>

            {/* Change status */}
            <div>
              <p className="text-sm text-gray-300 font-medium mb-2">تغيير الحالة:</p>
              <div className="grid grid-cols-3 gap-2">
                {(["paid", "processing", "completed", "rejected", "cancelled"] as OrderStatus[]).map(s => (
                  <button key={s} disabled={updating || selectedOrder.status === s}
                    onClick={() => updateStatus(selectedOrder.id, s)}
                    className={cn("py-2 px-3 rounded-xl text-xs font-medium transition-all",
                      selectedOrder.status === s ? "opacity-40 cursor-not-allowed bg-primary-800/50 text-gray-400"
                        : `${STATUS_MAP[s].bg} ${STATUS_MAP[s].color} hover:opacity-80`
                    )}>
                    {STATUS_MAP[s].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Send subscription data */}
            <div className="border-t border-primary-800/50 pt-4">
              <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Send size={16} className="text-green-400" />
                إرسال بيانات الاشتراك للعميل
              </p>

              {/* Type selector */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {([
                  { key: "email_pass", label: "إيميل + باسورد" },
                  { key: "email", label: "إيميل فقط" },
                  { key: "link", label: "رابط" },
                  { key: "custom", label: "مخصص" },
                ] as const).map(t => (
                  <button key={t.key} onClick={() => setSubType(t.key)}
                    className={cn("py-2 px-2 rounded-xl text-xs font-medium transition-all text-center",
                      subType === t.key ? "bg-blue-600 text-white" : "glass text-gray-400 hover:text-white"
                    )}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Fields */}
              {subType === "email_pass" && (
                <div className="space-y-2 mb-3">
                  <input value={subEmail} onChange={e => setSubEmail(e.target.value)}
                    className="input-dark" placeholder="📧 الإيميل" />
                  <input value={subPassword} onChange={e => setSubPassword(e.target.value)}
                    className="input-dark" placeholder="🔑 الباسورد" />
                </div>
              )}
              {subType === "email" && (
                <input value={subEmail} onChange={e => setSubEmail(e.target.value)}
                  className="input-dark mb-3" placeholder="📧 الإيميل" />
              )}
              {subType === "link" && (
                <input value={subLink} onChange={e => setSubLink(e.target.value)}
                  className="input-dark mb-3" placeholder="🔗 رابط الاشتراك" dir="ltr" />
              )}
              {subType === "custom" && (
                <textarea value={subCustom} onChange={e => setSubCustom(e.target.value)}
                  className="input-dark resize-none mb-3" rows={4}
                  placeholder="أكتب أي بيانات تريد إرسالها..." />
              )}

              <button
                onClick={sendSubscription}
                disabled={sendingSubscription || !isSubReady()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {sendingSubscription ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : <Send size={16} />}
                {sendingSubscription ? "جاري الإرسال..." : "إرسال للعميل عبر تلجرام ✈️"}
              </button>
              <p className="text-gray-500 text-xs mt-2 text-center">سيتم إرسال البيانات مباشرة لتلجرام العميل وتحديث الطلب إلى مكتمل</p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
