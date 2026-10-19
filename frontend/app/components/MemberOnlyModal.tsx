"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Crown, Sparkles, X, ArrowRight, Lock, ShieldCheck } from "lucide-react";

interface MemberOnlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export default function MemberOnlyModal({
  isOpen,
  onClose,
  title = "Đặc Quyền Thành Viên Chính Thức",
  message = "Bạn phải là thành viên chính thức của Smash Team mới được sử dụng chức năng này. Hãy đăng ký gia nhập CLB để mở khóa đặc quyền nhận thưởng Nhiệm vụ và đổi quà tại Smash Shop!"
}: MemberOnlyModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 180);
  };

  const handleJoinClub = () => {
    handleClose();
    router.push("/register");
  };

  if (!mounted || !isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200 select-none ${
        isClosing ? "opacity-0" : "opacity-100 animate-in fade-in"
      }`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Background ambient radial glow */}
      <div 
        className="absolute pointer-events-none w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[100px]"
        aria-hidden="true" 
      />

      {/* Modal Dialog Card */}
      <div
        className={`relative w-full max-w-md bg-gradient-to-b from-[#1c0c38] via-[#120726] to-[#090214] rounded-3xl p-6 sm:p-8 border border-purple-500/40 shadow-[0_0_60px_rgba(122,34,224,0.4)] text-center text-white overflow-hidden transition-all duration-200 ${
          isClosing ? "scale-95 opacity-0" : "animate-in zoom-in-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top gold shimmer bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-purple-300/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Crown Icon Box */}
        <div className="relative mx-auto w-20 h-20 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl animate-ping" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 border border-yellow-200 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.6)]">
            <Crown className="w-9 h-9 text-slate-950 drop-shadow-md" />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
          <Lock className="w-3.5 h-3.5" />
          <span>Khóa Đặc Quyền Hội Viên</span>
        </div>

        {/* Title */}
        <h3 className="text-xl sm:text-2xl font-black text-white leading-tight mt-1">
          {title}
        </h3>

        {/* Message */}
        <p className="text-xs sm:text-sm text-purple-200/80 mt-3 leading-relaxed px-2">
          {message}
        </p>

        {/* Member Benefits Preview */}
        <div className="mt-5 p-3.5 rounded-2xl bg-white/5 border border-purple-500/20 text-left space-y-2">
          <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Đặc quyền mở khóa khi trở thành Thành viên:
          </div>
          <div className="text-xs text-purple-200/90 space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Nhận toàn bộ phần thưởng Smash Coins & EXP Nhiệm vụ</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Đổi áo đấu, nước uống và vật phẩm tại Smash Shop</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Mở Hộp quà bí ẩn hàng tuần nhận Khiên Hộ Mệnh</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={handleJoinClub}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.5)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Đăng Ký Gia Nhập CLB Ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleClose}
            className="w-full py-2.5 text-xs font-bold text-purple-300/80 hover:text-white transition-colors cursor-pointer"
          >
            Đã hiểu, tôi sẽ xem thêm
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
