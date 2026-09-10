"use client";

import React, { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { 
  Trophy, QrCode, Award, Shield, Calendar, User, 
  Sparkles, CheckCircle2, AlertCircle, X, Download, 
  Activity, GraduationCap, Flame, Star, ChevronRight
} from "lucide-react";

export type ClubTitleBadge = 
  | "Ban Chủ Nhiệm"
  | "Trưởng Ban Chuyên Môn"
  | "Hạt Giống Tiêu Biểu"
  | "Thành Viên Tích Cực";

export interface BadmintonMilestone {
  id: string | number;
  year: string;
  title: string;
  subtitle: string;
  iconType: "gold" | "silver" | "bronze" | "star" | "fire";
}

export interface MemberProfileData {
  id: string | number;
  member_code: string; // vd: SMASH-MEM-0089
  full_name: string;
  nickname?: string;
  avatar_url?: string | null;
  university: string; // Trường / Đơn vị theo học
  dob?: string;
  gender: "Nam" | "Nữ";
  phone_zalo: string;
  email?: string;
  badminton_level: "Mới chơi" | "Trung bình" | "Khá" | "Bán chuyên";
  club_roles: ClubTitleBadge[];
  elo_score: number;
  total_matches: number;
  sessions_attended: number;
  win_rate: number;
  milestones: BadmintonMilestone[];
  today_checkin_status: "not_yet" | "checked_in";
  checkin_time?: string;
}

const TITLE_BADGE_STYLE: Record<ClubTitleBadge, { bg: string; text: string; border: string }> = {
  "Ban Chủ Nhiệm": {
    bg: "bg-purple-950/80",
    text: "text-purple-200",
    border: "border-purple-400/50"
  },
  "Trưởng Ban Chuyên Môn": {
    bg: "bg-cyan-950/80",
    text: "text-cyan-200",
    border: "border-cyan-400/50"
  },
  "Hạt Giống Tiêu Biểu": {
    bg: "bg-amber-950/80",
    text: "text-amber-200",
    border: "border-amber-400/50"
  },
  "Thành Viên Tích Cực": {
    bg: "bg-emerald-950/80",
    text: "text-emerald-200",
    border: "border-emerald-400/50"
  }
};

export default function MemberProfileCard({
  member = {
    id: "user_89",
    member_code: "SMASH-MEM-0089",
    full_name: "Nguyễn Văn Thương",
    nickname: "Thương Smash",
    avatar_url: null,
    university: "Đại học Công nghệ Thông tin - ĐHQG-HCM (UIT)",
    dob: "15/08/2004",
    gender: "Nam",
    phone_zalo: "0912 345 678",
    email: "thuong.nv@uit.edu.vn",
    badminton_level: "Khá",
    club_roles: ["Hạt Giống Tiêu Biểu", "Thành Viên Tích Cực"],
    elo_score: 1680,
    total_matches: 46,
    sessions_attended: 52,
    win_rate: 73.9,
    milestones: [
      {
        id: "m1",
        year: "2025",
        title: "Vô Địch Đôi Nam Mùa Xuân",
        subtitle: "Giải Nội Bộ SmashTeam Cup 2025",
        iconType: "gold"
      },
      {
        id: "m2",
        year: "2025",
        title: "Huy Chương Đồng Đơn Nam UIT Open",
        subtitle: "Giải Cầu Lông Sinh Viên Mở Rộng",
        iconType: "bronze"
      },
      {
        id: "m3",
        year: "2024 - 2026",
        title: "Cột mốc 50+ Buổi Sinh Hoạt",
        subtitle: "Thành viên chuyên cần & gắn bó",
        iconType: "fire"
      }
    ],
    today_checkin_status: "not_yet"
  }
}: {
  member?: MemberProfileData;
}) {
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [checkinStatus, setCheckinStatus] = useState(member.today_checkin_status);

  // Chuỗi mã QR định danh chuẩn cho Ban Tổ Chức quét
  const memberQRString = `SMASH_MEMBER:${member.member_code}:${member.full_name}:${member.phone_zalo}`;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* THẺ VẬN ĐỘNG VIÊN CHÍNH (ATHLETE PROFILE CARD) */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#141026] via-[#0C0A1A] to-[#180F33] border-2 border-purple-500/30 text-white shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Subtle Decorative Aura */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-600/15 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* CỘT TRÁI (4 CỘT): AVATAR & ĐỊNH DANH CÁ NHÂN */}
          <div className="lg:col-span-4 flex flex-col items-center text-center space-y-3 pb-6 lg:pb-0 border-b lg:border-b-0 lg:border-r border-white/10 lg:pr-6">
            {/* Avatar với Ring Tím Neon */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-gradient-to-r from-primary via-purple-400 to-pink-500 shadow-[0_0_25px_rgba(122,34,224,0.5)]">
              <div className="w-full h-full rounded-full bg-[#0C0A1A] flex items-center justify-center font-black text-3xl sm:text-4xl text-purple-200 overflow-hidden">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
                ) : (
                  member.full_name.charAt(0)
                )}
              </div>
              <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#0C0A1A] flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
                ✓
              </span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {member.full_name}
              </h2>
              {member.nickname && (
                <p className="text-xs text-purple-300 font-semibold mt-0.5">
                  &ldquo;{member.nickname}&rdquo;
                </p>
              )}
              <span className="inline-block font-mono text-[11px] text-amber-300 font-black px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 mt-2">
                {member.member_code}
              </span>
            </div>

            {/* Trường học / Đơn vị */}
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <GraduationCap className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="truncate max-w-[220px]">{member.university}</span>
            </div>

            {/* NÚT BẬT MÃ QR CÁ NHÂN */}
            <button
              type="button"
              onClick={() => setIsQRModalOpen(true)}
              className="min-h-[42px] w-full mt-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-black shadow-md shadow-primary/30 flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span>Mã QR Thẻ Vận Động Viên</span>
            </button>
          </div>

          {/* CỘT PHẢI (8 CỘT): TRÌNH ĐỘ, DANH HIỆU & THÀNH TÍCH CLB */}
          <div className="lg:col-span-8 space-y-6">
            {/* THÔNG TIN CHUYÊN MÔN & ĐIỂM ELO */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Trình độ</p>
                <p className="font-black text-sm text-purple-300 mt-1">{member.badminton_level}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Điểm ELO</p>
                <p className="font-black text-sm text-amber-300 mt-1">{member.elo_score}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Tỉ lệ thắng</p>
                <p className="font-black text-sm text-emerald-400 mt-1">{member.win_rate}%</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Buổi tham gia</p>
                <p className="font-black text-sm text-white mt-1">{member.sessions_attended}</p>
              </div>
            </div>

            {/* DANH HIỆU ĐỐI VỚI CLB (CLUB ROLE BADGES) */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary" />
                Danh hiệu & Đóng góp nội bộ:
              </span>
              <div className="flex flex-wrap gap-2">
                {member.club_roles.map((role) => {
                  const style = TITLE_BADGE_STYLE[role] || {
                    bg: "bg-slate-800",
                    text: "text-slate-200",
                    border: "border-slate-700"
                  };
                  return (
                    <span
                      key={role}
                      className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full border shadow-xs ${style.bg} ${style.text} ${style.border}`}
                    >
                      <Sparkles className="w-3 h-3" />
                      {role}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* THÀNH TÍCH CẦU LÔNG NỔI BẬT (BADMINTON MILESTONES) */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Dấu mốc & Thành tích giải đấu (Milestones):
              </span>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {member.milestones.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          m.iconType === "gold"
                            ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                            : m.iconType === "silver"
                            ? "bg-slate-300/20 text-slate-200 border border-slate-300/40"
                            : m.iconType === "bronze"
                            ? "bg-amber-800/20 text-amber-200 border border-amber-700/40"
                            : "bg-purple-900/30 text-purple-300 border border-purple-500/40"
                        }`}
                      >
                        {m.iconType === "gold" ? "🥇" : m.iconType === "bronze" ? "🥉" : "🏸"}
                      </div>
                      <div>
                        <p className="font-extrabold text-xs sm:text-sm text-white">{m.title}</p>
                        <p className="text-[11px] text-slate-400">{m.subtitle}</p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 font-bold bg-white/5 px-2 py-1 rounded-md">
                      {m.year}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* TRẠNG THÁI ĐIỂM DANH SINH HOẠT HÔM NAY (ATTENDANCE STATUS BADGE) */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-slate-300">Điểm danh buổi sinh hoạt hôm nay:</span>
              </div>

              {checkinStatus === "checked_in" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Đã Điểm Danh Thành Công
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold">
                  <AlertCircle className="w-3 h-3 text-slate-400" />
                  Chưa Điểm Danh
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL MÃ QR ĐỊNH DANH CÁ NHÂN */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-sm bg-[#0C0A1A] rounded-3xl border-2 border-primary/50 text-white shadow-2xl p-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsQRModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="inline-block text-[10px] font-mono font-black text-amber-300 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30">
                {member.member_code}
              </span>
              <h3 className="text-lg font-black text-white mt-2">{member.full_name}</h3>
              <p className="text-xs text-purple-300">{member.university}</p>
            </div>

            {/* QR Code Canvas */}
            <div className="p-4 bg-white rounded-3xl inline-block shadow-inner mx-auto">
              <QRCodeCanvas
                value={memberQRString}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed px-2">
              Đưa mã này cho Ban Chủ Nhiệm hoặc Tổ Trọng Tài quét khi có mặt tại sân để hoàn tất điểm danh.
            </p>

            <button
              type="button"
              onClick={() => {
                alert("Đã lưu mã QR định danh về máy!");
              }}
              className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" /> Tải ảnh thẻ QR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
