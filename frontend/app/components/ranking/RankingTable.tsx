"use client";

import React from "react";
import Link from "next/link";
import { Search, TrendingUp, TrendingDown, Minus, Sparkles, Target, Award, ShieldAlert, User } from "lucide-react";
import AvatarWithFrame from "../AvatarWithFrame";
import { RankedPlayer } from "./types";

interface RankingTableProps {
  rankings: RankedPlayer[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectPlayer: (player: RankedPlayer) => void;
  mode: 'singles' | 'doubles';
  filter: 'all' | 'official' | 'provisional';
  myPosition?: RankedPlayer | null;
}

export default function RankingTable({
  rankings,
  searchQuery,
  onSearchChange,
  onSelectPlayer,
  mode,
  filter,
  myPosition
}: RankingTableProps) {
  const filteredRankings = rankings.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = p.user.full_name?.toLowerCase().includes(q);
    const nickMatch = p.user.nickname?.toLowerCase().includes(q);
    const titleMatch = p.user.selected_title?.toLowerCase().includes(q);
    return nameMatch || nickMatch || titleMatch;
  });

  const renderMovementBadge = (p: RankedPlayer) => {
    if (p.movement === 'UP') {
      return (
        <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
          <TrendingUp className="w-3 h-3 mr-0.5" />+{p.rankChange}
        </span>
      );
    }
    if (p.movement === 'DOWN') {
      return (
        <span className="inline-flex items-center text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 shrink-0">
          <TrendingDown className="w-3 h-3 mr-0.5" />{p.rankChange}
        </span>
      );
    }
    if (p.movement === 'NEW') {
      return (
        <span className="inline-flex items-center text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 shrink-0">
          <Sparkles className="w-2.5 h-2.5 mr-0.5" />MỚI
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-[11px] font-bold text-slate-300 px-1 shrink-0">
        <Minus className="w-3 h-3" />
      </span>
    );
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-amber-400 text-amber-950 font-black shadow-amber-400/30";
    if (rank === 2) return "bg-slate-300 text-slate-800 font-black";
    if (rank === 3) return "bg-amber-800/30 text-amber-900 font-black border border-amber-800/40";
    return "bg-slate-100 text-slate-600 font-bold";
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-7 border border-purple-100/90 shadow-sm space-y-4">
      {/* Search and Count Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h3 className="font-black text-lg text-slate-800 tracking-tight">
            Danh Sách Xếp Hạng Đầy Đủ
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Hiển thị <strong>{filteredRankings.length}</strong> / {rankings.length} tay vợt {mode === 'doubles' ? 'Đôi' : 'Đơn'}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm tên, nickname hoặc danh hiệu..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full min-h-[42px] pl-10 pr-4 py-2 text-xs md:text-sm border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Rankings List */}
      <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
        {filteredRankings.map((p) => {
          return (
            <div
              key={p.user.id}
              onClick={() => onSelectPlayer(p)}
              className="flex items-center justify-between p-3 sm:p-4 rounded-2xl hover:bg-purple-50/50 border border-slate-100 hover:border-purple-200 transition-all cursor-pointer group"
            >
              {/* Left Column: Rank + Movement + Avatar + Info */}
              <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1 mr-2 sm:mr-4">
                {/* Rank Number & Movement Stack */}
                <div className="flex flex-col items-center justify-center shrink-0 w-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs tabular-nums shadow-xs ${getRankBadge(p.rank)}`}>
                    #{p.rank}
                  </div>
                  <div className="mt-1">
                    {renderMovementBadge(p)}
                  </div>
                </div>

                {/* Avatar with Frame */}
                <div className="shrink-0">
                  <AvatarWithFrame
                    avatarUrl={p.user.avatar_url || ""}
                    frameStyle={p.user.selected_avatar_frame}
                    sizeClass="w-11 h-11 sm:w-12 sm:h-12"
                    alt={p.user.full_name}
                  />
                </div>

                {/* Player Identity */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-black text-slate-800 group-hover:text-primary transition-colors text-sm sm:text-base truncate">
                      {p.user.full_name}
                    </p>
                    {p.user.nickname && (
                      <span className="text-xs text-slate-400 font-medium hidden sm:inline truncate">
                        (@{p.user.nickname})
                      </span>
                    )}
                    <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded shadow-xs shrink-0 ${p.badgeClass}`}>
                      {p.tier}
                    </span>
                    {p.isProvisional && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                        Tạm thời ({p.matches}/3)
                      </span>
                    )}
                  </div>

                  {/* Secondary info row */}
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                    <span className="tabular-nums font-semibold text-slate-600">
                      {p.winRate.toFixed(1)}% Thắng
                    </span>
                    <span>•</span>
                    <span className="tabular-nums">
                      {p.matches} trận ({p.wins}T - {p.losses}B)
                    </span>
                    {p.user.selected_title && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline-flex items-center gap-1 text-amber-600 font-bold">
                          <Award className="w-3 h-3" />
                          {p.user.selected_title}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Gap Copy Tag */}
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                    <Target className="w-3 h-3 text-primary/70 shrink-0" />
                    <span className="font-bold text-slate-600 truncate">{p.gapCopy}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: ELO & Peak */}
              <div className="text-right shrink-0">
                <p className="font-black text-base sm:text-xl text-slate-900 group-hover:text-primary transition-colors tabular-nums">
                  {p.elo}
                </p>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  ELO
                </p>
                <p className="text-[9px] text-slate-400 font-medium tabular-nums hidden sm:block">
                  Đỉnh: {p.peakElo}
                </p>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {filteredRankings.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <Search className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-500 font-medium">
              Không tìm thấy tay vợt nào phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.
            </p>
          </div>
        )}
      </div>

      {/* ================= Ô HẠNG CỦA BẠN (DƯỚI CÙNG BẢNG XẾP HẠNG) ================= */}
      {myPosition ? (
        <div className="pt-3 border-t-2 border-dashed border-purple-200">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-black uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Hạng của bạn ({mode === 'doubles' ? 'Đôi' : 'Đơn'})</span>
            </span>
            <span className="text-[11px] text-purple-600 font-bold hidden sm:inline">
              Chạm để xem chi tiết
            </span>
          </div>

          <div
            onClick={() => onSelectPlayer(myPosition)}
            className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white shadow-md border-2 border-purple-400/50 hover:border-amber-400/70 transition-all cursor-pointer group"
          >
            {/* Left: Rank + Avatar + Identity */}
            <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1 mr-2 sm:mr-4">
              <div className="flex flex-col items-center justify-center shrink-0 w-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black tabular-nums bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 shadow-sm">
                  #{myPosition.rank}
                </div>
                <div className="mt-1">
                  {renderMovementBadge(myPosition)}
                </div>
              </div>

              <div className="shrink-0">
                <AvatarWithFrame
                  avatarUrl={myPosition.user.avatar_url || ""}
                  frameStyle={myPosition.user.selected_avatar_frame}
                  sizeClass="w-11 h-11 sm:w-12 sm:h-12"
                  alt={myPosition.user.full_name}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-black text-white group-hover:text-amber-300 transition-colors text-sm sm:text-base truncate">
                    {myPosition.user.full_name}
                  </p>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-400 text-amber-950 shrink-0">
                    BẠN
                  </span>
                  <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded shadow-xs shrink-0 ${myPosition.badgeClass}`}>
                    {myPosition.tier}
                  </span>
                  {myPosition.isProvisional && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-400/30 shrink-0">
                      Tạm thời ({myPosition.matches}/3)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1 text-[11px] text-purple-200/80 flex-wrap">
                  <span className="tabular-nums font-semibold text-amber-300">
                    {myPosition.winRate.toFixed(1)}% Thắng
                  </span>
                  <span>•</span>
                  <span className="tabular-nums">
                    {myPosition.matches} trận ({myPosition.wins}T - {myPosition.losses}B)
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-300 font-bold truncate">
                  <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{myPosition.gapCopy}</span>
                </div>
              </div>
            </div>

            {/* Right: ELO */}
            <div className="text-right shrink-0">
              <p className="font-black text-lg sm:text-2xl text-amber-400 group-hover:text-yellow-300 transition-colors tabular-nums">
                {myPosition.elo}
              </p>
              <p className="text-[10px] uppercase font-bold text-purple-200 tracking-wider">
                Điểm ELO
              </p>
              <p className="text-[9px] text-purple-300/80 font-medium tabular-nums hidden sm:block">
                Đỉnh: {myPosition.peakElo}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-3 border-t border-slate-100">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-purple-950 font-medium">
              <User className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Đăng nhập để xem thứ hạng và điểm ELO của bạn</span>
            </div>
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shrink-0 hover:bg-primary/90 transition-colors shadow-xs"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
