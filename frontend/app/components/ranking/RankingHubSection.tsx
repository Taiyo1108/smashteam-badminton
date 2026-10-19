"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Trophy, HelpCircle, Calendar, RefreshCw, Users, ShieldCheck, Clock } from "lucide-react";
import { API_URL } from "@/app/config";
import { RankingHubResponse, RankedPlayer, RankedUser } from "./types";
import PlayerSpotlightBar from "./PlayerSpotlightBar";
import PodiumTop3 from "./PodiumTop3";
import RankingTable from "./RankingTable";
import MyPositionBar from "./MyPositionBar";
import PlayerDetailModal from "./PlayerDetailModal";
import EloExplainModal from "./EloExplainModal";

export default function RankingHubSection() {
  const [mode, setMode] = useState<'singles' | 'doubles'>('doubles');
  const [filter, setFilter] = useState<'all' | 'official' | 'provisional'>('official');
  const [searchQuery, setSearchQuery] = useState('');
  const [hubData, setHubData] = useState<RankingHubResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<RankedPlayer | null>(null);
  const [isEloModalOpen, setIsEloModalOpen] = useState(false);

  const fetchRankingData = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' 
        ? (localStorage.getItem('admin_token') || localStorage.getItem('token'))
        : null;

      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      let userId = null;
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          userId = parsed.id || null;
        } catch (e) {}
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const urlParams = new URLSearchParams({
        mode,
        filter,
        ...(userId ? { userId } : {})
      });

      const res = await fetch(`${API_URL}/api/ranking/hub?${urlParams.toString()}`, {
        headers
      });

      if (res.ok) {
        const data: RankingHubResponse = await res.json();
        setHubData(data);
      } else {
        console.error("Failed to fetch ranking hub data:", res.statusText);
      }
    } catch (err) {
      console.error("Error fetching ranking hub:", err);
    } finally {
      setLoading(false);
    }
  }, [mode, filter]);

  useEffect(() => {
    fetchRankingData();
  }, [fetchRankingData]);

  // Handler when user clicks on a spotlight user
  const handleSelectSpotlightUser = (user: RankedUser) => {
    if (!hubData) return;
    const found = hubData.rankings.find(p => p.user.id === user.id);
    if (found) {
      setSelectedPlayer(found);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-20 sm:pb-8">
      {/* ================= HEADER & CONTROLS ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-100/80 pb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span>{hubData?.season?.name || "SmashTeam Ranking Hub"}</span>
            </span>

            {hubData?.snapshotWeek && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">
                <Clock className="w-3 h-3 text-slate-400" />
                Snapshot: {hubData.snapshotWeek}
              </span>
            )}

            <button
              onClick={() => setIsEloModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100 text-[11px] font-bold transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3 h-3 text-purple-600" />
              <span>Quy tắc ELO</span>
            </button>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Bảng Xếp Hạng Câu Lạc Bộ
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Hệ thống tính điểm ELO và biến động thứ hạng hàng tuần theo kết quả thi đấu thực tế
          </p>
        </div>

        {/* Switchers (Mode + Filter) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 self-start md:self-auto">
          {/* Mode Switcher: Đơn vs Đôi */}
          <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setMode('singles')}
              className={`min-h-[38px] px-4 sm:px-5 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                mode === 'singles'
                  ? "bg-white text-primary shadow-sm border border-slate-200/50 scale-[1.02]"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Xếp Hạng Đơn
            </button>
            <button
              onClick={() => setMode('doubles')}
              className={`min-h-[38px] px-4 sm:px-5 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                mode === 'doubles'
                  ? "bg-white text-primary shadow-sm border border-slate-200/50 scale-[1.02]"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Xếp Hạng Đôi
            </button>
          </div>

          {/* Filter Switcher: Official (Default) vs All vs Provisional */}
          <div className="flex p-1 bg-purple-50/60 rounded-2xl border border-purple-100">
            <button
              onClick={() => setFilter('official')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                filter === 'official'
                  ? "bg-primary text-white shadow-xs"
                  : "text-purple-700 hover:text-purple-950"
              }`}
            >
              Chính thức ({hubData?.establishedCount || 0})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                filter === 'all'
                  ? "bg-primary text-white shadow-xs"
                  : "text-purple-700 hover:text-purple-950"
              }`}
            >
              Tất cả ({hubData?.totalPlayers || 0})
            </button>
            <button
              onClick={() => setFilter('provisional')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                filter === 'provisional'
                  ? "bg-primary text-white shadow-xs"
                  : "text-purple-700 hover:text-purple-950"
              }`}
            >
              Chờ xếp hạng ({hubData?.provisionalCount || 0})
            </button>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && !hubData && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-slate-100 rounded-2xl" />
            ))}
          </div>
          <div className="h-56 bg-slate-100 rounded-3xl" />
          <div className="h-96 bg-slate-100 rounded-3xl" />
        </div>
      )}

      {/* Main Content Area */}
      {hubData && (
        <>
          {/* BANNER TIẾN ĐỘ PHÂN HẠNG (NẾU USER CHƯA ĐỦ 3 TRẬN) */}
          {hubData.myPosition && (hubData.myPosition.isProvisional || (hubData.myPosition.matches ?? 0) < 3) && (
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-purple-600/15 to-amber-500/15 border-2 border-amber-400/50 shadow-lg shadow-amber-500/10 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-md shrink-0">
                  ⚡
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-900 border border-amber-400/40 text-[10px] font-black uppercase tracking-wider mb-1">
                    Trạng Thái Phân Hạng
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900">
                    Đang phân hạng: Hoàn thành thêm {Math.max(0, 3 - (hubData.myPosition.matches || 0))} trận để xuất hiện trên BXH
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Điểm Elo khởi điểm là 950. Cần tối thiểu 3 trận đấu xếp hạng để hệ thống ghi nhận vị trí chính thức.
                  </p>
                </div>
              </div>

              {/* Thanh tiến độ x/3 trận */}
              <div className="shrink-0 w-full sm:w-48 bg-white/80 p-3 rounded-2xl border border-amber-300/40 shadow-xs">
                <div className="flex justify-between items-center text-xs font-black mb-1.5">
                  <span className="text-slate-600 text-[11px]">Tiến độ phân hạng</span>
                  <span className="text-amber-600 font-black">{Math.min(3, hubData.myPosition.matches || 0)}/3 trận</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((hubData.myPosition.matches || 0) / 3) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 1. SPOTLIGHT BAR (ON FIRE, CLIMBER, RISING, MOST ACTIVE) */}
          <PlayerSpotlightBar
            spotlight={hubData.spotlight}
            onSelectUser={handleSelectSpotlightUser}
          />

          {/* 2. PODIUM TOP 3 CHAMPIONS */}
          <PodiumTop3
            podium={hubData.podium}
            isProvisionalView={filter === 'provisional'}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
            mode={mode}
          />

          {/* 3. RANKING TABLE WITH FULL DETAILS & SEARCH */}
          <RankingTable
            rankings={hubData.rankings}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
            mode={mode}
            filter={filter}
            myPosition={hubData.myPosition}
          />

          {/* 4. RANK TIERS LEGEND */}
          <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-purple-100/80 text-xs text-slate-600 space-y-3">
            <div className="flex items-center gap-1.5 font-black text-slate-800">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <span>Hệ Thống Phân Cấp Bậc ELO SmashTeam:</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-0.5">
              <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-purple-600 text-white font-black shadow-sm border border-red-400">
                Thách Đấu: 1800+
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white font-black shadow-sm border border-cyan-300">
                Kim Cương: 1600+
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 text-white font-black shadow-sm border border-emerald-300">
                Bạch Kim: 1400+
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black shadow-sm border border-yellow-300">
                Vàng: 1200+
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-slate-200 via-white to-slate-300 text-slate-900 font-black shadow-sm border border-slate-300">
                Bạc: 1000+
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-700 via-orange-800 to-amber-900 text-amber-50 font-black shadow-sm border border-amber-600">
                Đồng: &lt; 1000
              </span>
            </div>
          </div>

          {/* 5. STICKY MY POSITION BAR (Authenticated User) */}
          <MyPositionBar
            myPosition={hubData.myPosition}
            onOpenMyModal={() => {
              if (hubData.myPosition) setSelectedPlayer(hubData.myPosition);
            }}
          />

          {/* 6. PLAYER DETAIL MODAL */}
          <PlayerDetailModal
            player={selectedPlayer}
            isOpen={!!selectedPlayer}
            onClose={() => setSelectedPlayer(null)}
            myPlayer={hubData.myPosition}
            mode={mode}
          />

          {/* 7. ELO EXPLANATION MODAL */}
          <EloExplainModal
            isOpen={isEloModalOpen}
            onClose={() => setIsEloModalOpen(false)}
          />
        </>
      )}
    </div>
  );
}
