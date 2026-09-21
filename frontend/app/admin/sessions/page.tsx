"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Calendar, MapPin, Clock, Plus, Loader2, X, Download, Users, 
  CheckCircle, ChevronRight, UserCheck, AlertTriangle, ShieldCheck, 
  Hourglass, Search, RefreshCw, Edit3, Trash2, Check, UserPlus, 
  FileText, QrCode, Copy, ExternalLink, ShieldAlert, LogOut
} from "lucide-react";
import { API_URL } from "@/app/config";
import { QRCodeCanvas } from "qrcode.react";
import { formatVietnamDate, toVietnamDatetimeInput } from "@/app/utils/date";

export default function AdminSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [viewMode, setViewMode] = useState<"upcoming" | "history">("upcoming");

  // Dashboard Subtabs
  const [activeTab, setActiveTab] = useState<"attendees" | "waitlist" | "qr" | "audit">("attendees");
  const [attendeeFilter, setAttendeeFilter] = useState<"ALL" | "CHECKED_IN" | "CHECKED_OUT" | "MISSING_CHECKOUT" | "CONFIRMED" | "RESERVED" | "PENDING_LATE_CANCEL" | "NO_SHOW" | "CANCELLED">("ALL");
  const [searchMemberQuery, setSearchMemberQuery] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [isManualAddModalOpen, setIsManualAddModalOpen] = useState(false);
  const [isRejectLateCancelModalOpen, setIsRejectLateCancelModalOpen] = useState(false);
  const [rejectTargetUser, setRejectTargetUser] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Admin Check-out Override Modal
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutTargetUser, setCheckoutTargetUser] = useState<any>(null);
  const [adminCheckoutTime, setAdminCheckoutTime] = useState("");
  const [adminCheckoutReason, setAdminCheckoutReason] = useState("Admin check-out tại quầy");
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);

  // All club members for dropdown search (Walk-in / Manual Add)
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [walkInReason, setWalkInReason] = useState("Khách vãng lai check-in trực tiếp tại sân");
  const [manualAddStatus, setManualAddStatus] = useState<"RESERVED" | "CONFIRMED" | "CHECKED_IN">("CONFIRMED");

  // Form states (Create & Edit)
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [sessionStart, setSessionStart] = useState("");
  const [sessionEnd, setSessionEnd] = useState("");
  const [capacity, setCapacity] = useState(40);
  const [reservationDeadline, setReservationDeadline] = useState("");
  const [checkinOpenAt, setCheckinOpenAt] = useState("");
  const [checkinCloseAt, setCheckinCloseAt] = useState("");
  const [checkoutOpenAt, setCheckoutOpenAt] = useState("");
  const [checkoutCloseAt, setCheckoutCloseAt] = useState("");
  const [waitlistDuration, setWaitlistDuration] = useState(10);
  const [template, setTemplate] = useState<"dinh_ky" | "offline" | "khac">("khac");

  const handleSessionStartChange = (newVal: string) => {
    if (sessionStart && newVal) {
      const oldTime = new Date(sessionStart).getTime();
      const newTime = new Date(newVal).getTime();
      if (!isNaN(oldTime) && !isNaN(newTime)) {
        const delta = newTime - oldTime;
        
        const shiftTime = (timeStr: string) => {
          if (!timeStr) return timeStr;
          const t = new Date(timeStr).getTime();
          if (isNaN(t)) return timeStr;
          
          const shifted = new Date(t + delta);
          // Format shifted date to YYYY-MM-DDThh:mm
          const d = shifted;
          const pad = (n: number) => String(n).padStart(2, "0");
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        setSessionEnd(shiftTime(sessionEnd));
        setReservationDeadline(shiftTime(reservationDeadline));
        setCheckinOpenAt(shiftTime(checkinOpenAt));
        setCheckinCloseAt(shiftTime(checkinCloseAt));
        setCheckoutOpenAt(shiftTime(checkoutOpenAt));
        setCheckoutCloseAt(shiftTime(checkoutCloseAt));
      }
    }
    setSessionStart(newVal);
  };
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCheckoutUrl, setCopiedCheckoutUrl] = useState(false);

  // Fetch list of sessions
  const fetchSessions = async (historyMode = false, preserveSelectedId?: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/sessions?history=${historyMode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (preserveSelectedId) {
          const match = data.find((s: any) => s.id === preserveSelectedId);
          if (match) {
            setSelectedSession(match);
            fetchDashboard(match.id);
          }
        } else if (data.length > 0 && (!selectedSession || historyMode)) {
          setSelectedSession(data[0]);
          fetchDashboard(data[0].id);
        } else if (data.length === 0) {
          setSelectedSession(null);
          setDashboardData(null);
        }
      }
    } catch (e) {
      console.error("Error fetching sessions:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch complete session dashboard (attendees, waitlist, audit logs, capacity)
  const fetchDashboard = async (sessionId: string) => {
    setIsLoadingDashboard(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/sessions/${sessionId}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
        if (data.session) {
          setSelectedSession(data.session);
        }
      }
    } catch (e) {
      console.error("Error fetching session dashboard:", e);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  // Fetch all members for walk-in / manual-add
  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/users/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllMembers(data);
      }
    } catch (e) {
      console.error("Error fetching members:", e);
    }
  };

  useEffect(() => {
    fetchSessions(viewMode === "history");
    fetchMembers();
  }, [viewMode]);

  const selectSession = (session: any) => {
    setSelectedSession(session);
    fetchDashboard(session.id);
  };

  // Template autofill helper
  const applyTemplate = (type: "dinh_ky" | "offline" | "khac") => {
    setTemplate(type);
    const now = new Date();
    // Round to today's date
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");

    if (type === "dinh_ky") {
      setTitle("Sinh hoạt định kỳ CLB");
      setLocation("Sân Cầu Lông Bình Thắng");
      setSessionStart(`${y}-${m}-${d}T19:00`);
      setSessionEnd(`${y}-${m}-${d}T22:00`);
      setCapacity(40);
      setReservationDeadline(`${y}-${m}-${d}T17:00`);
      setCheckinOpenAt(`${y}-${m}-${d}T18:30`);
      setCheckinCloseAt(`${y}-${m}-${d}T22:30`);
      setCheckoutOpenAt(`${y}-${m}-${d}T21:00`);
      setCheckoutCloseAt(`${y}-${m}-${d}T22:30`);
      setWaitlistDuration(10);
    } else if (type === "offline") {
      setTitle("Offline & Giao lưu toàn CLB");
      setLocation("Sân Cầu Lông Kỳ Hòa");
      setSessionStart(`${y}-${m}-${d}T17:00`);
      setSessionEnd(`${y}-${m}-${d}T21:00`);
      setCapacity(50);
      setReservationDeadline(`${y}-${m}-${d}T13:00`);
      setCheckinOpenAt(`${y}-${m}-${d}T16:30`);
      setCheckinCloseAt(`${y}-${m}-${d}T21:30`);
      setCheckoutOpenAt(`${y}-${m}-${d}T20:00`);
      setCheckoutCloseAt(`${y}-${m}-${d}T21:30`);
      setWaitlistDuration(15);
    } else {
      setTitle("");
      setLocation("");
      setSessionStart("");
      setSessionEnd("");
      setCapacity(40);
      setReservationDeadline("");
      setCheckinOpenAt("");
      setCheckinCloseAt("");
      setCheckoutOpenAt("");
      setCheckoutCloseAt("");
      setWaitlistDuration(10);
    }
  };

  // Create Session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !sessionStart || !location) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          location,
          session_start: sessionStart,
          session_end: sessionEnd || null,
          capacity: Number(capacity) || 40,
          reservation_deadline: reservationDeadline || null,
          checkin_open_at: checkinOpenAt || null,
          checkin_close_at: checkinCloseAt || null,
          checkout_open_at: checkoutOpenAt || null,
          checkout_close_at: checkoutCloseAt || null,
          waitlist_offer_duration_minutes: Number(waitlistDuration) || 10
        })
      });

      const data = await res.json();

      if (res.ok) {
        setIsCreateModalOpen(false);
        fetchSessions(false, data.session?.id || data.id);
      } else {
        setError(data.error || "Không thể tạo buổi tập.");
      }
    } catch (err) {
      setError("Lỗi kết nối máy chủ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal with current values
  const openEditModal = () => {
    if (!selectedSession) return;
    setTitle(selectedSession.title || "");
    setLocation(selectedSession.location || "");
    setSessionStart(toVietnamDatetimeInput(selectedSession.session_start || selectedSession.date_time));
    setSessionEnd(toVietnamDatetimeInput(selectedSession.session_end));
    setCapacity(selectedSession.capacity || 40);
    setReservationDeadline(toVietnamDatetimeInput(selectedSession.reservation_deadline));
    setCheckinOpenAt(toVietnamDatetimeInput(selectedSession.checkin_open_at));
    setCheckinCloseAt(toVietnamDatetimeInput(selectedSession.checkin_close_at));
    setCheckoutOpenAt(toVietnamDatetimeInput(selectedSession.checkout_open_at));
    setCheckoutCloseAt(toVietnamDatetimeInput(selectedSession.checkout_close_at));
    setWaitlistDuration(selectedSession.waitlist_offer_duration_minutes || 10);
    setIsEditModalOpen(true);
    setError(null);
  };

  // Delete Session
  const handleDeleteSession = async () => {
    if (!selectedSession) return;
    const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa buổi tập "${selectedSession.title}" không?\nHành động này không thể hoàn tác!`);
    if (!confirmDelete) return;
    
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/sessions/${selectedSession.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSelectedSession(null);
        fetchSessions(viewMode === "history");
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi xóa buổi tập.");
      }
    } catch (error) {
      alert("Đã xảy ra lỗi khi xóa buổi tập.");
    }
  };

  // Save Edited Session
  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/sessions/${selectedSession.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          location,
          session_start: sessionStart,
          session_end: sessionEnd || null,
          capacity: Number(capacity) || 40,
          reservation_deadline: reservationDeadline || null,
          checkin_open_at: checkinOpenAt || null,
          checkin_close_at: checkinCloseAt || null,
          checkout_open_at: checkoutOpenAt || null,
          checkout_close_at: checkoutCloseAt || null,
          waitlist_offer_duration_minutes: Number(waitlistDuration) || 10
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsEditModalOpen(false);
        fetchDashboard(selectedSession.id);
        fetchSessions(viewMode === "history", selectedSession.id);
      } else {
        setError(data.error || "Không thể cập nhật buổi tập.");
      }
    } catch (err) {
      setError("Lỗi kết nối máy chủ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Admin Manual Check-out Override
  const handleAdminCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutTargetUser || !selectedSession) return;
    setIsSubmittingCheckout(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/sessions/${selectedSession.id}/check-out`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          target_user_id: checkoutTargetUser.user_id,
          checkout_time: adminCheckoutTime ? new Date(adminCheckoutTime).toISOString() : new Date().toISOString(),
          reason: adminCheckoutReason || "Admin check-out tại quầy"
        })
      });
      const data = await res.json();
      if (res.ok) {
        setIsCheckoutModalOpen(false);
        setCheckoutTargetUser(null);
        fetchDashboard(selectedSession.id);
      } else {
        alert(data.error || "Lỗi ghi nhận check-out.");
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ.");
    } finally {
      setIsSubmittingCheckout(false);
    }
  };

  // Approve Late Cancellation Request
  const handleApproveLateCancel = async (targetUserId: string) => {
    if (!confirm("Xác nhận DUYỆT yêu cầu hủy muộn này? Slot sẽ được hủy phạt và cấp cho người đầu tiên trong hàng chờ FIFO.")) return;
    setActionLoadingId(`approve-${targetUserId}`);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/sessions/${selectedSession.id}/late-cancel/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ target_user_id: targetUserId })
      });
      if (res.ok) {
        fetchDashboard(selectedSession.id);
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi phê duyệt hủy muộn.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject Late Cancellation Request
  const handleRejectLateCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTargetUser) return;
    setActionLoadingId(`reject-${rejectTargetUser.user_id}`);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/sessions/${selectedSession.id}/late-cancel/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          target_user_id: rejectTargetUser.user_id,
          reason: rejectReason || "Ban Quản trị từ chối yêu cầu hủy muộn."
        })
      });
      if (res.ok) {
        setIsRejectLateCancelModalOpen(false);
        setRejectTargetUser(null);
        setRejectReason("");
        fetchDashboard(selectedSession.id);
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi từ chối hủy muộn.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Walk-in Check-in
  const handleWalkInCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !selectedSession) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/sessions/${selectedSession.id}/walk-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: selectedMemberId,
          reason: walkInReason
        })
      });
      const data = await res.json();
      if (res.ok) {
        setIsWalkInModalOpen(false);
        setSelectedMemberId("");
        fetchDashboard(selectedSession.id);
      } else {
        alert(data.error || "Lỗi Walk-in Check-in.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual Add Member
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !selectedSession) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/sessions/${selectedSession.id}/participants/manual-add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: selectedMemberId,
          status: manualAddStatus
        })
      });
      const data = await res.json();
      if (res.ok) {
        setIsManualAddModalOpen(false);
        setSelectedMemberId("");
        fetchDashboard(selectedSession.id);
      } else {
        alert(data.error || "Lỗi thêm thành viên.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual Remove Member
  const handleManualRemove = async (userId: string, memberName: string) => {
    const reason = prompt(`Nhập lý do xóa/hủy chỗ của "${memberName}":`, "Admin hủy thủ công");
    if (reason === null) return;

    setActionLoadingId(`remove-${userId}`);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/sessions/${selectedSession.id}/participants/manual-remove`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId, reason })
      });
      if (res.ok) {
        fetchDashboard(selectedSession.id);
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi xóa thành viên.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // QR & Link helpers
  // QR & Link helpers
  const downloadQRCode = (type: "checkin" | "checkout" = "checkin") => {
    if (!selectedSession) return;
    const canvasId = type === "checkout" ? "session-checkout-qr-canvas" : "session-qr-canvas";
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `QR-${type === "checkout" ? "Checkout" : "Checkin"}-${selectedSession.title.replace(/\s+/g, "-")}.png`;
    link.click();
  };

  const qrSecretToken = selectedSession?.qr_secret_token || "";
  const qrCheckinUrl = selectedSession && typeof window !== "undefined"
    ? `${window.location.origin}/check-in?session_id=${selectedSession.id}&token=${qrSecretToken}`
    : "";

  const copyQrUrl = () => {
    if (!qrCheckinUrl) return;
    navigator.clipboard.writeText(qrCheckinUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const qrCheckoutSecretToken = selectedSession?.qr_checkout_secret_token || "";
  const qrCheckoutUrl = selectedSession && typeof window !== "undefined"
    ? `${window.location.origin}/check-in?session_id=${selectedSession.id}&token=${qrCheckoutSecretToken}&mode=checkout`
    : "";

  const copyQrCheckoutUrl = () => {
    if (!qrCheckoutUrl) return;
    navigator.clipboard.writeText(qrCheckoutUrl);
    setCopiedCheckoutUrl(true);
    setTimeout(() => setCopiedCheckoutUrl(false), 2500);
  };

  // Filter attendees
  const attendeesList: any[] = dashboardData?.attendees || [];
  const waitlist: any[] = dashboardData?.waitlist || [];
  const auditLogs: any[] = dashboardData?.auditLogs || [];

  const pendingLateCancelCount = attendeesList.filter(a => a.cancellation_request_pending).length;
  const checkedInCount = attendeesList.filter(a => a.status === "CHECKED_IN").length;
  const checkedOutCount = attendeesList.filter(a => a.status === "CHECKED_OUT").length;
  const missingCheckoutCount = attendeesList.filter(a => a.status === "MISSING_CHECKOUT").length;
  const confirmedCount = attendeesList.filter(a => a.status === "CONFIRMED").length;
  const reservedCount = attendeesList.filter(a => a.status === "RESERVED" || a.status === "going").length;
  const noShowCount = attendeesList.filter(a => a.status === "NO_SHOW").length;
  const cancelledCount = attendeesList.filter(a => a.status === "CANCELLED").length;
  const totalOccupied = checkedInCount + checkedOutCount + missingCheckoutCount + confirmedCount + reservedCount;
  const sessionCapacity = selectedSession?.capacity || 40;
  const occupancyPercent = Math.min(100, Math.round((totalOccupied / sessionCapacity) * 100));

  const filteredAttendees = attendeesList.filter((a) => {
    // Tab filter
    if (attendeeFilter === "CHECKED_IN" && a.status !== "CHECKED_IN") return false;
    if (attendeeFilter === "CHECKED_OUT" && a.status !== "CHECKED_OUT") return false;
    if (attendeeFilter === "MISSING_CHECKOUT" && a.status !== "MISSING_CHECKOUT") return false;
    if (attendeeFilter === "CONFIRMED" && a.status !== "CONFIRMED") return false;
    if (attendeeFilter === "RESERVED" && (a.status !== "RESERVED" && a.status !== "going")) return false;
    if (attendeeFilter === "PENDING_LATE_CANCEL" && !a.cancellation_request_pending) return false;
    if (attendeeFilter === "NO_SHOW" && a.status !== "NO_SHOW") return false;
    if (attendeeFilter === "CANCELLED" && a.status !== "CANCELLED") return false;

    // Search query
    if (searchMemberQuery.trim()) {
      const q = searchMemberQuery.toLowerCase();
      const matchName = (a.full_name || "").toLowerCase().includes(q);
      const matchNick = (a.nickname || "").toLowerCase().includes(q);
      const matchPhone = (a.phone_zalo || "").includes(q);
      return matchName || matchNick || matchPhone;
    }
    return true;
  });

  return (
    <div className="space-y-6 text-slate-800">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-secondary tracking-tight">Quản lý Lịch tập & Đặt chỗ</h1>
          <p className="text-slate-500 text-sm mt-1">Hệ thống Giữ chỗ (Reservation) → Chốt slot (Confirmation) → Quét QR Điểm danh với Hàng chờ FIFO.</p>
        </div>
        <button
          onClick={() => {
            setIsCreateModalOpen(true);
            applyTemplate("dinh_ky");
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-secondary hover:bg-primary-hover font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" /> Thiết lập Buổi tập mới
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: SESSIONS LIST */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex bg-slate-200/80 p-1 rounded-xl w-full">
            <button
              onClick={() => setViewMode("upcoming")}
              className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all text-center ${
                viewMode === "upcoming"
                  ? "bg-primary text-secondary shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Sắp diễn ra
            </button>
            <button
              onClick={() => setViewMode("history")}
              className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all text-center ${
                viewMode === "history"
                  ? "bg-primary text-secondary shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Lịch sử buổi đánh
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-slate-400 text-xs">
              {viewMode === "history" ? "Chưa có lịch sử buổi tập nào." : "Chưa có buổi tập nào được xếp lịch."}
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => {
                const isSelected = selectedSession?.id === s.id;
                const sCap = s.capacity || 40;
                const sAct = parseInt(s.active_reservations_count || 0, 10);
                const isFull = sAct >= sCap;

                return (
                  <div
                    key={s.id}
                    onClick={() => selectSession(s)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                      isSelected 
                        ? "bg-secondary text-white border-secondary shadow-lg ring-2 ring-primary/40" 
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0 pr-2">
                      <h4 className="font-bold text-sm line-clamp-1">{s.title}</h4>
                      <p className={`text-xs flex items-center gap-1 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {formatVietnamDate(s.session_start || s.date_time)}
                      </p>
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected
                            ? isFull ? "bg-rose-500/30 text-rose-200" : "bg-emerald-500/30 text-emerald-200"
                            : isFull ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        }`}>
                          {sAct}/{sCap} slot
                        </span>
                        <span className={`text-[10px] truncate max-w-[130px] ${isSelected ? "text-slate-400" : "text-slate-400"}`}>
                          {s.location}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary" : "text-slate-400"}`} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DETAILED SESSION DASHBOARD */}
        <div className="lg:col-span-2">
          {selectedSession ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              
              {/* TOP HEADER & ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-primary/20 text-secondary font-black px-2 py-0.5 rounded uppercase">
                      Bảng Điều Khiển Buổi Tập
                    </span>
                    {pendingLateCancelCount > 0 && (
                      <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full animate-bounce flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {pendingLateCancelCount} yêu cầu hủy muộn
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-secondary tracking-tight">{selectedSession.title}</h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-primary" /> {formatVietnamDate(selectedSession.session_start || selectedSession.date_time)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> {selectedSession.location}
                    </span>
                  </div>
                </div>

                {/* Toolbar buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setIsWalkInModalOpen(true);
                      setSelectedMemberId("");
                      setWalkInReason("Khách vãng lai check-in trực tiếp tại sân");
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> + Walk-in Check-in
                  </button>
                  <button
                    onClick={() => {
                      setIsManualAddModalOpen(true);
                      setSelectedMemberId("");
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> + Thêm thành viên
                  </button>
                  <button
                    onClick={openEditModal}
                    className="p-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                    title="Chỉnh sửa thông số buổi tập"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDeleteSession}
                    className="p-2 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer"
                    title="Xóa buổi tập"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => fetchDashboard(selectedSession.id)}
                    className="p-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                    title="Làm mới dữ liệu"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingDashboard ? "animate-spin text-primary" : ""}`} />
                  </button>
                </div>
              </div>

              {/* CAPACITY PROGRESS BAR & STATS */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-secondary">
                    Tỷ lệ lấp đầy sân: <span className="font-black text-primary">{totalOccupied}/{sessionCapacity} chỗ ({occupancyPercent}%)</span>
                  </span>
                  <span className="text-slate-500 font-medium">
                    Còn lại: <span className="font-bold text-emerald-600">{Math.max(0, sessionCapacity - totalOccupied)} slot</span>
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                  <div style={{ width: `${Math.min(100, (checkedInCount / sessionCapacity) * 100)}%` }} className="bg-emerald-500" title={`Check-in: ${checkedInCount}`} />
                  <div style={{ width: `${Math.min(100, (checkedOutCount / sessionCapacity) * 100)}%` }} className="bg-teal-600" title={`Check-out: ${checkedOutCount}`} />
                  <div style={{ width: `${Math.min(100, (missingCheckoutCount / sessionCapacity) * 100)}%` }} className="bg-amber-600" title={`Quên Check-out: ${missingCheckoutCount}`} />
                  <div style={{ width: `${Math.min(100, (confirmedCount / sessionCapacity) * 100)}%` }} className="bg-blue-500" title={`Confirmed: ${confirmedCount}`} />
                  <div style={{ width: `${Math.min(100, (reservedCount / sessionCapacity) * 100)}%` }} className="bg-amber-400" title={`Reserved: ${reservedCount}`} />
                </div>

                {/* Timing summary pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-600">
                  <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Hạn hủy tự do</span>
                    <span className="font-bold">{selectedSession.reservation_deadline ? formatVietnamDate(selectedSession.reservation_deadline) : "Chưa cài đặt"}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Cửa sổ Check-in</span>
                    <span className="font-bold">
                      {selectedSession.checkin_open_at ? formatVietnamDate(selectedSession.checkin_open_at, "time") : "Bất kỳ"} - {selectedSession.checkin_close_at ? formatVietnamDate(selectedSession.checkin_close_at, "time") : "Hết trận"}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Cửa sổ Check-out</span>
                    <span className="font-bold text-teal-700">
                      {selectedSession.checkout_open_at ? formatVietnamDate(selectedSession.checkout_open_at, "time") : "Bất kỳ"} - {selectedSession.checkout_close_at ? formatVietnamDate(selectedSession.checkout_close_at, "time") : "Đóng sân"}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Hàng chờ Waitlist</span>
                    <span className="font-bold text-purple-600">{waitlist.length} người • Giữ {selectedSession.waitlist_offer_duration_minutes || 10}p</span>
                  </div>
                </div>
              </div>

              {/* DASHBOARD TABS NAVIGATION */}
              <div className="flex border-b border-slate-200 gap-2">
                <button
                  onClick={() => setActiveTab("attendees")}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "attendees"
                      ? "border-primary text-secondary font-black"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <Users className="w-4 h-4" /> Danh sách Tham gia ({attendeesList.length})
                  {pendingLateCancelCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("waitlist")}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "waitlist"
                      ? "border-primary text-secondary font-black"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <Hourglass className="w-4 h-4" /> Hàng chờ Waitlist FIFO ({waitlist.length})
                </button>
                <button
                  onClick={() => setActiveTab("qr")}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "qr"
                      ? "border-primary text-secondary font-black"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <QrCode className="w-4 h-4" /> Mã QR Điểm Danh Sân
                </button>
                <button
                  onClick={() => setActiveTab("audit")}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "audit"
                      ? "border-primary text-secondary font-black"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <FileText className="w-4 h-4" /> Nhật ký Audit Log ({auditLogs.length})
                </button>
              </div>

              {/* TAB CONTENT: ATTENDEES */}
              {activeTab === "attendees" && (
                <div className="space-y-4">
                  {/* Subfilters & Search */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1 text-[11px]">
                      <button
                        onClick={() => setAttendeeFilter("ALL")}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                          attendeeFilter === "ALL" ? "bg-secondary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Tất cả ({attendeesList.length})
                      </button>
                      <button
                        onClick={() => setAttendeeFilter("CHECKED_IN")}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                          attendeeFilter === "CHECKED_IN" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Đã Check-in ({checkedInCount})
                      </button>
                      <button
                        onClick={() => setAttendeeFilter("CHECKED_OUT")}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                          attendeeFilter === "CHECKED_OUT" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Đã Check-out ({checkedOutCount})
                      </button>
                      <button
                        onClick={() => setAttendeeFilter("MISSING_CHECKOUT")}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                          attendeeFilter === "MISSING_CHECKOUT" ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Quên Check-out ({missingCheckoutCount})
                      </button>
                      {pendingLateCancelCount > 0 && (
                        <button
                          onClick={() => setAttendeeFilter("PENDING_LATE_CANCEL")}
                          className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                            attendeeFilter === "PENDING_LATE_CANCEL" ? "bg-amber-500 text-slate-950" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          ⚠️ Chờ duyệt hủy ({pendingLateCancelCount})
                        </button>
                      )}
                      <button
                        onClick={() => setAttendeeFilter("CONFIRMED")}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                          attendeeFilter === "CONFIRMED" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Confirmed ({confirmedCount})
                      </button>
                      <button
                        onClick={() => setAttendeeFilter("RESERVED")}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                          attendeeFilter === "RESERVED" ? "bg-amber-500 text-slate-950" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Reserved ({reservedCount})
                      </button>
                      <button
                        onClick={() => setAttendeeFilter("NO_SHOW")}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                          attendeeFilter === "NO_SHOW" ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        No-show ({noShowCount})
                      </button>
                      <button
                        onClick={() => setAttendeeFilter("CANCELLED")}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                          attendeeFilter === "CANCELLED" ? "bg-slate-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Đã hủy ({cancelledCount})
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm theo tên, SĐT..."
                        value={searchMemberQuery}
                        onChange={(e) => setSearchMemberQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-full sm:w-48 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {isLoadingDashboard ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : filteredAttendees.length === 0 ? (
                    <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                      Không có thành viên nào thỏa mãn điều kiện lọc.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden max-h-[480px] overflow-y-auto">
                      {filteredAttendees.map((a) => {
                        const isApproveLoading = actionLoadingId === `approve-${a.user_id}`;
                        const isRejectLoading = actionLoadingId === `reject-${a.user_id}`;
                        const isRemoveLoading = actionLoadingId === `remove-${a.user_id}`;

                        return (
                          <div 
                            key={a.user_id} 
                            className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                              a.cancellation_request_pending 
                                ? "bg-amber-50/70 border-l-4 border-l-amber-500" 
                                : "bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative">
                                {a.avatar_url ? (
                                  <img src={a.avatar_url} alt={a.full_name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-bold bg-secondary text-white uppercase text-xs">
                                    {(a.full_name || "U").charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-secondary truncate">{a.full_name}</span>
                                  {a.nickname && <span className="text-[10px] text-slate-400 font-medium">({a.nickname})</span>}
                                  {a.is_walk_in && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 font-extrabold uppercase">
                                      Walk-in
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400">
                                  {a.phone_zalo || "Chưa có SĐT"} • {a.badminton_level || "Chưa xếp cấp"}
                                </p>
                              </div>
                            </div>

                            {/* Status & Actions */}
                            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 shrink-0">
                              {/* Status Tag */}
                              {a.status === "CHECKED_OUT" && (
                                <span className="text-[10px] text-teal-700 font-bold bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-teal-500" />
                                  Check-out lúc {formatVietnamDate(a.checked_out_at, "time")} ({a.duration_minutes || 0}p)
                                </span>
                              )}
                              {a.status === "MISSING_CHECKOUT" && (
                                <span className="text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  Quên Check-out (~{a.duration_minutes || 0}p)
                                </span>
                              )}
                              {a.status === "CHECKED_IN" && (
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                                  Check-in lúc {formatVietnamDate(a.checked_in_at, "time")}
                                </span>
                              )}
                              {a.status === "CONFIRMED" && (
                                <span className="text-[10px] text-blue-700 font-bold bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-blue-500" />
                                  Đã chốt slot
                                </span>
                              )}
                              {(a.status === "RESERVED" || a.status === "going") && (
                                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                                  <Hourglass className="w-3 h-3 text-amber-500" />
                                  Đang giữ chỗ
                                </span>
                              )}
                              {a.status === "NO_SHOW" && (
                                <span className="text-[10px] text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                                  Vắng mặt (No-Show)
                                </span>
                              )}
                              {a.status === "CANCELLED" && (
                                <span className="text-[10px] text-slate-500 font-medium bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                                  Đã hủy {a.is_late_cancellation ? "(Hủy muộn)" : ""}
                                </span>
                              )}

                              {/* Pending Late Cancel Actions */}
                              {a.cancellation_request_pending && (
                                <div className="flex items-center gap-1.5 bg-amber-100/70 p-1 rounded-xl border border-amber-300">
                                  <span className="text-[10px] text-amber-900 font-bold px-1.5" title={a.cancellation_request_reason}>
                                    Lý do: &ldquo;{a.cancellation_request_reason}&rdquo;
                                  </span>
                                  <button
                                    onClick={() => handleApproveLateCancel(a.user_id)}
                                    disabled={isApproveLoading}
                                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    {isApproveLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                    Duyệt hủy
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRejectTargetUser(a);
                                      setIsRejectLateCancelModalOpen(true);
                                    }}
                                    disabled={isRejectLoading}
                                    className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <X className="w-3 h-3" /> Từ chối
                                  </button>
                                </div>
                              )}

                              {/* Admin Check-out action for checked-in attendees */}
                              {a.status === "CHECKED_IN" && (
                                <button
                                  onClick={() => {
                                    setCheckoutTargetUser(a);
                                    setAdminCheckoutTime(toVietnamDatetimeInput(new Date()));
                                    setAdminCheckoutReason("Admin check-out tại quầy");
                                    setIsCheckoutModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-[11px] border border-teal-300 transition-all cursor-pointer flex items-center gap-1"
                                  title="Admin check-out rời sân cho thành viên này"
                                >
                                  <LogOut className="w-3 h-3" />
                                  Check-out
                                </button>
                              )}

                              {/* Fast Admin Check-in button if reserved/confirmed */}
                              {a.status !== "CHECKED_IN" && a.status !== "CHECKED_OUT" && a.status !== "MISSING_CHECKOUT" && a.status !== "CANCELLED" && (
                                <button
                                  onClick={async () => {
                                    const token = localStorage.getItem("admin_token");
                                    await fetch(`${API_URL}/api/admin/sessions/${selectedSession.id}/walk-in`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                      body: JSON.stringify({ user_id: a.user_id, reason: "Admin check-in tại quầy" })
                                    });
                                    fetchDashboard(selectedSession.id);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-[11px] border border-slate-200 transition-all cursor-pointer"
                                >
                                  Check-in ngay
                                </button>
                              )}

                              {/* Remove participant button */}
                              {a.status !== "CANCELLED" && (
                                <button
                                  onClick={() => handleManualRemove(a.user_id, a.full_name)}
                                  disabled={isRemoveLoading}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                                  title="Xóa/Hủy khỏi danh sách"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: WAITLIST FIFO */}
              {activeTab === "waitlist" && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100 text-xs text-purple-900 leading-relaxed">
                    ℹ️ <strong>Cơ chế Hàng chờ FIFO:</strong> Khi một thành viên hủy chỗ, hệ thống sẽ tự động gửi thông báo và giữ slot riêng cho người ở vị trí hàng chờ tiếp theo trong vòng <strong>{selectedSession.waitlist_offer_duration_minutes || 10} phút</strong>. Nếu quá thời gian không xác nhận, lượt sẽ tự động chuyển tiếp cho người kế tiếp.
                  </div>

                  {waitlist.length === 0 ? (
                    <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                      Hiện không có ai trong Hàng chờ Waitlist.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                      {waitlist.map((w) => (
                        <div key={w.id} className="p-3.5 flex items-center justify-between gap-3 text-xs bg-white hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-full bg-secondary text-primary font-black flex items-center justify-center text-xs shrink-0">
                              #{w.position}
                            </span>
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                              {w.avatar_url ? (
                                <img src={w.avatar_url} alt={w.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold bg-slate-200 text-slate-600 text-[10px]">
                                  {(w.full_name || "U").charAt(0)}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-secondary">{w.full_name}</p>
                              <p className="text-[10px] text-slate-400">{w.phone_zalo} • Tham gia lúc {formatVietnamDate(w.created_at)}</p>
                            </div>
                          </div>

                          <div>
                            {w.status === "OFFERED" && (
                              <span className="text-[10px] text-amber-900 font-extrabold bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full animate-pulse">
                                Đang giữ chỗ • Hết hạn: {formatVietnamDate(w.offer_expires_at, "time")}
                              </span>
                            )}
                            {w.status === "WAITING" && (
                              <span className="text-[10px] text-purple-700 font-bold bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full">
                                Đang chờ lượt (#{w.position})
                              </span>
                            )}
                            {w.status === "CLAIMED" && (
                              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                                Đã nhận slot
                              </span>
                            )}
                            {w.status === "EXPIRED" && (
                              <span className="text-[10px] text-rose-500 font-medium bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                                Hết hạn nhận
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: QR CODE & PUBLIC DISPLAY */}
              {activeTab === "qr" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* QR 1: CHECK-IN */}
                    <div className="p-5 border border-slate-200 rounded-3xl bg-slate-50 text-center space-y-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <span className="text-xs font-black text-secondary uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          MÃ QR CHECK-IN SÂN ĐẤU
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {selectedSession.checkin_open_at ? formatVietnamDate(selectedSession.checkin_open_at, "time") : "Mở"} - {selectedSession.checkin_close_at ? formatVietnamDate(selectedSession.checkin_close_at, "time") : "Hết trận"}
                        </span>
                      </div>
                      
                      <div className="bg-white p-4 rounded-2xl shadow-inner border border-slate-200 inline-block mx-auto">
                        <QRCodeCanvas
                          id="session-qr-canvas"
                          value={qrCheckinUrl}
                          size={180}
                          level={"H"}
                          includeMargin={true}
                        />
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={() => downloadQRCode("checkin")}
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-secondary text-white hover:bg-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer shadow active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5" /> Tải mã QR Check-in (PNG)
                        </button>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            readOnly
                            value={qrCheckinUrl}
                            className="w-full bg-white p-2 rounded-xl border border-slate-200 font-mono text-[10px] text-slate-600 select-all truncate"
                          />
                          <button
                            onClick={copyQrUrl}
                            className="px-3 py-2 bg-primary text-secondary font-bold text-xs rounded-xl cursor-pointer hover:bg-primary-hover shrink-0 transition-all"
                            title="Sao chép link Check-in"
                          >
                            {copiedUrl ? "Đã chép!" : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* QR 2: CHECK-OUT */}
                    <div className="p-5 border border-teal-200/80 rounded-3xl bg-teal-50/40 text-center space-y-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-teal-100 pb-3">
                        <span className="text-xs font-black text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
                          <LogOut className="w-4 h-4 text-teal-600" />
                          MÃ QR CHECK-OUT (RỜI SÂN)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                          {selectedSession.checkout_open_at ? formatVietnamDate(selectedSession.checkout_open_at, "time") : "Mở"} - {selectedSession.checkout_close_at ? formatVietnamDate(selectedSession.checkout_close_at, "time") : "Đóng sân"}
                        </span>
                      </div>
                      
                      <div className="bg-white p-4 rounded-2xl shadow-inner border border-teal-200 inline-block mx-auto">
                        <QRCodeCanvas
                          id="session-checkout-qr-canvas"
                          value={qrCheckoutUrl}
                          size={180}
                          level={"H"}
                          includeMargin={true}
                        />
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={() => downloadQRCode("checkout")}
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-700 text-white hover:bg-teal-800 text-xs font-bold rounded-xl transition-all cursor-pointer shadow active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5" /> Tải mã QR Check-out (PNG)
                        </button>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            readOnly
                            value={qrCheckoutUrl}
                            className="w-full bg-white p-2 rounded-xl border border-teal-200 font-mono text-[10px] text-slate-600 select-all truncate"
                          />
                          <button
                            onClick={copyQrCheckoutUrl}
                            className="px-3 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl cursor-pointer hover:bg-teal-500 shrink-0 transition-all"
                            title="Sao chép link Check-out"
                          >
                            {copiedCheckoutUrl ? "Đã chép!" : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security & Token details */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <h4 className="font-bold text-secondary">Thông tin bảo mật mã QR & Khung giờ:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 text-[11px]">
                      <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-200">
                        <p className="font-bold text-secondary">Check-in Token:</p>
                        <p>• Mã Secret: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-secondary font-bold font-mono">{qrSecretToken || "Mặc định"}</code></p>
                        <p>• Mã 5 ký tự nhập tay: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-secondary font-bold font-mono">{selectedSession.checkin_code || "Không có"}</code></p>
                      </div>
                      <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-200">
                        <p className="font-bold text-teal-800">Check-out Token:</p>
                        <p>• Mã Secret Check-out: <code className="bg-teal-50 px-1.5 py-0.5 rounded text-teal-800 font-bold font-mono">{qrCheckoutSecretToken || "Mặc định"}</code></p>
                        <p>• Tự động loại khỏi Match Desk ngay khi Check-out thành công.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: AUDIT LOGS */}
              {activeTab === "audit" && (
                <div className="space-y-3">
                  {auditLogs.length === 0 ? (
                    <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                      Chưa có ghi nhận nhật ký thao tác nào cho buổi tập này.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="p-3 bg-white text-xs hover:bg-slate-50 transition-colors flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-secondary text-[11px] px-2 py-0.5 rounded bg-slate-100">
                                {log.action}
                              </span>
                              <span className="text-[11px] text-slate-600">
                                Đối tượng: <strong className="text-secondary">{log.target_user_name || "N/A"}</strong>
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Lý do: &ldquo;{log.reason || "Không có ghi chú"}&rdquo;
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Thực hiện bởi: {log.admin_name || "Hệ thống"} • {log.before_status} ➔ {log.after_status}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {formatVietnamDate(log.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="h-full min-h-[350px] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Users className="w-12 h-12 text-slate-300 mb-3" />
              <h4 className="font-bold text-sm text-secondary mb-1">Chọn một buổi tập ở danh sách bên trái</h4>
              <p className="text-xs max-w-sm leading-relaxed">Xem toàn bộ số liệu Giữ chỗ, Hàng chờ FIFO, Quét mã QR và Duyệt hủy muộn.</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE SESSION MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-secondary mb-4 tracking-tight flex items-center gap-1.5">
              <Calendar className="w-5 h-5 text-primary" /> Thiết lập Buổi tập & Quy tắc Giữ chỗ
            </h3>

            {/* Quick Templates */}
            <div className="space-y-1.5 mb-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mẫu nhanh</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate("dinh_ky")}
                  className={`p-2 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
                    template === "dinh_ky" ? "border-primary bg-primary/10 text-secondary" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Sinh hoạt định kỳ
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate("offline")}
                  className={`p-2 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
                    template === "offline" ? "border-primary bg-primary/10 text-secondary" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Offline toàn CLB
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate("khac")}
                  className={`p-2 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
                    template === "khac" ? "border-primary bg-primary/10 text-secondary" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Tự cấu hình
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Tên buổi tập</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Buổi tập Thứ Bảy - Giao lưu ELO"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs bg-slate-50 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Địa điểm sân đấu</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Sân cầu lông Kỳ Hòa, Quận 10"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs bg-slate-50 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Bắt đầu</label>
                  <input
                    type="datetime-local"
                    required
                    value={sessionStart}
                    onChange={(e) => handleSessionStartChange(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Kết thúc</label>
                  <input
                    type="datetime-local"
                    value={sessionEnd}
                    onChange={(e) => setSessionEnd(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Sức chứa (Slot)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={200}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Giữ slot Waitlist (phút)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={60}
                    value={waitlistDuration}
                    onChange={(e) => setWaitlistDuration(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                  Hạn chót tự hủy giữ chỗ (Deadline)
                </label>
                <input
                  type="datetime-local"
                  value={reservationDeadline}
                  onChange={(e) => setReservationDeadline(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                />
                <span className="text-[10px] text-slate-400 block">Sau hạn này, thành viên không thể tự hủy mà phải gửi yêu cầu hủy muộn.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Mở Check-in QR</label>
                  <input
                    type="datetime-local"
                    value={checkinOpenAt}
                    onChange={(e) => setCheckinOpenAt(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Đóng Check-in QR</label>
                  <input
                    type="datetime-local"
                    value={checkinCloseAt}
                    onChange={(e) => setCheckinCloseAt(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-teal-800 uppercase tracking-wider text-[10px]">Mở Check-out QR</label>
                  <input
                    type="datetime-local"
                    value={checkoutOpenAt}
                    onChange={(e) => setCheckoutOpenAt(e.target.value)}
                    className="w-full p-2 rounded-xl border border-teal-200 text-xs bg-teal-50/50 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-teal-800 uppercase tracking-wider text-[10px]">Đóng Check-out QR</label>
                  <input
                    type="datetime-local"
                    value={checkoutCloseAt}
                    onChange={(e) => setCheckoutCloseAt(e.target.value)}
                    className="w-full p-2 rounded-xl border border-teal-200 text-xs bg-teal-50/50 font-bold"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 text-xs bg-rose-50 text-rose-500 rounded-xl border border-rose-100 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-secondary font-bold text-xs rounded-xl shadow-md cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5 mt-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận Tạo Buổi Tập"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SESSION MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-secondary mb-4 tracking-tight flex items-center gap-1.5">
              <Edit3 className="w-5 h-5 text-primary" /> Chỉnh sửa Thông số Buổi tập
            </h3>

            <form onSubmit={handleUpdateSession} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Tên buổi tập</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Địa điểm sân đấu</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Bắt đầu</label>
                  <input
                    type="datetime-local"
                    required
                    value={sessionStart}
                    onChange={(e) => handleSessionStartChange(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Kết thúc</label>
                  <input
                    type="datetime-local"
                    value={sessionEnd}
                    onChange={(e) => setSessionEnd(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Sức chứa (Slot)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={200}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Giữ slot Waitlist (phút)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={60}
                    value={waitlistDuration}
                    onChange={(e) => setWaitlistDuration(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Hạn chót tự hủy giữ chỗ</label>
                <input
                  type="datetime-local"
                  value={reservationDeadline}
                  onChange={(e) => setReservationDeadline(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Mở Check-in QR</label>
                  <input
                    type="datetime-local"
                    value={checkinOpenAt}
                    onChange={(e) => setCheckinOpenAt(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Đóng Check-in QR</label>
                  <input
                    type="datetime-local"
                    value={checkinCloseAt}
                    onChange={(e) => setCheckinCloseAt(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-teal-800 uppercase tracking-wider text-[10px]">Mở Check-out QR</label>
                  <input
                    type="datetime-local"
                    value={checkoutOpenAt}
                    onChange={(e) => setCheckoutOpenAt(e.target.value)}
                    className="w-full p-2 rounded-xl border border-teal-200 text-xs bg-teal-50/50 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-teal-800 uppercase tracking-wider text-[10px]">Đóng Check-out QR</label>
                  <input
                    type="datetime-local"
                    value={checkoutCloseAt}
                    onChange={(e) => setCheckoutCloseAt(e.target.value)}
                    className="w-full p-2 rounded-xl border border-teal-200 text-xs bg-teal-50/50 font-bold"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 text-xs bg-rose-50 text-rose-500 rounded-xl border border-rose-100 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-secondary hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5 mt-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu Thay Đổi"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* WALK-IN MODAL */}
      {isWalkInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative text-xs">
            <button
              onClick={() => setIsWalkInModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-secondary mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" /> Điểm Danh Khách Walk-in Trực Tiếp
            </h3>
            <p className="text-slate-500 mb-4">Ghi nhận check-in trực tiếp tại sân cho khách vãng lai hoặc thành viên đến sân đột xuất.</p>

            <form onSubmit={handleWalkInCheckIn} className="space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Chọn thành viên</label>
                <select
                  required
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold focus:border-primary"
                >
                  <option value="">-- Chọn thành viên từ danh sách CLB --</option>
                  {allMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.phone_zalo || "Không SĐT"}) {m.nickname ? `• "${m.nickname}"` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Ghi chú / Lý do Walk-in</label>
                <input
                  type="text"
                  value={walkInReason}
                  onChange={(e) => setWalkInReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !selectedMemberId}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận Walk-in Check-in"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL ADD MODAL */}
      {isManualAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative text-xs">
            <button
              onClick={() => setIsManualAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-secondary mb-3 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Thêm Thành Viên Thủ Công
            </h3>

            <form onSubmit={handleManualAdd} className="space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Chọn thành viên</label>
                <select
                  required
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                >
                  <option value="">-- Chọn thành viên từ danh sách CLB --</option>
                  {allMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.phone_zalo || "Không SĐT"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Trạng thái chỉ định</label>
                <select
                  value={manualAddStatus}
                  onChange={(e) => setManualAddStatus(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                >
                  <option value="RESERVED">RESERVED (Giữ chỗ)</option>
                  <option value="CONFIRMED">CONFIRMED (Chốt slot chính thức)</option>
                  <option value="CHECKED_IN">CHECKED_IN (Đã có mặt tại sân)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !selectedMemberId}
                className="w-full py-3 bg-secondary hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Thêm vào Buổi Tập"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REJECT LATE CANCELLATION MODAL */}
      {isRejectLateCancelModalOpen && rejectTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative text-xs">
            <button
              onClick={() => setIsRejectLateCancelModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-rose-600 mb-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Từ Chối Yêu Cầu Hủy Muộn
            </h3>
            <p className="text-slate-500 mb-4">
              Bạn đang từ chối yêu cầu hủy của <strong>{rejectTargetUser.full_name}</strong>. Thành viên vẫn giữ nguyên slot và có thể bị đánh dấu No-Show nếu không đến.
            </p>

            <form onSubmit={handleRejectLateCancel} className="space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Lý do từ chối</label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ví dụ: Lý do không khẩn cấp / Đã quá sát giờ thi đấu..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRejectLateCancelModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={Boolean(actionLoadingId)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                >
                  {actionLoadingId ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Xác nhận Từ Chối"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN CHECK-OUT OVERRIDE MODAL */}
      {isCheckoutModalOpen && checkoutTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative text-xs">
            <button
              onClick={() => {
                setIsCheckoutModalOpen(false);
                setCheckoutTargetUser(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-teal-700 mb-2 flex items-center gap-2">
              <LogOut className="w-5 h-5" /> Ghi Nhận Check-out Rời Sân
            </h3>
            <p className="text-slate-500 mb-4">
              Xác nhận check-out cho <strong>{checkoutTargetUser.full_name}</strong>. Thành viên sẽ được ghi nhận thời lượng tham gia và lập tức bị loại khỏi Match Desk.
            </p>

            <form onSubmit={handleAdminCheckout} className="space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Thời điểm Check-out</label>
                <input
                  type="datetime-local"
                  required
                  value={adminCheckoutTime}
                  onChange={(e) => setAdminCheckoutTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Lý do / Ghi chú</label>
                <input
                  type="text"
                  required
                  value={adminCheckoutReason}
                  onChange={(e) => setAdminCheckoutReason(e.target.value)}
                  placeholder="Ví dụ: Admin check-out tại quầy / Thành viên về sớm..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsCheckoutModalOpen(false);
                    setCheckoutTargetUser(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCheckout}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow"
                >
                  {isSubmittingCheckout ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận Check-out"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
