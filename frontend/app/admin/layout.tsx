"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, Swords, LogOut, Loader2, Menu, X,
  Image as ImageIcon, Calendar, Sparkles, ShoppingBag, Home, Trophy
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Auth check for Admin role
    const token = localStorage.getItem("admin_token");
    const role = localStorage.getItem("user_role");
    if ((!token || role !== "admin") && !pathname.includes("/admin/login")) {
      router.push("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, router]);

  if (!isAuthenticated && !pathname.includes("/admin/login")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If login page, don't show sidebar
  if (pathname.includes("/admin/login")) {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Tổng quan", href: "/admin", icon: LayoutDashboard },
    { name: "Cập nhật kết quả", href: "/admin/matches", icon: Swords },
    { name: "Nhân sự & Thành viên", href: "/admin/personnel", icon: Users },
    { name: "Quản lý Buổi tập", href: "/admin/sessions", icon: Calendar },
    { name: "Quản lý Sự kiện", href: "/admin/events", icon: Trophy },
    { name: "Quản lý Nhiệm vụ", href: "/admin/quests", icon: Sparkles },
    { name: "Quản lý Gian hàng", href: "/admin/shop", icon: ShoppingBag },
    { name: "Quản lý Nội dung", href: "/admin/content", icon: ImageIcon },
  ];

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("user_role");
    router.push("/login");
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-secondary/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar cố định — chỉ nội dung bên phải được cuộn */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 shrink-0 bg-secondary text-slate-300 z-50 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform duration-300 flex flex-col border-r border-purple-950/40 shadow-xl`}>
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center font-black text-white shadow-[0_0_15px_rgba(122,34,224,0.5)]">
              S
            </div>
            <div>
              <span className="font-black text-lg text-white block leading-tight">Admin Hub</span>
              <span className="text-[10px] text-purple-300 uppercase tracking-wider font-bold">SmashTeam</span>
            </div>
          </div>
          <button
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center focus-ring"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Đóng menu sidebar"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Điều hướng quản trị" className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`min-h-[44px] flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-medium text-xs sm:text-sm focus-ring cursor-pointer ${
                  isActive
                    ? "bg-primary text-white font-bold shadow-md shadow-primary/35"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} aria-hidden="true" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/5 space-y-1">
          <Link
            href="/"
            className="min-h-[44px] flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors focus-ring"
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" aria-hidden="true" />
            <span>Trang chủ</span>
          </Link>
          <Link 
            href="/profile" 
            className="min-h-[44px] flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors focus-ring"
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" aria-hidden="true" />
            <span>Trang cá nhân</span>
          </Link>
          <button
            onClick={handleLogout}
            className="min-h-[44px] flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors focus-ring cursor-pointer"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" aria-hidden="true" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area — cột duy nhất được cuộn, sidebar giữ cố định */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white/95 backdrop-blur-md border-b border-purple-100 h-16 flex items-center px-4 justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-white shadow-xs">
              S
            </div>
            <span className="font-bold text-secondary text-sm">Quản Trị SmashTeam</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-700 hover:bg-purple-50 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center focus-ring cursor-pointer"
            aria-label="Mở menu quản trị"
          >
            <Menu className="w-6 h-6" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
