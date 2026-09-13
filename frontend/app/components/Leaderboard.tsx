"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Trophy, Medal, ArrowUp, ArrowDown, Minus, 
  Search, Filter, Calendar, Users, Shield, Sparkles 
} from "lucide-react";
import { API_URL } from "@/app/config";

export type RankTierName = "Rookie" | "Challenger" | "Elite" | "Master";

export interface PlayerRankData {
  id: string | number;
  full_name: string;
  avatar_url?: string | null;
  badminton_level?: string;
  elo_score: number;
  total_matches: number;
  win_rate: number;
  tier: RankTierName;
  trend: "up" | "down" | "same";
  trend_value?: number;
}

// Cấu hình huy hiệu Rank Tier tối giản
const TIER_CONFIG: Record<RankTierName, { label: string; badgeClass: string; bgSoft: string }> = {
  Master: {
    label: "Master",
    badgeClass: "bg-purple-950/80 text-purple-200 border border-purple-400/50 shadow-[0_0_12px_rgba(157,78,221,0.45)]",
    bgSoft: "from-purple-900/20 to-purple-950/40"
  },
  Elite: {
    label: "Elite",
    badgeClass: "bg-cyan-950/80 text-cyan-200 border border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]",
    bgSoft: "from-cyan-900/15 to-slate-900/30"
  },
  Challenger: {
    label: "Challenger",
    badgeClass: "bg-amber-950/80 text-amber-200 border border-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.3)]",
    bgSoft: "from-amber-900/15 to-slate-900/30"
  },
  Rookie: {
    label: "Rookie",
    badgeClass: "bg-slate-800 text-slate-300 border border-slate-600",
    bgSoft: "from-slate-800/30 to-slate-900/30"
  }
};

export const getTierFromElo = (elo: number): RankTierName => {
  if (elo >= 1800) return "Master";
  if (elo >= 1400) return "Elite";
  if (elo >= 1100) return "Challenger";
  return "Rookie";
};

