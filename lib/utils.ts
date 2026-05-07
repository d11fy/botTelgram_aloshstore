import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { OrderStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return `${parseFloat(String(price)).toFixed(2)} ₪`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const STATUS_MAP: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "قيد الانتظار", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  paid: { label: "تم الدفع", color: "text-blue-400", bg: "bg-blue-400/10" },
  processing: { label: "قيد التنفيذ", color: "text-purple-400", bg: "bg-purple-400/10" },
  completed: { label: "مكتمل", color: "text-green-400", bg: "bg-green-400/10" },
  rejected: { label: "مرفوض", color: "text-red-400", bg: "bg-red-400/10" },
  cancelled: { label: "ملغي", color: "text-gray-400", bg: "bg-gray-400/10" },
};

export const STATUS_EMOJI: Record<OrderStatus, string> = {
  pending: "⏳",
  paid: "💰",
  processing: "⚙️",
  completed: "✅",
  rejected: "❌",
  cancelled: "🚫",
};
