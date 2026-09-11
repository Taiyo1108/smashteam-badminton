"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Sparkles, Shield, Heart } from "lucide-react";
import RegistrationModal from "@/app/components/recruitment/RegistrationModal";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden text-foreground">
      {/* Background Decorative Mesh & Glowing Spotlight */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#7A22E0_1px,transparent_1px)] [background-size:32px_32px] opacity-10" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-purple-100/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 font-bold text-xs sm:text-sm text-secondary hover:text-primary transition-colors px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 hover:border-primary/40 focus-ring cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Trang chủ CLB</span>
          </Link>

          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center font-black text-white text-xs border border-primary/40 shadow-xs">
              S
            </div>
            <span className="font-black text-base tracking-tight text-secondary">
              Smash<span className="text-primary">Team</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 z-10 relative px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center justify-center">
        
        {/* Top Header Banner */}
        <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Tuyển Thành Viên Mới 2026</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-secondary tracking-tight">
            Đăng Ký Gia Nhập <span className="text-primary">SmashTeam</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Chỉ mất 2 phút để hoàn tất đơn ứng tuyển và tham gia buổi casting sân cùng các vợt thủ.
          </p>
        </div>

        {/* Embedded Multi-Step Registration Form */}
        <div className="w-full max-w-2xl">
          <RegistrationModal isEmbedded={true} />
        </div>

        {/* Support Note */}
        <div className="mt-8 text-center text-xs text-slate-400 space-y-1">
          <p>Mọi thắc mắc về đợt tuyển vui lòng liên hệ Ban Chủ Nhiệm qua Zalo: <strong>0912.345.678</strong></p>
          <p className="text-[11px]">SmashTeam Badminton Club • Tinh thần thể thao trung thực & văn minh</p>
        </div>

      </main>

      {/* Footer Minimal */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-purple-100 z-10 bg-white/50">
        © 2026 SmashTeam Badminton Club. All rights reserved.
      </footer>
    </div>
  );
}
