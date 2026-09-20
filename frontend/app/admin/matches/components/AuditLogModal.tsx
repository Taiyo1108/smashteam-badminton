"use client";

import { useState, useEffect } from "react";
import { X, History, Loader2, Calendar, User, FileText, AlertCircle, GitCommit } from "lucide-react";
import { API_URL } from "@/app/config";
import { MatchAuditLog } from "../types";

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string | null;
  getAdminToken: () => string;
}

export default function AuditLogModal({
  isOpen,
  onClose,
  matchId,
  getAdminToken
}: AuditLogModalProps) {
  const [logs, setLogs] = useState<MatchAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen && matchId) {
      fetchLogs(matchId);
    } else {
      setLogs([]);
      setErrorMsg("");
    }
  }, [isOpen, matchId]);

  const fetchLogs = async (id: string) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const token = getAdminToken();
      const res = await fetch(`${API_URL}/api/matches/${id}/audit-logs`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Không thể tải nhật ký chỉnh sửa.");
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi khi tải nhật ký.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !matchId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-secondary text-lg">
                Nhật ký chỉnh sửa (Audit Trail)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Mã trận đấu: <strong className="font-mono text-slate-700">{matchId}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="min-h-[200px] flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs font-bold">Đang tải nhật ký...</span>
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="min-h-[200px] flex flex-col items-center justify-center gap-2 text-slate-400">
              <History className="w-8 h-8 stroke-1 text-slate-300" />
              <p className="text-xs font-bold">Chưa có lượt chỉnh sửa nào.</p>
              <p className="text-[11px] text-slate-400">Trận đấu này vẫn giữ nguyên dữ liệu gốc từ thời điểm tạo.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log, index) => {
                const actionStr = (log.action || log.action_type || "").toUpperCase();
                const isVoid = actionStr === "VOID";
                const before = log.before_data || {};
                const after = log.after_data || {};

                return (
                  <div 
                    key={log.id || index}
                    className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-sm hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isVoid ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
                        }`}>
                          {isVoid ? "🚫 HỦY TRẬN (VOID)" : "✏️ CHỈNH SỬA (EDIT)"}
                        </span>
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {log.admin_name || "Admin"}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(log.created_at).toLocaleString("vi-VN")}
                      </span>
                    </div>

                    {/* Reason */}
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <span className="font-bold text-slate-600 block mb-0.5">Lý do:</span>
                      <p className="text-slate-800 italic">"{log.reason}"</p>
                    </div>

                    {/* Diff Snapshot */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
                        <span className="font-black text-[10px] uppercase text-slate-400 block mb-1">Dữ liệu trước đó</span>
                        <div>Tỉ số: <span className="font-mono font-bold">{before.score_p1 ?? "?"} - {before.score_p2 ?? "?"}</span></div>
                        <div>Trao đổi: <span className="font-mono font-bold">±{before.elo_exchanged ?? "?"} ELO</span></div>
                        <div>Trạng thái: <span className="font-bold">{before.status || "approved"}</span></div>
                      </div>

                      <div className="p-2 bg-emerald-50/60 border border-emerald-100 rounded-lg text-emerald-800">
                        <span className="font-black text-[10px] uppercase text-emerald-600 block mb-1">Dữ liệu sau sửa</span>
                        {isVoid ? (
                          <div>Trạng thái: <span className="font-bold text-red-600 uppercase">voided</span></div>
                        ) : (
                          <>
                            <div>Tỉ số: <span className="font-mono font-bold">{after.score_p1 ?? "?"} - {after.score_p2 ?? "?"}</span></div>
                            <div>Trao đổi: <span className="font-mono font-bold">±{after.elo_exchanged ?? "?"} ELO</span></div>
                            <div>Trạng thái: <span className="font-bold">{after.status || "approved"}</span></div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-medium">
                      <span className="flex items-center gap-1">
                        <GitCommit className="w-3.5 h-3.5 text-primary" />
                        Số trận tiếp theo bị tính lại: <strong>{log.affected_matches_count || 0}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
