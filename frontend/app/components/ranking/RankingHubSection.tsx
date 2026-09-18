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
  const [filter, setFilter] = useState<'all' | 'official' | 'provisional'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hubData, setHubData] = useState<RankingHubResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<RankedPlayer | null>(null);
  const [isEloModalOpen, setIsEloModalOpen] = useState(false);

  const fetchRankingData = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/api/ranking/hub?mode=${mode}&filter=${filter}`, {
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

          {/* Filter Switcher: All vs Official vs Provisional */}
          <div className="flex p-1 bg-purple-50/60 rounded-2xl border border-purple-100">
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
              onClick={() => setFilter('provisional')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                filter === 'provisional'
                  ? "bg-primary text-white shadow-xs"
                  : "text-purple-700 hover:text-purple-950"
              }`}
            >
              Tạm thời ({hubData?.provisionalCount || 0})
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
              <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-red-500 to-purple-600 text-white font-black shadow-xs">
                Challenger: 1800+
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold shadow-xs">
                Diamond: 1600+
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-teal-600 text-white font-bold shadow-xs">
                Platinum: 1400+
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold shadow-xs">
                Gold: 1200+
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-300 text-slate-800 font-bold shadow-xs">
                Silver: 1100+
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-900/20 text-amber-900 font-bold shadow-xs">
                Bronze: &lt; 1100
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
