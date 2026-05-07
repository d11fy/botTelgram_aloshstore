import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "blue" | "gold" | "green" | "purple" | "red";
  trend?: string;
}

const colors = {
  blue: { bg: "bg-blue-500/10", icon: "text-blue-400", border: "border-blue-500/20" },
  gold: { bg: "bg-yellow-500/10", icon: "text-yellow-400", border: "border-yellow-500/20" },
  green: { bg: "bg-green-500/10", icon: "text-green-400", border: "border-green-500/20" },
  purple: { bg: "bg-purple-500/10", icon: "text-purple-400", border: "border-purple-500/20" },
  red: { bg: "bg-red-500/10", icon: "text-red-400", border: "border-red-500/20" },
};

export default function StatCard({ title, value, icon: Icon, color = "blue", trend }: StatCardProps) {
  const c = colors[color];
  return (
    <div className={cn("glass rounded-2xl p-6 card-hover border", c.border)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {trend && <p className="text-xs text-gray-500 mt-1">{trend}</p>}
        </div>
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", c.bg)}>
          <Icon size={24} className={c.icon} />
        </div>
      </div>
    </div>
  );
}
