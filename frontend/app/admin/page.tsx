"use client";

import { useState, useEffect } from "react";
import { Users, UserPlus, Trophy, Activity, Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const [statsData, setStatsData] = useState<any>({
    membersCount: 0,
    candidatesCount: 0,
    matchesCount: 0,
    mediaCount: 0
  });
  const [latestMatches, setLatestMatches] = useState<any[]>([]);
  const [recentCandidates, setRecentCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to calculate relative time
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return;

      // 1. Fetch Stats
      const statsRes = await fetch("http://localhost:5000/api/users/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const stats = statsRes.ok ? await statsRes.json() : null;

      // 2. Fetch Matches
      const matchesRes = await fetch("http://localhost:5000/api/matches");
      const matches = matchesRes.ok ? await matchesRes.json() : [];

      // 3. Fetch Candidates
      const candidatesRes = await fetch("http://localhost:5000/api/users/candidates", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const candidates = candidatesRes.ok ? await candidatesRes.json() : [];

      if (stats) {
        setStatsData(stats);
      }
      setLatestMatches(matches.slice(0, 3));
      setRecentCandidates(candidates.slice(0, 3));
    } catch (e) {
      console.error("Error loading dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = [
    { name: "Tổng Thành Viên", value: statsData.membersCount, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { name: "Ứng Viên Chờ Duyệt", value: statsData.candidatesCount, icon: UserPlus, color: "text-amber-600", bg: "bg-amber-100" },
    { name: "Tổng Trận Đấu", value: statsData.matchesCount, icon: Trophy, color: "text-emerald-600", bg: "bg-emerald-100" },
    { name: "Bài Đăng Truyền Thông", value: statsData.mediaCount, icon: Activity, color: "text-purple-600", bg: "bg-purple-100" },
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Đang tải dữ liệu tổng quan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-secondary mb-2">Tổng quan</h1>
        <p className="text-slate-500">Thống kê hoạt động thực tế của Câu lạc bộ Cầu lông SmashTeam.</p>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <Icon className={`w-7 h-7 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.name}</p>
                <h3 className="text-2xl font-bold text-secondary">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hoạt động gần đây (Đơn đăng ký mới) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-secondary">Hoạt động gần đây</h2>
          </div>
          <div className="space-y-4">
            {recentCandidates.map((candidate) => (
              <div key={candidate.id} className="flex gap-4 items-start p-4 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-800">
                    <span className="font-bold">{candidate.full_name}</span> vừa gửi đơn ứng tuyển vào CLB.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{getRelativeTime(candidate.created_at)}</p>
                </div>
              </div>
            ))}

            {recentCandidates.length === 0 && (
              <p className="text-sm text-slate-400 italic text-center py-8">Chưa có ứng viên mới đăng ký gần đây.</p>
            )}
          </div>
        </div>

        {/* Trận đấu mới nhất */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-secondary">Trận đấu mới nhất</h2>
          </div>
          <div className="space-y-4">
            {latestMatches.map((match) => {
              // Determine winner / loser details
              const p1IsWinner = match.winner_name === match.player1_name;
              
              return (
                <div key={match.id} className="flex gap-4 items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">{match.player1_name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p1IsWinner ? 'text-primary bg-primary/10' : 'text-slate-400 bg-slate-100'}`}>
                        {p1IsWinner ? 'Thắng' : 'Thua'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">{match.player2_name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${!p1IsWinner ? 'text-primary bg-primary/10' : 'text-slate-400 bg-slate-100'}`}>
                        {!p1IsWinner ? 'Thắng' : 'Thua'}
                      </span>
                    </div>
                  </div>
                  <div className="pl-4 border-l border-slate-200 shrink-0 text-center">
                    <p className="text-sm font-bold text-secondary">{match.score_detail}</p>
                    <p className="text-[10px] text-green-500 font-bold">+{match.elo_exchanged} Elo</p>
                  </div>
                </div>
              );
            })}

            {latestMatches.length === 0 && (
              <p className="text-sm text-slate-400 italic text-center py-8">Chưa có kết quả trận đấu nào gần đây.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
