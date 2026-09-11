"use client";

import { useState, useEffect } from "react";
import { Swords, Trophy, Save, ArrowDownUp, AlertCircle, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { API_URL } from "@/app/config";
import { getRankName, getRankBadgeClass } from "@/app/utils/rank";

interface SearchablePlayerSelectProps {
  label: string;
  value: string;
  onChange: (id: string) => void;
  members: any[];
  isDoubles: boolean;
  currentDropdown: string;
  isSelected: (id: string, currentDropdown: string) => boolean;
  placeholder: string;
  badge?: React.ReactNode;
}

function SearchablePlayerSelect({
  label,
  value,
  onChange,
  members,
  isDoubles,
  currentDropdown,
  isSelected,
  placeholder,
  badge
}: SearchablePlayerSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Sync state with selected value
  useEffect(() => {
    if (value) {
      const selectedMember = members.find(m => m.id === value);
      if (selectedMember) {
        setSearchQuery(selectedMember.full_name);
        return;
      }
    }
    setSearchQuery("");
  }, [value, members]);

  // Filter members
  const filtered = members.filter(m => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const shortId = m.id ? m.id.split('-')[0].toLowerCase() : "";
    return (
      m.full_name.toLowerCase().includes(q) ||
      (m.phone_zalo || "").includes(q) ||
      shortId.includes(q)
    );
  });

  return (
    <div className="space-y-2 relative">
      <div className="flex justify-between items-center">
        <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">
          {label}
        </label>
        {badge}
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay to allow clicking on an option
            setTimeout(() => {
              setIsOpen(false);
              // Reset to current selected name if query is not matching any selection
              if (value) {
                const selected = members.find(m => m.id === value);
                if (selected) {
                  setSearchQuery(selected.full_name);
                }
              } else {
                setSearchQuery("");
              }
            }, 250);
          }}
          onChange={(e) => {
            const val = e.target.value;
            setSearchQuery(val);
            if (!val) {
              onChange("");
            }
          }}
          className="w-full p-3 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-black font-bold text-slate-800"
        />
        
        {/* Toggle icon */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">
          ▼
        </span>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50 divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-3 text-xs text-slate-400 italic">Không tìm thấy thành viên</div>
          ) : (
            filtered.map(m => {
              const disabled = isSelected(m.id, currentDropdown);
              const shortId = m.id ? m.id.split('-')[0].toUpperCase() : "";
              const currentElo = isDoubles ? (m.elo_doubles ?? 1000) : (m.elo_singles ?? 1000);
              const rankName = getRankName(currentElo);
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={disabled}
                  onMouseDown={() => {
                    onChange(m.id);
                    setSearchQuery(m.full_name);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-3 text-xs transition-colors flex justify-between items-center ${
                    disabled 
                      ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                      : 'hover:bg-slate-50 text-slate-700 font-bold'
                  }`}
                >
                  <div>
                    <div>{m.full_name} <span className="text-[10px] text-slate-400 tabular-nums">({shortId})</span></div>
                    <div className="text-[9px] text-slate-400 font-medium">SĐT: {m.phone_zalo || "N/A"}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${getRankBadgeClass(rankName)}`}>
                      {rankName}
                    </span>
                    <span className="text-[10px] font-black text-amber-500 font-mono">
                      Elo {currentElo}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function MatchesPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [isDoubles, setIsDoubles] = useState(false);
  
  // Player selection states
  const [player1, setPlayer1] = useState("");
  const [player1Partner, setPlayer1Partner] = useState("");
  const [player2, setPlayer2] = useState("");
  const [player2Partner, setPlayer2Partner] = useState("");
  
  // Scores & Winner states
  const [scoreP1, setScoreP1] = useState("");
  const [scoreP2, setScoreP2] = useState("");
  const [winner, setWinner] = useState(""); // player1 = Team 1 wins, player2 = Team 2 wins
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch actual members for dropdown selection
  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/users/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const allMembers = await res.json();
        // Lọc bỏ các thành viên tạm nghỉ (inactive), đã rời CLB (left), hoặc bị khóa tài khoản (is_blocked)
        const activeMembers = allMembers.filter((m: any) => m.status === "active" && !m.is_blocked);
        setMembers(activeMembers);
      }
    } catch (e) {
      console.error("Error fetching members:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Find selected member objects
  const p1Details = members.find((m) => m.id === player1);
  const p1pDetails = members.find((m) => m.id === player1Partner);
  const p2Details = members.find((m) => m.id === player2);
  const p2pDetails = members.find((m) => m.id === player2Partner);

  // Helper to determine if a player is already selected in another dropdown
  const isSelected = (id: string, currentDropdown: string) => {
    if (currentDropdown !== "p1" && player1 === id) return true;
    if (currentDropdown !== "p1p" && player1Partner === id) return true;
    if (currentDropdown !== "p2" && player2 === id) return true;
    if (currentDropdown !== "p2p" && player2Partner === id) return true;
    return false;
  };

  // Client-side Elo Simulator for separated Elo scores
  const simulateElo = () => {
    if (!p1Details || !p2Details || !winner) return null;
    if (isDoubles && (!p1pDetails || !p2pDetails)) return null;

    // Dynamically retrieve values based on Singles / Doubles toggle
    const elo1 = isDoubles ? p1Details.elo_doubles : p1Details.elo_singles;
    const elo2 = isDoubles ? p2Details.elo_doubles : p2Details.elo_singles;
    const matches1 = isDoubles ? (p1Details.matches_doubles || 0) : (p1Details.matches_singles || 0);
    const matches2 = isDoubles ? (p2Details.matches_doubles || 0) : (p2Details.matches_singles || 0);
    const streak1 = isDoubles ? (p1Details.streak_doubles || 0) : (p1Details.streak_singles || 0);
    const streak2 = isDoubles ? (p2Details.streak_doubles || 0) : (p2Details.streak_singles || 0);

    const elo1_p = isDoubles && p1pDetails ? p1pDetails.elo_doubles : null;
    const elo2_p = isDoubles && p2pDetails ? p2pDetails.elo_doubles : null;
    const matches1_p = isDoubles && p1pDetails ? (p1pDetails.matches_doubles || 0) : 0;
    const matches2_p = isDoubles && p2pDetails ? (p2pDetails.matches_doubles || 0) : 0;
    const streak1_p = isDoubles && p1pDetails ? (p1pDetails.streak_doubles || 0) : 0;
    const streak2_p = isDoubles && p2pDetails ? (p2pDetails.streak_doubles || 0) : 0;

    // Team average Elo
    const T1 = elo1_p !== null ? (elo1 + elo1_p) / 2 : elo1;
    const T2 = elo2_p !== null ? (elo2 + elo2_p) / 2 : elo2;

    const getK = (matches: number, streak: number) => {
      return matches < 10 ? 40 : (streak >= 3 ? 36 : 24);
    };

    const K1 = getK(matches1, streak1);
    const K2 = getK(matches2, streak2);

    let K_team1 = K1;
    if (elo1_p !== null) {
      const K1_p = getK(matches1_p, streak1_p);
      K_team1 = (K1 + K1_p) / 2;
    }

    let K_team2 = K2;
    if (elo2_p !== null) {
      const K2_p = getK(matches2_p, streak2_p);
      K_team2 = (K2 + K2_p) / 2;
    }

    const E1 = 1 / (1 + Math.pow(10, (T2 - T1) / 400));
    const E2 = 1 - E1;

    // Team 1 won if winner is player1
    const team1Won = winner === player1;
    const S1 = team1Won ? 1 : 0;
    const S2 = 1 - S1;

    const delta1 = Math.round(K_team1 * (S1 - E1));
    const delta2 = Math.round(K_team2 * (S2 - E2));

    const elo1New = Math.max(100, elo1 + delta1);
    const elo1_pNew = elo1_p !== null ? Math.max(100, elo1_p + delta1) : null;
    const elo2New = Math.max(100, elo2 + delta2);
    const elo2_pNew = elo2_p !== null ? Math.max(100, elo2_p + delta2) : null;

    return {
      p1: { before: elo1, after: elo1New, diff: delta1 },
      p1_p: elo1_p !== null && elo1_pNew !== null ? { before: elo1_p, after: elo1_pNew, diff: delta1 } : null,
      p2: { before: elo2, after: elo2New, diff: delta2 },
      p2_p: elo2_p !== null && elo2_pNew !== null ? { before: elo2_p, after: elo2_pNew, diff: delta2 } : null,
    };
  };

  const simulated = simulateElo();

  const handleScoreChange = (p1Score: string, p2Score: string) => {
    setScoreP1(p1Score);
    setScoreP2(p2Score);

    const s1 = parseInt(p1Score);
    const s2 = parseInt(p2Score);

    if (!isNaN(s1) && !isNaN(s2) && player1 && player2) {
      if (s1 > s2) setWinner(player1);
      else if (s2 > s1) setWinner(player2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (player1 === player2) {
      setFormError("Hai người chơi chính của 2 đội phải khác nhau!");
      return;
    }
    if (isDoubles && (!player1Partner || !player2Partner)) {
      setFormError("Vui lòng chọn đầy đủ 4 người chơi cho trận đánh đôi!");
      return;
    }
    if (scoreP1 === "" || scoreP2 === "") {
      setFormError("Vui lòng nhập điểm số hợp lệ!");
      return;
    }
    if (!winner) {
      setFormError("Vui lòng chọn đội thắng!");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/matches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          player1_id: player1,
          player2_id: player2,
          player1_partner_id: isDoubles ? player1Partner : null,
          player2_partner_id: isDoubles ? player2Partner : null,
          score_p1: parseInt(scoreP1),
          score_p2: parseInt(scoreP2),
          winner_id: winner
        })
      });

      if (res.ok) {
        const { default: confetti } = await import("canvas-confetti");
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        setFormSuccess("Lưu kết quả trận đấu và cập nhật điểm Elo thành công!");

        // Reset forms
        setPlayer1("");
        setPlayer1Partner("");
        setPlayer2("");
        setPlayer2Partner("");
        setScoreP1("");
        setScoreP2("");
        setWinner("");

        fetchMembers();
      } else {
        const err = await res.json();
        setFormError(err.error || "Gặp lỗi khi lưu kết quả trận đấu.");
      }
    } catch (e) {
      setFormError("Lỗi kết nối mạng.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
        <p className="text-sm font-medium">Đang tải danh sách thành viên...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-1">Cập nhật Kết quả Thi đấu</h1>
          <p className="text-slate-500">Nhập kết quả trận đấu Solo (Đơn) hoặc Đôi để tự động tính Elo và chuỗi.</p>
        </div>
        
        {/* Thể thức Toggle */}
        <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start md:self-center">
          <button
            type="button"
            onClick={() => {
              setIsDoubles(false);
              setPlayer1Partner("");
              setPlayer2Partner("");
              setWinner("");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${!isDoubles ? 'bg-white text-secondary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            ĐÁNH ĐƠN
          </button>
          <button
            type="button"
            onClick={() => {
              setIsDoubles(true);
              setWinner("");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${isDoubles ? 'bg-white text-secondary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            ĐÁNH ĐÔI
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-slate-50 rounded-full blur-3xl -z-0"></div>
        
        <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 items-stretch">
            {/* ĐỘI A (ĐỘI 1) */}
            <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${winner === player1 && player1 !== "" ? 'bg-black/5 border-black shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'bg-slate-50/50 border-slate-200'}`}>
              <div className="space-y-4">
                <SearchablePlayerSelect
                  label={isDoubles ? "Đội A (Thành viên 1)" : "Người chơi 1 (Đội A)"}
                  value={player1}
                  onChange={(val) => {
                    setPlayer1(val);
                    if (winner === player1) setWinner("");
                  }}
                  members={members}
                  isDoubles={isDoubles}
                  currentDropdown="p1"
                  isSelected={isSelected}
                  placeholder="Nhập tên, SĐT hoặc Mã thành viên..."
                  badge={
                    <div className="flex gap-1.5 items-center">
                      {p1Details && (isDoubles ? p1Details.matches_doubles : p1Details.matches_singles) < 10 && (
                        <span className="bg-blue-100 text-blue-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">Placement</span>
                      )}
                      {p1Details && (isDoubles ? p1Details.streak_doubles : p1Details.streak_singles) >= 3 && (
                        <span className="bg-red-100 text-red-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase animate-pulse">
                          Hot ({isDoubles ? p1Details.streak_doubles : p1Details.streak_singles}W)
                        </span>
                      )}
                    </div>
                  }
                />

                {/* Doubles Partner A */}
                {isDoubles && (
                  <div className="pt-2 border-t border-slate-200/50">
                    <SearchablePlayerSelect
                      label="Đội A (Thành viên 2)"
                      value={player1Partner}
                      onChange={setPlayer1Partner}
                      members={members}
                      isDoubles={isDoubles}
                      currentDropdown="p1p"
                      isSelected={isSelected}
                      placeholder="Nhập tên, SĐT hoặc Mã thành viên..."
                      badge={
                        <div className="flex gap-1.5 items-center">
                          {p1pDetails && p1pDetails.matches_doubles < 10 && (
                            <span className="bg-blue-100 text-blue-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">Placement</span>
                          )}
                          {p1pDetails && p1pDetails.streak_doubles >= 3 && (
                            <span className="bg-red-100 text-red-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase animate-pulse">Hot ({p1pDetails.streak_doubles}W)</span>
                          )}
                        </div>
                      }
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-1">Điểm số Đội A</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={scoreP1}
                    onChange={(e) => handleScoreChange(e.target.value, scoreP2)}
                    className="w-full p-3 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-black text-center font-black text-slate-800 text-lg"
                  />
                </div>

                {p1Details && (
                  <div className="p-3 bg-white/60 border border-slate-100 rounded-xl space-y-1.5 text-xs text-slate-500">
                    <p className="font-bold text-slate-600 text-[10px] uppercase tracking-wider mb-1">Thông số hiện tại ({isDoubles ? "Đánh đôi" : "Đánh đơn"})</p>
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span>Player 1: <strong className="text-slate-700">{p1Details.full_name}</strong> (Elo: {isDoubles ? p1Details.elo_doubles : p1Details.elo_singles})</span>
                      <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${getRankBadgeClass(getRankName(isDoubles ? p1Details.elo_doubles : p1Details.elo_singles))}`}>
                        {getRankName(isDoubles ? p1Details.elo_doubles : p1Details.elo_singles)}
                      </span>
                    </div>
                    <p>Trận đấu: <span className="font-bold text-slate-700">{isDoubles ? p1Details.matches_doubles : p1Details.matches_singles}</span></p>
                    
                    {isDoubles && p1pDetails && (
                      <>
                        <div className="flex items-center justify-between gap-1 flex-wrap pt-1 border-t border-slate-200/40">
                          <span>Partner: <strong className="text-slate-700">{p1pDetails.full_name}</strong> (Elo: {p1pDetails.elo_doubles})</span>
                          <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${getRankBadgeClass(getRankName(p1pDetails.elo_doubles))}`}>
                            {getRankName(p1pDetails.elo_doubles)}
                          </span>
                        </div>
                        <p>Trận đấu: <span className="font-bold text-slate-700">{p1pDetails.matches_doubles}</span></p>
                        <p className="border-t border-slate-200/50 pt-1 mt-1">Elo trung bình Đội A: <span className="font-black text-secondary">{((p1Details.elo_doubles + p1pDetails.elo_doubles) / 2).toFixed(0)}</span></p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {player1 && (!isDoubles || player1Partner) && (
                <button 
                  type="button"
                  onClick={() => setWinner(player1)}
                  className={`w-full py-2.5 mt-4 rounded-xl text-xs font-black tracking-wider transition-colors border ${winner === player1 ? 'bg-black border-black text-white shadow-md shadow-black/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {winner === player1 ? '✓ ĐỘI A THẮNG' : 'CHỌN ĐỘI A THẮNG'}
                </button>
              )}
            </div>

            {/* CỘT GIỮA: VS & BỘ MÔ PHỎNG ELO */}
            <div className="flex flex-col items-center justify-center gap-4 py-4 min-w-[150px]">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black shadow-inner">
                VS
              </div>

              {simulated && (
                <div className="text-center p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 w-full">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Elo dự kiến</p>
                  
                  {/* P1 & Partner 1 Simulator */}
                  <div className="space-y-1 text-left">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-200/60 pb-0.5">Đội A</p>
                    
                    {/* Player 1 */}
                    <div className="flex justify-between items-center text-[11px] gap-2">
                      <span className="font-bold text-slate-600 truncate max-w-[70px]">{p1Details?.full_name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">{simulated.p1.before}→{simulated.p1.after}</span>
                        <span className={`font-black ${simulated.p1.diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ({simulated.p1.diff >= 0 ? `+${simulated.p1.diff}` : simulated.p1.diff})
                        </span>
                        {getRankName(simulated.p1.before) !== getRankName(simulated.p1.after) && (
                          <span className={`text-[7px] uppercase tracking-wider font-extrabold px-1 py-0.5 rounded ${getRankBadgeClass(getRankName(simulated.p1.after))}`}>
                            {getRankName(simulated.p1.after)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Partner 1 */}
                    {isDoubles && simulated.p1_p && (
                      <div className="flex justify-between items-center text-[11px] gap-2">
                        <span className="font-bold text-slate-600 truncate max-w-[70px]">{p1pDetails?.full_name}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">{simulated.p1_p.before}→{simulated.p1_p.after}</span>
                          <span className={`font-black ${simulated.p1_p.diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ({simulated.p1_p.diff >= 0 ? `+${simulated.p1_p.diff}` : simulated.p1_p.diff})
                          </span>
                          {getRankName(simulated.p1_p.before) !== getRankName(simulated.p1_p.after) && (
                            <span className={`text-[7px] uppercase tracking-wider font-extrabold px-1 py-0.5 rounded ${getRankBadgeClass(getRankName(simulated.p1_p.after))}`}>
                              {getRankName(simulated.p1_p.after)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* P2 & Partner 2 Simulator */}
                  <div className="space-y-1 text-left">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-200/60 pb-0.5">Đội B</p>
                    
                    {/* Player 2 */}
                    <div className="flex justify-between items-center text-[11px] gap-2">
                      <span className="font-bold text-slate-600 truncate max-w-[70px]">{p2Details?.full_name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">{simulated.p2.before}→{simulated.p2.after}</span>
                        <span className={`font-black ${simulated.p2.diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ({simulated.p2.diff >= 0 ? `+${simulated.p2.diff}` : simulated.p2.diff})
                        </span>
                        {getRankName(simulated.p2.before) !== getRankName(simulated.p2.after) && (
                          <span className={`text-[7px] uppercase tracking-wider font-extrabold px-1 py-0.5 rounded ${getRankBadgeClass(getRankName(simulated.p2.after))}`}>
                            {getRankName(simulated.p2.after)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Partner 2 */}
                    {isDoubles && simulated.p2_p && (
                      <div className="flex justify-between items-center text-[11px] gap-2">
                        <span className="font-bold text-slate-600 truncate max-w-[70px]">{p2pDetails?.full_name}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">{simulated.p2_p.before}→{simulated.p2_p.after}</span>
                          <span className={`font-black ${simulated.p2_p.diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ({simulated.p2_p.diff >= 0 ? `+${simulated.p2_p.diff}` : simulated.p2_p.diff})
                          </span>
                          {getRankName(simulated.p2_p.before) !== getRankName(simulated.p2_p.after) && (
                            <span className={`text-[7px] uppercase tracking-wider font-extrabold px-1 py-0.5 rounded ${getRankBadgeClass(getRankName(simulated.p2_p.after))}`}>
                              {getRankName(simulated.p2_p.after)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* ĐỘI B (ĐỘI 2) */}
            <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${winner === player2 && player2 !== "" ? 'bg-black/5 border-black shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'bg-slate-50/50 border-slate-200'}`}>
              <div className="space-y-4">
                <SearchablePlayerSelect
                  label={isDoubles ? "Đội B (Thành viên 1)" : "Người chơi 2 (Đội B)"}
                  value={player2}
                  onChange={(val) => {
                    setPlayer2(val);
                    if (winner === player2) setWinner("");
                  }}
                  members={members}
                  isDoubles={isDoubles}
                  currentDropdown="p2"
                  isSelected={isSelected}
                  placeholder="Nhập tên, SĐT hoặc Mã thành viên..."
                  badge={
                    <div className="flex gap-1.5 items-center">
                      {p2Details && (isDoubles ? p2Details.matches_doubles : p2Details.matches_singles) < 10 && (
                        <span className="bg-blue-100 text-blue-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">Placement</span>
                      )}
                      {p2Details && (isDoubles ? p2Details.streak_doubles : p2Details.streak_singles) >= 3 && (
                        <span className="bg-red-100 text-red-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase animate-pulse">
                          Hot ({isDoubles ? p2Details.streak_doubles : p2Details.streak_singles}W)
                        </span>
                      )}
                    </div>
                  }
                />

                {/* Doubles Partner B */}
                {isDoubles && (
                  <div className="pt-2 border-t border-slate-200/50">
                    <SearchablePlayerSelect
                      label="Đội B (Thành viên 2)"
                      value={player2Partner}
                      onChange={setPlayer2Partner}
                      members={members}
                      isDoubles={isDoubles}
                      currentDropdown="p2p"
                      isSelected={isSelected}
                      placeholder="Nhập tên, SĐT hoặc Mã thành viên..."
                      badge={
                        <div className="flex gap-1.5 items-center">
                          {p2pDetails && p2pDetails.matches_doubles < 10 && (
                            <span className="bg-blue-100 text-blue-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">Placement</span>
                          )}
                          {p2pDetails && p2pDetails.streak_doubles >= 3 && (
                            <span className="bg-red-100 text-red-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase animate-pulse">Hot ({p2pDetails.streak_doubles}W)</span>
                          )}
                        </div>
                      }
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-1">Điểm số Đội B</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={scoreP2}
                    onChange={(e) => handleScoreChange(scoreP1, e.target.value)}
                    className="w-full p-3 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-black text-center font-black text-slate-800 text-lg"
                  />
                </div>

                {p2Details && (
                  <div className="p-3 bg-white/60 border border-slate-100 rounded-xl space-y-1.5 text-xs text-slate-500">
                    <p className="font-bold text-slate-600 text-[10px] uppercase tracking-wider mb-1">Thông số hiện tại ({isDoubles ? "Đánh đôi" : "Đánh đơn"})</p>
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span>Player 2: <strong className="text-slate-700">{p2Details.full_name}</strong> (Elo: {isDoubles ? p2Details.elo_doubles : p2Details.elo_singles})</span>
                      <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${getRankBadgeClass(getRankName(isDoubles ? p2Details.elo_doubles : p2Details.elo_singles))}`}>
                        {getRankName(isDoubles ? p2Details.elo_doubles : p2Details.elo_singles)}
                      </span>
                    </div>
                    <p>Trận đấu: <span className="font-bold text-slate-700">{isDoubles ? p2Details.matches_doubles : p2Details.matches_singles}</span></p>
                    
                    {isDoubles && p2pDetails && (
                      <>
                        <div className="flex items-center justify-between gap-1 flex-wrap pt-1 border-t border-slate-200/40">
                          <span>Partner: <strong className="text-slate-700">{p2pDetails.full_name}</strong> (Elo: {p2pDetails.elo_doubles})</span>
                          <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${getRankBadgeClass(getRankName(p2pDetails.elo_doubles))}`}>
                            {getRankName(p2pDetails.elo_doubles)}
                          </span>
                        </div>
                        <p>Trận đấu: <span className="font-bold text-slate-700">{p2pDetails.matches_doubles}</span></p>
                        <p className="border-t border-slate-200/50 pt-1 mt-1">Elo trung bình Đội B: <span className="font-black text-secondary">{((p2Details.elo_doubles + p2pDetails.elo_doubles) / 2).toFixed(0)}</span></p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {player2 && (!isDoubles || player2Partner) && (
                <button 
                  type="button"
                  onClick={() => setWinner(player2)}
                  className={`w-full py-2.5 mt-4 rounded-xl text-xs font-black tracking-wider transition-colors border ${winner === player2 ? 'bg-black border-black text-white shadow-md shadow-black/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {winner === player2 ? '✓ ĐỘI B THẮNG' : 'CHỌN ĐỘI B THẮNG'}
                </button>
              )}
            </div>
          </div>

          <div className="pt-4 space-y-3">
            {formError && (
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 px-4 py-3 rounded-2xl font-medium">
                {formError}
              </p>
            )}
            {formSuccess && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-2xl font-medium">
                {formSuccess}
              </p>
            )}
            <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !player1 || !player2 || !winner || scoreP1 === "" || scoreP2 === "" || (isDoubles && (!player1Partner || !player2Partner))}
              className="px-8 h-12 bg-black hover:bg-black/85 disabled:opacity-50 text-white rounded-full font-bold transition-all flex items-center gap-2 shadow-lg cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Đang lưu...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Lưu & Tính Elo
                </>
              )}
            </button>
            </div>
          </div>
        </form>
      </div>

      {/* Guide Card */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4 items-start">
        <div className="mt-1">
          <ArrowDownUp className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h3 className="font-bold text-blue-900 mb-1">Cách tính điểm Elo Đơn & Đôi</h3>
          <ul className="text-sm text-blue-700 leading-relaxed list-disc list-inside space-y-1">
            <li><strong>Đánh Đôi:</strong> Điểm số kỳ vọng của trận đấu được tính dựa trên Elo trung bình của Đội A và Đội B. Số điểm tăng/giảm sau trận sẽ được áp dụng đồng đều cho cả hai thành viên của đội.</li>
            <li><strong>Placement (K=40):</strong> Cho thành viên có dưới 10 trận đấu, giúp xác lập hạng nhanh. Ở đánh đôi, K-factor của đội là trung bình cộng K-factor các thành viên.</li>
            <li><strong>Hot Streak (K=36):</strong> Dành cho thành viên đang giữ chuỗi thắng từ 3 trở lên.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
