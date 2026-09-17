"use client";

import React from "react";
import { Crown, Trophy, TrendingUp, TrendingDown, Minus, Sparkles, ShieldAlert } from "lucide-react";
import AvatarWithFrame from "../AvatarWithFrame";
import { RankedPlayer } from "./types";

interface PodiumTop3Props {
  podium: RankedPlayer[];
  isProvisionalView: boolean;
  onSelectPlayer: (player: RankedPlayer) => void;
  mode: 'singles' | 'doubles';
}

export default function PodiumTop3({
  podium,
  isProvisionalView,
  onSelectPlayer,
  mode
}: PodiumTop3Props) {
  // If in Provisional Filter view, display guidance banner instead of Podium
  if (isProvisionalView) {
    return (
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-purple-50/50 border border-amber-200/80 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h4 className="font-black text-slate-800 text-base">
            Bục Vinh Quang Chỉ Vinh Danh Tay Vợt Chính Thức
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Các thành viên dưới 3 trận đấu đang ở giai đoạn phân hạng tạm thời (Provisional). Hãy hoàn thành đủ 3 trận giao lưu để ghi danh chính thức lên Bục Quán Quân!
          </p>
        </div>
      </div>
    );
  }

  if (podium.length === 0) {
    return null;
  }

  const p1 = podium[0];
  const p2 = podium[1];
  const p3 = podium[2];

  const renderMovement = (player: RankedPlayer) => {
    if (player.movement === 'UP') {
      return (
        <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
          <TrendingUp className="w-3 h-3 mr-0.5" />+{player.rankChange}
        </span>
      );
    }
    if (player.movement === 'DOWN') {
      return (
        <span className="inline-flex items-center text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
          <TrendingDown className="w-3 h-3 mr-0.5" />{player.rankChange}
        </span>
      );
    }
    if (player.movement === 'NEW') {
      return (
        <span className="inline-flex items-center text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
          <Sparkles className="w-2.5 h-2.5 mr-0.5" />Mới
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-[10px] font-bold text-slate-400">
        <Minus className="w-2.5 h-2.5 mr-0.5" />—
      </span>
    );
  };

  return (
    <div className="bg-gradient-to-b from-purple-50/60 via-white to-white rounded-3xl p-5 sm:p-8 border border-purple-100/80 shadow-sm relative overflow-hidden">
      {/* Center Subtitle */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 border border-amber-300/80 text-amber-900 text-xs font-black uppercase tracking-wider">
          <Trophy className="w-3.5 h-3.5 text-amber-600" />
          <span>Bục Vinh Quang Top 3 • {mode === 'doubles' ? 'Đôi' : 'Đơn'}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-6 items-end max-w-2xl mx-auto pt-4 pb-2">
        {/* ================= 2ND PLACE (SILVER) ================= */}
        {p2 ? (
          <div 
            onClick={() => onSelectPlayer(p2)}
            className="flex flex-col items-center cursor-pointer group transition-transform hover:-translate-y-1"
          >
            <div className="relative">
              <AvatarWithFrame
                avatarUrl={p2.user.avatar_url || ""}
                frameStyle={p2.user.selected_avatar_frame}
                sizeClass="w-16 h-16 sm:w-20 sm:h-20"
                alt={p2.user.full_name}
              />
              <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-200 border border-slate-300 text-slate-700 text-[10px] font-black uppercase shadow-xs">
                #2
              </span>
            </div>

            <div className="text-center mt-4 w-full px-1">
              <p className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-primary transition-colors">
                {p2.user.full_name}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <p className="text-xs sm:text-sm font-black text-primary tabular-nums">
                  {p2.elo} ELO
                </p>
                {renderMovement(p2)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                {p2.winRate.toFixed(0)}% Thắng ({p2.matches} trận)
              </p>
            </div>
          </div>
        ) : <div />}

        {/* ================= 1ST PLACE (GOLD CHAMPION) ================= */}
        {p1 ? (
          <div 
            onClick={() => onSelectPlayer(p1)}
            className="flex flex-col items-center transform -translate-y-3 sm:-translate-y-6 cursor-pointer group transition-transform hover:-translate-y-7"
          >
            <div className="relative">
              {/* Bouncing Crown */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-amber-500 fill-amber-500 animate-bounce z-20">
                <Crown className="w-8 h-8 text-amber-500 fill-amber-400 drop-shadow-md" />
              </div>

              {/* Glowing Aura Ring */}
              <div className="relative p-1 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                <AvatarWithFrame
                  avatarUrl={p1.user.avatar_url || ""}
                  frameStyle={p1.user.selected_avatar_frame}
                  sizeClass="w-20 h-20 sm:w-24 sm:h-24"
                  alt={p1.user.full_name}
                />
              </div>

              <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 text-[10px] font-black uppercase tracking-wider shadow-sm z-20">
                Quán Quân
              </span>
            </div>

            <div className="text-center mt-5 w-full px-1">
              <p className="text-sm sm:text-base font-black text-slate-900 truncate group-hover:text-primary transition-colors">
                {p1.user.full_name}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <p className="text-sm sm:text-base font-black text-amber-600 tabular-nums">
                  {p1.elo} ELO
                </p>
                {renderMovement(p1)}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 font-bold tabular-nums">
                {p1.winRate.toFixed(0)}% Thắng ({p1.matches} trận)
              </p>
            </div>
          </div>
        ) : <div />}

        {/* ================= 3RD PLACE (BRONZE) ================= */}
        {p3 ? (
          <div 
            onClick={() => onSelectPlayer(p3)}
            className="flex flex-col items-center cursor-pointer group transition-transform hover:-translate-y-1"
          >
            <div className="relative">
              <AvatarWithFrame
                avatarUrl={p3.user.avatar_url || ""}
                frameStyle={p3.user.selected_avatar_frame}
                sizeClass="w-16 h-16 sm:w-20 sm:h-20"
                alt={p3.user.full_name}
              />
              <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black uppercase shadow-xs">
                #3
              </span>
            </div>

            <div className="text-center mt-4 w-full px-1">
              <p className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-primary transition-colors">
                {p3.user.full_name}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <p className="text-xs sm:text-sm font-black text-primary tabular-nums">
                  {p3.elo} ELO
                </p>
                {renderMovement(p3)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                {p3.winRate.toFixed(0)}% Thắng ({p3.matches} trận)
              </p>
            </div>
          </div>
        ) : <div />}
      </div>
    </div>
  );
}
