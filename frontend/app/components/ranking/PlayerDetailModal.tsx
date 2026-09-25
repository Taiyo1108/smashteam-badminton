"use client";

import React, { useState } from "react";
import { X, Trophy, Flame, TrendingUp, TrendingDown, Minus, Target, Award, Sparkles, ZoomIn } from "lucide-react";
import AvatarWithFrame from "../AvatarWithFrame";
import { RankedPlayer } from "./types";

interface PlayerDetailModalProps {
  player: RankedPlayer | null;
  isOpen: boolean;
  onClose: () => void;
  myPlayer?: RankedPlayer | null;
  mode: 'singles' | 'doubles';
}

export default function PlayerDetailModal({
  player,
  isOpen,
  onClose,
  myPlayer,
  mode
}: PlayerDetailModalProps) {
  const [isAvatarZoomed, setIsAvatarZoomed] = useState(false);

  if (!isOpen || !player) return null;

  const isMe = myPlayer && myPlayer.user.id === player.user.id;
  const eloDiffWithMe = myPlayer ? player.elo - myPlayer.elo : null;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      >
        <div 
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Player Status / Frame */}
          <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 text-white p-6 relative overflow-hidden">
            {/* Background subtle glow */}
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-20"
              aria-label="Đóng"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="flex items-center gap-4 relative z-10">
              {/* Clickable Avatar to Zoom */}
              <div 
                onClick={() => setIsAvatarZoomed(true)}
                className="relative cursor-pointer group/avatar rounded-full shrink-0 transition-transform hover:scale-105 active:scale-95"
                title="Nhấn để phóng to ảnh đại diện"
              >
                <AvatarWithFrame
                  avatarUrl={player.user.avatar_url || ""}
                  frameStyle={player.user.selected_avatar_frame}
                  sizeClass="w-20 h-20"
                  alt={player.user.full_name}
                />
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity text-white pointer-events-none">
                  <ZoomIn className="w-5 h-5 text-white drop-shadow" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${player.badgeClass}`}>
                    {player.tier}
                  </span>
                  {player.isProvisional || !player.rank ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-400/30">
                      Vô hạng ({player.matches}/3)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                      Chính thức
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-black text-white truncate">
                  {player.user.full_name}
                </h3>
                {player.user.nickname && (
                  <p className="text-xs text-purple-200/90 font-medium truncate">
                    &ldquo;{player.user.nickname}&rdquo;
                  </p>
                )}
                {player.user.selected_title && (
                  <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-amber-300">
                    <Award className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{player.user.selected_title}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Player sub-info (Without badminton_level) */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-purple-200/80">
              <span>{player.user.academic_info || "SmashTeam Member"}</span>
              <span className="font-mono text-[11px] text-purple-300/70">ID: {player.user.id.slice(0, 8)}</span>
            </div>
          </div>

          {/* Core Stats Body */}
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            {/* Rank & Movement Highlight */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Vị trí hiện tại ({mode === 'doubles' ? 'Đôi' : 'Đơn'})</span>
                <div className="flex items-center gap-2 mt-0.5">
                  {player.isProvisional || !player.rank ? (
                    <span className="text-xl sm:text-2xl font-black text-amber-600">Vô hạng</span>
                  ) : (
                    <span className="text-2xl font-black text-slate-800 tabular-nums">#{player.rank}</span>
                  )}

                  {player.isProvisional || !player.rank ? (
                    <span className="inline-flex items-center text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      Chờ xếp hạng ({player.matches}/3)
                    </span>
                  ) : (
                    <>
                      {player.movement === 'UP' && (
                        <span className="inline-flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <TrendingUp className="w-3.5 h-3.5 mr-1" />
                          +{player.rankChange} bậc
                        </span>
                      )}
                      {player.movement === 'DOWN' && (
                        <span className="inline-flex items-center text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          <TrendingDown className="w-3.5 h-3.5 mr-1" />
                          {player.rankChange} bậc
                        </span>
                      )}
                      {player.movement === 'SAME' && (
                        <span className="inline-flex items-center text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Minus className="w-3.5 h-3.5 mr-0.5" />
                          Giữ hạng
                        </span>
                      )}
                      {player.movement === 'NEW' && (
                        <span className="inline-flex items-center text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                          <Sparkles className="w-3.5 h-3.5 mr-0.5" />
                          Tân binh
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Điểm ELO</span>
                <p className="text-2xl font-black text-primary tabular-nums">{player.elo}</p>
                <p className="text-[10px] text-slate-400 font-bold tabular-nums">Đỉnh cao: {player.peakElo}</p>
              </div>
            </div>

            {/* Grid Stats: Matches, W/L, Win Rate, Streaks */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-purple-50/50 border border-purple-100">
                <span className="text-[11px] font-bold text-slate-500">Trận đấu & Tỉ lệ</span>
                <p className="text-lg font-black text-slate-800 mt-0.5 tabular-nums">
                  {player.winRate.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {player.matches} trận ({player.wins}T - {player.losses}B)
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Chuỗi Thắng</span>
                </div>
                <p className="text-lg font-black text-amber-700 mt-0.5 tabular-nums">
                  {player.streak > 0 ? `${player.streak} trận` : "—"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  Kỷ lục: {player.maxStreak} trận liên tiếp
                </p>
              </div>
            </div>

            {/* Next Goal / Gap: CHỈ hiển thị cho chính bản thân mình */}
            {isMe && (
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Mục tiêu thứ hạng của bạn</span>
                  <p className="text-sm font-bold text-amber-300 truncate mt-0.5">
                    {player.gapCopy}
                  </p>
                </div>
              </div>
            )}

            {/* Comparative analysis with current user if logged in */}
            {myPlayer && !isMe && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900">
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>So với bạn ({myPlayer.rank ? `Hạng #${myPlayer.rank}` : "Vô hạng"}):</span>
                  <span className="tabular-nums">
                    {eloDiffWithMe !== null && eloDiffWithMe > 0 && `Hơn bạn +${eloDiffWithMe} ELO`}
                    {eloDiffWithMe !== null && eloDiffWithMe < 0 && `Kém bạn ${Math.abs(eloDiffWithMe)} ELO`}
                    {eloDiffWithMe === 0 && `Bằng điểm ELO với bạn`}
                  </span>
                </div>
                <p className="text-[11px] text-indigo-700/80">
                  {eloDiffWithMe !== null && eloDiffWithMe > 0
                    ? `Chênh lệch ${eloDiffWithMe} điểm ELO so với bạn.`
                    : `Bạn đang có ưu thế thứ hạng và ELO trước đối thủ này.`}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors shadow-sm"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Modal: Phóng to Avatar khi click */}
      {isAvatarZoomed && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setIsAvatarZoomed(false);
          }}
        >
          <div 
            className="relative max-w-sm sm:max-w-md w-full bg-slate-900 border border-purple-500/30 rounded-3xl p-6 shadow-2xl flex flex-col items-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsAvatarZoomed(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white z-10"
              aria-label="Đóng ảnh"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-2xl overflow-hidden bg-slate-950 border-2 border-white/20 shadow-inner flex items-center justify-center">
              {player.user.avatar_url ? (
                <img 
                  src={player.user.avatar_url} 
                  alt={player.user.full_name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-purple-800 to-indigo-700 flex items-center justify-center text-white text-6xl font-black">
                  {player.user.full_name.charAt(0)}
                </div>
              )}
            </div>

            <div className="text-center">
              <h4 className="text-lg font-black text-white">
                {player.user.full_name}
              </h4>
              {player.user.nickname && (
                <p className="text-xs text-purple-300 font-medium">
                  @{player.user.nickname}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
