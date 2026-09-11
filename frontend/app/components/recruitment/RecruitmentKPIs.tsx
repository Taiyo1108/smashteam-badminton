"use client";

import { motion } from "framer-motion";
import { Users, Clock, CheckCircle2, Award, ArrowUpRight, TrendingUp } from "lucide-react";

export interface CandidateItem {
  id: string | number;
  full_name: string;
  phone_zalo: string;
  email?: string;
  academic_info?: string;
  badminton_level: string;
  gender?: string;
  soft_skills?: string | string[];
  casting_slot_id?: string | number;
  casting_time?: string;
  location?: string;
  created_at?: string;
  extra_answers?: unknown;
}

interface RecruitmentKPIsProps {
  candidates: CandidateItem[];
  approvedCount?: number;
  totalSlotsCapacity?: number;
}

export default function RecruitmentKPIs({
  candidates = [],
  approvedCount = 0,
  totalSlotsCapacity = 60
}: RecruitmentKPIsProps) {
  const totalCandidates = candidates.length;
  const pendingCount = totalCandidates; // Candidates currently in pending queue

  // Calculate gender ratio
  const maleCount = candidates.filter(c => c.gender === "Nam").length;
  const femaleCount = candidates.filter(c => c.gender === "Nữ").length;
  const malePercent = totalCandidates > 0 ? Math.round((maleCount / totalCandidates) * 100) : 0;
  const femalePercent = totalCandidates > 0 ? Math.round((femaleCount / totalCandidates) * 100) : 0;

  // Calculate skill level distribution
  const beginnerCount = candidates.filter(c => c.badminton_level === "Mới chơi").length;
  const intermediateCount = candidates.filter(c => c.badminton_level === "Trung bình").length;
  const advancedCount = candidates.filter(c => c.badminton_level === "Khá/Giỏi").length;

  const beginnerPct = totalCandidates > 0 ? Math.round((beginnerCount / totalCandidates) * 100) : 0;
  const intermediatePct = totalCandidates > 0 ? Math.round((intermediateCount / totalCandidates) * 100) : 0;
  const advancedPct = totalCandidates > 0 ? Math.round((advancedCount / totalCandidates) * 100) : 0;

  const kpis = [
    {
      id: "total",
      label: "Tổng hồ sơ nộp",
      value: totalCandidates,
      sub: "Đợt tuyển hiện tại",
      badge: totalCandidates > 0 ? `${totalCandidates} hồ sơ` : "Chưa có hồ sơ",
      badgeColor: "bg-purple-100 text-primary border-purple-200",
      icon: Users,
      iconBg: "bg-purple-50 text-primary"
    },
    {
      id: "pending",
      label: "Đang chờ casting & duyệt",
      value: pendingCount,
      sub: pendingCount > 0 ? "Cần xử lý & chấm điểm" : "Không còn hồ sơ chờ",
      badge: pendingCount > 0 ? "Cần duyệt sớm" : "Đã xử lý hết",
      badgeColor: pendingCount > 0
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-slate-100 text-slate-500 border-slate-200",
      icon: Clock,
      iconBg: "bg-amber-50 text-amber-600"
    },
    {
      id: "approved",
      label: "Thành viên đã duyệt",
      value: approvedCount,
      sub: approvedCount > 0 ? "Đã kích hoạt ELO & Rank" : "Chưa có thành viên nào",
      badge: approvedCount > 0 ? "Đạt tiêu chuẩn" : "Chưa có dữ liệu",
      badgeColor: approvedCount > 0
        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
        : "bg-slate-100 text-slate-500 border-slate-200",
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600"
    },
    {
      id: "capacity",
      label: "Tỷ lệ lấp đầy chỉ tiêu",
      value: `${Math.min(Math.round((totalCandidates / totalSlotsCapacity) * 100), 100)}%`,
      sub: `${totalCandidates}/${totalSlotsCapacity} chỗ tuyển chọn`,
      badge: "Tiến độ tuyển",
      badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
      icon: Award,
      iconBg: "bg-cyan-50 text-cyan-600"
    }
  ];

  return (
    <div className="space-y-4">
      {/* 4 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.06 }}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${kpi.badgeColor}`}>
                  {kpi.badge}
                </span>
              </div>

              <div>
                <p className="text-2xl sm:text-3xl font-black text-secondary tracking-tight tabular-nums">
                  {kpi.value}
                </p>
                <h4 className="text-xs font-bold text-slate-700 mt-0.5">{kpi.label}</h4>
                <p className="text-[11px] text-slate-400">{kpi.sub}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Distribution Sub-Bars: Trình độ & Giới tính */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Skill Level Distribution */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
              <Award className="w-4 h-4 text-primary" /> Phân bố trình độ ứng viên
            </h4>
            <span className="text-[11px] text-slate-400 font-medium font-mono">{totalCandidates} hồ sơ</span>
          </div>

          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${beginnerPct}%` }} 
              className="bg-emerald-400 h-full transition-all" 
              title={`Mới chơi: ${beginnerCount} (${beginnerPct}%)`}
            />
            <div 
              style={{ width: `${intermediatePct}%` }} 
              className="bg-primary h-full transition-all" 
              title={`Trung bình: ${intermediateCount} (${intermediatePct}%)`}
            />
            <div 
              style={{ width: `${advancedPct}%` }} 
              className="bg-amber-400 h-full transition-all" 
              title={`Khá/Giỏi: ${advancedCount} (${advancedPct}%)`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold pt-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Mới chơi: {beginnerCount} ({beginnerPct}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Trung bình: {intermediateCount} ({intermediatePct}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Khá/Giỏi: {advancedCount} ({advancedPct}%)
            </span>
          </div>
        </div>

        {/* Gender Distribution */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
              <Users className="w-4 h-4 text-purple-600" /> Tỷ lệ giới tính ứng viên
            </h4>
            <span className="text-[11px] text-slate-400 font-medium font-mono">
              {maleCount} Nam / {femaleCount} Nữ
            </span>
          </div>

          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${malePercent}%` }} 
              className="bg-cyan-500 h-full transition-all" 
              title={`Nam: ${maleCount} (${malePercent}%)`}
            />
            <div 
              style={{ width: `${femalePercent}%` }} 
              className="bg-pink-500 h-full transition-all" 
              title={`Nữ: ${femaleCount} (${femalePercent}%)`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold pt-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              Nam: {maleCount} ({malePercent}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              Nữ: {femaleCount} ({femalePercent}%)
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
