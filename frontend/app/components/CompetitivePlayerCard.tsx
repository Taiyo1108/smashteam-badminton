"use client";

import React, { useState } from "react";
import { 
  Trophy, Flame, Sparkles, Settings, Share2, 
  Target, Swords, Crown, Award, ChevronRight,
  TrendingUp, Users, User, Zap, ShieldAlert,
  Camera, Paintbrush, Calendar, Code, CheckCircle2,
  Coins, Star, ShieldCheck
} from "lucide-react";
import AvatarWithFrame from "./AvatarWithFrame";
import { calculateRankStars } from "@/app/utils/rank";

export interface CompetitiveCardProps {
  player: {
    id: string;
    full_name: string;
    nickname?: string;
    avatar_url?: string;
    selected_avatar_frame?: string;
    selected_title?: string;
    badminton_level?: string;
    role?: string;
    academic_info?: string;
  };
  singles?: {
    elo: number;
    tier: string;
    tierLabel: string;
    badgeClass: string;
    glowClass: string;
    borderClass: string;
    rank?: number;
    totalPlayers?: number;
    percentile?: string | null;
    topPercent?: number | null;
    matches: number;
    wins: number;
    losses: number;
    winRate: number;
    peakElo: number;
    isProvisional: boolean;
    provisionalThreshold: number;
    newPeak: boolean;
  };
  doubles?: {
    elo: number;
    tier: string;
    tierLabel: string;
    badgeClass: string;
    glowClass: string;
    borderClass: string;
    rank?: number;
    totalPlayers?: number;
    percentile?: string | null;
    topPercent?: number | null;
    matches: number;
    wins: number;
    losses: number;
    winRate: number;
    peakElo: number;
    isProvisional: boolean;
    provisionalThreshold: number;
    newPeak: boolean;
  };
  overall?: {
    totalMatches: number;
    totalWins: number;
    totalLosses: number;
    winRate: number;
    isProvisional: boolean;
  };
  progression?: {
    activeMode: "singles" | "doubles";
    currentElo: number;
    hasNextTier: boolean;
    nextTierName?: string;
    nextTierLabel?: string;
    nextTierMinElo?: number;
    eloNeeded: number;
    progressPercent: number;
    milestones: Array<{
      type: string;
      title: string;
      description: string;
      progressPercent: number;
      target: number;
      current: number;
    }>;
  };
  achievements?: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    tier: string;
    category: string;
  }>;
  streak?: {
    singles: { current: number; max: number };
    doubles: { current: number; max: number };
    activeStreak: number;
    activeMode: "singles" | "doubles";
  };
  title?: {
    name: string;
    isEquipped: boolean;
  };
  meta?: {
    level: number;
    xp: number;
    smashCoins: number;
    dailyStreak?: number;
  };
  reputationScore?: number;
  onOpenSettings?: () => void;
  onOpenShareModal?: () => void;
  onOpenReputationModal?: () => void;
}

// Icon mapper for achievements
const renderBadgeIcon = (iconName: string, className = "w-4 h-4") => {
  switch (iconName) {
    case "Flame": return <Flame className={className} />;
    case "Crown": return <Crown className={className} />;
    case "Swords": return <Swords className={className} />;
    case "Target": return <Target className={className} />;
    case "Users": return <Users className={className} />;
    case "Trophy": return <Trophy className={className} />;
    case "Camera": return <Camera className={className} />;
    case "Paintbrush": return <Paintbrush className={className} />;
    case "Calendar": return <Calendar className={className} />;
    case "Code": return <Code className={className} />;
    default: return <Award className={className} />;
  }
};

