"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Swords, LogOut, Loader2, Menu, X, Image as ImageIcon, Calendar, Sparkles, ShoppingBag } from "lucide-react";
import BrandLogo from "@/app/components/BrandLogo";
import ThemeToggle from "@/app/components/ThemeToggle";

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
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
    { name: "Nhân sự", href: "/admin/personnel", icon: Users },
    { name: "Quản lý Buổi tập", href: "/admin/sessions", icon: Calendar },
    { name: "Quản lý Nhiệm vụ", href: "/admin/quests", icon: Sparkles },
    { name: "Quản lý Gian hàng", href: "/admin/shop", icon: ShoppingBag },
    { name: "Quản lý nội dung", href: "/admin/content", icon: ImageIcon },
  ];

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("user_role");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar — đồng bộ template trắng/đen với trang chính */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-white text-slate-600 border-r border-slate-200 z-50 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform duration-300 flex flex-col`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size={32} />
            <span className="font-bold text-xl text-slate-900 tracking-tight">Admin Panel</span>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-black" onClick={() => setIsSidebarOpen(false)} aria-label="Đóng menu">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all text-sm font-bold ${
                  isActive
                    ? "bg-black text-white shadow-md"
                    : "hover:bg-slate-100 hover:text-black"
                }`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-1">
          <div className="px-4 py-2">
            <ThemeToggle />
          </div>
          <Link href="/profile" className="flex items-center gap-3 w-full px-4 py-3 rounded-full text-slate-600 hover:bg-slate-100 hover:text-black transition-colors">
            <Users className="w-5 h-5" />
            <span className="font-medium">Trang cá nhân</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 h-16 flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BrandLogo size={32} />
            <span className="font-bold">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Mở menu"
              className="p-2 -mr-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
