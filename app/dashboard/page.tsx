import { createClient } from "@supabase/supabase-js";
import Header from "@/components/layout/Header";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatPrice, formatDate } from "@/lib/utils";
import { Order } from "@/lib/types";
import { ShoppingCart, DollarSign, TrendingUp, Star, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

async function getStats() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [{ data: todayOrders }, { data: allOrders }, { data: products }, { data: recentOrders }] =
    await Promise.all([
      supabase.from("orders").select("id").gte("created_at", today.toISOString()),
      supabase.from("orders").select("price, status, product_name"),
      supabase.from("products").select("id").eq("status", true),
      supabase.from("orders")
        .select("*, users(name, username)")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  const completedOrders = (allOrders || []).filter(o => o.status === "completed");
  const totalRevenue = completedOrders.reduce((s, o) => s + Number(o.price), 0);
  const netProfit = completedOrders.reduce((s, o) => s + Number(o.price), 0);
  const pendingOrders = (allOrders || []).filter(o => o.status === "pending").length;

  // Top product
  const productCount: Record<string, number> = {};
  (allOrders || []).forEach(o => {
    productCount[o.product_name] = (productCount[o.product_name] || 0) + 1;
  });
  const topProduct = Object.entries(productCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  return {
    todayOrders: todayOrders?.length || 0,
    totalRevenue,
    netProfit,
    topProduct,
    pendingOrders,
    completedOrders: completedOrders.length,
    activeProducts: products?.length || 0,
    recentOrders: (recentOrders || []) as Order[],
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <>
      <Header title="لوحة التحكم" subtitle="مرحباً بك في علوش ستور" />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard title="طلبات اليوم" value={stats.todayOrders} icon={ShoppingCart} color="blue" />
        <StatCard title="إجمالي الإيرادات" value={formatPrice(stats.totalRevenue)} icon={DollarSign} color="gold" />
        <StatCard title="صافي الربح" value={formatPrice(stats.netProfit)} icon={TrendingUp} color="green" />
        <StatCard title="منتجات نشطة" value={stats.activeProducts} icon={Star} color="purple" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard title="طلبات منتظرة" value={stats.pendingOrders} icon={Clock} color="red" />
        <StatCard title="طلبات مكتملة" value={stats.completedOrders} icon={CheckCircle} color="green" />
        <StatCard title="أكثر خدمة مطلوبة" value={stats.topProduct} icon={Star} color="gold" trend="الأكثر مبيعاً" />
      </div>

      {/* Recent Orders */}
      <div className="glass rounded-2xl border border-primary-800/30">
        <div className="flex items-center justify-between p-6 border-b border-primary-800/50">
          <h2 className="text-lg font-bold text-white">آخر الطلبات</h2>
          <Link href="/dashboard/orders" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
            عرض الكل ←
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-primary-800/30">
                <th className="text-right text-gray-400 text-xs font-medium px-6 py-3">رقم الطلب</th>
                <th className="text-right text-gray-400 text-xs font-medium px-6 py-3">العميل</th>
                <th className="text-right text-gray-400 text-xs font-medium px-6 py-3">الخدمة</th>
                <th className="text-right text-gray-400 text-xs font-medium px-6 py-3">السعر</th>
                <th className="text-right text-gray-400 text-xs font-medium px-6 py-3">الحالة</th>
                <th className="text-right text-gray-400 text-xs font-medium px-6 py-3">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map(order => (
                <tr key={order.id} className="border-b border-primary-900/50 hover:bg-primary-800/20 transition-colors">
                  <td className="px-6 py-4 text-blue-400 font-mono text-sm">#{order.order_number}</td>
                  <td className="px-6 py-4 text-white text-sm">
                    {order.customer_name || order.users?.name || "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-300 text-sm">{order.product_name}</td>
                  <td className="px-6 py-4 text-yellow-400 text-sm font-medium">{formatPrice(order.price)}</td>
                  <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{formatDate(order.created_at)}</td>
                </tr>
              ))}
              {!stats.recentOrders.length && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">لا توجد طلبات بعد</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
