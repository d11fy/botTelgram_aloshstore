"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Package, Grid, CreditCard,
  ShoppingCart, BarChart3, LogOut,
  Star, Menu, X, ChevronRight, Megaphone
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "الرئيسية" },
  { href: "/dashboard/orders", icon: ShoppingCart, label: "الطلبات" },
  { href: "/dashboard/products", icon: Package, label: "الاشتراكات" },
  { href: "/dashboard/categories", icon: Grid, label: "التصنيفات" },
  { href: "/dashboard/payments", icon: CreditCard, label: "طرق الدفع" },
  { href: "/dashboard/stats", icon: BarChart3, label: "الإحصائيات" },
  { href: "/dashboard/broadcast", icon: Megaphone, label: "رسالة جماعية" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavLink = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
          isActive
            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-900/30"
            : "text-gray-400 hover:text-white hover:bg-primary-800/50"
        )}
      >
        <item.icon size={20} className={cn(isActive ? "text-white" : "text-gray-400 group-hover:text-blue-400")} />
        {!collapsed && <span className="font-medium">{item.label}</span>}
        {!collapsed && isActive && <ChevronRight size={16} className="mr-auto opacity-60" />}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 p-6 border-b border-primary-800/50",
        collapsed && "justify-center"
      )}>
        <div className="w-10 h-10 rounded-xl primary-gradient flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-900/50">
          <Star size={20} className="text-yellow-300" fill="currentColor" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">علوش ستور</h1>
            <p className="text-gray-500 text-xs">لوحة التحكم</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(item => <NavLink key={item.href} item={item} />)}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-primary-800/50 space-y-1">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut size={20} />
          {!collapsed && <span className="font-medium">تسجيل الخروج</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 right-4 z-50 lg:hidden w-10 h-10 glass rounded-xl flex items-center justify-center text-white"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        "fixed top-0 right-0 h-full w-72 z-40 lg:hidden glass border-l border-primary-800/50 transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col h-screen sticky top-0 glass border-l border-primary-800/50 transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -left-3 top-20 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg z-10 hover:bg-blue-500"
        >
          <ChevronRight size={14} className={cn("transition-transform", !collapsed && "rotate-180")} />
        </button>
        <SidebarContent />
      </aside>
    </>
  );
}
