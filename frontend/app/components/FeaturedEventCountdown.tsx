"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Calendar, MapPin, Clock, Trophy, Flame, 
  ArrowRight, Sparkles, CheckCircle2, AlertCircle, ChevronRight 
} from "lucide-react";
import { format } from "date-fns";

interface FeaturedEventCountdownProps {
  settings?: Record<string, string>;
  upcomingSession?: any;
  onViewSchedule?: () => void;
  isLoggedIn?: boolean;
}

export default function FeaturedEventCountdown({
  settings = {},
  upcomingSession,
  onViewSchedule,
  isLoggedIn = false
}: FeaturedEventCountdownProps) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalMs: 0,
    isExpired: false,
    isHappeningNow: false
  });

  // Calculate target event parameters from settings or upcoming session
  const eventEnabled = settings.featured_event_enabled !== "false";
  const eventTitle = settings.featured_event_title || 
    upcomingSession?.title || 
    "Giải Đấu Cầu Lông SmashTeam Championship 2026";
  const eventSubtitle = settings.featured_event_subtitle || 
    "Sự kiện quy tụ các vợt thủ tranh cúp ELO Vàng, vinh danh tay vợt xuất sắc và phần thưởng tài trợ độc quyền.";
  const eventLocation = settings.featured_event_location || 
    upcomingSession?.location || 
    "Cụm Sân Cầu Lông Lan Anh, 291 CMT8, Q.10, TP.HCM";
  const eventBadge = settings.featured_event_badge || "SỰ KIỆN NỔI BẬT";
  const actionText = settings.featured_event_action_text || "Đăng ký tham gia ngay";
  const actionLink = settings.featured_event_action_link || (isLoggedIn ? "/check-in" : "/register");

  // Determine target date/time
  const targetDateStr = settings.featured_event_date || upcomingSession?.date_time || "2026-09-20T08:30:00";

  useEffect(() => {
    setMounted(true);

    const calculateTime = () => {
      const targetTime = new Date(targetDateStr).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (isNaN(targetTime)) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: false, isHappeningNow: false });
        return;
      }

      // Event is currently happening (within 4 hours of start)
      if (diff <= 0 && diff > -4 * 60 * 60 * 1000) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalMs: diff,
          isExpired: false,
          isHappeningNow: true
        });
        return;
      }

      // Event has already finished
      if (diff <= -4 * 60 * 60 * 1000) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalMs: diff,
          isExpired: true,
          isHappeningNow: false
        });
        return;
      }

      // Live countdown calculation
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        days: Math.max(0, days),
        hours: Math.max(0, hours),
        minutes: Math.max(0, minutes),
        seconds: Math.max(0, seconds),
        totalMs: diff,
        isExpired: false,
        isHappeningNow: false
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDateStr]);

  if (!eventEnabled) return null;

  // Format date display in Vietnamese (dd/MM/yyyy HH:mm)
  const formattedEventDate = (() => {
    try {
      const d = new Date(targetDateStr);
      if (isNaN(d.getTime())) return targetDateStr;
      return format(d, "dd/MM/yyyy HH:mm");
    } catch {
      return targetDateStr;
    }
  })();

  const padZero = (n: number) => String(n).padStart(2, "0");

  return (
    <section 
      aria-labelledby="countdown-event-title"
      className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 my-10"
    >
      {/* Outer Glow Spotlight */}
      <div 
        className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-smash-violet/30 to-purple-800/30 rounded-3xl blur-2xl opacity-60 pointer-events-none" 
        aria-hidden="true" 
      />

      {/* Main Glassmorphism Athletic Board Card */}
      <div className="relative rounded-3xl bg-[#141026]/95 border border-primary/40 shadow-[0_0_40px_rgba(122,34,224,0.25)] overflow-hidden backdrop-blur-xl p-6 sm:p-8 md:p-10">
        
        {/* Subtle decorative background lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#7A22E0_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-smash-violet/15 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* ========================================================================= */}
          {/* CỘT TRÁI (7 CỘT): CHI TIẾT SỰ KIỆN & NÚT HÀNH ĐỘNG                       */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 space-y-5 text-left">
            
            {/* Top Badges */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary/25 border border-primary/60 text-purple-200 text-xs font-black uppercase tracking-wider shadow-sm">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" aria-hidden="true" />
                <span>{eventBadge}</span>
              </span>

              {mounted && timeLeft.isHappeningNow ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/60 text-red-300 text-xs font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  ĐANG DIỄN RA
                </span>
              ) : mounted && !timeLeft.isExpired ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  SẮP BẮT ĐẦU
                </span>
              ) : null}
            </div>

            {/* Event Title */}
            <div>
              <h2 
                id="countdown-event-title"
                className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight"
              >
                {eventTitle}
              </h2>
              <p className="text-sm sm:text-base text-slate-300 mt-2 line-clamp-2 leading-relaxed font-normal">
                {eventSubtitle}
              </p>
            </div>

            {/* Info Chips: Date, Time & Venue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Date & Time */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 border border-primary/30">
                  <Calendar className="w-5 h-5 text-smash-violet" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Thời gian bắt đầu</p>
                  <p className="text-xs sm:text-sm font-bold text-white truncate capitalize">{formattedEventDate}</p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <MapPin className="w-5 h-5 text-amber-400" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Địa điểm thi đấu</p>
                  <p className="text-xs sm:text-sm font-bold text-white truncate" title={eventLocation}>{eventLocation}</p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href={actionLink} className="inline-block">
                <button
                  id="countdown-cta-primary"
                  className="min-h-[48px] px-6 sm:px-8 py-3 bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-black rounded-full shadow-[0_0_25px_rgba(122,34,224,0.6)] hover:shadow-[0_0_35px_rgba(157,78,221,0.8)] transition-all transform active:scale-95 flex items-center gap-2 cursor-pointer focus-ring"
                >
                  <span>{actionText}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </Link>

              {onViewSchedule && (
                <button
                  id="countdown-cta-schedule"
                  onClick={onViewSchedule}
                  className="min-h-[48px] px-5 sm:px-6 py-3 bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-bold rounded-full border border-white/20 hover:border-white/40 transition-all active:scale-95 flex items-center gap-2 cursor-pointer focus-ring"
                >
                  <span>Xem lịch toàn mùa</span>
                  <ChevronRight className="w-4 h-4 text-purple-300" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CỘT PHẢI (5 CỘT): BẢNG ĐỒNG HỒ ĐẾM NGƯỢC THỜI GIAN THỰC                  */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="w-full bg-gradient-to-b from-white/10 to-white/5 border border-primary/40 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
              
              {/* Header Ticker Title */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Thời gian đếm ngược
                  </span>
                </div>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
              </div>

              {/* 4 Countdown Boxes */}
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {/* 1. NGÀY */}
                <div className="flex flex-col items-center justify-center bg-[#0C0A1A]/80 border border-purple-500/30 rounded-2xl py-3 sm:py-4 px-1 shadow-inner relative group hover:border-primary transition-all">
                  <span className="text-2xl sm:text-4xl md:text-5xl font-black text-white tabular-nums tracking-tight">
                    {mounted ? padZero(timeLeft.days) : "--"}
                  </span>
                  <span className="text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider text-purple-300 mt-1">
                    Ngày
                  </span>
                </div>

                {/* 2. GIỜ */}
                <div className="flex flex-col items-center justify-center bg-[#0C0A1A]/80 border border-purple-500/30 rounded-2xl py-3 sm:py-4 px-1 shadow-inner relative group hover:border-primary transition-all">
                  <span className="text-2xl sm:text-4xl md:text-5xl font-black text-white tabular-nums tracking-tight">
                    {mounted ? padZero(timeLeft.hours) : "--"}
                  </span>
                  <span className="text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider text-purple-300 mt-1">
                    Giờ
                  </span>
                </div>

                {/* 3. PHÚT */}
                <div className="flex flex-col items-center justify-center bg-[#0C0A1A]/80 border border-purple-500/30 rounded-2xl py-3 sm:py-4 px-1 shadow-inner relative group hover:border-primary transition-all">
                  <span className="text-2xl sm:text-4xl md:text-5xl font-black text-white tabular-nums tracking-tight">
                    {mounted ? padZero(timeLeft.minutes) : "--"}
                  </span>
                  <span className="text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider text-purple-300 mt-1">
                    Phút
                  </span>
                </div>

                {/* 4. GIÂY */}
                <div className="flex flex-col items-center justify-center bg-primary/20 border border-primary/60 rounded-2xl py-3 sm:py-4 px-1 shadow-[0_0_15px_rgba(122,34,224,0.3)] relative group transition-all">
                  <span className="text-2xl sm:text-4xl md:text-5xl font-black text-white tabular-nums tracking-tight animate-pulse">
                    {mounted ? padZero(timeLeft.seconds) : "--"}
                  </span>
                  <span className="text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider text-purple-200 mt-1">
                    Giây
                  </span>
                </div>
              </div>

              {/* Status Note / Live Status Footnote */}
              <div className="mt-5 pt-4 border-t border-white/10 text-center">
                {mounted && timeLeft.isHappeningNow ? (
                  <p className="text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    Sự kiện đang diễn ra tại sân! Hãy vào điểm danh ngay.
                  </p>
                ) : mounted && timeLeft.isExpired ? (
                  <p className="text-xs text-slate-400 font-medium">
                    Sự kiện đã hoàn tất. Ban chủ nhiệm sẽ cập nhật đợt kế tiếp sớm!
                  </p>
                ) : (
                  <p className="text-xs text-purple-200 font-medium flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                    Đếm ngược trực tiếp theo giờ địa phương Việt Nam (GMT+7)
                  </p>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
