"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const ROLE_LABELS: Record<string, string> = {
  product_manager: "Product Manager",
  developer: "Developer",
  executive: "Executive",
};

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "📊" },
  { name: "Chat", href: "/chat", icon: "💬" },
  { name: "Connections", href: "/connections", icon: "🔗" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold tracking-wide">MAHALO3</h1>
        <p className="text-xs text-gray-400 mt-1">AI-Powered SDLC Platform</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-700">
        {user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-400">
                  {ROLE_LABELS[user.role] || user.role}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors text-left"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm">
              ?
            </div>
            <div>
              <p className="text-sm text-gray-300">Not logged in</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
