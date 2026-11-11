"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, AlertTriangle, ShieldAlert, CheckCircle2, 
  Calendar, RefreshCw, UserCheck, UserX, Loader2, Play 
} from "lucide-react";
import { API_URL } from "@/app/config";

interface MonthlyInactivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function MonthlyInactivityModal({
  isOpen,
  onClose,
  onRefresh
}: MonthlyInactivityModalProps) {
  const [selectedMonth, setSelectedMonth] = useState("2026-10");
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchPreview = async (month: string) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/inactivity-penalties/preview?month=${month}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || "Không thể tải dữ liệu chuyên cần.");
      }
      const data = await res.json();
      setReportData(data);
    } catch (err: any) {
      console.error("Error previewing monthly inactivity:", err);
      setError(err.message || "Lỗi tải báo cáo chuyên cần.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPreview(selectedMonth);
    }
  }, [isOpen, selectedMonth]);

  const handleExecute = async () => {
    if (!window.confirm(`Xác nhận thực thi phạt chuyên cần cho ${reportData?.monthDisplay || selectedMonth}? Những thành viên chưa đạt 2 buổi sẽ bị phạt 1 thẻ vàng và trừ điểm uy tín theo quy chế.`)) {
      return;
    }

    try {
      setExecuting(true);
      setError(null);
      setSuccessMessage(null);
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/inactivity-penalties/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ month: selectedMonth })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || "Không thể thực thi xử phạt chuyên cần.");
      }

      const data = await res.json();
      setReportData(data);
      setSuccessMessage(`Đã thực thi thành công! Đã phạt mới ${data.newlyPenalizedCount} thành viên và giữ nguyên ${data.alreadyPenalizedCount} thành viên đã phạt trước đó.`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error("Error executing monthly inactivity:", err);
      setError(err.message || "Lỗi thực thi kỷ luật.");
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20 text-lg">
                🟨
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Xử Lý Kỷ Luật Chuyên Cần Tháng
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    &lt; 2 Buổi/Tháng
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thành viên không đạt tối thiểu 2 buổi/tháng: Phạt 1 Thẻ vàng, trừ 30đ uy tín (lần 1) hoặc trừ 40đ uy tín (lần 2+).
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Month Selector & Action Bar */}
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Chọn tháng đánh giá:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-xs outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => fetchPreview(selectedMonth)}
                disabled={loading}
                className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                title="Làm mới"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-500" : ""}`} />
              </button>
            </div>

            <button
              type="button"
              disabled={executing || loading || !reportData || reportData.penalizedCount === 0}
              onClick={handleExecute}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {executing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Đang thực thi...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                  <span>Quét & Thực Thi Kỷ Luật ({reportData?.monthDisplay || selectedMonth})</span>
                </>
              )}
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mx-5 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mx-5 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Stats Bar */}
          {reportData && (
            <div className="px-5 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Tổng Thành Viên</span>
                <span className="text-lg font-black text-slate-900">{reportData.totalMembers}</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="block text-[10px] font-bold text-emerald-700 uppercase">Đạt Chuẩn (≥ 2 Buổi)</span>
                <span className="text-lg font-black text-emerald-700">{reportData.compliantCount}</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-center">
                <span className="block text-[10px] font-bold text-amber-800 uppercase">Chưa Đạt (&lt; 2 Buổi)</span>
                <span className="text-lg font-black text-amber-900">{reportData.penalizedCount}</span>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-center">
                <span className="block text-[10px] font-bold text-purple-700 uppercase">Đã Ghi Nhận Kỷ Luật</span>
                <span className="text-lg font-black text-purple-800">{reportData.alreadyPenalizedCount}</span>
              </div>
            </div>
          )}

          {/* List of Penalized Members */}
          <div className="flex-1 overflow-y-auto p-5 space-y-2">
            <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span>Danh sách thành viên thuộc diện kỷ luật ({reportData?.penalizedList?.length || 0}):</span>
              <span className="text-[10px] text-slate-400 font-normal">Buổi tập thực tế: {reportData?.totalSessionsInMonth || 0} buổi</span>
            </h3>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-xs">Đang đối chiếu dữ liệu điểm danh tháng...</span>
              </div>
            ) : reportData?.penalizedList?.length === 0 ? (
              <div className="py-12 text-center text-emerald-600 bg-emerald-50/50 rounded-2xl border border-emerald-100 p-6">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-xs font-bold">Tuyệt vời! 100% thành viên đều tham gia từ 2 buổi sinh hoạt trở lên trong tháng này.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-extrabold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Thành viên</th>
                      <th className="py-2.5 px-3">SĐT</th>
                      <th className="py-2.5 px-3 text-center">Buổi tham gia</th>
                      <th className="py-2.5 px-3 text-center">Mức phạt</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData?.penalizedList?.map((m: any, idx: number) => (
                      <tr key={idx} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-2 px-3 font-bold text-slate-800">
                          {m.name}
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                          {m.phone || "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-amber-100 text-amber-900">
                            {m.attended}/2 buổi
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                            🟨 Lần {m.violationNumber} ({m.penaltyReputation}đ)
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {m.isAlreadyPenalized ? (
                            <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                              Đã xử phạt
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              Chờ thực thi
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>* Thành viên bị phạt sẽ nhận được cảnh báo 1 lần khi đăng nhập.</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-700 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