export default function CompetitivePlayerCard({
  player,
  singles,
  doubles,
  overall,
  progression,
  achievements = [],
  streak,
  title,
  meta,
  reputationScore,
  onOpenSettings,
  onOpenShareModal,
  onOpenReputationModal
}: CompetitiveCardProps) {
  // Mode selection: default to doubles
  const [activeMode, setActiveMode] = useState<"singles" | "doubles">("doubles");

  // Active mode stats
  const currentModeStats = activeMode === "doubles" ? doubles : singles;
  const otherModeStats = activeMode === "doubles" ? singles : doubles;

  const elo = currentModeStats?.elo || 1000;
  const starInfo = calculateRankStars(elo);
  const tier = starInfo.tierName;
  const tierLabel = starInfo.tierLabel;
  const peakElo = currentModeStats?.peakElo || elo;
  const matches = currentModeStats?.matches || 0;
  const wins = currentModeStats?.wins || 0;
  const losses = currentModeStats?.losses || 0;
  const winRate = currentModeStats?.winRate || 0;
  const isProvisional = currentModeStats?.isProvisional || false;
  const newPeak = currentModeStats?.newPeak || false;
  const rankNumber = currentModeStats?.rank;
  const percentile = currentModeStats?.percentile;

  // Active streak in current mode
  const modeStreak = activeMode === "doubles" 
    ? (streak?.doubles?.current || 0) 
    : (streak?.singles?.current || 0);

  // Next tier progress
  const nextTierMinElo = 
    tier === "Challenger" ? 2500 : 
    tier === "Diamond" ? 1800 : 
    tier === "Platinum" ? 1600 : 
    tier === "Gold" ? 1400 : 
    tier === "Silver" ? 1200 : 1000;
  
  const prevTierMinElo = 
    tier === "Challenger" ? 1800 : 
    tier === "Diamond" ? 1600 : 
    tier === "Platinum" ? 1400 : 
    tier === "Gold" ? 1200 : 
    tier === "Silver" ? 1000 : 800;

  const tierSpan = nextTierMinElo - prevTierMinElo;
  const tierProgress = tierSpan > 0 ? Math.min(100, Math.max(0, Math.round(((elo - prevTierMinElo) / tierSpan) * 100))) : 100;
  const eloToNextTier = Math.max(0, nextTierMinElo - elo);

  // Theme styling based on Tier
  const tierTheme = {
    Challenger: {
      accentGrad: "from-red-600 via-rose-600 to-purple-600",
      borderGrad: "border-rose-500/70 hover:border-rose-500 shadow-[0_0_25px_rgba(239,68,68,0.25)]",
      glowBg: "from-rose-500/25 via-purple-500/15 to-transparent",
      badgeColor: "bg-gradient-to-r from-red-600 via-rose-600 to-purple-600 text-white shadow-md shadow-red-500/40 border border-red-400 font-black",
      textAcc: "text-rose-600",
      ringColor: "stroke-rose-500"
    },
    Diamond: {
      accentGrad: "from-cyan-400 via-blue-500 to-indigo-600",
      borderGrad: "border-blue-500/60 hover:border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.25)]",
      glowBg: "from-blue-500/20 via-cyan-500/15 to-transparent",
      badgeColor: "bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/40 border border-cyan-300 font-black",
      textAcc: "text-blue-600",
      ringColor: "stroke-blue-500"
    },
    Platinum: {
      accentGrad: "from-emerald-400 via-teal-500 to-cyan-500",
      borderGrad: "border-teal-400/60 hover:border-teal-500 shadow-[0_0_25px_rgba(20,184,166,0.2)]",
      glowBg: "from-teal-500/20 via-emerald-500/10 to-transparent",
      badgeColor: "bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/35 border border-emerald-300 font-black",
      textAcc: "text-teal-600",
      ringColor: "stroke-teal-500"
    },
    Gold: {
      accentGrad: "from-amber-400 via-yellow-400 to-amber-500",
      borderGrad: "border-amber-400/60 hover:border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.25)]",
      glowBg: "from-amber-500/20 via-yellow-500/15 to-transparent",
      badgeColor: "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/35 border border-yellow-300 font-black",
      textAcc: "text-amber-600",
      ringColor: "stroke-amber-500"
    },
    Silver: {
      accentGrad: "from-slate-200 via-white to-slate-300",
      borderGrad: "border-slate-300 hover:border-slate-400 shadow-[0_0_20px_rgba(148,163,184,0.2)]",
      glowBg: "from-slate-300/30 via-slate-200/15 to-transparent",
      badgeColor: "bg-gradient-to-r from-slate-200 via-white to-slate-300 text-slate-900 shadow-md shadow-slate-300/40 border border-slate-300 font-black",
      textAcc: "text-slate-700",
      ringColor: "stroke-slate-400"
    },
    Bronze: {
      accentGrad: "from-amber-700 via-orange-800 to-amber-900",
      borderGrad: "border-amber-700/50 hover:border-amber-700 shadow-[0_0_20px_rgba(180,83,9,0.2)]",
      glowBg: "from-amber-800/20 via-amber-900/10 to-transparent",
      badgeColor: "bg-gradient-to-r from-amber-700 via-orange-800 to-amber-900 text-amber-50 shadow-md shadow-amber-900/40 border border-amber-600 font-black",
      textAcc: "text-amber-800",
      ringColor: "stroke-amber-700"
    }
  }[tier] || {
    accentGrad: "from-slate-700 to-slate-900",
    borderGrad: "border-slate-200",
    glowBg: "from-slate-100 to-transparent",
    badgeColor: "bg-slate-800 text-white font-black",
    textAcc: "text-slate-800",
    ringColor: "stroke-slate-800"
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* CARD WRAPPER */}
      <div 
        id="competitive-player-card"
        className={`relative w-full rounded-3xl bg-white border-2 ${tierTheme.borderGrad} p-6 shadow-xl transition-all duration-300 overflow-hidden flex flex-col`}
      >
        {/* Ambient Glow Gradient */}
        <div className={`absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br ${tierTheme.glowBg} rounded-full blur-3xl pointer-events-none -z-0`} />
        <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-100 to-transparent pointer-events-none -z-0" />

        {/* 1. TOP HEADER: Tier & Quick Actions */}
        <div className="flex items-center justify-between relative z-10 mb-4 gap-3">
          {/* Tier Badge: stretched to fill space previously occupied by Top% & Tập sự */}
          <div className="flex-1 min-w-0">
            <span className={`w-full text-[12px] font-black uppercase tracking-wider px-4 py-2 rounded-full ${tierTheme.badgeColor} flex items-center justify-center gap-2 shadow-sm truncate`}>
              <Trophy className="w-4 h-4 shrink-0" />
              <span>HẠNG {tierLabel.toUpperCase()}</span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenShareModal && (
              <button
                onClick={onOpenShareModal}
                className="p-2 rounded-xl bg-slate-100 hover:bg-black hover:text-white text-slate-600 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Chia sẻ Thẻ VĐV / Flex card"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="p-2 rounded-xl bg-slate-100 hover:bg-black hover:text-white text-slate-600 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Cài đặt hồ sơ"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 2. MODE SWITCHER: Singles vs Doubles (Independent Competitive Modes) */}
        <div className="relative z-10 w-full mb-5">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setActiveMode("singles")}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeMode === "singles"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>ĐẤU ĐƠN</span>
            </button>

            <button
              onClick={() => setActiveMode("doubles")}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeMode === "doubles"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>ĐẤU ĐÔI</span>
            </button>
          </div>
        </div>

        {/* 3. PLAYER IDENTITY: Avatar + Name + Title */}
        <div className="flex flex-col items-center text-center relative z-10 mb-5">
          <div className="relative mb-3">
            <AvatarWithFrame
              avatarUrl={player.avatar_url || ""}
              frameStyle={player.selected_avatar_frame || null}
              sizeClass="w-24 h-24"
              alt={player.full_name}
            />
            {newPeak && (
              <span className="absolute -top-2 -right-3 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md animate-pulse">
                NEW PEAK!
              </span>
            )}
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
            {player.full_name}
          </h2>

          {/* Nickname & Academic */}
          <div className="flex items-center gap-2 mt-1 text-slate-500 text-xs">
            {player.nickname ? (
              <span className="font-semibold italic text-slate-700">"{player.nickname}"</span>
            ) : (
              <span className="text-slate-400 italic text-[11px]">Chưa đặt biệt danh</span>
            )}
            {player.academic_info && (
              <>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span className="font-medium text-slate-500 text-[11px]">{player.academic_info}</span>
              </>
            )}
          </div>

          {/* Prestige Equipped Title */}
          {title?.name && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-amber-500/10 border border-amber-500/30 text-amber-900 shadow-sm">
              <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                {title.name}
              </span>
            </div>
          )}

          {/* Active Winning Streak Pill (ONLY DISPLAY IF >= 2, ZERO FAKE STREAKS) */}
          {modeStreak >= 2 && (
            <div className="mt-2.5 flex items-center gap-1.5 bg-gradient-to-r from-orange-500/15 to-red-500/15 text-orange-600 border border-orange-500/30 px-3 py-0.5 rounded-full text-xs font-black animate-pulse">
              <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
              <span>+{modeStreak} TRẬN THẮNG LIÊN TIẾP ({activeMode === "doubles" ? "ĐÔI" : "ĐƠN"})</span>
            </div>
          )}
        </div>

        {/* 4. CORE RATINGS: Current ELO & Peak ELO Block */}
        <div className="relative z-10 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-slate-400" />
                <span>ELO HIỆN TẠI ({activeMode === "doubles" ? "ĐÔI" : "ĐƠN"})</span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-4xl font-black text-slate-900 tracking-tight">
                  {elo}
                </span>
                <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${tierTheme.badgeColor}`}>
                  {tierLabel}
                </span>
              </div>
            </div>

            {/* Peak ELO Box */}
            <div className="text-right pl-3 border-l border-slate-200">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                KỶ LỤC ĐỈNH CAO
              </div>
              <div className="text-lg font-black text-slate-800 mt-0.5 flex items-center justify-end gap-1">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>{peakElo}</span>
              </div>
              <div className="text-[9px] text-slate-500 font-medium">
                {newPeak ? (
                  <span className="text-emerald-600 font-bold">Vừa lập đỉnh mới!</span>
                ) : (
                  <span>Cách đỉnh: {Math.max(0, peakElo - elo)} ELO</span>
                )}
              </div>
            </div>
          </div>

          {/* Next Tier Progress Bar */}
          <div className="mt-3.5 pt-3 border-t border-slate-200/80">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-600 mb-1.5">
              <span>Mục tiêu: {nextTierMinElo} ELO</span>
              <span className="text-slate-900 font-black">
                {eloToNextTier > 0 ? `Cần +${eloToNextTier} ELO` : "Đã đạt đỉnh Tier"}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full bg-gradient-to-r ${tierTheme.accentGrad} transition-all duration-700 rounded-full`}
                style={{ width: `${tierProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* 5. BATTLE RECORD MATRIX: Matches, W/L, Win Rate */}
        <div className="relative z-10 grid grid-cols-3 gap-2.5 mb-4">
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Số Trận</span>
            <span className="text-xl font-black text-slate-900 mt-0.5">{matches}</span>
            <span className="text-[9px] text-slate-500 font-medium">
              {activeMode === "doubles" ? "Đấu đôi" : "Đấu đơn"}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thắng - Thua</span>
            <span className="text-xl font-black text-slate-900 mt-0.5">
              <span className="text-emerald-600">{wins}</span>
              <span className="text-slate-300 mx-1">-</span>
              <span className="text-rose-500">{losses}</span>
            </span>
            <span className="text-[9px] text-slate-500 font-medium">Hiệu số: {wins - losses > 0 ? `+${wins - losses}` : wins - losses}</span>
          </div>

          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tỉ Lệ Thắng</span>
            <span className={`text-xl font-black mt-0.5 ${
              winRate >= 60 ? "text-emerald-600" : winRate >= 50 ? "text-blue-600" : "text-slate-800"
            }`}>
              {winRate.toFixed(1)}%
            </span>
            <span className="text-[9px] text-slate-500 font-medium">
              {matches < 3 ? "Chưa xác thực" : "Chính thức"}
            </span>
          </div>
        </div>

        {/* 6. RANK STARS PROGRESSION (LIÊN QUÂN MOBA STYLE) */}
        <div className="relative z-10 mb-4 p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg border border-slate-700/60">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                HẠNG {starInfo.tierLabel.toUpperCase()} • {starInfo.stars}/5 SAO
              </span>
            </div>
            <div className="text-[10px] font-bold text-slate-300">
              {starInfo.eloToNextStar > 0 ? (
                <span>
                  Cần <strong className="text-amber-400 font-black">+{starInfo.eloToNextStar} ELO</strong> lên{" "}
                  {starInfo.stars >= 5 ? "bậc tiếp" : `${starInfo.stars + 1}★`}
                </span>
              ) : (
                <span className="text-emerald-400 font-bold">Đỉnh cao bậc xếp hạng</span>
              )}
            </div>
          </div>

          {/* 5 Stars Visual Row */}
          <div className="flex items-center justify-center gap-3 py-2 bg-black/40 rounded-xl border border-white/5 backdrop-blur-sm">
            {[1, 2, 3, 4, 5].map((index) => {
              const isFilled = index <= starInfo.stars;
              return (
                <div key={index} className="relative flex items-center justify-center transition-all duration-300">
                  {isFilled ? (
                    <Star
                      className="w-6 h-6 fill-amber-400 text-amber-300 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.65)]"
                    />
                  ) : (
                    <Star
                      className="w-6 h-6 text-slate-600/70 fill-slate-800/60"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 7. FEATURED BADGES SHOWCASE (TOP 3 REAL BADGES) */}
        {achievements.length > 0 && (
          <div className="relative z-10 mb-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-black" /> HUY HIỆU TIÊU BIỂU
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {achievements.length} huy hiệu
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {achievements.slice(0, 3).map((ach, idx) => (
                <div
                  key={ach.id || idx}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center group hover:border-black/30 hover:bg-slate-100 transition-all"
                  title={ach.description}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center mb-1 shadow-sm group-hover:scale-110 transition-transform">
                    {renderBadgeIcon(ach.icon)}
                  </div>
                  <span className="text-[10px] font-black text-slate-900 line-clamp-1">
                    {ach.name}
                  </span>
                  <span className="text-[8px] text-slate-500 line-clamp-1 uppercase">
                    Thi đấu
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. REFINED META FOOTER (LEVEL, XP, REPUTATION, COINS) */}
        <div className="relative z-10 pt-3 border-t border-slate-200 mt-auto flex items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 text-[11px]">
              CẤP {meta?.level ?? 1}
            </span>
            <div className="w-14 sm:w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full" 
                style={{ width: `${Math.min(100, ((meta?.xp || 0) % 100))}%` }} 
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {reputationScore !== undefined && (
              <button
                type="button"
                onClick={onOpenReputationModal}
                className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px] transition-all cursor-pointer shadow-sm active:scale-95"
                title="Bấm để xem lịch sử điểm hoạt động & uy tín"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{reputationScore}đ Uy tín</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 text-[11px]">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span>{meta?.smashCoins ?? 0} xu</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
