"use client";

import { useState, useEffect } from "react";
import { 
  X, AlertTriangle, ArrowRight, ArrowLeft, Loader2, CheckCircle2, 
  Trophy, ShieldAlert, Users, TrendingUp, TrendingDown, RefreshCw 
} from "lucide-react";
import { API_URL } from "@/app/config";
import { MatchHistoryItem, Player, MatchEditPreview } from "../types";

interface EditMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: MatchHistoryItem | null;
  members: Player[];
  onSuccess: () => void;
  getAdminToken: () => string;
}

export default function EditMatchModal({
  isOpen,
  onClose,
  match,
  members,
  onSuccess,
  getAdminToken
}: EditMatchModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form State
  const [p1Id, setP1Id] = useState("");
  const [p1pId, setP1pId] = useState("");
  const [p2Id, setP2Id] = useState("");
  const [p2pId, setP2pId] = useState("");
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [winnerTeam, setWinnerTeam] = useState<"team1" | "team2">("team1");
  const [reason, setReason] = useState("");

  // Preview Result
  const [previewData, setPreviewData] = useState<MatchEditPreview | null>(null);

  const isDoubles = match ? Boolean(match.player1_partner_id || match.player2_partner_id) : false;

  useEffect(() => {
    if (match) {
      setP1Id(match.player1_id || "");
      setP1pId(match.player1_partner_id || "");
      setP2Id(match.player2_id || "");
      setP2pId(match.player2_partner_id || "");
      setScore1(String(match.score_p1 ?? ""));
      setScore2(String(match.score_p2 ?? ""));
      const isP1TeamWinner = match.winner_id === match.player1_id || (match.player1_partner_id && match.winner_id === match.player1_partner_id);
      setWinnerTeam(isP1TeamWinner ? "team1" : "team2");
      setReason("");
      setStep(1);
      setPreviewData(null);
      setErrorMsg("");
    }
  }, [match]);

  if (!isOpen || !match) return null;

  // Xử lý nạp Preview tác động (Step 1 -> Step 2)
  const handleRequestPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const s1 = parseInt(score1, 10);
    const s2 = parseInt(score2, 10);

    if (!p1Id || !p2Id) {
      setErrorMsg("Vui lòng chọn đầy đủ người chơi Đội 1 và Đội 2.");
      return;
    }
    if (isDoubles && (!p1pId || !p2pId)) {
      setErrorMsg("Trận đấu đôi cần đủ 4 tuyển thủ.");
      return;
    }
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0 || (s1 === 0 && s2 === 0)) {
      setErrorMsg("Tỉ số không hợp lệ.");
      return;
    }
    if (s1 === s2) {
      setErrorMsg("Trận đấu cầu lông không thể có tỉ số hòa.");
      return;
    }
    if (!reason.trim()) {
      setErrorMsg("Vui lòng nhập lý do chỉnh sửa trận đấu (bắt buộc để lưu Audit Log).");
      return;
    }

    const determinedWinnerId = winnerTeam === "team1" ? p1Id : p2Id;

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
          player1_id: p1Id,
          player2_id: p2Id,
          player1_partner_id: isDoubles ? p1pId : null,
          player2_partner_id: isDoubles ? p2pId : null,
          score_p1: s1,
          score_p2: s2,
          winner_id: determinedWinnerId,
          is_void: false
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể mô phỏng tính toán lại ELO.");
      }

      setPreviewData(data);
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi kết nối máy chủ.");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Xử lý Xác nhận lưu chỉnh sửa (Step 2 Confirm)
  const handleConfirmEdit = async () => {
    if (!previewData) return;
    setErrorMsg("");
    setSubmitting(true);

    const s1 = parseInt(score1, 10);
    const s2 = parseInt(score2, 10);
    const determinedWinnerId = winnerTeam === "team1" ? p1Id : p2Id;

    try {
      const token = getAdminToken();
      const res = await fetch(`${API_URL}/api/matches/${match.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          player1_id: p1Id,
          player2_id: p2Id,
          player1_partner_id: isDoubles ? p1pId : null,
          player2_partner_id: isDoubles ? p2pId : null,
          score_p1: s1,
          score_p2: s2,
          winner_id: determinedWinnerId,
          reason: reason.trim(),
          checksum: previewData.checksum
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("⚠️ Xung đột dữ liệu: Dữ liệu trận đấu đã bị thay đổi trong lúc bạn xem trước. Vui lòng đóng và mở lại để cập nhật.");
        }
        throw new Error(data.error || "Lỗi lưu chỉnh sửa trận đấu.");
      }

      alert("🎉 Cập nhật trận đấu và tính toán lại chuỗi ELO thành công!");
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi khi cập nhật trận đấu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              ✏️
            </div>
            <div>
              <h2 className="font-black text-secondary text-lg">
                Chỉnh sửa trận đấu & Recalculate ELO
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>Mã trận: <strong className="font-mono text-slate-700">{match.id.split("-")[0]}</strong></span>
                <span>•</span>
                <span>{isDoubles ? "👥 Đấu Đôi" : "🏸 Đấu Đơn"}</span>
                <span>•</span>
                <span>{new Date(match.created_at).toLocaleString("vi-VN")}</span>
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

        {/* Step Indicator */}
        <div className="px-6 pt-4 pb-2 flex items-center justify-center gap-4 bg-white text-xs font-bold">
          <div className={`flex items-center gap-2 ${step === 1 ? "text-primary font-black" : "text-slate-400"}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 1 ? "bg-secondary text-primary" : "bg-slate-100 text-slate-500"}`}>
              1
            </span>
            <span>Chỉnh sửa thông số</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-200"></div>
          <div className={`flex items-center gap-2 ${step === 2 ? "text-primary font-black" : "text-slate-400"}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? "bg-secondary text-primary" : "bg-slate-100 text-slate-500"}`}>
              2
            </span>
            <span>Xem trước tác động (Preview)</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-100 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 1 && (
            <form id="edit-form" onSubmit={handleRequestPreview} className="space-y-4">
              {/* Team 1 Selection */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                  ĐỘI 1 (Bên trái)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Tuyển thủ 1</label>
                    <select
                      value={p1Id}
                      onChange={(e) => setP1Id(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="">-- Chọn tuyển thủ --</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.full_name} ({isDoubles ? m.elo_doubles : m.elo_singles} ELO)</option>
                      ))}
                    </select>
                  </div>
                  {isDoubles && (
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Đồng đội 1</label>
                      <select
                        value={p1pId}
                        onChange={(e) => setP1pId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      >
                        <option value="">-- Chọn đồng đội --</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.full_name} ({m.elo_doubles} ELO)</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Scores & Winner Selection */}
              <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200/50 space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 block">
                  TỈ SỐ & ĐỘI THẮNG
                </span>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <label className="text-xs font-bold text-slate-600 block mb-1">Điểm Đội 1</label>
                    <input
                      type="number"
                      min="0"
                      value={score1}
                      onChange={(e) => {
                        setScore1(e.target.value);
                        const s1 = parseInt(e.target.value);
                        const s2 = parseInt(score2);
                        if (!isNaN(s1) && !isNaN(s2)) {
                          if (s1 > s2) setWinnerTeam("team1");
                          else if (s2 > s1) setWinnerTeam("team2");
                        }
                      }}
                      className="w-20 text-center font-mono font-black text-xl py-2 bg-white border border-slate-300 rounded-xl focus:border-primary"
                    />
                  </div>
                  <span className="font-black text-slate-400 text-lg mt-5">-</span>
                  <div className="text-center">
                    <label className="text-xs font-bold text-slate-600 block mb-1">Điểm Đội 2</label>
                    <input
                      type="number"
                      min="0"
                      value={score2}
                      onChange={(e) => {
                        setScore2(e.target.value);
                        const s1 = parseInt(score1);
                        const s2 = parseInt(e.target.value);
                        if (!isNaN(s1) && !isNaN(s2)) {
                          if (s1 > s2) setWinnerTeam("team1");
                          else if (s2 > s1) setWinnerTeam("team2");
                        }
                      }}
                      className="w-20 text-center font-mono font-black text-xl py-2 bg-white border border-slate-300 rounded-xl focus:border-primary"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="radio"
                      name="winnerTeam"
                      checked={winnerTeam === "team1"}
                      onChange={() => setWinnerTeam("team1")}
                      className="text-primary focus:ring-primary"
                    />
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    Đội 1 Thắng
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="radio"
                      name="winnerTeam"
                      checked={winnerTeam === "team2"}
                      onChange={() => setWinnerTeam("team2")}
                      className="text-primary focus:ring-primary"
                    />
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    Đội 2 Thắng
                  </label>
                </div>
              </div>

              {/* Team 2 Selection */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                  ĐỘI 2 (Bên phải)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Tuyển thủ 2</label>
                    <select
                      value={p2Id}
                      onChange={(e) => setP2Id(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="">-- Chọn tuyển thủ --</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.full_name} ({isDoubles ? m.elo_doubles : m.elo_singles} ELO)</option>
                      ))}
                    </select>
                  </div>
                  {isDoubles && (
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Đồng đội 2</label>
                      <select
                        value={p2pId}
                        onChange={(e) => setP2pId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      >
                        <option value="">-- Chọn đồng đội --</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.full_name} ({m.elo_doubles} ELO)</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Reason for Edit */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Lý do chỉnh sửa <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Được ghi nhận vào Audit Log</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nhập nhầm tỉ số hiệp đấu, đổi vị trí tuyển thủ..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-primary outline-none"
                />
              </div>
            </form>
          )}

          {step === 2 && previewData && (
            <div className="space-y-4">
              {/* Chain Warning Alert */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-amber-900">
                    Cảnh báo ảnh hưởng chuỗi ELO ({previewData.affectedMatchesCount} trận tiếp theo)
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    Hệ thống sẽ tự động replay và tính toán lại toàn bộ các trận đấu tiếp theo theo dòng thời gian thực tế để đảm bảo ELO luôn chuẩn xác.
                  </p>
                </div>
              </div>

              {/* Before vs After Overview */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    DỮ LIỆU HIỆN TẠI (BEFORE)
                  </span>
                  <div className="space-y-1.5 font-bold text-slate-700">
                    <div>Tỉ số: <span className="font-mono">{previewData.before.score_p1} - {previewData.before.score_p2}</span></div>
                    <div>Đội thắng: <span className="text-amber-600">{previewData.before.winner_name || "Đội 1"}</span></div>
                    <div>Điểm trao đổi: <span className="font-mono">±{previewData.before.elo_exchanged}</span></div>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block mb-2">
                    DỰ PHÓNG SAU SỬA (AFTER)
                  </span>
                  <div className="space-y-1.5 font-bold text-emerald-900">
                    <div>Tỉ số: <span className="font-mono">{previewData.after.score_p1} - {previewData.after.score_p2}</span></div>
                    <div>Đội thắng: <span className="text-emerald-700">{winnerTeam === "team1" ? "Đội 1" : "Đội 2"}</span></div>
                    <div>Điểm trao đổi: <span className="font-mono">±{previewData.after.elo_exchanged}</span></div>
                  </div>
                </div>
              </div>

              {/* Player Impacts Table */}
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-600 block">
                  Biến động chỉ số các tuyển thủ liên quan
                </span>
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 text-[11px] font-black">
                        <th className="p-2.5">Tuyển thủ</th>
                        <th className="p-2.5 text-center">ELO Hiện tại ➔ Mới</th>
                        <th className="p-2.5 text-center">Chênh lệch</th>
                        <th className="p-2.5 text-center">Thắng/Thua</th>
                        <th className="p-2.5 text-center">Tỉ lệ thắng</th>
                        <th className="p-2.5 text-center">Peak ELO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {Object.values(previewData.playerImpacts || {}).map((impact) => (
                        <tr key={impact.id} className="hover:bg-slate-50/80">
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
                            {impact.newWins}W - {impact.newLosses}L
                          </td>
                          <td className="p-2.5 text-center font-mono">
                            {impact.newWinRate}%
                          </td>
                          <td className="p-2.5 text-center font-mono text-amber-600 font-bold">
                            {impact.newPeak}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Affected Subsequent Matches Preview */}
              {previewData.affectedMatches && previewData.affectedMatches.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600 block">
                    Các trận đấu tiếp theo được tính lại ({previewData.affectedMatches.length})
                  </span>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 text-xs">
                    {previewData.affectedMatches.map((m) => (
                      <div key={m.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <div className="font-bold text-slate-800">
                            {m.player1_name} {m.player1_partner_name && `& ${m.player1_partner_name}`} vs {m.player2_name} {m.player2_partner_name && `& ${m.player2_partner_name}`}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(m.created_at).toLocaleString("vi-VN")} • Tỉ số: {m.score_p1}-{m.score_p2}
                          </div>
                        </div>
                        <div className="text-right text-[11px] font-mono">
                          <span className="text-slate-500">P1 ELO: {m.p1_elo_after_old} ➔ </span>
                          <strong className="text-secondary">{m.p1_elo_after_new}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                form="edit-form"
                disabled={loadingPreview}
                className="px-6 py-2.5 rounded-xl bg-secondary hover:bg-slate-900 text-white text-xs font-black transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {loadingPreview ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Đang mô phỏng Recalculation...
                  </>
                ) : (
                  <>
                    Xem trước tác động (Preview)
                    <ArrowRight className="w-4 h-4 text-primary" />
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
                Quay lại sửa tiếp
              </button>
              <button
                type="button"
                onClick={handleConfirmEdit}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang lưu và cập nhật ELO...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Xác nhận & Cập nhật ELO
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
