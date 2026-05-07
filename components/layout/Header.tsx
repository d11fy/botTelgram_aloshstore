"use client";
import { useSession } from "next-auth/react";
import { Bell, User } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 glass rounded-xl px-4 py-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 flex items-center justify-center">
            <User size={16} className="text-blue-400" />
          </div>
          <span className="text-white text-sm font-medium hidden sm:block">
            {session?.user?.name || "Admin"}
          </span>
        </div>
      </div>
    </header>
  );
}
