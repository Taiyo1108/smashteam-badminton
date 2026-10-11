"use client";

import React, { useEffect } from "react";
import { 
  X, ShieldCheck, ShieldAlert, Award, Calendar, 
  CheckCircle2, AlertTriangle, AlertCircle, TrendingUp, Info
} from "lucide-react";
import { formatVietnamDate } from "@/app/utils/date";

export interface ReputationEvent {
  id?: string;
  delta: number;
  type: string;
  title: string;
  sessionTitle?: string | null;
  reason?: string;
  date: string | Date;
}

export interface ReputationData {
  score: number;
  label: string;
  level: string;
  color: string;
  breakdown?: {
    noShowCount?: number;
    lateCancelCount?: number;
    missingCheckoutCount?: number;
    attendedValidCount?: number;
    attendedCount?: number;
    activeYellowCards?: number;
    activeRedCards?: number;
  };
  history?: ReputationEvent[];
}

interface ReputationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  reputation?: ReputationData | null;
}

export default function ReputationHistoryModal({
  isOpen,
  onClose,
  reputation
}: ReputationHistoryModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const score = reputation?.score ?? 100;
  const label = reputation?.label ?? (score >= 90 ? "Xuất sắc" : score >= 75 ? "Tốt" : score >= 50 ? "Trung bình" : "Nguy cơ");
  const history = reputation?.history || [];

  const getScoreTheme = () => {
    if (score >= 90) {
      return {
        badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        barColor: "bg-emerald-500",
        textColor: "text-emerald-600",
        cardBg: "from-emerald-500/10 via-emerald-500/5 to-transparent"
      };
    }
    if (score >= 75) {
      return {
        badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
        barColor: "bg-blue-500",
        textColor: "text-blue-600",
        cardBg: "from-blue-500/10 via-blue-500/5 to-transparent"
      };
    }
    if (score >= 50) {
      return {
        badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
        barColor: "bg-amber-500",
        textColor: "text-amber-600",
        cardBg: "from-amber-500/10 via-amber-500/5 to-transparent"
      };
    }
    return {
      badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
      barColor: "bg-rose-500",
      textColor: "text-rose-600",
      cardBg: "from-rose-500/10 via-rose-500/5 to-transparent"
    };
  };

  const theme = getScoreTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      {/* Background overlay click */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] z-10 animate-scaleUp">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Điểm Hoạt Động & Uy Tín
              </h2>
              <p className="text-[11px] font-medium text-slate-500">
                Thước đo chuyên cần & văn hóa sinh hoạt CLB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* Main Score Card */}
          <div className={`p-5 rounded-2xl border border-slate-200 bg-gradient-to-br ${theme.cardBg} flex flex-col gap-3 shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Điểm uy tín hiện tại
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className={`text-4xl font-black tracking-tight ${theme.textColor}`}>
                    {score}
                  </span>
                  <span className="text-sm font-bold text-slate-400">/ 100</span>
                </div>
              </div>
              <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border shadow-sm ${theme.badgeBg}`}>
                {label}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className={`h-full ${theme.barColor} transition-all duration-700 rounded-full`}
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Điểm uy tín khởi điểm là <strong>100 điểm</strong>. Duy trì điểm số cao giúp bạn được ưu tiên giữ chỗ các buổi tập đông, tham gia các giải đấu nội bộ và hưởng quyền lợi thành viên chính thức.
            </p>
          </div>

          {/* Quy tắc tính điểm rút gọn */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-500" /> Quy Tắc Tính Điểm Minh Bạch
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-white border border-slate-200/60 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0">+2</span>
                <span className="text-slate-600 text-[10px]">Tham gia buổi tập đủ</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200/60 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-lg bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center shrink-0">-20</span>
                <span className="text-slate-600 text-[10px]">Vắng không phép (No-show)</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200/60 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-lg bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center shrink-0">-10</span>
                <span className="text-slate-600 text-[10px]">Hủy lịch tập sát giờ</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200/60 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-lg bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center shrink-0">-5</span>
                <span className="text-slate-600 text-[10px]">Quên quét mã check-out</span>
              </div>
            </div>
          </div>

          {/* Timeline History */}
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-slate-700" /> Lịch Sử Biến Động Điểm
            </h4>

            {history.length > 0 ? (
              <div className="space-y-2.5">
                {history.map((event, idx) => {
                  const isPositive = event.delta > 0;
                  return (
                    <div
                      key={event.id || idx}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-sm flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 mt-0.5 border ${
                            isPositive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {isPositive ? `+${event.delta}` : event.delta}
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900">
                            {event.title}
                          </div>
                          {event.sessionTitle && (
                            <div className="text-[11px] font-medium text-slate-600 mt-0.5">
                              {event.sessionTitle}
                            </div>
                          )}
                          {event.reason && (
                            <div className="text-[10px] text-slate-400 mt-0.5 italic">
                              {event.reason}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatVietnamDate(event.date, "full")}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 border ${
                          isPositive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {isPositive ? `Cộng điểm` : `Trừ điểm`}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                <p className="text-xs font-bold text-slate-800">Chưa có vi phạm nào</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Bạn đang giữ trọn vẹn điểm uy tín khởi điểm. Hãy duy trì tác phong tốt nhé!
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
