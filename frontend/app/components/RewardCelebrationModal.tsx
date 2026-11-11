"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Sparkles, Trophy, X, Coins, Shield, ArrowUpCircle, Check, ShoppingBag, Ticket } from "lucide-react";
import confetti from "canvas-confetti";

export interface RewardItem {
  name: string;
  imageUrl?: string | null;
  description?: string;
  type?: string;
  quantity?: number;
}

export interface RewardCelebrationData {
  isOpen: boolean;
  type: "quest" | "mystery_box" | "shop_purchase" | "level_up" | "generic";
  title: string;
  subtitle?: string;
  coins?: number;
  spentCoins?: number;
  xp?: number;
  item?: RewardItem;
  couponCode?: string | null;
  levelUp?: {
    leveledUp: boolean;
    currentLevel?: number;
  };
}

interface RewardCelebrationModalProps {
  data: RewardCelebrationData | null;
  onClose: () => void;
}

// Hàm phát âm thanh chúc mừng chiến thắng (Web Audio API đa âm sắc, không cần file ngoài)
function playRewardChime(isJackpot = false) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Hợp âm Trưởng tươi vui (C5, E5, G5, B5, C6, E6)
    const freqs = isJackpot
      ? [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51] // C5, E5, G5, B5, C6, E6
      : [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Sử dụng sóng sine ngọt ngào kèm sóng triangle tạo độ vang lấp lánh
      osc.type = idx % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      const noteTime = now + idx * 0.08;
      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.22, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.7);
    });
  } catch {
    // Trình duyệt chặn autoplay âm thanh khi chưa tương tác
  }
}

// Âm thanh click nhận thưởng giòn tan
function playCollectSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.12); // E6

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  } catch {
    // ignore
  }
}

