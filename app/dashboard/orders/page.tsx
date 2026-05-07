"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import { formatPrice, formatDate, STATUS_MAP } from "@/lib/utils";
import { Order, OrderStatus } from "@/lib/types";
import { Eye, Search, Filter, RefreshCw, Image } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const STATUSES: { value: string; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "pending", label: "منتظر" },
  { value: "paid", label: "مدفوع" },
  { value: "processing", label: "قيد التنفيذ" },
  { value: "completed", label: "مكتمل" },
  { value: "rejected", label: "مرفوض" },
  { value: "cancelled", label: "ملغي" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);

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

  const filtered = orders.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(s) ||
      o.product_name.toLowerCase().includes(s) ||
      (o.customer_name || "").toLowerCase().includes(s) ||
      (o.customer_phone || "").includes(s)
    );
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
      setSelectedOrder(null);
      fetchOrders();
    } else {
      toast.error("حدث خطأ");
    }
    setUpdating(false);
  }

  return (
    <>
      <Header title="الطلبات" subtitle="إدارة جميع طلبات المتجر" />

      {/* Filters */}
      <div className="glass rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث برقم الطلب أو العميل أو الخدمة..."
            className="input-dark pr-10"
          />
        </div>
        <button onClick={fetchOrders} className="btn-ghost flex items-center gap-2 whitespace-nowrap">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          تحديث
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
              statusFilter === s.value
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                : "glass text-gray-400 hover:text-white"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-primary-800/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-primary-800/30">
                {["رقم الطلب", "العميل", "الخدمة", "الدفع", "المبلغ", "الحالة", "التاريخ", ""].map(h => (
                  <th key={h} className="text-right text-gray-400 text-xs font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-primary-900/30">
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-primary-800/50 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center text-gray-500">لا توجد طلبات</td></tr>
              ) : filtered.map(order => (
                <tr key={order.id} className="border-b border-primary-900/30 hover:bg-primary-800/20 transition-colors">
                  <td className="px-4 py-3 text-blue-400 font-mono text-sm whitespace-nowrap">#{order.order_number}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white text-sm">{order.customer_name || "—"}</p>
                      <p className="text-gray-500 text-xs">{order.customer_phone || ""}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{order.product_name}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{order.payment_method_name}</td>
                  <td className="px-4 py-3 text-yellow-400 text-sm font-medium whitespace-nowrap">{formatPrice(order.price)}</td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="w-8 h-8 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 flex items-center justify-center text-blue-400 transition-all"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order detail modal */}
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`طلب #${selectedOrder?.order_number}`} size="lg">
        {selectedOrder && (
          <div className="space-y-6">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "العميل", value: selectedOrder.customer_name },
                { label: "الهاتف", value: selectedOrder.customer_phone },
                { label: "الإيميل", value: selectedOrder.customer_email },
                { label: "الخدمة", value: selectedOrder.product_name },
                { label: "المدة", value: selectedOrder.product_duration },
                { label: "السعر", value: formatPrice(selectedOrder.price) },
                { label: "طريقة الدفع", value: selectedOrder.payment_method_name },
                { label: "TXID", value: selectedOrder.txid },
              ].filter(f => f.value).map(field => (
                <div key={field.label} className="glass rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-1">{field.label}</p>
                  <p className="text-white text-sm font-medium break-all">{field.value}</p>
                </div>
              ))}
            </div>

            {/* Proof image */}
            {selectedOrder.proof_image && (
              <div>
                <p className="text-gray-400 text-xs mb-2">إثبات الدفع</p>
                <a
                  href={`https://api.telegram.org/file/bot${process.env.NEXT_PUBLIC_BOT_FILE_TOKEN}/${selectedOrder.proof_image}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                >
                  <Image size={16} />
                  عرض صورة الإثبات
                </a>
              </div>
            )}

            {/* Status */}
            <div>
              <p className="text-gray-400 text-xs mb-2">الحالة الحالية</p>
              <StatusBadge status={selectedOrder.status} />
            </div>

            {/* Change status */}
            <div>
              <p className="text-gray-400 text-sm font-medium mb-3">تغيير الحالة:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(["paid", "processing", "completed", "rejected", "cancelled"] as OrderStatus[]).map(s => (
                  <button
                    key={s}
                    disabled={updating || selectedOrder.status === s}
                    onClick={() => updateStatus(selectedOrder.id, s)}
                    className={cn(
                      "py-2 px-3 rounded-xl text-xs font-medium transition-all",
                      selectedOrder.status === s
                        ? "opacity-40 cursor-not-allowed bg-primary-800/50 text-gray-400"
                        : `${STATUS_MAP[s].bg} ${STATUS_MAP[s].color} hover:opacity-80`
                    )}
                  >
                    {updating ? "..." : STATUS_MAP[s].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
