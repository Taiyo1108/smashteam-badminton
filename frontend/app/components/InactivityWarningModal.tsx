"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ShieldAlert, Check, Calendar, ArrowRight, Sparkles } from "lucide-react";
import { API_URL } from "@/app/config";

export interface InactivityWarningData {
  recordId: string;
  cardType: string;
  reason: string;
  monthYear: string;
  monthDisplay: string;
  sessionsAttended: number;
  requiredSessions: number;
  violationNumber: number;
  penaltyReputation: number;
  issuedAt?: string;
}

interface InactivityWarningModalProps {
  warning: InactivityWarningData | null;
  isOpen: boolean;
  onClose: () => void;
  onAcknowledgeSuccess?: () => void;
}

export default function InactivityWarningModal({
  warning,
  isOpen,
  onClose,
  onAcknowledgeSuccess
}: InactivityWarningModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !warning) return null;

  const handleAcknowledge = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem("token") || localStorage.getItem("admin_token");
      if (token) {
        await fetch(`${API_URL}/api/profile/acknowledge-inactivity-warning`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ recordId: warning.recordId })
        });
      }

      // Lưu cờ đã đọc vào localStorage để ngăn chặn triệt để
      localStorage.setItem(`ack_inactivity_${warning.recordId}`, "true");

      if (onAcknowledgeSuccess) {
        onAcknowledgeSuccess();
      }
      onClose();
    } catch (err) {
      console.error("Error acknowledging warning:", err);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const isFirstViolation = warning.violationNumber <= 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative w-full max-w-lg bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-7 shadow-[0_0_60px_rgba(245,158,11,0.25)] text-white overflow-hidden"
        >
          {/* Decorative Background Glows */}
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Header with Yellow Card Badge */}
          <div className="flex items-start gap-4 mb-5">
            <div className="relative shrink-0">
              <div className="w-12 h-16 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 border-2 border-yellow-200 shadow-lg shadow-amber-500/30 flex items-center justify-center transform -rotate-6">
                <span className="text-slate-950 font-black text-xl">🟨</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-black border-2 border-slate-900">
                {warning.violationNumber}
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold uppercase tracking-wider">
                  Kỷ luật chuyên cần
                </span>
                <span className="text-slate-400 text-xs font-semibold">
                  {warning.monthDisplay}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1 tracking-tight">
                Cảnh Báo Kỷ Luật Hoạt Động CLB
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Thông báo vi phạm quy chế số buổi sinh hoạt định kỳ tối thiểu
              </p>
            </div>
          </div>

          {/* Stats Breakdown Card */}
          <div className="bg-slate-800/80 border border-amber-500/30 rounded-2xl p-4 mb-4 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                Buổi tham gia
              </span>
              <span className="text-base sm:text-lg font-black text-amber-400">
                {warning.sessionsAttended}
                <span className="text-xs text-slate-500 font-semibold">/{warning.requiredSessions}</span>
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                Hình thức phạt
              </span>
              <span className="text-xs sm:text-sm font-black text-amber-300 flex items-center justify-center gap-1 mt-1">
                <span>1 Thẻ Vàng</span>
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                Điểm uy tín
              </span>
              <span className="text-base sm:text-lg font-black text-rose-400">
                {warning.penaltyReputation}đ
              </span>
            </div>
          </div>

          {/* Policy Explanation */}
          <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed bg-amber-950/20 border border-amber-500/20 rounded-2xl p-4 mb-5">
            <p>
              Theo nội quy của CLB Smash Team, tất cả thành viên chính thức cần tham gia{" "}
              <strong className="text-amber-300 font-bold">tối thiểu 2 buổi sinh hoạt/tháng</strong> để duy trì phong độ và tinh thần đồng đội.
            </p>
            <p>
              Trong <strong className="text-white font-bold">{warning.monthDisplay}</strong>, bạn đã không đạt chỉ tiêu trên ({warning.sessionsAttended}/{warning.requiredSessions} buổi), do đó hệ thống áp dụng:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-amber-200/90 font-medium">
              <li>
                Phạt <strong className="text-amber-300">1 Thẻ vàng</strong> vào hồ sơ kỷ luật.
              </li>
              <li>
                Trừ <strong className="text-rose-400">{Math.abs(warning.penaltyReputation)} điểm uy tín</strong> ({warning.penaltyReputation}đ) trên trang cá nhân.
              </li>
            </ul>

            <div className="mt-2 pt-2 border-t border-amber-500/20 text-[11px] text-amber-400/90 flex items-start gap-1.5 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                {isFirstViolation
                  ? "Lưu ý quan trọng: Nếu các tháng tiếp theo bạn tiếp tục không đạt tối thiểu 2 buổi/tháng, mức phạt lần 2 sẽ tăng lên -40 điểm uy tín."
                  : `Cảnh báo tái phạm (Lần ${warning.violationNumber}): Bạn đã bị trừ 40 điểm uy tín do tiếp tục không đạt tối thiểu 2 buổi/tháng. Hãy tích cực tham gia để tránh nguy cơ bị xử lý kỷ luật mức cao hơn.`}
              </span>
            </div>
          </div>

          {/* Confirmation Action Button */}
          <div className="space-y-2">
            <button
              id="btn-acknowledge-inactivity-warning"
              type="button"
              disabled={submitting}
              onClick={handleAcknowledge}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/25 transition-all transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <span>Đang ghi nhận...</span>
              ) : (
                <>
                  <Check className="w-5 h-5 text-slate-950 stroke-[3]" />
                  <span>Tôi Đã Hiểu & Cam Kết Tham Gia Đầy Đủ</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-slate-400 italic">
              * Cảnh báo này chỉ hiển thị 1 lần duy nhất sau khi bạn xác nhận.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