export default function Leaderboard() {
  const [matchType, setMatchType] = useState<"singles" | "doubles">("singles");
  const [selectedSeason, setSelectedSeason] = useState<string>("season_2026_q1");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [players, setPlayers] = useState<PlayerRankData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Gọi API Leaderboard hoặc nạp Mock Data đồng bộ
  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_URL}/api/users/leaderboard?type=${matchType}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped: PlayerRankData[] = data.map((item, index) => {
            const elo = Number(item.elo_score) || 1000;
            return {
              id: item.id,
              full_name: item.full_name || "Vận Động Viên",
              avatar_url: item.avatar_url,
              badminton_level: item.badminton_level || "Trung bình",
              elo_score: elo,
              total_matches: Number(item.total_matches) || 0,
              win_rate: Number(item.win_rate) || 0,
              tier: getTierFromElo(elo),
              trend: index % 3 === 0 ? "up" : index % 3 === 1 ? "same" : "down",
              trend_value: (index % 4) + 1
            };
          });
          setPlayers(mapped);
        } else {
          // Dữ liệu mẫu chuẩn kiến trúc SmashTeam
          setPlayers([
            { id: "1", full_name: "Nguyễn Văn Thương", elo_score: 1890, total_matches: 48, win_rate: 81.2, tier: "Master", trend: "up", trend_value: 2 },
            { id: "2", full_name: "Trần Minh Quang", elo_score: 1740, total_matches: 42, win_rate: 73.8, tier: "Elite", trend: "same", trend_value: 0 },
            { id: "3", full_name: "Lê Hoàng Bảo", elo_score: 1620, total_matches: 36, win_rate: 66.7, tier: "Elite", trend: "down", trend_value: 1 },
            { id: "4", full_name: "Phạm Hải Đăng", elo_score: 1380, total_matches: 28, win_rate: 57.1, tier: "Challenger", trend: "up", trend_value: 3 },
            { id: "5", full_name: "Đặng Thùy Linh", elo_score: 1240, total_matches: 22, win_rate: 50.0, tier: "Challenger", trend: "down", trend_value: 2 },
            { id: "6", full_name: "Hoàng Minh Tâm", elo_score: 1080, total_matches: 14, win_rate: 42.8, tier: "Rookie", trend: "same", trend_value: 0 }
          ]);
        }
      })
      .catch(() => {
        setPlayers([
          { id: "1", full_name: "Nguyễn Văn Thương", elo_score: 1890, total_matches: 48, win_rate: 81.2, tier: "Master", trend: "up", trend_value: 2 },
          { id: "2", full_name: "Trần Minh Quang", elo_score: 1740, total_matches: 42, win_rate: 73.8, tier: "Elite", trend: "same", trend_value: 0 },
          { id: "3", full_name: "Lê Hoàng Bảo", elo_score: 1620, total_matches: 36, win_rate: 66.7, tier: "Elite", trend: "down", trend_value: 1 },
          { id: "4", full_name: "Phạm Hải Đăng", elo_score: 1380, total_matches: 28, win_rate: 57.1, tier: "Challenger", trend: "up", trend_value: 3 }
        ]);
      })
      .finally(() => setIsLoading(false));
  }, [matchType]);

  // Bộ lọc tìm kiếm & Tier
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const matchesSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = tierFilter === "all" || p.tier === tierFilter;
      return matchesSearch && matchesTier;
    });
  }, [players, searchQuery, tierFilter]);

  const top1 = filteredPlayers[0];
  const top2 = filteredPlayers[1];
  const top3 = filteredPlayers[2];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* HEADER SECTION: Title & Mode Switcher */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-purple-900/20 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <Trophy className="w-3.5 h-3.5 text-primary" />
            <span>Bảng Vinh Danh SmashTeam</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Bảng Xếp Hạng & Điểm ELO
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-normal">
            Hệ thống tính điểm năng lực thực chiến và xếp hạng thứ bậc thành viên định kỳ.
          </p>
        </div>

        {/* ĐƠN / ĐÔI TOGGLE SWITCH */}
        <div className="flex items-center p-1 bg-slate-200/80 rounded-2xl border border-slate-300/60 shadow-inner">
          <button
            type="button"
            onClick={() => setMatchType("singles")}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              matchType === "singles"
                ? "bg-primary text-white shadow-md shadow-primary/30"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Nội Dung Đơn
          </button>
          <button
            type="button"
            onClick={() => setMatchType("doubles")}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              matchType === "doubles"
                ? "bg-primary text-white shadow-md shadow-primary/30"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Nội Dung Đôi
          </button>
        </div>
      </div>

      {/* TOP 1 - 2 - 3 PODIUM SHOWCASE */}
      {!isLoading && filteredPlayers.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 items-end">
          {/* TOP 2 (SILVER) */}
          <div className="order-2 md:order-1 bg-gradient-to-b from-slate-900 via-[#141026] to-[#0C0A1A] rounded-3xl p-6 border border-slate-400/40 text-white relative shadow-lg text-center transform hover:-translate-y-1.5 transition-transform duration-300">
            <div className="w-10 h-10 mx-auto -mt-11 rounded-full bg-slate-300 text-slate-900 flex items-center justify-center font-black text-sm border-2 border-slate-100 shadow-md">
              #2
            </div>
            <div className="mt-4 space-y-2">
              <div className="w-20 h-20 mx-auto rounded-full bg-slate-700/80 border-2 border-slate-300/80 flex items-center justify-center font-black text-xl text-slate-200 overflow-hidden">
                {top2.avatar_url ? (
                  <img src={top2.avatar_url} alt={top2.full_name} className="w-full h-full object-cover" />
                ) : (
                  top2.full_name.charAt(0)
                )}
              </div>
              <h3 className="font-extrabold text-lg text-white truncate">{top2.full_name}</h3>
              <span className={`inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${TIER_CONFIG[top2.tier].badgeClass}`}>
                {top2.tier}
              </span>
              <div className="pt-3 border-t border-white/10 flex justify-around text-xs">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Điểm ELO</p>
                  <p className="font-black text-slate-100 text-base">{top2.elo_score}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Thắng</p>
                  <p className="font-bold text-slate-200 text-base">{top2.win_rate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* TOP 1 (GOLD CHAMPION) */}
          <div className="order-1 md:order-2 bg-gradient-to-b from-[#1E1238] via-[#140E2A] to-[#0C0A1A] rounded-3xl p-7 border-2 border-amber-400/80 text-white relative shadow-2xl shadow-primary/20 text-center transform md:-translate-y-4 hover:-translate-y-5 transition-transform duration-300">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse mb-0.5" />
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-black text-base border-2 border-white shadow-lg">
                #1
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="w-24 h-24 mx-auto rounded-full bg-purple-950 border-4 border-amber-400 flex items-center justify-center font-black text-2xl text-amber-300 overflow-hidden shadow-[0_0_20px_rgba(251,191,36,0.35)]">
                {top1.avatar_url ? (
                  <img src={top1.avatar_url} alt={top1.full_name} className="w-full h-full object-cover" />
                ) : (
                  top1.full_name.charAt(0)
                )}
              </div>
              <h3 className="font-black text-xl text-white truncate">{top1.full_name}</h3>
              <span className={`inline-block text-[10px] font-black uppercase px-3 py-1 rounded-full ${TIER_CONFIG[top1.tier].badgeClass}`}>
                {top1.tier} Master
              </span>
              <div className="pt-4 border-t border-purple-500/20 flex justify-around text-xs">
                <div>
                  <p className="text-purple-300 text-[10px] uppercase font-bold">Điểm ELO</p>
                  <p className="font-black text-amber-300 text-xl">{top1.elo_score}</p>
                </div>
                <div>
                  <p className="text-purple-300 text-[10px] uppercase font-bold">Thắng ({top1.total_matches} trận)</p>
                  <p className="font-bold text-white text-xl">{top1.win_rate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* TOP 3 (BRONZE) */}
          <div className="order-3 bg-gradient-to-b from-slate-900 via-[#141026] to-[#0C0A1A] rounded-3xl p-6 border border-amber-700/50 text-white relative shadow-lg text-center transform hover:-translate-y-1.5 transition-transform duration-300">
            <div className="w-10 h-10 mx-auto -mt-11 rounded-full bg-amber-800 text-amber-100 flex items-center justify-center font-black text-sm border-2 border-amber-600 shadow-md">
              #3
            </div>
            <div className="mt-4 space-y-2">
              <div className="w-20 h-20 mx-auto rounded-full bg-slate-700/80 border-2 border-amber-700/80 flex items-center justify-center font-black text-xl text-amber-200 overflow-hidden">
                {top3.avatar_url ? (
                  <img src={top3.avatar_url} alt={top3.full_name} className="w-full h-full object-cover" />
                ) : (
                  top3.full_name.charAt(0)
                )}
              </div>
              <h3 className="font-extrabold text-lg text-white truncate">{top3.full_name}</h3>
              <span className={`inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${TIER_CONFIG[top3.tier].badgeClass}`}>
                {top3.tier}
              </span>
              <div className="pt-3 border-t border-white/10 flex justify-around text-xs">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Điểm ELO</p>
                  <p className="font-black text-slate-100 text-base">{top3.elo_score}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Thắng</p>
                  <p className="font-bold text-slate-200 text-base">{top3.win_rate}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm tên vợt thủ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-slate-900"
            />
          </div>

          {/* Tier Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">Tất cả thứ hạng</option>
              <option value="Master">Master (1800+)</option>
              <option value="Elite">Elite (1400 - 1799)</option>
              <option value="Challenger">Challenger (1100 - 1399)</option>
              <option value="Rookie">Rookie (&lt; 1100)</option>
            </select>
          </div>

          {/* Season Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-primary cursor-pointer"
            >
              <option value="season_2026_q1">Mùa giải Q1 / 2026</option>
              <option value="season_2025_q4">Mùa giải Q4 / 2025</option>
              <option value="all_time">Toàn bộ lịch sử</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-slate-400 font-medium self-end md:self-auto">
          Hiển thị <strong className="text-slate-800">{filteredPlayers.length}</strong> thành viên
        </span>
      </div>

      {/* FULL LEADERBOARD DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="py-3.5 px-4 text-center w-14"># Thứ tự</th>
                <th className="py-3.5 px-4">Vợt thủ</th>
                <th className="py-3.5 px-4 text-center">Cấp bậc</th>
                <th className="py-3.5 px-4 text-center">Điểm ELO</th>
                <th className="py-3.5 px-4 text-center">Tỉ lệ thắng</th>
                <th className="py-3.5 px-4 text-center">Tổng số trận</th>
                <th className="py-3.5 px-4 text-center">Xu hướng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlayers.map((player, idx) => (
                <tr 
                  key={player.id} 
                  className="hover:bg-purple-50/40 transition-colors group"
                >
                  <td className="py-3.5 px-4 text-center font-black text-slate-700">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                      idx === 0 ? "bg-amber-100 text-amber-900 border border-amber-300" :
                      idx === 1 ? "bg-slate-200 text-slate-800 border border-slate-300" :
                      idx === 2 ? "bg-amber-900/15 text-amber-950 border border-amber-800/30" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {idx + 1}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {player.avatar_url ? (
                          <img src={player.avatar_url} alt={player.full_name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          player.full_name.charAt(0)
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-primary transition-colors text-sm">
                          {player.full_name}
                        </p>
                        <span className="text-[10px] text-slate-400">{player.badminton_level}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className={`inline-block text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${TIER_CONFIG[player.tier].badgeClass}`}>
                      {player.tier}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center font-black text-sm text-slate-900 group-hover:text-primary transition-colors">
                    {player.elo_score}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full" 
                          style={{ width: `${player.win_rate}%` }} 
                        />
                      </div>
                      <span className="font-semibold text-slate-700">{player.win_rate.toFixed(1)}%</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-center text-slate-500 font-medium">
                    {player.total_matches} trận
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {player.trend === "up" && (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold text-xs">
                        <ArrowUp className="w-3.5 h-3.5" /> +{player.trend_value}
                      </span>
                    )}
                    {player.trend === "down" && (
                      <span className="inline-flex items-center gap-0.5 text-rose-600 font-bold text-xs">
                        <ArrowDown className="w-3.5 h-3.5" /> -{player.trend_value}
                      </span>
                    )}
                    {player.trend === "same" && (
                      <span className="inline-flex items-center text-slate-400">
                        <Minus className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPlayers.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-semibold">Không tìm thấy vợt thủ nào phù hợp với bộ lọc.</p>
          </div>
        )}
      </div>

      {/* TIER BADGE GUIDE LEGEND */}
      <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-600">
        <span className="font-bold text-slate-800 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-primary" /> Tiêu chuẩn xếp hạng ELO:
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <strong>Master:</strong> 1,800+ ELO
          </span>
          <span className="inline-flex items-center gap-1 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
            <strong>Elite:</strong> 1,400 - 1,799 ELO
          </span>
          <span className="inline-flex items-center gap-1 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <strong>Challenger:</strong> 1,100 - 1,399 ELO
          </span>
          <span className="inline-flex items-center gap-1 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <strong>Rookie:</strong> &lt; 1,100 ELO
          </span>
        </div>
      </div>
    </div>
  );
}