export default function RewardCelebrationModal({ data, onClose }: RewardCelebrationModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Kích hoạt pháo hoa đa tầng & âm thanh rực rỡ khi mở modal
  useEffect(() => {
    if (!data?.isOpen) return;

    const isJackpot = Boolean(
      (data.coins && data.coins >= 40) ||
      data.levelUp?.leveledUp ||
      data.type === "shop_purchase" ||
      data.item
    );

    // Phát âm thanh chúc mừng
    playRewardChime(isJackpot);

    // Đợt 1: Bắn pháo hoa trung tâm bùng nổ
    confetti({
      particleCount: isJackpot ? 120 : 80,
      spread: 80,
      origin: { y: 0.55 },
      colors: ["#FFD700", "#FFA500", "#7A22E0", "#9D4EDD", "#2dd4bf", "#ffffff"],
      shapes: ["circle", "star"],
      scalar: 1.25,
      disableForReducedMotion: true,
      zIndex: 10001,
    });

    // Đợt 2: Pháo hoa cánh bay từ 2 bên sườn
    const timer1 = setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 60,
        origin: { x: 0.12, y: 0.7 },
        colors: ["#FFD700", "#FFA500", "#7A22E0", "#2dd4bf"],
        zIndex: 10001,
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 60,
        origin: { x: 0.88, y: 0.7 },
        colors: ["#FFD700", "#FFA500", "#7A22E0", "#2dd4bf"],
        zIndex: 10001,
      });
    }, 280);

    // Đợt 3: Mưa sao lấp lánh nhẹ nhàng rơi xuống
    const timer2 = setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 100,
        origin: { y: 0.3 },
        colors: ["#FFD700", "#ffffff", "#c084fc"],
        shapes: ["star"],
        gravity: 0.8,
        scalar: 0.9,
        zIndex: 10001,
      });
    }, 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [data?.isOpen, data?.coins, data?.levelUp, data?.item, data?.type]);

  // Phím tắt Enter, Space, Escape để đóng modal tiện lợi
  useEffect(() => {
    if (!data?.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        handleConfirm();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [data?.isOpen]);

  const handleConfirm = () => {
    playCollectSound();
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 180);
  };

  if (!mounted || !data?.isOpen || typeof document === "undefined") {
    return null;
  }

  const hasCoins = typeof data.coins === "number" && data.coins > 0;
  const hasXp = typeof data.xp === "number" && data.xp > 0;
  const isLevelUp = Boolean(data.levelUp?.leveledUp);
  const isJackpot = Boolean(hasCoins && (data.coins || 0) >= 40);
  const isShopPurchase = data.type === "shop_purchase";

  return createPortal(
    <div
      className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl transition-opacity duration-200 select-none ${
        isClosing ? "opacity-0" : "opacity-100 animate-in fade-in"
      }`}
      onClick={handleConfirm}
      role="dialog"
      aria-modal="true"
    >
      {/* VÒNG QUAY TIA SÁNG HÀO QUANG (ROTATING GOD RAYS) */}
      <div
        className="absolute pointer-events-none w-[700px] h-[700px] sm:w-[850px] sm:h-[850px] rounded-full opacity-35 filter blur-xs animate-[spin_25s_linear_infinite]"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(255,215,0,0.3) 0deg, transparent 25deg, rgba(168,85,247,0.3) 50deg, transparent 75deg, rgba(45,212,191,0.3) 100deg, transparent 125deg, rgba(255,215,0,0.3) 150deg, transparent 175deg, rgba(244,63,94,0.3) 200deg, transparent 225deg, rgba(168,85,247,0.3) 250deg, transparent 275deg, rgba(255,215,0,0.3) 300deg, transparent 325deg, rgba(45,212,191,0.3) 350deg, transparent 360deg)",
        }}
        aria-hidden="true"
      />

      {/* ÁNH SÁNG TÂM ĐIỂM (AMBIENT RADIAL GLOW) */}
      <div
        className={`absolute pointer-events-none w-96 h-96 rounded-full filter blur-3xl opacity-60 transition-all duration-700 animate-pulse ${
          isJackpot || isShopPurchase
            ? "bg-amber-400/40"
            : isLevelUp
            ? "bg-purple-500/40"
            : "bg-primary/35"
        }`}
        aria-hidden="true"
      />

      {/* KHUNG THẺ PHẦN THƯỞNG CHÍNH (CENTER REWARD CARD) */}
      <div
        className={`relative w-full max-w-lg bg-gradient-to-b from-[#1e0f3d] via-[#130728] to-[#090214] rounded-3xl p-6 sm:p-8 border border-purple-500/40 shadow-[0_0_80px_rgba(122,34,224,0.45)] text-center text-white overflow-hidden transition-all duration-200 ${
          isClosing ? "scale-95 opacity-0" : "animate-in zoom-in-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng nhanh góc trên */}
        <button
          onClick={handleConfirm}
          className="absolute top-4 right-4 p-2 rounded-full text-purple-300/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer z-20"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Dải sáng viền trên cùng */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />

        {/* HUY HIỆU DANH HIỆU TRÊN CÙNG */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border mb-4 shadow-lg backdrop-blur-md bg-purple-950/70 border-purple-400/40 text-purple-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
          {data.type === "quest"
            ? "Hoàn Thành Nhiệm Vụ"
            : data.type === "mystery_box"
            ? "Hộp Quà May Mắn"
            : data.type === "shop_purchase"
            ? "Mua Hàng Thành Công"
            : "Phần Thưởng Độc Quyền"}
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
        </div>

        {/* TIÊU ĐỀ PHẦN THƯỞNG */}
        <h3 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md">
          {data.title}
        </h3>

        {/* MÔ TẢ PHỤ */}
        <p className="text-xs sm:text-sm text-purple-200/70 mt-1.5 max-w-sm mx-auto leading-relaxed">
          {data.subtitle || "Phần thưởng đã được cộng trực tiếp vào tài khoản của bạn!"}
        </p>

        {/* BANNER THĂNG CẤP ĐẶC BIỆT (NẾU CÓ LEVEL UP) */}
        {isLevelUp && (
          <div className="mt-4 p-3 rounded-2xl bg-gradient-to-r from-purple-600/30 via-fuchsia-600/30 to-purple-600/30 border border-fuchsia-400/50 flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(217,70,239,0.4)] animate-bounce">
            <ArrowUpCircle className="w-5 h-5 text-fuchsia-300 animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm font-black text-fuchsia-100 uppercase tracking-wide">
              ⭐ LÊN CẤP! BẠN ĐẠT CẤP ĐỘ {data.levelUp?.currentLevel} ⭐
            </span>
          </div>
        )}

        {/* KHU VỰC HIỂN THỊ PHẦN THƯỞNG TRỌNG TÂM (HERO REWARD SHOWCASE) */}
        <div className="mt-6 mb-6 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          {/* 1. HIỂN THỊ COIN (NẾU CÓ TỪ NHIỆM VỤ HOẶC HỘP QUÀ) */}
          {hasCoins && (
            <div className="relative group flex-1 w-full p-4 rounded-2xl bg-gradient-to-b from-amber-500/15 to-purple-950/40 border border-amber-400/40 shadow-[0_0_30px_rgba(245,158,11,0.25)] flex flex-col items-center justify-center gap-2 hover:scale-102 transition-transform">
              {/* Icon đồng xu 3D vàng óng */}
              <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 flex items-center justify-center shadow-[0_0_25px_rgba(251,191,36,0.6)] border-2 border-yellow-200">
                <Coins className="w-8 h-8 sm:w-9 sm:h-9 text-slate-950 drop-shadow-md" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-200 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-400 text-[9px] font-black items-center justify-center text-slate-950">
                    ★
                  </span>
                </span>
              </div>

              {/* Số lượng xu nhận được */}
              <div className="space-y-0.5">
                <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                  +{data.coins}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-200/80">
                  Smash Coins
                </div>
              </div>

              {/* Tag Jackpot nếu nhận nhiều xu */}
              {isJackpot && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white shadow-md animate-pulse">
                  🔥 JACKPOT!
                </span>
              )}
            </div>
          )}

          {/* 2. HIỂN THỊ EXP (NẾU CÓ TỪ NHIỆM VỤ) */}
          {hasXp && (
            <div className="relative group flex-1 w-full p-4 rounded-2xl bg-gradient-to-b from-purple-500/15 to-purple-950/40 border border-purple-400/40 shadow-[0_0_30px_rgba(168,85,247,0.25)] flex flex-col items-center justify-center gap-2 hover:scale-102 transition-transform">
              {/* Icon viên đá EXP phát sáng tím */}
              <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-fuchsia-400 via-purple-600 to-indigo-700 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.6)] border-2 border-purple-300">
                <Sparkles className="w-8 h-8 sm:w-9 sm:h-9 text-white drop-shadow-md" />
              </div>

              {/* Số lượng EXP nhận được */}
              <div className="space-y-0.5">
                <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-purple-200 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                  +{data.xp}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-purple-200/80">
                  Kinh Nghiệm (EXP)
                </div>
              </div>
            </div>
          )}

          {/* 3. HIỂN THỊ VẬT PHẨM (VẬT PHẨM TỪ CỬA HÀNG HOẶC HỘP QUÀ) */}
          {data.item && (
            <div className="relative group flex-1 w-full p-5 rounded-2xl bg-gradient-to-b from-purple-500/20 via-[#1a0c36] to-purple-950/50 border border-purple-400/50 shadow-[0_0_35px_rgba(168,85,247,0.3)] flex flex-col items-center justify-center gap-3">
              {data.item.imageUrl ? (
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-amber-400/60 bg-purple-950/70 p-1.5 shadow-[0_0_25px_rgba(251,191,36,0.4)]">
                  <Image
                    src={data.item.imageUrl}
                    alt={data.item.name}
                    fill
                    sizes="112px"
                    unoptimized
                    className="object-contain p-1 hover:scale-105 transition-transform"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-purple-600 to-indigo-700 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.6)] border-2 border-purple-300">
                  <ShoppingBag className="w-9 h-9 text-white drop-shadow-md" />
                </div>
              )}

              <div className="space-y-1">
                <div className="text-base sm:text-lg font-black text-amber-300 leading-tight">
                  {data.item.name}
                </div>
                <p className="text-[11px] text-purple-200/80 max-w-xs">
                  {data.item.description || "Vật phẩm đã sẵn sàng sử dụng trong Túi đồ của bạn!"}
                </p>
              </div>

              {/* Thông tin số xu đã thanh toán (khi mua hàng) */}
              {typeof data.spentCoins === "number" && data.spentCoins > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                  <Coins className="w-3.5 h-3.5 text-amber-300" />
                  <span>Đã thanh toán: {data.spentCoins} Smash Coins</span>
                </div>
              )}

              {/* Mã nhận quà vật lý (nếu có Coupon Code) */}
              {data.couponCode && (
                <div className="w-full mt-1 p-2.5 rounded-xl bg-purple-900/50 border border-purple-400/40 flex flex-col items-center gap-1 shadow-inner">
                  <span className="text-[10px] text-purple-200 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Ticket className="w-3 h-3 text-amber-300" /> Mã nhận tại sân CLB:
                  </span>
                  <span className="font-mono text-sm sm:text-base font-black text-amber-300 tracking-widest px-3 py-0.5 rounded bg-black/50 border border-amber-400/50">
                    {data.couponCode}
                  </span>
                  <span className="text-[9px] text-purple-300/70">
                    Mã này đã được lưu trong Túi Đồ để bạn xuất trình nhận đồ
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* NÚT BẤM "TUYỆT VỜI / NHẬN THƯỞNG" LỘNG LẪY */}
        <button
          onClick={handleConfirm}
          className="relative group w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.5)] active:scale-95 transition-all cursor-pointer overflow-hidden"
        >
          {/* Hiệu ứng tia sáng quét ngang nút (Shimmer sweep) */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-xs">
            <Check className="w-4 h-4 stroke-[3]" />
            Tuyệt vời / Hoàn tất
          </span>
        </button>

        {/* Gợi ý phím tắt */}
        <p className="text-[10px] text-purple-300/40 mt-3">
          Nhấn phím <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[9px]">Enter</kbd> hoặc chạm bất kỳ đâu để tiếp tục
        </p>
      </div>
    </div>,
    document.body
  );
}
