"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  User,
  Shield,
  ShieldAlert,
  Award,
  Clock,
  Calendar,
  Phone,
  Mail,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Flame,
  Zap,
  Activity,
  History,
  TrendingUp,
  TrendingDown,
  Target,
  RefreshCw,
  Plus,
  Ban,
  Check,
  Tag,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  FileText
} from "lucide-react";
import { API_URL } from "@/app/config";
import { formatVietnamDate } from "@/app/utils/date";
import { getRankName, getRankBadgeClass } from "@/app/utils/rank";

// Predefined available tags for badminton club
const AVAILABLE_TAGS = [
  { id: "Vận động viên", label: "Vận động viên", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "Ban truyền thông", label: "Ban truyền thông", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "Designer", label: "Designer", color: "bg-pink-50 text-pink-700 border-pink-200" },
  { id: "MC & Hoạt náo", label: "MC & Hoạt náo", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "Ban tổ chức giải", label: "Ban tổ chức giải", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { id: "Thành viên nòng cốt", label: "Thành viên nòng cốt", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "Thành viên mới", label: "Thành viên mới", color: "bg-slate-100 text-slate-700 border-slate-300" }
];

const SOFT_SKILLS_OPTIONS = ["Chụp ảnh", "Quay dựng video", "Thiết kế", "Hỗ trợ chạy giải"];

interface Member360ModalProps {
  memberId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onMemberUpdated?: () => void;
}

type TabType = "overview" | "personal" | "attendance" | "competitive" | "gamification" | "timeline" | "audit";

export default function Member360Modal({
  memberId,
  isOpen,
  onClose,
  onMemberUpdated
}: Member360ModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Tab data caches
  const [overviewData, setOverviewData] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [competitiveData, setCompetitiveData] = useState<any>(null);
  const [gamificationData, setGamificationData] = useState<any>(null);
  const [timelineData, setTimelineData] = useState<any>(null);
  const [auditData, setAuditData] = useState<any>(null);

  // Loading states per tab
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [loadingCompetitive, setLoadingCompetitive] = useState(false);
  const [loadingGamification, setLoadingGamification] = useState(false);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Forms / Actions state
  const [profileForm, setProfileForm] = useState<any>({});
  const [updateReason, setUpdateReason] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Coin adjust action
  const [showCoinModal, setShowCoinModal] = useState(false);
  const [coinAmount, setCoinAmount] = useState<number>(50);
  const [coinReason, setCoinReason] = useState("");
  const [isAdjustingCoins, setIsAdjustingCoins] = useState(false);

  // Discipline issue action
  const [showDisciplineModal, setShowDisciplineModal] = useState(false);
  const [disciplineType, setDisciplineType] = useState<"YELLOW" | "RED" | "WARNING">("YELLOW");
  const [disciplineReason, setDisciplineReason] = useState("");
  const [disciplineNote, setDisciplineNote] = useState("");
  const [isIssuingDiscipline, setIsIssuingDiscipline] = useState(false);

  // Discipline revoke action
  const [revokeTargetRecord, setRevokeTargetRecord] = useState<any>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [isRevoking, setIsRevoking] = useState(false);

  const getAuthToken = () => {
    return typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  };

  // 1. Fetch Overview (Always loaded first)
  const fetchOverview = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoadingOverview(true);
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/admin/members/${memberId}/360/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setOverviewData(data.data);
        const u = data.data.user;
        setProfileForm({
          full_name: u.fullName || "",
          nickname: u.nickname || "",
          phone_zalo: u.phoneZalo || "",
          email: u.email || "",
          academic_info: u.academicInfo || "",
          gender: u.gender || "male",
          badminton_level: u.badmintonLevel || "Trung bình",
          hand_preference: u.handPreference || "right",
          play_style: u.playStyle || "Công thủ toàn diện",
          soft_skills: Array.isArray(u.softSkills) ? u.softSkills : [],
          tags: Array.isArray(u.tags) ? u.tags : []
        });
      }
    } catch (err) {
      console.error("Error fetching overview:", err);
    } finally {
      setLoadingOverview(false);
    }
  }, [memberId]);

  // 2. Fetch Attendance (Lazy)
  const fetchAttendance = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoadingAttendance(true);
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/admin/members/${memberId}/360/attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setAttendanceData(data.data);
      }
    } catch (err) {
      console.error("Error fetching attendance:", err);
    } finally {
      setLoadingAttendance(false);
    }
  }, [memberId]);

  // 3. Fetch Competitive (Lazy)
  const fetchCompetitive = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoadingCompetitive(true);
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/admin/members/${memberId}/360/competitive`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setCompetitiveData(data.data);
      }
    } catch (err) {
      console.error("Error fetching competitive:", err);
    } finally {
      setLoadingCompetitive(false);
    }
  }, [memberId]);

  // 4. Fetch Gamification (Lazy)
  const fetchGamification = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoadingGamification(true);
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/admin/members/${memberId}/360/gamification`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setGamificationData(data.data);
      }
    } catch (err) {
      console.error("Error fetching gamification:", err);
    } finally {
      setLoadingGamification(false);
    }
  }, [memberId]);

  // 5. Fetch Timeline (Lazy)
  const fetchTimeline = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoadingTimeline(true);
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/admin/members/${memberId}/360/timeline?limit=60`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setTimelineData(data.data);
      }
    } catch (err) {
      console.error("Error fetching timeline:", err);
    } finally {
      setLoadingTimeline(false);
    }
  }, [memberId]);

  // 6. Fetch Audit History (Lazy)
  const fetchAudit = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoadingAudit(true);
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/admin/members/${memberId}/360/audit?limit=60`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setAuditData(data.data);
      }
    } catch (err) {
      console.error("Error fetching audit:", err);
    } finally {
      setLoadingAudit(false);
    }
  }, [memberId]);

  // Handle Tab Switch & Trigger Lazy Fetch
  useEffect(() => {
    if (!isOpen || !memberId) return;
    if (activeTab === "overview" && !overviewData) {
      fetchOverview();
    } else if (activeTab === "attendance" && !attendanceData) {
      fetchAttendance();
    } else if (activeTab === "competitive" && !competitiveData) {
      fetchCompetitive();
    } else if (activeTab === "gamification" && !gamificationData) {
      fetchGamification();
    } else if (activeTab === "timeline" && !timelineData) {
      fetchTimeline();
    } else if (activeTab === "audit" && !auditData) {
      fetchAudit();
    }
  }, [
    isOpen,
    memberId,
    activeTab,
    overviewData,
    attendanceData,
    competitiveData,
    gamificationData,
    timelineData,
    auditData,
    fetchOverview,
    fetchAttendance,
    fetchCompetitive,
    fetchGamification,
    fetchTimeline,
    fetchAudit
  ]);

  // Reset state on modal open/close
  useEffect(() => {
    if (isOpen && memberId) {
      setActiveTab("overview");
      setOverviewData(null);
      setAttendanceData(null);
      setCompetitiveData(null);
      setGamificationData(null);
      setTimelineData(null);
      setAuditData(null);
      fetchOverview();
    }
  }, [isOpen, memberId, fetchOverview]);

  // Handler: Save Personal Info Form
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) return;
    setIsSavingProfile(true);
    setProfileMessage(null);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/admin/members/${memberId}/personal-info`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...profileForm,
          reason: updateReason.trim() || "Cập nhật hồ sơ thành viên"
        })
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMessage({ text: "Cập nhật hồ sơ thành công!", type: "success" });
        setUpdateReason("");
        fetchOverview();
        onMemberUpdated?.();
      } else {
        setProfileMessage({ text: data.error || "Lỗi cập nhật hồ sơ.", type: "error" });
      }
    } catch (err: any) {
      setProfileMessage({ text: err.message || "Lỗi kết nối máy chủ.", type: "error" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handler: Adjust Smash Coins
  const handleAdjustCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !coinReason.trim() || coinAmount === 0) return;
    setIsAdjustingCoins(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/admin/members/${memberId}/coins/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: coinAmount,
          reason: coinReason.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowCoinModal(false);
        setCoinReason("");
        fetchOverview();
        fetchGamification();
        fetchTimeline();
        onMemberUpdated?.();
      } else {
        alert(data.error || "Không thể điều chỉnh xu.");
      }
    } catch (err: any) {
      alert(err.message || "Lỗi mạng.");
    } finally {
      setIsAdjustingCoins(false);
    }
  };

  // Handler: Issue Discipline Card
  const handleIssueDiscipline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !disciplineReason.trim()) return;
    setIsIssuingDiscipline(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/admin/members/${memberId}/discipline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: disciplineType,
          reason: disciplineReason.trim(),
          note: disciplineNote.trim() || null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowDisciplineModal(false);
        setDisciplineReason("");
        setDisciplineNote("");
        fetchOverview();
        fetchAudit();
        fetchTimeline();
        onMemberUpdated?.();
      } else {
        alert(data.error || "Không thể áp dụng kỷ luật.");
      }
    } catch (err: any) {
      alert(err.message || "Lỗi mạng.");
    } finally {
      setIsIssuingDiscipline(false);
    }
  };

  // Handler: Revoke Discipline Record
  const handleRevokeDiscipline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !revokeTargetRecord || !revokeReason.trim()) return;
    setIsRevoking(true);
    try {
      const token = getAuthToken();
      const res = await fetch(
        `${API_URL}/api/admin/members/${memberId}/discipline/${revokeTargetRecord.id}/revoke`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            reason: revokeReason.trim()
          })
        }
      );
      const data = await res.json();
      if (res.ok) {
        setRevokeTargetRecord(null);
        setRevokeReason("");
        fetchOverview();
        fetchAudit();
        fetchTimeline();
        onMemberUpdated?.();
      } else {
        alert(data.error || "Không thể gỡ án kỷ luật.");
      }
    } catch (err: any) {
      alert(err.message || "Lỗi mạng.");
    } finally {
      setIsRevoking(false);
    }
  };

  if (!isOpen) return null;

  const user = overviewData?.user;
  const reliability = overviewData?.reliability;
  const disciplineSummary = overviewData?.disciplineSummary;

  // Reliability colors
  const getReliabilityColorClass = (level: string) => {
    switch (level) {
      case "excellent":
        return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "good":
        return "text-blue-700 bg-blue-50 border-blue-200";
      case "fair":
        return "text-amber-700 bg-amber-50 border-amber-200";
      case "risk":
      default:
        return "text-rose-700 bg-rose-50 border-rose-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* ========================================================= */}
        {/* MODAL HEADER: MEMBER 360 BANNER */}
        {/* ========================================================= */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-5 sm:p-6 border-b border-slate-800 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {loadingOverview && !user ? (
            <div className="flex items-center gap-3 py-6 justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              <span className="text-sm font-medium text-slate-300">Đang tải hồ sơ 360°...</span>
            </div>
          ) : user ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Avatar with fallback */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-md border-2 border-white/20 overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                    ) : (
                      user.fullName.charAt(0)
                    )}
                  </div>
                  {user.isBlocked && (
                    <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white">
                      Khóa
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">{user.fullName}</h2>
                    {user.nickname && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/10 text-purple-200">
                        ({user.nickname})
                      </span>
                    )}
                    {user.role === "admin" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Admin
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-300 flex-wrap">
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {user.phoneZalo}
                    </span>
                    {user.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {user.email}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Gia nhập: {formatVietnamDate(user.joinedAt || user.createdAt)}
                    </span>
                  </div>

                  {/* Active Tags */}
                  {user.tags && user.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {user.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-200 border border-purple-500/30 flex items-center gap-1"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Header Right: Reliability Score Gauge */}
              {reliability && (
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-2xl w-full sm:w-auto">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reliability Score</p>
                    <p className="text-xs font-semibold text-slate-200 mt-0.5">{reliability.label}</p>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg border ${
                      reliability.level === "excellent"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : reliability.level === "good"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                        : reliability.level === "fair"
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                    }`}
                  >
                    {reliability.score}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Quick Sub-Banner: Cards alert bar if active */}
          {disciplineSummary && (disciplineSummary.activeYellowCards > 0 || disciplineSummary.activeRedCards > 0) && (
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-medium">Tình trạng kỷ luật:</span>
                {disciplineSummary.activeRedCards > 0 && (
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    {disciplineSummary.activeRedCards} Thẻ đỏ (Đang đình chỉ)
                  </span>
                )}
                {disciplineSummary.activeYellowCards > 0 && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    {disciplineSummary.activeYellowCards} Thẻ vàng còn hiệu lực
                  </span>
                )}
              </div>
              <button
                onClick={() => setActiveTab("audit")}
                className="text-purple-300 hover:text-white underline font-semibold text-[11px]"
              >
                Xem chi tiết án phạt &rarr;
              </button>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* TABS NAVIGATION BAR */}
        {/* ========================================================= */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none py-2 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "bg-slate-900 text-white shadow-xs"
                : "hover:bg-slate-200/70 hover:text-slate-900"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Tổng quan 360°
          </button>

          <button
            onClick={() => setActiveTab("personal")}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "personal"
                ? "bg-slate-900 text-white shadow-xs"
                : "hover:bg-slate-200/70 hover:text-slate-900"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Thông tin cá nhân
          </button>

          <button
            onClick={() => setActiveTab("attendance")}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "attendance"
                ? "bg-slate-900 text-white shadow-xs"
                : "hover:bg-slate-200/70 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Chuyên cần
          </button>

          <button
            onClick={() => setActiveTab("competitive")}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "competitive"
                ? "bg-slate-900 text-white shadow-xs"
                : "hover:bg-slate-200/70 hover:text-slate-900"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Thi đấu & ELO
          </button>

          <button
            onClick={() => setActiveTab("gamification")}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "gamification"
                ? "bg-slate-900 text-white shadow-xs"
                : "hover:bg-slate-200/70 hover:text-slate-900"
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Gamification & Xu
          </button>

          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "timeline"
                ? "bg-slate-900 text-white shadow-xs"
                : "hover:bg-slate-200/70 hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Dòng hoạt động
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "audit"
                ? "bg-slate-900 text-white shadow-xs"
                : "hover:bg-slate-200/70 hover:text-slate-900"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Kiểm toán & Kỷ luật
          </button>
        </div>

        {/* ========================================================= */}
        {/* MODAL BODY (CONTENT BY TAB) */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* --------------------------------------------------------- */}
          {/* TAB 1: OVERVIEW */}
          {/* --------------------------------------------------------- */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {loadingOverview && !overviewData ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  <p className="text-sm font-medium">Đang tải dữ liệu tổng quan...</p>
                </div>
              ) : overviewData ? (
                <>
                  {/* KPIs Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-500" /> Smash Coins
                      </p>
                      <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
                        {overviewData.user.smashCoins.toLocaleString()}
                      </p>
                      <button
                        onClick={() => setShowCoinModal(true)}
                        className="text-[11px] font-bold text-purple-600 hover:text-purple-800 mt-2 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Điều chỉnh số dư
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-orange-500" /> Cấp độ & XP
                      </p>
                      <p className="text-2xl font-black text-slate-900 mt-1">
                        Level {overviewData.user.level}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">{overviewData.user.xp} XP tích lũy</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-indigo-500" /> ELO Cao nhất
                      </p>
                      <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
                        {Math.max(overviewData.competitiveSummary.singles.elo, overviewData.competitiveSummary.doubles.elo)}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {overviewData.competitiveSummary.singles.rank} / {overviewData.competitiveSummary.doubles.rank}
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Tỉ lệ chuyên cần
                      </p>
                      <p className="text-2xl font-black text-slate-900 mt-1">
                        {overviewData.attendanceSummary.attendanceRate}%
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {overviewData.attendanceSummary.attendedCount} / {overviewData.attendanceSummary.totalReservations} buổi
                      </p>
                    </div>
                  </div>

                  {/* Reliability Score Breakdown Card */}
                  <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-purple-600" />
                          Chỉ số Uy tín Hoạt động (Reliability Score)
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Điểm số tự động phái sinh từ hành vi tham gia, điểm danh, no-show và kỷ luật thực tế (0 - 100).
                        </p>
                      </div>
                      <span className={`text-xs font-black px-3 py-1 rounded-full border ${getReliabilityColorClass(reliability.level)}`}>
                        {reliability.label} ({reliability.score}/100)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          reliability.level === "excellent"
                            ? "bg-emerald-500"
                            : reliability.level === "good"
                            ? "bg-blue-500"
                            : reliability.level === "fair"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${reliability.score}%` }}
                      />
                    </div>

                    {/* Breakdown Items */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block font-medium">Buổi hoàn thành</span>
                        <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                          +{reliability.breakdown.attendedCount * 2}đ
                        </span>
                        <span className="text-[10px] text-slate-400">({reliability.breakdown.attendedCount} buổi)</span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block font-medium">Vắng không báo (No-show)</span>
                        <span className="font-bold text-rose-600 text-sm mt-0.5 block">
                          -{reliability.breakdown.noShowCount * 20}đ
                        </span>
                        <span className="text-[10px] text-slate-400">({reliability.breakdown.noShowCount} lần)</span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block font-medium">Hủy chỗ sát giờ</span>
                        <span className="font-bold text-amber-600 text-sm mt-0.5 block">
                          -{reliability.breakdown.lateCancelCount * 10}đ
                        </span>
                        <span className="text-[10px] text-slate-400">({reliability.breakdown.lateCancelCount} lần)</span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block font-medium">Thẻ vàng hiệu lực</span>
                        <span className="font-bold text-amber-600 text-sm mt-0.5 block">
                          -{reliability.breakdown.activeYellowCards * 15}đ
                        </span>
                        <span className="text-[10px] text-slate-400">({reliability.breakdown.activeYellowCards} thẻ)</span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block font-medium">Thẻ đỏ hiệu lực</span>
                        <span className="font-bold text-rose-600 text-sm mt-0.5 block">
                          -{reliability.breakdown.activeRedCards * 40}đ
                        </span>
                        <span className="text-[10px] text-slate-400">({reliability.breakdown.activeRedCards} thẻ)</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Next Steps */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => setShowDisciplineModal(true)}
                      className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      Xử phạt kỷ luật (Thẻ phạt)
                    </button>
                    <button
                      onClick={() => setShowCoinModal(true)}
                      className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl border border-amber-200 transition-colors flex items-center gap-1.5"
                    >
                      <Coins className="w-4 h-4" />
                      Cộng / Trừ Smash Coins
                    </button>
                    <button
                      onClick={() => setActiveTab("personal")}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Edit3 className="w-4 h-4" />
                      Chỉnh sửa hồ sơ & Functional Tags
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* --------------------------------------------------------- */}
          {/* TAB 2: PERSONAL INFORMATION FORM */}
          {/* --------------------------------------------------------- */}
          {activeTab === "personal" && (
            <form onSubmit={handleSaveProfile} className="space-y-5 max-w-3xl">
              {profileMessage && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    profileMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  {profileMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.full_name || ""}
                    onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Biệt danh / Nickname</label>
                  <input
                    type="text"
                    value={profileForm.nickname || ""}
                    onChange={e => setProfileForm({ ...profileForm, nickname: e.target.value })}
                    placeholder="VD: DinhNhat, HuyBeo..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Số điện thoại / Zalo *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.phone_zalo || ""}
                    onChange={e => setProfileForm({ ...profileForm, phone_zalo: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={profileForm.email || ""}
                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Thông tin học vấn / Nghề nghiệp</label>
                  <input
                    type="text"
                    value={profileForm.academic_info || ""}
                    onChange={e => setProfileForm({ ...profileForm, academic_info: e.target.value })}
                    placeholder="VD: ĐH Bách Khoa, K21..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Giới tính</label>
                  <select
                    value={profileForm.gender || "male"}
                    onChange={e => setProfileForm({ ...profileForm, gender: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none bg-white"
                  >
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Trình độ Cầu lông</label>
                  <select
                    value={profileForm.badminton_level || "Trung bình"}
                    onChange={e => setProfileForm({ ...profileForm, badminton_level: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none bg-white font-medium"
                  >
                    <option value="Mới chơi">Mới chơi</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Khá/Giỏi">Khá/Giỏi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tay thuận & Lối chơi</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={profileForm.hand_preference || "right"}
                      onChange={e => setProfileForm({ ...profileForm, hand_preference: e.target.value })}
                      className="px-2.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none bg-white"
                    >
                      <option value="right">Thuận tay phải</option>
                      <option value="left">Thuận tay trái</option>
                      <option value="both">Thuận 2 tay</option>
                    </select>

                    <select
                      value={profileForm.play_style || "Công thủ toàn diện"}
                      onChange={e => setProfileForm({ ...profileForm, play_style: e.target.value })}
                      className="px-2.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none bg-white"
                    >
                      <option value="Tấn công">Tấn công</option>
                      <option value="Phòng thủ">Phòng thủ</option>
                      <option value="Công thủ toàn diện">Công thủ toàn diện</option>
                      <option value="Điều cầu/Gài lưới">Điều cầu/Gài lưới</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Functional Tags Selection */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 uppercase mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-purple-600" />
                  Functional Tags (Nhãn vai trò CLB)
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TAGS.map(t => {
                    const isChecked = (profileForm.tags || []).includes(t.id);
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => {
                          const current = profileForm.tags || [];
                          const next = isChecked ? current.filter((x: string) => x !== t.id) : [...current, t.id];
                          setProfileForm({ ...profileForm, tags: next });
                        }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                          isChecked ? t.color + " ring-2 ring-purple-600/30 font-black shadow-xs" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Soft Skills Selection */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 uppercase mb-2">Kỹ năng mềm hỗ trợ CLB</label>
                <div className="flex flex-wrap gap-3">
                  {SOFT_SKILLS_OPTIONS.map(skill => {
                    const isChecked = (profileForm.soft_skills || []).includes(skill);
                    return (
                      <label key={skill} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            const current = profileForm.soft_skills || [];
                            const next = e.target.checked
                              ? [...current, skill]
                              : current.filter((s: string) => s !== skill);
                            setProfileForm({ ...profileForm, soft_skills: next });
                          }}
                          className="rounded text-purple-600 focus:ring-purple-600 w-4 h-4"
                        />
                        {skill}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Reason for change (Audit Trail Requirement) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Lý do cập nhật (Ghi vào lịch sử kiểm toán) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Cập nhật tag Vận động viên tham gia giải đấu, chỉnh sửa số điện thoại..."
                  value={updateReason}
                  onChange={e => setUpdateReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                  Lưu thay đổi hồ sơ
                </button>
              </div>
            </form>
          )}

          {/* --------------------------------------------------------- */}
          {/* TAB 3: ATTENDANCE & RESERVATIONS */}
          {/* --------------------------------------------------------- */}
          {activeTab === "attendance" && (
            <div className="space-y-6">
              {loadingAttendance && !attendanceData ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  <p className="text-sm font-medium">Đang tải lịch sử chuyên cần...</p>
                </div>
              ) : attendanceData ? (
                (() => {
                  const attSummary = attendanceData.summary || attendanceData.stats || {};
                  const attTrends = attendanceData.trend || attendanceData.weeklyTrends || [];
                  const attHistory = attendanceData.history || [];
                  const totalRes = attSummary.totalReservations ?? attSummary.totalSessionsTracked ?? 0;
                  const completed = attSummary.completedSessions ?? attSummary.checkedOutCount ?? 0;
                  const missing = attSummary.missingCheckout ?? attSummary.missingCheckoutCount ?? 0;
                  const noShows = attSummary.noShowCount || 0;
                  const lateCancels = attSummary.lateCancelCount || 0;
                  const durationHours = attSummary.totalDurationHours ?? Math.round((attSummary.totalDurationMinutes || 0) / 60);

                  return (
                    <>
                      {/* High level stats cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <p className="text-[11px] font-bold text-slate-500 uppercase">Tổng đặt chỗ</p>
                          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{totalRes}</p>
                          <p className="text-[10px] text-slate-400 mt-1">Lượt đăng ký tham gia</p>
                        </div>

                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                          <p className="text-[11px] font-bold text-emerald-700 uppercase">Có mặt hoàn tất</p>
                          <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">{completed}</p>
                          <p className="text-[10px] text-emerald-600 mt-1">Đủ check-in & check-out</p>
                        </div>

                        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                          <p className="text-[11px] font-bold text-amber-700 uppercase">Quên check-out</p>
                          <p className="text-2xl font-black text-amber-700 mt-1 font-mono">{missing}</p>
                          <p className="text-[10px] text-amber-600 mt-1">Có mặt nhưng thiếu checkout</p>
                        </div>

                        <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                          <p className="text-[11px] font-bold text-rose-700 uppercase">No-show / Hủy trễ</p>
                          <p className="text-2xl font-black text-rose-700 mt-1 font-mono">{noShows + lateCancels}</p>
                          <p className="text-[10px] text-rose-600 mt-1">
                            {noShows} No-show, {lateCancels} Hủy trễ
                          </p>
                        </div>
                      </div>

                      {/* 12-Week Trend Line / Heat Display */}
                      {attTrends.length > 0 && (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <h4 className="text-xs font-bold text-slate-700 uppercase mb-3 flex items-center justify-between">
                            <span>Xu hướng tham gia 12 tuần gần nhất</span>
                            <span className="text-[11px] font-semibold text-slate-500 lowercase">
                              Tổng số giờ đánh: {durationHours} giờ
                            </span>
                          </h4>
                          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 text-center">
                            {attTrends.map((w: any, idx: number) => (
                              <div key={idx} className="bg-white p-2 rounded-xl border border-slate-200">
                                <span className="text-[10px] text-slate-400 block font-mono">{w.label || w.week}</span>
                                <span
                                  className={`text-xs font-black mt-1 block ${
                                    (w.attended || 0) > 0 ? "text-emerald-600" : "text-slate-300"
                                  }`}
                                >
                                  {w.attended || 0}b
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Detailed History Table */}
                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
                          <span>Lịch sử các buổi tập ({attHistory.length})</span>
                          <button
                            onClick={fetchAttendance}
                            className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                          >
                            <RefreshCw className="w-3 h-3" /> Làm mới
                          </button>
                        </div>
                        {attHistory.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-400">Chưa có lịch sử buổi tập nào.</div>
                        ) : (
                          <div className="max-h-72 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50/80 sticky top-0 border-b border-slate-100 text-slate-500 uppercase font-bold text-[10px]">
                                <tr>
                                  <th className="p-3">Buổi tập</th>
                                  <th className="p-3">Thời gian</th>
                                  <th className="p-3">Trạng thái</th>
                                  <th className="p-3">Check-in / Check-out</th>
                                  <th className="p-3">Thời lượng</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {attHistory.map((h: any) => (
                                  <tr key={h.id} className="hover:bg-slate-50/60">
                                    <td className="p-3 font-semibold text-slate-900">{h.sessionTitle}</td>
                                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                                      {formatVietnamDate(h.sessionDateTime || h.dateTime)}
                                    </td>
                                    <td className="p-3">
                                      <span
                                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                          h.status === "CHECKED_OUT"
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : h.status === "MISSING_CHECKOUT"
                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                            : h.status === "NO_SHOW"
                                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                                            : h.status === "CANCELLED"
                                            ? "bg-slate-100 text-slate-600"
                                            : "bg-blue-50 text-blue-700 border border-blue-200"
                                        }`}
                                      >
                                        {h.statusLabel || h.status}
                                      </span>
                                      {(h.isLateCancellation || h.isLateCancel) && (
                                        <span className="ml-1 text-[9px] text-amber-600 font-bold bg-amber-50 px-1 py-0.5 rounded">
                                          Hủy trễ
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-3 font-mono text-[11px] text-slate-600">
                                      {h.checkinAt ? formatVietnamDate(h.checkinAt, "time") : "--"} &rarr;{" "}
                                      {h.checkoutAt ? formatVietnamDate(h.checkoutAt, "time") : "--"}
                                    </td>
                                    <td className="p-3 font-mono text-slate-700">
                                      {h.durationMinutes ? `${h.durationMinutes}p` : "--"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()
              ) : null}
            </div>
          )}

          {/* --------------------------------------------------------- */}
          {/* TAB 4: COMPETITIVE STATS */}
          {/* --------------------------------------------------------- */}
          {activeTab === "competitive" && (
            <div className="space-y-6">
              {loadingCompetitive && !competitiveData ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  <p className="text-sm font-medium">Đang tải thống kê thi đấu...</p>
                </div>
              ) : competitiveData ? (
                (() => {
                  const singles = competitiveData.singles || {};
                  const doubles = competitiveData.doubles || {};
                  const matchesList = competitiveData.matches || [];

                  return (
                    <>
                      {/* Singles & Doubles Side-by-Side Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Singles */}
                        <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Đơn (Singles)</span>
                            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${getRankBadgeClass(singles.rank || "Bronze")}`}>
                              {singles.rank || "Bronze"}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-black text-slate-900 font-mono">{singles.elo || 1000}</p>
                            <p className="text-xs text-slate-400">Peak: {singles.peakElo || singles.elo || 1000}</p>
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                            <div>
                              <span className="text-slate-400 block font-medium">Trận</span>
                              <span className="font-bold text-slate-800">{singles.matches ?? singles.totalMatches ?? 0}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Thắng/Thua</span>
                              <span className="font-bold text-slate-800">
                                {singles.wins ?? singles.winCount ?? 0} / {singles.losses ?? singles.lossCount ?? 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Tỉ lệ thắng</span>
                              <span className="font-bold text-emerald-600">{singles.winRate ?? 0}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Doubles */}
                        <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Đôi (Doubles)</span>
                            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${getRankBadgeClass(doubles.rank || "Bronze")}`}>
                              {doubles.rank || "Bronze"}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-black text-slate-900 font-mono">{doubles.elo || 1000}</p>
                            <p className="text-xs text-slate-400">Peak: {doubles.peakElo || doubles.elo || 1000}</p>
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                            <div>
                              <span className="text-slate-400 block font-medium">Trận</span>
                              <span className="font-bold text-slate-800">{doubles.matches ?? doubles.totalMatches ?? 0}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Thắng/Thua</span>
                              <span className="font-bold text-slate-800">
                                {doubles.wins ?? doubles.winCount ?? 0} / {doubles.losses ?? doubles.lossCount ?? 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Tỉ lệ thắng</span>
                              <span className="font-bold text-emerald-600">{doubles.winRate ?? 0}%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Match History Table */}
                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
                          <span>Lịch sử các trận đấu gần đây ({matchesList.length})</span>
                          <button
                            onClick={fetchCompetitive}
                            className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                          >
                            <RefreshCw className="w-3 h-3" /> Làm mới
                          </button>
                        </div>

                        {matchesList.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-400">Chưa có dữ liệu trận đấu chính thức nào.</div>
                        ) : (
                          <div className="max-h-72 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50/80 sticky top-0 border-b border-slate-100 text-slate-500 uppercase font-bold text-[10px]">
                                <tr>
                                  <th className="p-3">Thời gian</th>
                                  <th className="p-3">Thể loại</th>
                                  <th className="p-3">Kết quả</th>
                                  <th className="p-3">Tỷ số</th>
                                  <th className="p-3">Đồng đội / Đối thủ</th>
                                  <th className="p-3 text-right">Biến động ELO</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {matchesList.map((m: any) => {
                                  const isWin = m.result === "WIN" || m.isWinner;
                                  const scoreText = m.score || `${m.myScore ?? 0} - ${m.oppScore ?? 0}`;
                                  const partner = m.partner?.name || m.partnerName;
                                  const opponents = [m.opponent?.name, m.opponent2?.name].filter(Boolean).join(", ") || (m.opponentNames || []).join(", ") || "--";
                                  const delta = m.eloDelta ?? 0;

                                  return (
                                    <tr key={m.id} className="hover:bg-slate-50/60">
                                      <td className="p-3 font-mono text-[11px] text-slate-500">
                                        {m.date || formatVietnamDate(m.createdAt, "date")}
                                      </td>
                                      <td className="p-3 font-semibold text-slate-700">
                                        {m.format || (m.isDoubles || m.mode === "doubles" ? "Đôi" : "Đơn")}
                                      </td>
                                      <td className="p-3">
                                        <span
                                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                            isWin
                                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                              : "bg-rose-50 text-rose-700 border border-rose-200"
                                          }`}
                                        >
                                          {isWin ? "Thắng" : "Thua"}
                                        </span>
                                      </td>
                                      <td className="p-3 font-mono font-bold text-slate-900">{scoreText}</td>
                                      <td className="p-3 text-slate-600">
                                        {partner && (
                                          <span className="block text-[11px] text-purple-700">
                                            Đồng đội: {partner}
                                          </span>
                                        )}
                                        <span className="block text-[11px] text-slate-500">
                                          VS: {opponents}
                                        </span>
                                      </td>
                                      <td className="p-3 text-right font-mono font-black">
                                        {delta > 0 ? (
                                          <span className="text-emerald-600 flex items-center justify-end gap-0.5">
                                            <TrendingUp className="w-3.5 h-3.5" /> +{delta}
                                          </span>
                                        ) : delta < 0 ? (
                                          <span className="text-rose-600 flex items-center justify-end gap-0.5">
                                            <TrendingDown className="w-3.5 h-3.5" /> {delta}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">0</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()
              ) : null}
            </div>
          )}

          {/* --------------------------------------------------------- */}
          {/* TAB 5: GAMIFICATION & COINS */}
          {/* --------------------------------------------------------- */}
          {activeTab === "gamification" && (
            <div className="space-y-6">
              {loadingGamification && !gamificationData ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  <p className="text-sm font-medium">Đang tải dữ liệu Gamification & Xu...</p>
                </div>
              ) : gamificationData ? (
                <>
                  {/* Balance & Adjust Action Banner */}
                  <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 rounded-3xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                        <Coins className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Số dư ví Smash Coins</p>
                        <p className="text-3xl font-black text-slate-900 font-mono mt-0.5">
                          {gamificationData.smashCoins.toLocaleString()} <span className="text-sm font-bold text-amber-600">Coins</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowCoinModal(true)}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Điều chỉnh số dư ví
                    </button>
                  </div>

                  {/* Level, Inventory & Quests Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase">Cấp độ hiện tại</p>
                      <p className="text-xl font-black text-slate-900 mt-1">Level {gamificationData.level}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{gamificationData.xp} XP kinh nghiệm</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase">Danh hiệu & Khung đại diện</p>
                      <p className="text-sm font-bold text-purple-700 mt-1">
                        {gamificationData.inventory.selectedTitle || "Chưa chọn danh hiệu"}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {gamificationData.inventory.selectedAvatarFrame || "Khung tiêu chuẩn"}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase">Nhiệm vụ (Quests)</p>
                      <p className="text-xl font-black text-emerald-600 mt-1">
                        {gamificationData.quests.completedQuestsCount} <span className="text-xs font-normal text-slate-500">hoàn thành</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {gamificationData.quests.activeQuestsCount} nhiệm vụ đang mở
                      </p>
                    </div>
                  </div>

                  {/* Coin Transaction Ledger Table */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
                      <span>Sổ cái lịch sử giao dịch Xu ({gamificationData.coinTransactions.length})</span>
                      <button
                        onClick={fetchGamification}
                        className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                      >
                        <RefreshCw className="w-3 h-3" /> Làm mới
                      </button>
                    </div>

                    {gamificationData.coinTransactions.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">Chưa có giao dịch xu nào trong sổ cái.</div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50/80 sticky top-0 border-b border-slate-100 text-slate-500 uppercase font-bold text-[10px]">
                            <tr>
                              <th className="p-3">Thời gian</th>
                              <th className="p-3">Số lượng</th>
                              <th className="p-3">Nguồn</th>
                              <th className="p-3">Lý do</th>
                              <th className="p-3 text-right">Số dư sau GD</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {gamificationData.coinTransactions.map((tx: any) => (
                              <tr key={tx.id} className="hover:bg-slate-50/60">
                                <td className="p-3 font-mono text-[11px] text-slate-500">
                                  {formatVietnamDate(tx.createdAt)}
                                </td>
                                <td className="p-3 font-mono font-bold">
                                  {tx.amount > 0 ? (
                                    <span className="text-emerald-600 font-black">+{tx.amount}</span>
                                  ) : (
                                    <span className="text-rose-600 font-black">{tx.amount}</span>
                                  )}
                                </td>
                                <td className="p-3 text-slate-600 font-semibold">{tx.source}</td>
                                <td className="p-3 text-slate-700">{tx.reason}</td>
                                <td className="p-3 text-right font-mono text-slate-900 font-bold">
                                  {tx.balanceAfter !== null ? tx.balanceAfter.toLocaleString() : "--"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* --------------------------------------------------------- */}
          {/* TAB 6: ACTIVITY TIMELINE */}
          {/* --------------------------------------------------------- */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase">Dòng sự kiện hoạt động hợp nhất</h4>
                <button
                  onClick={fetchTimeline}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="w-3 h-3" /> Làm mới
                </button>
              </div>

              {loadingTimeline && !timelineData ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  <p className="text-sm font-medium">Đang tải dòng hoạt động...</p>
                </div>
              ) : timelineData && timelineData.timeline.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {timelineData.timeline.map((item: any) => (
                    <div key={item.id} className="relative group">
                      {/* Timeline Dot */}
                      <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-white ring-2 ring-slate-100" />
                      <div className="bg-slate-50 hover:bg-slate-100/80 p-3.5 rounded-2xl border border-slate-200 transition-colors">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-slate-800">{item.title}</span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {formatVietnamDate(item.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-slate-400">Chưa ghi nhận hoạt động nào gần đây.</div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------- */}
          {/* TAB 7: DISCIPLINE & AUDIT LOGS */}
          {/* --------------------------------------------------------- */}
          {activeTab === "audit" && (
            <div className="space-y-6">
              {loadingAudit && !auditData ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  <p className="text-sm font-medium">Đang tải kiểm toán & kỷ luật...</p>
                </div>
              ) : auditData ? (
                <>
                  {/* Discipline Records Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        Danh sách thẻ phạt kỷ luật ({auditData.disciplineRecords.length})
                      </h4>
                      <button
                        onClick={() => setShowDisciplineModal(true)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Phạt thẻ mới
                      </button>
                    </div>

                    {auditData.disciplineRecords.length === 0 ? (
                      <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                        Thành viên chưa từng bị phạt kỷ luật nào.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2.5">
                        {auditData.disciplineRecords.map((r: any) => (
                          <div
                            key={r.id}
                            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              r.status === "ACTIVE"
                                ? r.type === "RED"
                                  ? "bg-rose-50/70 border-rose-200 text-rose-900"
                                  : "bg-amber-50/70 border-amber-200 text-amber-900"
                                : "bg-slate-50 border-slate-200 text-slate-600 opacity-75"
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    r.type === "RED"
                                      ? "bg-rose-600 text-white"
                                      : r.type === "YELLOW"
                                      ? "bg-amber-500 text-white"
                                      : "bg-slate-600 text-white"
                                  }`}
                                >
                                  {r.type === "RED" ? "Thẻ đỏ" : r.type === "YELLOW" ? "Thẻ vàng" : "Cảnh cáo"}
                                </span>
                                <span className="font-bold text-xs">{r.reason}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({formatVietnamDate(r.createdAt)})
                                </span>
                              </div>
                              {r.note && <p className="text-xs text-slate-600 mt-1 italic">Ghi chú: {r.note}</p>}
                              {r.revokedReason && (
                                <p className="text-xs text-emerald-700 mt-1 font-semibold">
                                  Đã gỡ án phạt: {r.revokedReason} (Bởi {r.revokedByAdminName})
                                </p>
                              )}
                            </div>

                            {r.status === "ACTIVE" && (
                              <button
                                onClick={() => setRevokeTargetRecord(r)}
                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors shadow-2xs whitespace-nowrap self-start sm:self-center"
                              >
                                Gỡ án phạt
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Audit Logs Table */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs mt-6">
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-purple-600" />
                        Nhật ký kiểm toán thay đổi dữ liệu ({auditData.auditLogs.length})
                      </span>
                      <button
                        onClick={fetchAudit}
                        className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium text-xs"
                      >
                        <RefreshCw className="w-3 h-3" /> Làm mới
                      </button>
                    </div>

                    {auditData.auditLogs.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">Chưa có nhật ký kiểm toán nào.</div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50/80 sticky top-0 border-b border-slate-100 text-slate-500 uppercase font-bold text-[10px]">
                            <tr>
                              <th className="p-3">Thời gian</th>
                              <th className="p-3">Loại hành động</th>
                              <th className="p-3">Thay đổi</th>
                              <th className="p-3">Lý do</th>
                              <th className="p-3 text-right">Admin</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {auditData.auditLogs.map((log: any) => (
                              <tr key={log.id} className="hover:bg-slate-50/60">
                                <td className="p-3 font-mono text-[11px] text-slate-500">
                                  {formatVietnamDate(log.createdAt)}
                                </td>
                                <td className="p-3 font-bold text-slate-800">{log.actionType}</td>
                                <td className="p-3 text-slate-600 font-mono text-[11px]">
                                  {log.fieldName ? (
                                    <>
                                      <span className="font-semibold">{log.fieldName}:</span>{" "}
                                      <span className="line-through text-slate-400">{String(log.oldValue ?? "")}</span>{" "}
                                      &rarr; <span className="text-purple-700">{String(log.newValue ?? "")}</span>
                                    </>
                                  ) : (
                                    "--"
                                  )}
                                </td>
                                <td className="p-3 text-slate-700">{log.reason || "--"}</td>
                                <td className="p-3 text-right font-semibold text-slate-800">
                                  {log.adminName || "System"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

        </div>

        {/* ========================================================= */}
        {/* SUB-MODAL 1: ADJUST SMASH COINS */}
        {/* ========================================================= */}
        {showCoinModal && (
          <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                  <Coins className="w-5 h-5 text-amber-500" />
                  Điều chỉnh số dư Smash Coins
                </h3>
                <button
                  onClick={() => setShowCoinModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdjustCoins} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Số lượng xu (+ để cộng, - để trừ) *
                  </label>
                  <input
                    type="number"
                    required
                    value={coinAmount}
                    onChange={e => setCoinAmount(parseInt(e.target.value) || 0)}
                    placeholder="VD: 50 hoặc -20"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Lý do điều chỉnh (Bắt buộc) *
                  </label>
                  <input
                    type="text"
                    required
                    value={coinReason}
                    onChange={e => setCoinReason(e.target.value)}
                    placeholder="VD: Thưởng hỗ trợ truyền thông, Hoàn trả phí tham gia..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCoinModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isAdjustingCoins || coinAmount === 0 || !coinReason.trim()}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isAdjustingCoins && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Xác nhận điều chỉnh
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUB-MODAL 2: ISSUE DISCIPLINE */}
        {/* ========================================================= */}
        {showDisciplineModal && (
          <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  Xử phạt kỷ luật thành viên
                </h3>
                <button
                  onClick={() => setShowDisciplineModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleIssueDiscipline} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Loại thẻ phạt *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDisciplineType("YELLOW")}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        disciplineType === "YELLOW"
                          ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      Thẻ vàng
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisciplineType("RED")}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        disciplineType === "RED"
                          ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      Thẻ đỏ
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisciplineType("WARNING")}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        disciplineType === "WARNING"
                          ? "bg-slate-800 text-white border-slate-900 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      Cảnh cáo
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Lý do xử phạt (Bắt buộc) *
                  </label>
                  <input
                    type="text"
                    required
                    value={disciplineReason}
                    onChange={e => setDisciplineReason(e.target.value)}
                    placeholder="VD: Vắng mặt không phép 2 buổi liên tiếp..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ghi chú bổ sung</label>
                  <textarea
                    rows={2}
                    value={disciplineNote}
                    onChange={e => setDisciplineNote(e.target.value)}
                    placeholder="Ghi chú chi tiết thêm..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDisciplineModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isIssuingDiscipline || !disciplineReason.trim()}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isIssuingDiscipline && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Áp dụng kỷ luật
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUB-MODAL 3: REVOKE DISCIPLINE */}
        {/* ========================================================= */}
        {revokeTargetRecord && (
          <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-base text-slate-900">Gỡ án phạt kỷ luật</h3>
                <button
                  onClick={() => setRevokeTargetRecord(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Bạn đang gỡ án phạt: <strong className="text-slate-900">{revokeTargetRecord.reason}</strong> (
                {revokeTargetRecord.type === "RED"
                  ? "Thẻ đỏ"
                  : revokeTargetRecord.type === "YELLOW"
                  ? "Thẻ vàng"
                  : "Cảnh cáo"}
                )
              </p>

              <form onSubmit={handleRevokeDiscipline} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Lý do gỡ án phạt (Bắt buộc) *
                  </label>
                  <input
                    type="text"
                    required
                    value={revokeReason}
                    onChange={e => setRevokeReason(e.target.value)}
                    placeholder="VD: Đã tích cực tham gia bù buổi tập, giải trình chính đáng..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRevokeTargetRecord(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isRevoking || !revokeReason.trim()}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isRevoking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Xác nhận gỡ án
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
