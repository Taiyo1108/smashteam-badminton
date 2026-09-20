"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Search, Filter, Calendar, Trophy, RotateCcw, 
  ChevronLeft, ChevronRight, Edit3, Ban, History, 
  Loader2, AlertCircle, RefreshCw, CheckCircle2, MoreVertical
} from "lucide-react";
import { API_URL } from "@/app/config";
import { MatchHistoryItem, Player } from "../types";
import EditMatchModal from "./EditMatchModal";
import VoidMatchModal from "./VoidMatchModal";
import AuditLogModal from "./AuditLogModal";

interface MatchHistoryViewProps {
  members: Player[];
  getAdminToken: () => string;
  onRefreshData?: () => void;
}

export default function MatchHistoryView({
  members,
  getAdminToken,
  onRefreshData
}: MatchHistoryViewProps) {
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<"all" | "singles" | "doubles">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "voided">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMatches, setTotalMatches] = useState(0);

  // Modals state
  const [editingMatch, setEditingMatch] = useState<MatchHistoryItem | null>(null);
  const [voidingMatch, setVoidingMatch] = useState<MatchHistoryItem | null>(null);
  const [auditMatchId, setAuditMatchId] = useState<string | null>(null);

  // Fetch match history from API
  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const token = getAdminToken();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        mode: modeFilter,
        status: statusFilter,
        search: search.trim()
      });

      const res = await fetch(`${API_URL}/api/matches/history?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("Không thể tải lịch sử trận đấu.");
      const data = await res.json();
      setMatches(data.matches || []);
      setTotalPages(data.totalPages || 1);
      setTotalMatches(data.total || 0);
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi khi tải dữ liệu lịch sử.");
    } finally {
      setLoading(false);
    }
  }, [page, modeFilter, statusFilter, search, getAdminToken]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleRefreshAll = () => {
    fetchMatches();
    if (onRefreshData) onRefreshData();
  };

  const renderPlayerBadge = (
    name: string, 
    nickname: string | null | undefined, 
    avatar: string | null | undefined, 
    eloBefore?: number, 
    eloAfter?: number,
    isWinner?: boolean
  ) => {
    const diff = (eloAfter !== undefined && eloBefore !== undefined) ? eloAfter - eloBefore : null;
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs overflow-hidden shrink-0 border border-slate-200">
          {avatar ? (
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          ) : (
            name.charAt(0)
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold truncate max-w-[130px] ${isWinner ? "text-slate-900" : "text-slate-700"}`}>
              {name}
            </span>
            {nickname && (
              <span className="text-[10px] text-slate-400 truncate max-w-[70px]">
                ({nickname})
              </span>
            )}
          </div>
          {eloBefore !== undefined && eloAfter !== undefined && (
            <div className="text-[10px] font-mono flex items-center gap-1">
              <span className="text-slate-400">{eloBefore}</span>
              <span className="text-slate-300">➔</span>
              <span className="font-bold text-slate-700">{eloAfter}</span>
              {diff !== null && diff !== 0 && (
                <span className={`font-bold ${diff > 0 ? "text-emerald-600" : "text-red-500"}`}>
                  ({diff > 0 ? `+${diff}` : diff})
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Filters Toolbar */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-black text-secondary tracking-tight">
                LỊCH SỬ & HIỆU CHỈNH TRẬN ĐẤU
              </h2>
              <span className="bg-amber-100 text-amber-800 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase">
                {totalMatches} trận
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Chỉnh sửa tỉ số, hủy trận sai sót & tự động Recalculate chuỗi ELO theo thứ tự thời gian.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefreshAll}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới
          </button>
        </div>

        {/* Filter Controls */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên tuyển thủ, nickname hoặc số điện thoại..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:bg-white focus:border-primary transition-colors"
            />
          </div>

          {/* Mode Filter */}
          <div>
            <select
              value={modeFilter}
              onChange={(e) => {
                setModeFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:bg-white focus:border-primary transition-colors"
            >
              <option value="all">🏸 Thể thức: Tất cả</option>
              <option value="doubles">👥 Chỉ trận Đấu Đôi</option>
              <option value="singles">🏸 Chỉ trận Đấu Đơn</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:bg-white focus:border-primary transition-colors"
            >
              <option value="all">Trạng thái: Tất cả</option>
              <option value="approved">✅ Hợp lệ (Approved)</option>
              <option value="voided">🚫 Đã hủy (Voided)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Matches List */}
      {loading ? (
        <div className="min-h-[300px] bg-white rounded-3xl border border-slate-200 p-8 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs font-bold">Đang tải danh sách lịch sử trận đấu...</span>
        </div>
      ) : errorMsg ? (
        <div className="p-6 bg-red-50 rounded-3xl border border-red-200 text-red-700 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : matches.length === 0 ? (
        <div className="min-h-[250px] bg-white rounded-3xl border border-slate-200 p-8 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Trophy className="w-10 h-10 stroke-1 text-slate-300" />
          <p className="text-sm font-bold text-slate-600">Không tìm thấy trận đấu nào phù hợp</p>
          <p className="text-xs text-slate-400">Hãy thử thay đổi điều kiện lọc hoặc từ khóa tìm kiếm.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const isDoubles = Boolean(m.player1_partner_id || m.player2_partner_id);
            const isVoided = m.status === "voided";
            const team1Won = Boolean(m.winner_id === m.player1_id || (m.player1_partner_id && m.winner_id === m.player1_partner_id));
            const team2Won = Boolean(!team1Won && !isVoided);

            return (
              <div
                key={m.id}
                className={`bg-white rounded-2xl p-4 md:p-5 border transition-all shadow-sm hover:shadow-md ${
                  isVoided 
                    ? "border-red-200/80 bg-red-50/20 opacity-80" 
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Meta tags & timestamp */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isVoided ? "bg-red-100 text-red-700 border border-red-200" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {isVoided ? "🚫 Đã hủy (Voided)" : "✅ Hợp lệ"}
                    </span>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                      {isDoubles ? "👥 Đôi" : "🏸 Đơn"}
                    </span>

                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(m.created_at).toLocaleString("vi-VN")}
                    </span>

                    <span className="text-[10px] font-mono text-slate-400">
                      #{m.id.split("-")[0]}
                    </span>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end lg:self-auto">
                    {/* View Audit Logs */}
                    <button
                      type="button"
                      onClick={() => setAuditMatchId(m.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Xem nhật ký chỉnh sửa"
                    >
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      Nhật ký
                    </button>

                    {/* Edit Match */}
                    <button
                      type="button"
                      disabled={isVoided}
                      onClick={() => setEditingMatch(m)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                        isVoided
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60"
                      }`}
                      title={isVoided ? "Không thể chỉnh sửa trận đã hủy" : "Chỉnh sửa trận & recalculate ELO"}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                      Sửa
                    </button>

                    {/* Void Match */}
                    {!isVoided && (
                      <button
                        type="button"
                        onClick={() => setVoidingMatch(m)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Hủy kết quả trận đấu"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Hủy trận
                      </button>
                    )}
                  </div>
                </div>

                {/* Match Details: Team 1 vs Team 2 */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 items-center gap-4">
                  {/* Team 1 Players */}
                  <div className={`md:col-span-5 space-y-2 p-3 rounded-xl ${team1Won ? "bg-amber-50/40 border border-amber-100" : ""}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                        {team1Won && <Trophy className="w-3 h-3 text-amber-500" />}
                        ĐỘI 1
                      </span>
                      {team1Won && <span className="text-[10px] font-bold text-amber-600">Thắng cuộc</span>}
                    </div>
                    {renderPlayerBadge(
                      m.player1_name, 
                      m.player1_nickname, 
                      m.player1_avatar, 
                      m.p1_elo_before, 
                      m.p1_elo_after, 
                      team1Won
                    )}
                    {isDoubles && m.player1_partner_name && (
                      renderPlayerBadge(
                        m.player1_partner_name, 
                        m.player1_partner_nickname, 
                        m.player1_partner_avatar, 
                        m.p1_partner_elo_before, 
                        m.p1_partner_elo_after, 
                        team1Won
                      )
                    )}
                  </div>

                  {/* Center Score & ELO Exchanged */}
                  <div className="md:col-span-2 flex flex-col items-center justify-center py-2 text-center">
                    <div className="flex items-center gap-2 font-mono font-black text-2xl text-slate-900 bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-200">
                      <span className={team1Won ? "text-amber-600" : ""}>{m.score_p1}</span>
                      <span className="text-slate-300">-</span>
                      <span className={team2Won ? "text-amber-600" : ""}>{m.score_p2}</span>
                    </div>
                    <div className="mt-1 text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      ±{m.elo_exchanged || 0} ELO
                    </div>
                  </div>

                  {/* Team 2 Players */}
                  <div className={`md:col-span-5 space-y-2 p-3 rounded-xl ${team2Won ? "bg-amber-50/40 border border-amber-100" : ""}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                        {team2Won && <Trophy className="w-3 h-3 text-amber-500" />}
                        ĐỘI 2
                      </span>
                      {team2Won && <span className="text-[10px] font-bold text-amber-600">Thắng cuộc</span>}
                    </div>
                    {renderPlayerBadge(
                      m.player2_name, 
                      m.player2_nickname, 
                      m.player2_avatar, 
                      m.p2_elo_before, 
                      m.p2_elo_after, 
                      team2Won
                    )}
                    {isDoubles && m.player2_partner_name && (
                      renderPlayerBadge(
                        m.player2_partner_name, 
                        m.player2_partner_nickname, 
                        m.player2_partner_avatar, 
                        m.p2_partner_elo_before, 
                        m.p2_partner_elo_after, 
                        team2Won
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 text-xs font-bold text-slate-600">
          <div>
            Trang {page} / {totalPages} (Tổng cộng {totalMatches} trận)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Sau
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <EditMatchModal
        isOpen={Boolean(editingMatch)}
        match={editingMatch}
        members={members}
        onClose={() => setEditingMatch(null)}
        onSuccess={handleRefreshAll}
        getAdminToken={getAdminToken}
      />

      <VoidMatchModal
        isOpen={Boolean(voidingMatch)}
        match={voidingMatch}
        onClose={() => setVoidingMatch(null)}
        onSuccess={handleRefreshAll}
        getAdminToken={getAdminToken}
      />

      <AuditLogModal
        isOpen={Boolean(auditMatchId)}
        matchId={auditMatchId}
        onClose={() => setAuditMatchId(null)}
        getAdminToken={getAdminToken}
      />
    </div>
  );
}
