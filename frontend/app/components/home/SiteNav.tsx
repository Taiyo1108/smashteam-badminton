"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";

const NAV_LINKS = [
  { href: "#rankings", label: "Bảng xếp hạng" },
  { href: "#media", label: "Hoạt động" },
  { href: "#about", label: "Về chúng tôi" },
  { href: "#faq", label: "FAQ" },
] as const;

function SiteNav() {
  const [auth, setAuth] = useState<{ loggedIn: boolean; role: string } | null>(null);

  useEffect(() => {
    // Trang chính luôn sáng — gỡ class dark còn sót khi điều hướng từ trang tài khoản về
    document.documentElement.classList.remove("dark");
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        setAuth({ loggedIn: false, role: "" });
        return;
      }
      setAuth({ loggedIn: true, role: localStorage.getItem("user_role") ?? "" });
    } catch {
      setAuth({ loggedIn: false, role: "" });
    }
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full z-50 flex justify-center px-4 pt-4">
      <nav
        aria-label="Điều hướng chính"
        className="w-full max-w-[1120px] flex items-center justify-between gap-6 rounded-full bg-white/80 backdrop-blur-md border border-black/5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] px-5 py-3"
      >
        <a href="#hero" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="SmashTeam logo"
            width={32}
            height={32}
            priority
            className="w-8 h-8 rounded-xl object-cover"
          />
          <span className="font-bold text-[17px] tracking-tight">SmashTeam</span>
        </a>
        <div className="hidden md:flex items-center gap-8 text-[15px] font-medium text-black/70">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-black transition-colors">
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2 min-h-10 min-w-[140px] justify-end">
          {!auth ? (
            <span className="h-10 w-[140px] rounded-full bg-black/5 animate-pulse" aria-hidden />
          ) : auth.loggedIn ? (
            <Link
              href={auth.role === "admin" ? "/admin" : "/profile"}
              className="flex items-center gap-2 h-10 pl-5 pr-1.5 rounded-full bg-black text-white text-sm font-semibold hover:bg-black/85 transition-colors"
            >
              {auth.role === "admin" ? "Quản trị" : "Cá nhân"}
              <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:block text-sm font-semibold text-black/60 hover:text-black px-3"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-2 h-10 pl-5 pr-1.5 rounded-full bg-black text-white text-sm font-semibold hover:bg-black/85 transition-colors"
              >
                Gia nhập ngay
                <span className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </Link>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}

export default memo(SiteNav);
