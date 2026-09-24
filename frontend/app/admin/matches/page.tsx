"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { 
  Swords, Trophy, Save, ArrowDownUp, AlertCircle, 
  TrendingUp, TrendingDown, Loader2, Sparkles, RefreshCw, 
  Users, CheckCircle2, RotateCcw, Trash2, Zap, Layers,
  ChevronDown, Check, ArrowRightLeft, Calendar, History
} from "lucide-react";
import confetti from "canvas-confetti";
import { API_URL } from "@/app/config";
import { Player, CourtSlot, CourtStatus, SessionItem, MatchSuggestion, EloPreviewData } from "./types";
import MatchHistoryView from "./components/MatchHistoryView";


interface SearchablePlayerSelectProps {
  label: string;
  value: string;
  onChange: (id: string) => void;
  members: Player[];
  isDoubles: boolean;
  courtId: string;
  dropdownRole: 'p1' | 'p1p' | 'p2' | 'p2p';
  getPlayerUsage: (id: string, courtId: string, dropdownRole: string) => { isUsed: boolean; usedAt?: string };
  placeholder: string;
  badge?: React.ReactNode;
}

function SearchablePlayerSelect({
  label,
  value,
  onChange,
  members,
  isDoubles,
  courtId,
  dropdownRole,
  getPlayerUsage,
  placeholder,
  badge
}: SearchablePlayerSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

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

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return members;
    return members.filter(m => {
      const shortId = m.id ? m.id.split('-')[0].toLowerCase() : "";
      return (
        m.full_name.toLowerCase().includes(q) ||
        (m.nickname || "").toLowerCase().includes(q) ||
        (m.phone_zalo || "").includes(q) ||
        shortId.includes(q)
      );
    });
  }, [members, searchQuery]);

  return (
    <div className="space-y-1.5 relative">
      <div className="flex justify-between items-center">
        <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider">
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
            setTimeout(() => {
              setIsOpen(false);
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
            if (!val) onChange("");
          }}
          className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-primary font-bold text-slate-800 transition-colors shadow-sm"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">
          ▼
        </span>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 divide-y divide-slate-100 animate-fade-in">
          {filtered.length === 0 ? (
            <div className="p-3 text-xs text-slate-400 italic text-center">Không tìm thấy tuyển thủ</div>
          ) : (
            filtered.map(m => {
              const usage = getPlayerUsage(m.id, courtId, dropdownRole);
              const shortId = m.id ? m.id.split('-')[0].toUpperCase() : "";
              const currentElo = isDoubles ? m.elo_doubles : m.elo_singles;
              const matchesCount = isDoubles ? m.matches_doubles : m.matches_singles;
              const streak = isDoubles ? m.streak_doubles : m.streak_singles;

              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={usage.isUsed}
                  onMouseDown={() => {
                    onChange(m.id);
                    setSearchQuery(m.full_name);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 text-xs transition-colors flex justify-between items-center ${
                    usage.isUsed
                      ? 'bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                      : 'hover:bg-amber-50/60 text-slate-700 font-bold cursor-pointer'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{m.full_name}</span>
                      {m.nickname && (
                        <span className="text-[10px] text-slate-400 font-normal">({m.nickname})</span>
                      )}
                      {usage.isUsed && (
                        <span className="text-[9px] bg-red-100 text-red-600 px-1 py-0.2 rounded font-black">
                          {usage.usedAt}
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium flex gap-2 mt-0.5">
                      <span>{shortId}</span>
                      {matchesCount < 10 && (
                        <span className="text-blue-500 font-bold">Placement ({matchesCount} trận)</span>
                      )}
                      {streak >= 3 && (
                        <span className="text-red-500 font-bold">Hot {streak}W</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-amber-600 font-mono shrink-0 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50">
                    {currentElo}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function MatchDeskPage() {
  const [activeTab, setActiveTab] = useState<"desk" | "history">("desk");
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [useAllMembers, setUseAllMembers] = useState<boolean>(false);
  const [members, setMembers] = useState<Player[]>([]);
  const [isDoubles, setIsDoubles] = useState<boolean>(true);
  const [courtCount, setCourtCount] = useState<number>(4);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshingPlayers, setRefreshingPlayers] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const isInitializedRef = useRef<boolean>(false);

  // Lấy token an toàn từ localStorage (hỗ trợ cả admin_token và token)
  const getAdminToken = () => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("admin_token") || localStorage.getItem("token") || "";
  };

  // Matchmaker Modal States
  const [matchmakerOpen, setMatchmakerOpen] = useState<boolean>(false);
  const [matchmakerCourtId, setMatchmakerCourtId] = useState<string>("");
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);

  // Review All Modal States
  const [reviewAllOpen, setReviewAllOpen] = useState<boolean>(false);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState<boolean>(false);

  // Court Slots State
  const [courts, setCourts] = useState<CourtSlot[]>([
    { courtId: "c1", courtName: "SÂN 1", status: "EMPTY", player1Id: "", player1PartnerId: "", player2Id: "", player2PartnerId: "", scoreP1: "", scoreP2: "", winnerId: "" },
    { courtId: "c2", courtName: "SÂN 2", status: "EMPTY", player1Id: "", player1PartnerId: "", player2Id: "", player2PartnerId: "", scoreP1: "", scoreP2: "", winnerId: "" },
    { courtId: "c3", courtName: "SÂN 3", status: "EMPTY", player1Id: "", player1PartnerId: "", player2Id: "", player2PartnerId: "", scoreP1: "", scoreP2: "", winnerId: "" },
    { courtId: "c4", courtName: "SÂN 4", status: "EMPTY", player1Id: "", player1PartnerId: "", player2Id: "", player2PartnerId: "", scoreP1: "", scoreP2: "", winnerId: "" },
  ]);

  // Điều chỉnh số lượng sân
  const handleCourtCountChange = (count: number) => {
    setCourtCount(count);
    setCourts(prev => {
      const newCourts: CourtSlot[] = [];
      for (let i = 1; i <= count; i++) {
        const courtId = `c${i}`;
        const existing = prev.find(c => c.courtId === courtId);
        if (existing) {
          newCourts.push(existing);
        } else {
          newCourts.push({
            courtId,
            courtName: `SÂN ${i}`,
            status: "EMPTY",
            player1Id: "",
            player1PartnerId: "",
            player2Id: "",
            player2PartnerId: "",
            scoreP1: "",
            scoreP2: "",
            winnerId: ""
          });
        }
      }
      return newCourts;
    });
  };

  // Nạp danh sách Tuyển thủ theo Session (hoặc toàn bộ CLB) với fallback an toàn
  const fetchPlayers = async (sessionId?: string, all?: boolean) => {
    setRefreshingPlayers(true);
    setErrorMessage("");
    try {
      const token = getAdminToken();
      const targetSession = sessionId !== undefined ? sessionId : selectedSessionId;
      const targetAll = all !== undefined ? all : useAllMembers;
      
      const query = new URLSearchParams();
      if (targetSession) query.append("session_id", targetSession);
      if (targetAll) query.append("use_all", "true");

      let loaded = false;
      try {
        const res = await fetch(`${API_URL}/api/matches/session-players?${query.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setMembers(data);
            loaded = true;
          }
        }
      } catch (err) {
        console.warn("Could not fetch /api/matches/session-players, trying fallback:", err);
      }

      // Fallback: nếu session-players không có hoặc bị lỗi kết nối, nạp từ /api/users/members
      if (!loaded) {
        const fallbackRes = await fetch(`${API_URL}/api/users/members`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (fallbackRes.ok) {
          const allMembers = await fallbackRes.json();
          const activeMembers = allMembers.filter((m: any) => m.status === "active" && !m.is_blocked);
          setMembers(activeMembers);
          loaded = true;
        }
      }

      if (!loaded) {
        setErrorMessage("Không thể nạp danh sách tuyển thủ. Vui lòng kiểm tra quyền Admin hoặc bấm làm mới.");
      }
    } catch (e) {
      console.error("Error fetching session players:", e);
      setErrorMessage("Lỗi kết nối máy chủ khi nạp danh sách tuyển thủ.");
    } finally {
      setRefreshingPlayers(false);
      setLoading(false);
    }
  };

  // Khởi tạo ban đầu: nạp cả sessions và players một cách an toàn và dứt điểm
  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      setLoading(true);
      try {
        let firstSessionId = "";
        try {
          const sRes = await fetch(`${API_URL}/api/sessions?history=true`);
          if (sRes.ok) {
            const sData = await sRes.json();
            if (isMounted) {
              setSessions(sData);
              if (Array.isArray(sData) && sData.length > 0) {
                firstSessionId = sData[0].id;
                setSelectedSessionId(firstSessionId);
              }
            }
          }
        } catch (sErr) {
          console.error("Error fetching sessions on mount:", sErr);
        }

        // Tải tuyển thủ
        await fetchPlayers(firstSessionId, false);
      } catch (err) {
        console.error("Error during Match Desk initialization:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
          isInitializedRef.current = true;
        }
      }
    };

    initData();
    return () => { isMounted = false; };
  }, []);

  // Khi admin chủ động đổi Session hoặc toggle Use All Members
  useEffect(() => {
    if (!isInitializedRef.current) return;
    fetchPlayers(selectedSessionId, useAllMembers);
  }, [selectedSessionId, useAllMembers]);

  // Kiểm tra tuyển thủ đang được sử dụng ở đâu trong Match Desk
  const getPlayerUsage = (playerId: string, currentCourtId: string, dropdownRole: string) => {
    for (const c of courts) {
      if (c.courtId === currentCourtId) {
        if (dropdownRole !== "p1" && c.player1Id === playerId) return { isUsed: true, usedAt: "Cùng sân (Đội A)" };
        if (dropdownRole !== "p1p" && c.player1PartnerId === playerId) return { isUsed: true, usedAt: "Cùng sân (Đội A)" };
        if (dropdownRole !== "p2" && c.player2Id === playerId) return { isUsed: true, usedAt: "Cùng sân (Đội B)" };
        if (dropdownRole !== "p2p" && c.player2PartnerId === playerId) return { isUsed: true, usedAt: "Cùng sân (Đội B)" };
      } else {
        // Khác sân: chỉ kiểm tra các sân đang active (chưa SAVED)
        if (c.status !== "SAVED") {
          if (
            c.player1Id === playerId || 
            c.player1PartnerId === playerId || 
            c.player2Id === playerId || 
            c.player2PartnerId === playerId
          ) {
            return { isUsed: true, usedAt: `Đang ở ${c.courtName}` };
          }
        }
      }
    }
    return { isUsed: false };
  };

  // Tính Preview ELO cho 1 CourtSlot
  const computeEloPreview = (slot: CourtSlot): EloPreviewData | null => {
    const p1 = members.find(m => m.id === slot.player1Id);
    const p2 = members.find(m => m.id === slot.player2Id);
    const p1p = isDoubles ? members.find(m => m.id === slot.player1PartnerId) : null;
    const p2p = isDoubles ? members.find(m => m.id === slot.player2PartnerId) : null;

    if (!p1 || !p2) return null;
    if (isDoubles && (!p1p || !p2p)) return null;

    const elo1 = isDoubles ? p1.elo_doubles : p1.elo_singles;
    const elo2 = isDoubles ? p2.elo_doubles : p2.elo_singles;
    const matches1 = isDoubles ? p1.matches_doubles : p1.matches_singles;
    const matches2 = isDoubles ? p2.matches_doubles : p2.matches_singles;
    const streak1 = isDoubles ? p1.streak_doubles : p1.streak_singles;
    const streak2 = isDoubles ? p2.streak_doubles : p2.streak_singles;

    const elo1_p = isDoubles && p1p ? p1p.elo_doubles : null;
    const elo2_p = isDoubles && p2p ? p2p.elo_doubles : null;
    const matches1_p = isDoubles && p1p ? p1p.matches_doubles : 0;
    const matches2_p = isDoubles && p2p ? p2p.matches_doubles : 0;
    const streak1_p = isDoubles && p1p ? p1p.streak_doubles : 0;
    const streak2_p = isDoubles && p2p ? p2p.streak_doubles : 0;

    const T1 = elo1_p !== null ? (elo1 + elo1_p) / 2 : elo1;
    const T2 = elo2_p !== null ? (elo2 + elo2_p) / 2 : elo2;

    const getK = (mCount: number, sCount: number) => {
      return mCount < 10 ? 40 : (sCount >= 3 ? 36 : 24);
    };

    let K1 = getK(matches1, streak1);
    let K2 = getK(matches2, streak2);

    let K_team1 = K1;
    if (elo1_p !== null) {
      K_team1 = (K1 + getK(matches1_p, streak1_p)) / 2;
    }

    let K_team2 = K2;
    if (elo2_p !== null) {
      K_team2 = (K2 + getK(matches2_p, streak2_p)) / 2;
    }

    const E1 = 1 / (1 + Math.pow(10, (T2 - T1) / 400));
    const E2 = 1 - E1;

    // Xác định đội thắng
    const team1Won = slot.winnerId === slot.player1Id || (isDoubles && slot.winnerId === slot.player1PartnerId);
    const S1 = team1Won ? 1 : 0;
    const S2 = 1 - S1;

    const delta1 = Math.round(K_team1 * (S1 - E1));
    const delta2 = Math.round(K_team2 * (S2 - E2));

    const elo1New = Math.max(100, elo1 + delta1);
    const elo1_pNew = elo1_p !== null ? Math.max(100, elo1_p + delta1) : 0;
    const elo2New = Math.max(100, elo2 + delta2);
    const elo2_pNew = elo2_p !== null ? Math.max(100, elo2_p + delta2) : 0;

    const eloExchanged = team1Won ? Math.abs(delta1) : Math.abs(delta2);

    return {
      team1Elo: Math.round(T1),
      team2Elo: Math.round(T2),
      winProb1: Math.round(E1 * 100),
      winProb2: Math.round(E2 * 100),
      p1Diff: delta1,
      p1pDiff: delta1,
      p2Diff: delta2,
      p2pDiff: delta2,
      p1New: elo1New,
      p1pNew: elo1_pNew,
      p2New: elo2New,
      p2pNew: elo2_pNew,
      eloExchanged
    };
  };

  // Cập nhật trạng thái tự động cho 1 Court
  const updateSlotState = (updated: CourtSlot): CourtSlot => {
    // Nếu sân đã SAVED hoặc COMMITTING thì giữ nguyên trạng thái
    if (updated.status === "SAVED" || updated.status === "COMMITTING") {
      return updated;
    }

    const hasP1 = Boolean(updated.player1Id);
    const hasP2 = Boolean(updated.player2Id);
    const hasP1p = isDoubles ? Boolean(updated.player1PartnerId) : true;
    const hasP2p = isDoubles ? Boolean(updated.player2PartnerId) : true;

    if (!hasP1 && !hasP2 && !updated.player1PartnerId && !updated.player2PartnerId && !updated.scoreP1 && !updated.scoreP2) {
      return { ...updated, status: "EMPTY", eloPreview: null, errorMessage: undefined };
    }

    const playersComplete = hasP1 && hasP2 && hasP1p && hasP2p;
    const s1 = parseInt(updated.scoreP1);
    const s2 = parseInt(updated.scoreP2);
    const hasValidScore = !isNaN(s1) && !isNaN(s2) && s1 >= 0 && s2 >= 0 && (s1 > 0 || s2 > 0) && s1 !== s2;

    if (playersComplete && hasValidScore && updated.winnerId) {
      const preview = computeEloPreview(updated);
      return {
        ...updated,
        status: "READY",
        eloPreview: preview,
        errorMessage: undefined
      };
    } else {
      const preview = playersComplete && updated.winnerId ? computeEloPreview(updated) : null;
      return {
        ...updated,
        status: "DRAFT",
        eloPreview: preview,
        errorMessage: undefined
      };
    }
  };

  // Thay đổi trường thông tin trong 1 Court
  const handleUpdateCourt = (courtId: string, patch: Partial<CourtSlot>) => {
    setCourts(prev => prev.map(c => {
      if (c.courtId !== courtId) return c;
      const merged = { ...c, ...patch };
      
      // Tự động set winner nếu cả 2 score hợp lệ
      if (patch.scoreP1 !== undefined || patch.scoreP2 !== undefined) {
        const s1 = parseInt(merged.scoreP1);
        const s2 = parseInt(merged.scoreP2);
        if (!isNaN(s1) && !isNaN(s2) && merged.player1Id && merged.player2Id) {
          if (s1 > s2) merged.winnerId = merged.player1Id;
          else if (s2 > s1) merged.winnerId = merged.player2Id;
        }
      }

      return updateSlotState(merged);
    }));
  };

  // Đổi bên (Swap Team A & Team B)
  const handleSwapTeams = (courtId: string) => {
    const slot = courts.find(c => c.courtId === courtId);
    if (!slot) return;

    const newWinner = slot.winnerId === slot.player1Id ? slot.player2Id : 
                      slot.winnerId === slot.player2Id ? slot.player1Id : slot.winnerId;

    handleUpdateCourt(courtId, {
      player1Id: slot.player2Id,
      player1PartnerId: slot.player2PartnerId,
      player2Id: slot.player1Id,
      player2PartnerId: slot.player1PartnerId,
      scoreP1: slot.scoreP2,
      scoreP2: slot.scoreP1,
      winnerId: newWinner
    });
  };

  // Xóa / Reset 1 sân về EMPTY
  const handleResetCourt = (courtId: string) => {
    handleUpdateCourt(courtId, {
      status: "EMPTY",
      player1Id: "",
      player1PartnerId: "",
      player2Id: "",
      player2PartnerId: "",
      scoreP1: "",
      scoreP2: "",
      winnerId: "",
      eloPreview: null,
      errorMessage: undefined,
      lastSavedMatch: undefined
    });
  };

  // Rematch Đấu Lại (Giữ nguyên 4 người, reset điểm)
  const handleRematchCourt = (courtId: string) => {
    const slot = courts.find(c => c.courtId === courtId);
    if (!slot) return;

    handleUpdateCourt(courtId, {
      status: "DRAFT",
      scoreP1: "",
      scoreP2: "",
      winnerId: "",
      eloPreview: null,
      errorMessage: undefined,
      lastSavedMatch: undefined
    });
  };

  // Mở Smart Matchmaker Popup cho 1 Court
  const handleOpenMatchmaker = async (courtId: string) => {
    const slot = courts.find(c => c.courtId === courtId);
    if (!slot || !slot.player1Id) {
      alert("Vui lòng chọn ít nhất 1 tuyển thủ ở Đội A trước khi dùng Smart Matchmaker!");
      return;
    }

    setMatchmakerCourtId(courtId);
    setMatchmakerOpen(true);
    setLoadingSuggestions(true);

    try {
      const token = getAdminToken();
      const team1Ids = [slot.player1Id];
      if (isDoubles && slot.player1PartnerId) team1Ids.push(slot.player1PartnerId);

      // Thu thập các player đang được dùng ở các sân khác
      const excludedIds: string[] = [];
      courts.forEach(c => {
        if (c.courtId !== courtId && c.status !== "SAVED") {
          if (c.player1Id) excludedIds.push(c.player1Id);
          if (c.player1PartnerId) excludedIds.push(c.player1PartnerId);
          if (c.player2Id) excludedIds.push(c.player2Id);
          if (c.player2PartnerId) excludedIds.push(c.player2PartnerId);
        }
      });

      const res = await fetch(`${API_URL}/api/matches/suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: selectedSessionId,
          mode: isDoubles ? "doubles" : "singles",
          team1_player_ids: team1Ids,
          excluded_player_ids: excludedIds
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } else {
        setSuggestions([]);
      }
    } catch (e) {
      console.error("Error in Smart Matchmaker:", e);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Áp dụng gợi ý từ Smart Matchmaker
  const handleApplySuggestion = (sugg: MatchSuggestion) => {
    if (!matchmakerCourtId) return;

    if (isDoubles) {
      if (sugg.player2 && sugg.player2Partner) {
        handleUpdateCourt(matchmakerCourtId, {
          player2Id: sugg.player2.id,
          player2PartnerId: sugg.player2Partner.id
        });
      } else if (sugg.partner) {
        // Gợi ý partner cho Player 1
        handleUpdateCourt(matchmakerCourtId, {
          player1PartnerId: sugg.partner.id
        });
      }
    } else {
      if (sugg.player) {
        handleUpdateCourt(matchmakerCourtId, {
          player2Id: sugg.player.id
        });
      }
    }

    setMatchmakerOpen(false);
  };

  // Commit Đơn lẻ (Single Match)
  const handleSingleCommit = async (courtId: string) => {
    const slot = courts.find(c => c.courtId === courtId);
    if (!slot || slot.status !== "READY") return;

    handleUpdateCourt(courtId, { status: "COMMITTING" });

    try {
      const token = getAdminToken();
      const res = await fetch(`${API_URL}/api/matches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          player1_id: slot.player1Id,
          player2_id: slot.player2Id,
          player1_partner_id: isDoubles ? slot.player1PartnerId : null,
          player2_partner_id: isDoubles ? slot.player2PartnerId : null,
          score_p1: parseInt(slot.scoreP1),
          score_p2: parseInt(slot.scoreP2),
          winner_id: slot.winnerId
        })
      });

      if (res.ok) {
        const matchData = await res.json();
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
        
        handleUpdateCourt(courtId, {
          status: "SAVED",
          lastSavedMatch: matchData
        });

        // Refetch danh sách tuyển thủ với ELO mới nhất
        await fetchPlayers();
      } else {
        const err = await res.json();
        handleUpdateCourt(courtId, {
          status: "ERROR",
          errorMessage: err.error || "Gặp lỗi khi lưu trận đấu."
        });
      }
    } catch (e) {
      handleUpdateCourt(courtId, {
        status: "ERROR",
        errorMessage: "Lỗi kết nối máy chủ."
      });
    }
  };

  // Danh sách các sân đang READY để Batch Commit
  const readyCourts = courts.filter(c => c.status === "READY");

  // Thực hiện Batch Commit (All-or-Nothing)
  const handleBatchCommit = async () => {
    if (readyCourts.length === 0) return;

    setIsBatchSubmitting(true);

    try {
      const token = getAdminToken();
      const payloadMatches = readyCourts.map(slot => ({
        court_id: slot.courtName,
        player1_id: slot.player1Id,
        player2_id: slot.player2Id,
        player1_partner_id: isDoubles ? slot.player1PartnerId : null,
        player2_partner_id: isDoubles ? slot.player2PartnerId : null,
        score_p1: parseInt(slot.scoreP1),
        score_p2: parseInt(slot.scoreP2),
        winner_id: slot.winnerId
      }));

      const res = await fetch(`${API_URL}/api/matches/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: selectedSessionId || null,
          matches: payloadMatches
        })
      });

      const data = await res.json();

      if (res.ok) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
        alert(`🎉 ${data.message || `Đã lưu thành công ${readyCourts.length} trận đấu!`}`);

        // Đổi trạng thái toàn bộ ready courts sang SAVED
        setCourts(prev => prev.map(c => {
          const committed = (data.committedMatches || []).find((cm: any) => cm.court_id === c.courtName);
          if (c.status === "READY") {
            return {
              ...c,
              status: "SAVED",
              lastSavedMatch: committed?.match
            };
          }
          return c;
        }));

        setReviewAllOpen(false);
        // Refetch players để cập nhật ELO mới nhất
        await fetchPlayers();
      } else {
        alert(data.error || "Batch commit thất bại. Toàn bộ batch đã được rollback an toàn.");
      }
    } catch (e) {
      alert("Lỗi kết nối mạng khi gửi batch commit.");
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  const getStatusBadge = (status: CourtStatus) => {
    switch (status) {
      case "EMPTY":
        return <span className="bg-slate-100 text-slate-500 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Trống</span>;
      case "DRAFT":
        return <span className="bg-amber-100 text-amber-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Đang nhập</span>;
      case "READY":
        return <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">● Sẵn sàng</span>;
      case "COMMITTING":
        return <span className="bg-blue-100 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Đang lưu...</span>;
      case "SAVED":
        return <span className="bg-green-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1"><Check className="w-3 h-3" /> Đã lưu</span>;
      case "ERROR":
        return <span className="bg-red-100 text-red-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Lỗi</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center gap-4 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-bold">Đang tải trung tâm điều phối Match Desk...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* TOP NAVIGATION TABS */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl w-fit border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("desk")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "desk"
              ? "bg-secondary text-white shadow-md"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <Swords className="w-4 h-4 text-primary" />
          BÀN ĐIỀU PHỐI (MATCH DESK)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "history"
              ? "bg-secondary text-white shadow-md"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <History className="w-4 h-4 text-amber-400" />
          LỊCH SỬ & HIỆU CHỈNH ELO
        </button>
      </div>

      {activeTab === "history" ? (
        <MatchHistoryView
          members={members}
          getAdminToken={getAdminToken}
          onRefreshData={fetchPlayers}
        />
      ) : (
        <>
          {/* 1. TOP CONTROL BAR */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-secondary tracking-tight">MATCH DESK</h1>
              <span className="bg-primary/20 text-secondary text-xs font-black px-2.5 py-0.5 rounded-full uppercase">
                Multi-Court
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Bàn điều phối đa sân & Nhập kết quả thi đấu nhanh với Smart Matchmaker.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Review & Batch Commit */}
            <button
              type="button"
              onClick={() => setReviewAllOpen(true)}
              disabled={readyCourts.length === 0}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-md cursor-pointer ${
                readyCourts.length > 0 
                  ? 'bg-secondary hover:bg-slate-900 text-white active:scale-95' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Layers className="w-4 h-4 text-primary" />
              Lưu tất cả ({readyCourts.length} sân sẵn sàng)
            </button>

            {/* Clear all drafts */}
            <button
              type="button"
              onClick={() => {
                if (confirm("Bạn có chắc chắn muốn xóa toàn bộ các trận đang soạn thảo không?")) {
                  courts.forEach(c => handleResetCourt(c.courtId));
                }
              }}
              className="px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors cursor-pointer"
              title="Xóa hết draft"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters & Configuration Row */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Session Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl w-full sm:w-auto">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="bg-transparent font-bold text-slate-700 outline-none text-xs w-full sm:w-auto cursor-pointer"
              >
                <option value="">-- Toàn bộ thành viên CLB --</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({new Date(s.date_time).toLocaleDateString('vi-VN')})
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Use All Members vs Checked-in Only */}
            <button
              type="button"
              onClick={() => setUseAllMembers(!useAllMembers)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all cursor-pointer ${
                useAllMembers
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {useAllMembers ? "● Hiện tất cả thành viên" : "✓ Chỉ người đã check-in"}
            </button>

            {/* Refresh Player List */}
            <button
              type="button"
              onClick={() => fetchPlayers()}
              disabled={refreshingPlayers}
              className="p-1.5 text-slate-500 hover:text-secondary bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
              title="Làm mới danh sách tuyển thủ"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingPlayers ? 'animate-spin text-primary' : ''}`} />
            </button>

            <span className="text-[11px] text-slate-400 font-medium">
              ({members.length} tuyển thủ khả dụng)
            </span>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            {/* Singles / Doubles Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setIsDoubles(false)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${!isDoubles ? 'bg-white text-secondary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                ĐƠN
              </button>
              <button
                type="button"
                onClick={() => setIsDoubles(true)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${isDoubles ? 'bg-white text-secondary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                ĐÔI
              </button>
            </div>

            {/* Court Count Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <span className="text-[10px] font-black text-slate-400 px-1 uppercase">Sân:</span>
              {[3, 4, 5].map(cnt => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => handleCourtCountChange(cnt)}
                  className={`w-7 h-6 rounded-lg text-xs font-black transition-all cursor-pointer ${courtCount === cnt ? 'bg-white text-secondary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {cnt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Thông báo lỗi nếu nạp tuyển thủ thất bại */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button 
            type="button"
            onClick={() => fetchPlayers("", true)}
            className="px-3 py-1 bg-red-600 text-white rounded-xl text-[11px] font-bold hover:bg-red-700 cursor-pointer transition-colors"
          >
            Nạp tất cả thành viên CLB
          </button>
        </div>
      )}

      {/* 2. MULTI-COURT GRID */}
      <div className={`grid grid-cols-1 ${courtCount <= 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2 xl:grid-cols-4'} gap-5`}>
        {courts.map((court) => {
          const preview = court.eloPreview;
          const isSaved = court.status === "SAVED";

          return (
            <div 
              key={court.courtId} 
              className={`bg-white rounded-3xl border transition-all flex flex-col justify-between shadow-sm overflow-hidden ${
                court.status === 'READY'
                  ? 'border-emerald-300 ring-2 ring-emerald-400/20'
                  : court.status === 'SAVED'
                  ? 'border-green-300 bg-green-50/20'
                  : court.status === 'ERROR'
                  ? 'border-red-300'
                  : 'border-slate-200'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-secondary tracking-wide">{court.courtName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(court.status)}
                  <button
                    type="button"
                    onClick={() => handleResetCourt(court.courtId)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                    title="Xóa sân này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-4 flex-1">
                {/* ĐỘI A */}
                <div className={`p-3 rounded-2xl border transition-all space-y-2 ${
                  court.winnerId === court.player1Id && court.player1Id
                    ? 'bg-amber-500/10 border-amber-400 shadow-sm'
                    : 'bg-slate-50/70 border-slate-200/80'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Đội A</span>
                    {preview && (
                      <span className="text-[10px] font-mono font-black text-amber-600 bg-white px-2 py-0.5 rounded-lg border border-amber-200 shadow-2xs">
                        Elo {preview.team1Elo} ({preview.winProb1}%)
                      </span>
                    )}
                  </div>

                  <SearchablePlayerSelect
                    label={isDoubles ? "VĐV 1" : "Người chơi Đội A"}
                    value={court.player1Id}
                    onChange={(val) => handleUpdateCourt(court.courtId, { player1Id: val })}
                    members={members}
                    isDoubles={isDoubles}
                    courtId={court.courtId}
                    dropdownRole="p1"
                    getPlayerUsage={getPlayerUsage}
                    placeholder="Chọn tuyển thủ..."
                  />

                  {isDoubles && (
                    <SearchablePlayerSelect
                      label="VĐV 2"
                      value={court.player1PartnerId}
                      onChange={(val) => handleUpdateCourt(court.courtId, { player1PartnerId: val })}
                      members={members}
                      isDoubles={isDoubles}
                      courtId={court.courtId}
                      dropdownRole="p1p"
                      getPlayerUsage={getPlayerUsage}
                      placeholder="Chọn bạn đánh cặp..."
                    />
                  )}
                </div>

                {/* VS DIVIDER & SMART MATCHMAKER BUTTON */}
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="h-px bg-slate-200 flex-1"></div>
                  
                  {/* Smart Matchmaker Trigger */}
                  <button
                    type="button"
                    onClick={() => handleOpenMatchmaker(court.courtId)}
                    disabled={isSaved || !court.player1Id}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-black rounded-full border border-amber-200/80 transition-all flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Gợi ý đối thủ cân bằng ELO"
                  >
                    <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                    Ghép thông minh
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwapTeams(court.courtId)}
                    className="p-1 text-slate-400 hover:text-secondary rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Đổi bên (Swap Đội A ⇄ Đội B)"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                  <div className="h-px bg-slate-200 flex-1"></div>
                </div>

                {/* ĐỘI B */}
                <div className={`p-3 rounded-2xl border transition-all space-y-2 ${
                  court.winnerId === court.player2Id && court.player2Id
                    ? 'bg-amber-500/10 border-amber-400 shadow-sm'
                    : 'bg-slate-50/70 border-slate-200/80'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Đội B</span>
                    {preview && (
                      <span className="text-[10px] font-mono font-black text-amber-600 bg-white px-2 py-0.5 rounded-lg border border-amber-200 shadow-2xs">
                        Elo {preview.team2Elo} ({preview.winProb2}%)
                      </span>
                    )}
                  </div>

                  <SearchablePlayerSelect
                    label={isDoubles ? "VĐV 1" : "Người chơi Đội B"}
                    value={court.player2Id}
                    onChange={(val) => handleUpdateCourt(court.courtId, { player2Id: val })}
                    members={members}
                    isDoubles={isDoubles}
                    courtId={court.courtId}
                    dropdownRole="p2"
                    getPlayerUsage={getPlayerUsage}
                    placeholder="Chọn tuyển thủ..."
                  />

                  {isDoubles && (
                    <SearchablePlayerSelect
                      label="VĐV 2"
                      value={court.player2PartnerId}
                      onChange={(val) => handleUpdateCourt(court.courtId, { player2PartnerId: val })}
                      members={members}
                      isDoubles={isDoubles}
                      courtId={court.courtId}
                      dropdownRole="p2p"
                      getPlayerUsage={getPlayerUsage}
                      placeholder="Chọn bạn đánh cặp..."
                    />
                  )}
                </div>

                {/* SCORE & WINNER ENTRY */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block text-center">Tỉ số trận đấu</span>
                  
                  <div className="flex items-center justify-center gap-3">
                    <input
                      type="number"
                      min="0"
                      disabled={isSaved}
                      placeholder="0"
                      value={court.scoreP1}
                      onChange={(e) => handleUpdateCourt(court.courtId, { scoreP1: e.target.value })}
                      className="w-16 h-12 text-center text-xl font-black bg-white border border-slate-200 rounded-xl outline-none focus:border-primary shadow-sm"
                    />
                    <span className="text-slate-400 font-black text-lg">:</span>
                    <input
                      type="number"
                      min="0"
                      disabled={isSaved}
                      placeholder="0"
                      value={court.scoreP2}
                      onChange={(e) => handleUpdateCourt(court.courtId, { scoreP2: e.target.value })}
                      className="w-16 h-12 text-center text-xl font-black bg-white border border-slate-200 rounded-xl outline-none focus:border-primary shadow-sm"
                    />
                  </div>

                  {/* Winner Select Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isSaved || !court.player1Id}
                      onClick={() => handleUpdateCourt(court.courtId, { winnerId: court.player1Id })}
                      className={`py-1.5 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                        court.winnerId === court.player1Id
                          ? 'bg-secondary text-white border-secondary shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {court.winnerId === court.player1Id ? "✓ Đội A Thắng" : "Đội A Thắng"}
                    </button>
                    <button
                      type="button"
                      disabled={isSaved || !court.player2Id}
                      onClick={() => handleUpdateCourt(court.courtId, { winnerId: court.player2Id })}
                      className={`py-1.5 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                        court.winnerId === court.player2Id
                          ? 'bg-secondary text-white border-secondary shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {court.winnerId === court.player2Id ? "✓ Đội B Thắng" : "Đội B Thắng"}
                    </button>
                  </div>
                </div>

                {/* LIVE ELO PREVIEW BAR */}
                {preview && (
                  <div className="p-2.5 bg-amber-50/50 rounded-2xl border border-amber-200/60 text-[11px] space-y-1">
                    <div className="flex justify-between items-center text-slate-600 font-bold">
                      <span>Biến động Elo dự kiến:</span>
                      <span className="font-mono font-black text-amber-700">±{preview.eloExchanged} ELO</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500">Đội A:</span>
                      <span className={`font-mono font-bold ${preview.p1Diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {preview.p1Diff >= 0 ? `+${preview.p1Diff}` : preview.p1Diff}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500">Đội B:</span>
                      <span className={`font-mono font-bold ${preview.p2Diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {preview.p2Diff >= 0 ? `+${preview.p2Diff}` : preview.p2Diff}
                      </span>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {court.errorMessage && (
                  <div className="p-2.5 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{court.errorMessage}</span>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 border-t border-slate-100 bg-slate-50/40">
                {isSaved ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRematchCourt(court.courtId)}
                      className="flex-1 py-2 bg-white hover:bg-slate-50 text-secondary border border-slate-200 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-primary" />
                      Đấu lại (Rematch)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetCourt(court.courtId)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Trận mới
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={court.status !== "READY"}
                    onClick={() => handleSingleCommit(court.courtId)}
                    className={`w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                      court.status === "READY"
                        ? "bg-secondary hover:bg-slate-900 text-white active:scale-95"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <Save className="w-3.5 h-3.5 text-primary" />
                    Lưu sân này
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. SMART MATCHMAKER MODAL */}
      {matchmakerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-black">
                  ⚡
                </div>
                <div>
                  <h3 className="text-base font-black text-secondary">Smart Matchmaker</h3>
                  <p className="text-xs text-slate-500">Đề xuất đối thủ cân bằng ELO từ danh sách check-in</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMatchmakerOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loadingSuggestions ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
                <p className="text-xs font-bold">Đang tìm các cặp đối thủ phù hợp nhất...</p>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="py-8 text-center text-slate-500 space-y-2">
                <p className="text-sm font-bold">Không tìm thấy cặp đối thủ phù hợp</p>
                <p className="text-xs text-slate-400">
                  Các tuyển thủ khả dụng trong buổi tập có thể đang bận ở sân khác hoặc số lượng chưa đủ.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500">
                  Gợi ý đối thủ cho Đội A ({suggestions.length} cặp tốt nhất):
                </p>
                
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {suggestions.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-amber-50/40 hover:border-amber-300 transition-all flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-secondary">
                            {s.player2?.full_name} + {s.player2Partner?.full_name}
                          </span>
                          <span className="text-[10px] font-black text-amber-600 font-mono bg-white px-2 py-0.5 rounded border border-amber-200">
                            Elo {s.team2Elo}
                          </span>
                          {s.hasProvisional && (
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200" title="Đã hiệu chỉnh ELO tân thủ để đảm bảo cân bằng">
                              Hiệu chỉnh tân thủ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                          <span>Chênh lệch: <strong className="text-slate-700">{s.teamGap} ELO</strong></span>
                          <span>Độ cân bằng: <strong className="text-emerald-600">{s.matchQuality}%</strong></span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplySuggestion(s)}
                        className="px-4 py-2 bg-secondary hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer shrink-0 active:scale-95"
                      >
                        Chọn cặp này
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. REVIEW ALL & BATCH COMMIT MODAL */}
      {reviewAllOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-secondary text-primary flex items-center justify-center font-black">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-secondary">Review & Batch Commit Tất Cả</h3>
                  <p className="text-xs text-slate-500">Kiểm tra lại toàn bộ các sân trước khi ghi nhận đồng loạt</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewAllOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-black uppercase text-slate-400 tracking-wider">
                Danh sách {readyCourts.length} trận đấu sẵn sàng:
              </p>

              <div className="space-y-3">
                {readyCourts.map((c) => {
                  const p1 = members.find(m => m.id === c.player1Id);
                  const p1p = members.find(m => m.id === c.player1PartnerId);
                  const p2 = members.find(m => m.id === c.player2Id);
                  const p2p = members.find(m => m.id === c.player2PartnerId);
                  const prev = c.eloPreview;

                  return (
                    <div key={c.courtId} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-black text-secondary">
                        <span>{c.courtName}</span>
                        <span className="text-amber-600 font-mono">Biến động: ±{prev?.eloExchanged || 0} ELO</span>
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-1 text-slate-700">
                        <div className="text-left font-bold">
                          <p>{p1?.full_name}</p>
                          {p1p && <p className="text-slate-500">{p1p.full_name}</p>}
                        </div>

                        <div className="text-center font-black text-base px-3 py-1 bg-white rounded-xl border border-slate-200">
                          {c.scoreP1} - {c.scoreP2}
                        </div>

                        <div className="text-right font-bold">
                          <p>{p2?.full_name}</p>
                          {p2p && <p className="text-slate-500">{p2p.full_name}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-2xl border border-blue-100 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span>
                <strong>Bảo đảm nguyên tử (All-or-Nothing):</strong> Toàn bộ {readyCourts.length} trận đấu sẽ được commit trong một transaction. Nếu có bất kỳ lỗi nào, toàn bộ sẽ được rollback tự động.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReviewAllOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                disabled={isBatchSubmitting}
                onClick={handleBatchCommit}
                className="px-6 py-2.5 bg-secondary hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isBatchSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Đang commit batch...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Xác nhận Commit Tất cả ({readyCourts.length} trận)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

    </div>
  );
}

