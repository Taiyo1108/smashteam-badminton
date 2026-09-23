"use client";

import { useState, useEffect } from "react";
import { 
  X, AlertOctagon, ArrowRight, ArrowLeft, Loader2, CheckCircle2, 
  Ban, ShieldAlert, AlertTriangle 
} from "lucide-react";
import { API_URL } from "@/app/config";
import { MatchHistoryItem, MatchEditPreview } from "../types";

interface VoidMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: MatchHistoryItem | null;
  onSuccess: () => void;
  getAdminToken: () => string;
}

export default function VoidMatchModal({
  isOpen,
  onClose,
  match,
  onSuccess,
  getAdminToken
}: VoidMatchModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [previewData, setPreviewData] = useState<MatchEditPreview | null>(null);

  useEffect(() => {
    if (match) {
      setReason("");
      setStep(1);
      setPreviewData(null);
      setErrorMsg("");
    }
  }, [match]);

  if (!isOpen || !match) return null;

  const isDoubles = Boolean(match.player1_partner_id || match.player2_partner_id);

  // Yêu cầu nạp Preview tác động khi hủy trận
  const handleRequestPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!reason.trim()) {
      setErrorMsg("Vui lòng nhập lý do hủy trận đấu (bắt buộc).");
      return;
    }

    setLoadingPreview(true);
    try {
      const token = getAdminToken();
      const res = await fetch(`${API_URL}/api/matches/${match.id}/preview-edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          is_void: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể mô phỏng tác động hủy trận.");
      }

      setPreviewData(data);
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi kết nối máy chủ.");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Xác nhận hủy trận (Void)
  const handleConfirmVoid = async () => {
    if (!previewData) return;
    setErrorMsg("");
    setSubmitting(true);

    try {
      const token = getAdminToken();
      const res = await fetch(`${API_URL}/api/matches/${match.id}/void`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: reason.trim(),
          checksum: previewData.checksum
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("⚠️ Xung đột dữ liệu: Trận đấu đã bị sửa đổi trước đó. Vui lòng thử lại.");
        }
        throw new Error(data.error || "Lỗi khi hủy trận đấu.");
      }

      alert("🚫 Đã hủy trận đấu và tính toán lại chuỗi ELO thành công!");
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi khi hủy trận đấu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-red-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center font-bold">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-secondary text-lg">
                Hủy kết quả trận đấu (Void Match)
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>Mã: <strong className="font-mono text-slate-700">{match.id.split("-")[0]}</strong></span>
                <span>•</span>
                <span>{isDoubles ? "👥 Đôi" : "🏸 Đơn"}</span>
                <span>•</span>
                <span>Tỉ số: {match.score_p1}-{match.score_p2}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-100 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 1 && (
            <form id="void-form" onSubmit={handleRequestPreview} className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-amber-900">
                    Nguyên tắc Hủy trận an toàn:
                  </p>
                  <ul className="list-disc list-inside text-amber-800 space-y-0.5 leading-relaxed">
                    <li>Trận đấu <strong>KHÔNG</strong> bị xóa vĩnh viễn khỏi Database.</li>
                    <li>Trạng thái trận sẽ chuyển thành <code className="bg-amber-100 px-1 py-0.5 rounded font-bold">voided</code>.</li>
                    <li>Toàn bộ ELO và thành tích phát sinh từ trận này sẽ được loại bỏ và replay lại từ đầu.</li>
                  </ul>
                </div>
              </div>

              {/* Match Summary Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <span className="text-[11px] font-black uppercase text-slate-500 block">Thông tin trận đấu cần hủy:</span>
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <div>
                    {match.player1_name} {match.player1_partner_name && `& ${match.player1_partner_name}`}
                  </div>
                  <div className="font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {match.score_p1} - {match.score_p2}
                  </div>
                  <div>
                    {match.player2_name} {match.player2_partner_name && `& ${match.player2_partner_name}`}
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  {new Date(match.created_at).toLocaleString("vi-VN")}
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Lý do hủy trận <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Audit Trail</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ví dụ: Nhập trùng trận đấu, đối thủ bỏ cuộc từ đầu, lỗi điều phối sân..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-red-500 outline-none resize-none"
                />
              </div>
            </form>
          )}

          {step === 2 && previewData && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-2xl border border-red-200 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-red-900">
                    Xác nhận tác động Hủy trận ({previewData.affectedMatchesCount} trận tiếp theo)
                  </p>
                  <p className="text-red-800 leading-relaxed">
                    Dưới đây là dự phóng ELO và thành tích mới của các tuyển thủ sau khi loại bỏ trận đấu này.
                  </p>
                </div>
              </div>

              {/* Player Impact Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-[11px] font-black">
                      <th className="p-2.5">Tuyển thủ</th>
                      <th className="p-2.5 text-center">ELO Hiện tại ➔ Mới</th>
                      <th className="p-2.5 text-center">Chênh lệch</th>
                      <th className="p-2.5 text-center">Trận / Thắng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {Object.values(previewData.playerImpacts || {}).map((impact) => (
                      <tr key={impact.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{impact.full_name}</td>
                        <td className="p-2.5 text-center font-mono">
                          {impact.currentElo} ➔ <strong className="text-slate-900">{impact.newElo}</strong>
                        </td>
                        <td className="p-2.5 text-center">
                          {impact.eloDiff > 0 ? (
                            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                              +{impact.eloDiff}
                            </span>
                          ) : impact.eloDiff < 0 ? (
                            <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full text-[11px]">
                              {impact.eloDiff}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-bold">0</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center text-slate-600">
                          {impact.newMatches} trận ({impact.newWins}W)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                form="void-form"
                disabled={loadingPreview}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {loadingPreview ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang mô phỏng...
                  </>
                ) : (
                  <>
                    Xem trước tác động
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang hủy trận...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Xác nhận Hủy trận
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
