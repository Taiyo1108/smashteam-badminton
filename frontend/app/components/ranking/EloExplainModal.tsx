"use client";

import React from "react";
import { X, Trophy, ShieldCheck, Sparkles, TrendingUp, Info } from "lucide-react";

interface EloExplainModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EloExplainModal({ isOpen, onClose }: EloExplainModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded-lg bg-purple-500/30 text-purple-300">
              <Trophy className="w-4 h-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-purple-300">
              Luật Cạnh Tranh CLB
            </span>
          </div>
          <h3 className="text-xl font-black tracking-tight">Hệ Thống Xếp Hạng ELO SmashTeam</h3>
          <p className="text-xs text-purple-200/80 mt-1">
            Quy chuẩn tính điểm thể thao công bằng, minh bạch và khoa học
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-sm text-slate-600">
          {/* Rule 1 */}
          <div className="flex gap-3 p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100">
            <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Điểm Khởi Điểm & Phân Hạng</h4>
              <p className="text-xs mt-0.5 text-slate-600 leading-relaxed">
                Mỗi thành viên gia nhập có điểm cơ sở <strong>1000 ELO</strong>. Khi thi đấu các trận giao lưu chính thức, hệ thống ELO chuẩn quốc tế sẽ tự động tính toán điểm cộng/trừ theo chênh lệch trình độ giữa hai bên.
              </p>
            </div>
          </div>

          {/* Rule 2 */}
          <div className="flex gap-3 p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Hạng Tạm Thời (Provisional) vs Chính Thức</h4>
              <p className="text-xs mt-0.5 text-slate-600 leading-relaxed">
                Thành viên đấu <strong>dưới 3 trận</strong> được xếp trạng thái <em>Tạm thời</em>. Cần hoàn thành tối thiểu <strong>3 trận chính thức</strong> để được công nhận vị trí chính thức và đủ điều kiện lọt vào Bục Vinh Quang Top 3 (Podium).
              </p>
            </div>
          </div>

          {/* Rule 3 */}
          <div className="flex gap-3 p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/60">
            <TrendingUp className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Biến Động Tuần (Weekly Movement)</h4>
              <p className="text-xs mt-0.5 text-slate-600 leading-relaxed">
                Hệ thống lưu lại bản snapshot thứ hạng vào <strong>00:00 sáng Thứ Hai hàng tuần</strong>. Chỉ số tăng (↑) hoặc giảm (↓) trên bảng xếp hạng thể hiện mức thăng/trầm của bạn so với bảng snapshot tuần gần nhất.
              </p>
            </div>
          </div>

          {/* Rule 4 */}
          <div className="flex gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <Info className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Quy Tắc Phân Định Đồng Điểm (Tie-Break)</h4>
              <p className="text-xs mt-0.5 text-slate-600 leading-relaxed">
                Khi bằng ELO, thứ tự xếp hạng tuân theo ưu tiên: <strong>1. Số trận đã đấu cao hơn</strong> → <strong>2. Tỷ lệ thắng cao hơn</strong> → <strong>3. Ngày gia nhập sớm hơn</strong>.
              </p>
            </div>
          </div>

          {/* Tier list summary */}
          <div className="pt-2">
            <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
              Các Bậc Danh Vọng SmashTeam
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-red-500 to-purple-600 text-white text-xs font-bold text-center">
                Challenger: 1800+
              </div>
              <div className="p-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold text-center">
                Diamond: 1600+
              </div>
              <div className="p-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold text-center">
                Platinum: 1400+
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold text-center">
                Gold: 1200+
              </div>
              <div className="p-2.5 rounded-xl bg-slate-300 text-slate-800 text-xs font-bold text-center">
                Silver: 1100+
              </div>
              <div className="p-2.5 rounded-xl bg-amber-900/20 text-amber-900 text-xs font-bold text-center">
                Bronze: &lt; 1100
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
