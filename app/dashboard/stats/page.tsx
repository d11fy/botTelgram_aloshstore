"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import StatCard from "@/components/ui/StatCard";
import { formatPrice } from "@/lib/utils";
import { Order } from "@/lib/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { DollarSign, TrendingUp, ShoppingCart, Package, Star, CheckCircle } from "lucide-react";

export default function StatsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("orders").select("*, products(cost)").then(({ data }) => {
      setOrders((data || []) as Order[]);
      setLoading(false);
    });
  }, []);

  // Calculations
  const completed = orders.filter(o => o.status === "completed");
  const totalRevenue = completed.reduce((s, o) => s + Number(o.price), 0);
  const totalCost = completed.reduce((s, o) => s + Number((o as any).products?.cost || 0), 0);
  const netProfit = totalRevenue - totalCost;
  const totalOrders = orders.length;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter(o => new Date(o.created_at) >= today).length;

  // Product stats
  const productStats: Record<string, { count: number; revenue: number }> = {};
  orders.forEach(o => {
    if (!productStats[o.product_name]) productStats[o.product_name] = { count: 0, revenue: 0 };
    productStats[o.product_name].count++;
    if (o.status === "completed") productStats[o.product_name].revenue += Number(o.price);
  });
  const productChartData = Object.entries(productStats)
    .map(([name, d]) => ({ name, طلبات: d.count, إيرادات: d.revenue }))
    .sort((a, b) => b["طلبات"] - a["طلبات"])
    .slice(0, 8);

  // Status pie
  const statusCount: Record<string, number> = {};
  orders.forEach(o => { statusCount[o.status] = (statusCount[o.status] || 0) + 1; });
  const pieData = Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  const PIE_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#22c55e", "#ef4444", "#6b7280"];

  // Monthly revenue (last 6 months)
  const monthlyData: Record<string, number> = {};
  completed.forEach(o => {
    const month = new Date(o.created_at).toLocaleString("ar-EG", { month: "short", year: "2-digit" });
    monthlyData[month] = (monthlyData[month] || 0) + Number(o.price);
  });
  const monthlyChartData = Object.entries(monthlyData)
    .map(([month, revenue]) => ({ month, إيرادات: revenue }))
    .slice(-6);

  if (loading) {
    return (
      <>
        <Header title="الإحصائيات" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="glass rounded-2xl h-28" />)}
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="الإحصائيات" subtitle="تحليل أداء المتجر" />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard title="إجمالي الطلبات" value={totalOrders} icon={ShoppingCart} color="blue" />
        <StatCard title="إجمالي الإيرادات" value={formatPrice(totalRevenue)} icon={DollarSign} color="gold" />
        <StatCard title="صافي الربح" value={formatPrice(netProfit)} icon={TrendingUp} color="green" />
        <StatCard title="طلبات اليوم" value={todayOrders} icon={CheckCircle} color="purple" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Monthly Revenue Chart */}
        <div className="glass rounded-2xl p-6 border border-primary-800/30">
          <h3 className="text-white font-semibold mb-4">الإيرادات الشهرية</h3>
          {monthlyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyChartData}>
                <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e3a8a", borderRadius: "12px", color: "#fff" }} />
                <Bar dataKey="إيرادات" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-500">لا توجد بيانات</div>
          )}
        </div>

        {/* Status Pie */}
        <div className="glass rounded-2xl p-6 border border-primary-800/30">
          <h3 className="text-white font-semibold mb-4">توزيع الحالات</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e3a8a", borderRadius: "12px", color: "#fff" }} />
                <Legend formatter={v => <span style={{ color: "#9ca3af", fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-500">لا توجد بيانات</div>
          )}
        </div>
      </div>

      {/* Product performance */}
      <div className="glass rounded-2xl p-6 border border-primary-800/30">
        <h3 className="text-white font-semibold mb-4">أداء المنتجات</h3>
        {productChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={productChartData} layout="vertical">
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e3a8a", borderRadius: "12px", color: "#fff" }} />
              <Bar dataKey="طلبات" fill="#3b82f6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-gray-500">لا توجد بيانات</div>
        )}
      </div>
    </>
  );
}
