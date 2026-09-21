"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar, Clock, MapPin, Users, Check, X, AlertCircle,
  Loader2, QrCode, ArrowRight, ShieldCheck, Hourglass, CheckCircle2,
  AlertTriangle, Send, LogOut
} from "lucide-react";
import { API_URL } from "@/app/config";
import { formatVietnamDate } from "@/app/utils/date";

interface SessionReservationWidgetProps {
  session: {
    id: string;
    title: string;
    location: string;
    date_time: string;
    session_start?: string;
    session_end?: string;
    capacity?: number;
    reservation_deadline?: string;
    checkin_open_at?: string;
    checkin_close_at?: string;
    checkout_open_at?: string;
    checkout_close_at?: string;
    available_slots?: number;
    active_reservations_count?: number;
    is_full?: boolean;
    // user specific
    user_attendance?: {
      status?: string;
      cancellation_request_pending?: boolean;
      cancellation_request_reason?: string;
      checked_in_at?: string;
      checked_out_at?: string;
      checkout_status?: string;
      duration_minutes?: number;
    } | null;
    user_waitlist?: {
      id?: string;
      position?: number;
      status?: string;
      offer_expires_at?: string;
    } | null;
    // Flat fields from /api/profile/me
    rsvp_status?: string;
    cancellation_request_pending?: boolean;
    cancellation_request_reason?: string;
    checked_in_at?: string;
    checked_out_at?: string;
    checkout_status?: string;
    duration_minutes?: number;
    waitlist_id?: string;
    waitlist_position?: number;
    waitlist_status?: string;
    waitlist_offer_expires_at?: string;
  };
  isLoggedIn: boolean;
  onActionSuccess?: () => void;
  compact?: boolean;
}

export default function SessionReservationWidget({
  session,
  isLoggedIn,
  onActionSuccess,
  compact = false
}: SessionReservationWidgetProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  
  // Late Cancel Modal
  const [isLateCancelModalOpen, setIsLateCancelModalOpen] = useState(false);
  const [lateCancelReason, setLateCancelReason] = useState("");
  const [isSubmittingLateCancel, setIsSubmittingLateCancel] = useState(false);

  // Waitlist offer countdown timer
  const [offerTimeRemaining, setOfferTimeRemaining] = useState<string | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Resolve attendance and waitlist status from props (compatible with both shapes)
  const attStatus = session.user_attendance?.status || session.rsvp_status || null;
  const isLateCancelPending = !!(session.user_attendance?.cancellation_request_pending ?? session.cancellation_request_pending);
  const lateCancelReasonText = session.user_attendance?.cancellation_request_reason || session.cancellation_request_reason || "";
  const checkedInAt = session.user_attendance?.checked_in_at || session.checked_in_at || null;
  const checkedOutAt = session.user_attendance?.checked_out_at || session.checked_out_at || null;
  const checkoutStatus = session.user_attendance?.checkout_status || session.checkout_status || null;
  const durationMinutes = session.user_attendance?.duration_minutes ?? session.duration_minutes ?? null;

  const wlStatus = session.user_waitlist?.status || session.waitlist_status || null;
  const wlPosition = session.user_waitlist?.position ?? session.waitlist_position ?? null;
  const wlOfferExpiresAt = session.user_waitlist?.offer_expires_at || session.waitlist_offer_expires_at || null;

  const capacity = session.capacity || 40;
  const activeCount = session.active_reservations_count ?? 0;
  const availableSlots = typeof session.available_slots === "number" ? session.available_slots : Math.max(0, capacity - activeCount);
  const isSessionFull = session.is_full ?? (availableSlots <= 0);

  // Check deadline
  const now = new Date();
  const deadline = session.reservation_deadline ? new Date(session.reservation_deadline) : null;
  const isDeadlinePassed = deadline ? now > deadline : false;

  // Check checkin window
  const checkinOpen = session.checkin_open_at ? new Date(session.checkin_open_at) : null;
  const checkinClose = session.checkin_close_at ? new Date(session.checkin_close_at) : null;
  const isCheckinOpen = (checkinOpen && checkinClose)
    ? (now >= checkinOpen && now <= checkinClose)
    : true; // Default fallback to open if not configured

  // Timer for OFFERED countdown
  useEffect(() => {
    if (wlStatus !== "OFFERED" || !wlOfferExpiresAt) {
      setOfferTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const exp = new Date(wlOfferExpiresAt).getTime();
      const curr = Date.now();
      const diff = exp - curr;

      if (diff <= 0) {
        setOfferTimeRemaining("Đã hết hạn");
        if (onActionSuccess) onActionSuccess();
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setOfferTimeRemaining(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [wlStatus, wlOfferExpiresAt]);

  // Handler: Reserve
  const handleReserve = async () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setLoadingAction("reserve");
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/sessions/${session.id}/reserve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Đã đăng ký giữ chỗ thành công! Hẹn gặp bạn ở sân.");
        if (onActionSuccess) onActionSuccess();
      } else {
        showToast(data.error || "Không thể giữ chỗ.", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  // Handler: Cancel Reservation
  const handleCancelReservation = async () => {
    if (!confirm("Bạn có chắc chắn muốn hủy giữ chỗ cho buổi tập này không?")) return;
    setLoadingAction("cancel");
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/sessions/${session.id}/reserve/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Đã hủy giữ chỗ thành công. Slot đã được nhường lại cho người khác.");
        if (onActionSuccess) onActionSuccess();
      } else {
        showToast(data.error || "Không thể hủy giữ chỗ.", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  // Handler: Request Late Cancel
  const handleRequestLateCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lateCancelReason.trim()) {
      showToast("Vui lòng nhập lý do hủy muộn.", "error");
      return;
    }
    setIsSubmittingLateCancel(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/sessions/${session.id}/reserve/request-late-cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: lateCancelReason.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Yêu cầu hủy muộn đã được gửi tới Ban Quản trị. Vui lòng chờ xét duyệt.");
        setIsLateCancelModalOpen(false);
        setLateCancelReason("");
        if (onActionSuccess) onActionSuccess();
      } else {
        showToast(data.error || "Không thể gửi yêu cầu hủy muộn.", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setIsSubmittingLateCancel(false);
    }
  };

  // Handler: Join Waitlist
  const handleJoinWaitlist = async () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setLoadingAction("join_waitlist");
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/sessions/${session.id}/waitlist/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Bạn đã vào hàng chờ ở vị trí #${data.position}. Khi có người hủy, hệ thống sẽ báo bạn!`);
        if (onActionSuccess) onActionSuccess();
      } else {
        showToast(data.error || "Không thể tham gia hàng chờ.", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  // Handler: Leave Waitlist
  const handleLeaveWaitlist = async () => {
    if (!confirm("Bạn có chắc muốn rút khỏi danh sách chờ buổi tập này không?")) return;
    setLoadingAction("leave_waitlist");
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/sessions/${session.id}/waitlist/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Bạn đã rời khỏi danh sách chờ.");
        if (onActionSuccess) onActionSuccess();
      } else {
        showToast(data.error || "Lỗi rút khỏi danh sách chờ.", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  // Handler: Claim Waitlist Offer
  const handleClaimOffer = async () => {
    setLoadingAction("claim_offer");
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/sessions/${session.id}/waitlist/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Chúc mừng! Bạn đã nhận slot thành công. Đã được ghi nhận Giữ chỗ!");
        if (onActionSuccess) onActionSuccess();
      } else {
        showToast(data.error || "Không thể nhận slot (có thể đã hết thời gian).", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const isReserved = attStatus === "RESERVED" || attStatus === "CONFIRMED" || attStatus === "going";
  const isCheckedIn = attStatus === "CHECKED_IN";
  const isCheckedOut = attStatus === "CHECKED_OUT";
  const isMissingCheckout = attStatus === "MISSING_CHECKOUT";
  const isWaitlistWaiting = wlStatus === "WAITING";
  const isWaitlistOffered = wlStatus === "OFFERED";

  return (
    <div className={`rounded-2xl border transition-all ${
      isCheckedOut
        ? "bg-teal-950/40 border-teal-500/40 shadow-teal-950/30"
        : isMissingCheckout
        ? "bg-amber-950/30 border-amber-600/40 shadow-amber-950/30"
        : isCheckedIn 
        ? "bg-emerald-950/40 border-emerald-500/40 shadow-emerald-950/30" 
        : isWaitlistOffered
        ? "bg-amber-950/40 border-amber-500/50 shadow-amber-950/30 animate-pulse"
        : isReserved
        ? "bg-purple-950/40 border-primary/40 shadow-primary/20"
        : "bg-slate-900/60 border-slate-800"
    } p-5 text-white relative overflow-hidden shadow-lg`}>

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Capacity / Slots badge */}
        <div className="flex items-center gap-2">
          {availableSlots > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Còn {availableSlots}/{capacity} slot
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Đã đủ {capacity}/{capacity} slot
            </span>
          )}

          {session.reservation_deadline && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3 text-purple-400" />
              Hạn hủy: {formatVietnamDate(session.reservation_deadline, "time")} {formatVietnamDate(session.reservation_deadline, "date")}
            </span>
          )}
        </div>

        {/* User Status Tag */}
        <div>
          {isCheckedOut && (
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-teal-500 text-slate-950 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã Check-out (Hoàn thành)
            </span>
          )}
          {isMissingCheckout && (
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/30 text-amber-300 border border-amber-400/50 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Quên Check-out
            </span>
          )}
          {isCheckedIn && (
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-slate-950 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã Check-in tại sân
            </span>
          )}
          {attStatus === "CONFIRMED" && !isCheckedIn && !isCheckedOut && !isMissingCheckout && (
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/30 text-blue-300 border border-blue-400/40 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Đã Chốt Slot (CONFIRMED)
            </span>
          )}
          {(attStatus === "RESERVED" || attStatus === "going") && !isCheckedIn && !isCheckedOut && !isMissingCheckout && (
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-primary/30 text-primary-hover border border-primary/40 flex items-center gap-1">
              <Hourglass className="w-3.5 h-3.5" /> Đã Giữ Chỗ (RESERVED)
            </span>
          )}
          {isWaitlistWaiting && (
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
              <Hourglass className="w-3.5 h-3.5" /> Hàng chờ #{wlPosition ?? "..."}
            </span>
          )}
          {isWaitlistOffered && (
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500 text-slate-950 flex items-center gap-1">
              ⚡ ĐƯỢC CẤP SLOT ({offerTimeRemaining})
            </span>
          )}
        </div>
      </div>

      {/* Late Cancellation Pending Warning */}
      {isLateCancelPending && (
        <div className="mb-4 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-300">Đang chờ Ban Quản trị duyệt Yêu cầu Hủy muộn</p>
            <p className="text-[11px] text-amber-200/80 mt-0.5">Lý do: &ldquo;{lateCancelReasonText}&rdquo;</p>
          </div>
        </div>
      )}

      {/* WAITLIST OFFERED SPECIAL BANNER */}
      {isWaitlistOffered && (
        <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-amber-900/60 to-yellow-900/40 border border-amber-400 text-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎉</span>
              <div>
                <p className="font-black text-sm text-amber-300">ĐÃ CÓ SLOT TRỐNG CHO BẠN!</p>
                <p className="text-xs text-slate-300">Vui lòng xác nhận nhận slot trước khi bộ đếm kết thúc:</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-mono font-black text-amber-400 tabular-nums">
                {offerTimeRemaining || "00:00"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleClaimOffer}
              disabled={loadingAction === "claim_offer"}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loadingAction === "claim_offer" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" /> Xác nhận nhận chỗ ngay
                </>
              )}
            </button>
            <button
              onClick={handleLeaveWaitlist}
              disabled={loadingAction === "leave_waitlist"}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Nhường slot
            </button>
          </div>
        </div>
      )}

      {/* WAITLIST WAITING BANNER */}
      {isWaitlistWaiting && (
        <div className="mb-4 p-3.5 rounded-xl bg-purple-950/50 border border-purple-800/60 text-xs text-purple-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Hourglass className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Bạn đang ở vị trí #{wlPosition} trong Danh sách chờ FIFO.</p>
              <p className="text-[11px] text-purple-300/80">Hệ thống sẽ giữ slot riêng cho bạn khi có thành viên khác hủy chỗ.</p>
            </div>
          </div>
          <button
            onClick={handleLeaveWaitlist}
            disabled={loadingAction === "leave_waitlist"}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 transition-all cursor-pointer"
          >
            Rút khỏi chờ
          </button>
        </div>
      )}

      {/* ACTION BUTTONS ROW */}
      <div className="flex flex-wrap items-center gap-2.5">
        {!isLoggedIn ? (
          <Link href={`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`} className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-xs bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/30 transition-all cursor-pointer flex items-center justify-center gap-2">
              Đăng nhập để Giữ chỗ
            </button>
          </Link>
        ) : isCheckedIn ? (
          <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              Check-in lúc {checkedInAt ? formatVietnamDate(checkedInAt, "time") : "hôm nay"}. Sẵn sàng ra sân ghép trận!
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Link href={`/check-in?session_id=${session.id}&mode=checkout`}>
                <button className="px-3.5 py-1.5 rounded-lg bg-emerald-400 text-slate-950 text-xs font-black hover:bg-emerald-300 transition-all flex items-center gap-1.5 cursor-pointer shadow">
                  <LogOut className="w-3.5 h-3.5" />
                  Quét QR Check-out
                </button>
              </Link>
              <Link href="/admin/matches">
                <button className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all">
                  Xem Bàn Đấu
                </button>
              </Link>
            </div>
          </div>
        ) : isCheckedOut ? (
          <div className="w-full p-4 rounded-xl bg-teal-950/60 border border-teal-500/30 text-teal-200 text-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
              <div>
                <p className="font-bold text-white text-sm">Buổi tập hoàn thành (Đã Check-out)</p>
                <p className="text-[11px] text-teal-300/80 mt-0.5">
                  {checkedInAt ? `Vào: ${formatVietnamDate(checkedInAt, "time")}` : ""} 
                  {checkedOutAt ? ` • Ra: ${formatVietnamDate(checkedOutAt, "time")}` : ""} 
                  {typeof durationMinutes === "number" && durationMinutes > 0 ? ` • Thời lượng: ${durationMinutes} phút` : ""}
                </p>
              </div>
            </div>
            <Link href="/profile">
              <button className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow">
                Xem Lịch Sử
              </button>
            </Link>
          </div>
        ) : isMissingCheckout ? (
          <div className="w-full p-4 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-amber-300 text-sm">Đã kết thúc buổi tập (Quên Check-out)</p>
                <p className="text-[11px] text-amber-200/80 mt-0.5">
                  Hệ thống tự động ghi nhận hoàn thành buổi tập{typeof durationMinutes === "number" && durationMinutes > 0 ? ` (~${durationMinutes} phút)` : ""}.
                </p>
              </div>
            </div>
            <Link href="/profile">
              <button className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all cursor-pointer shadow">
                Xem Lịch Sử
              </button>
            </Link>
          </div>
        ) : isReserved ? (
          <>
            {/* Self-cancel button if BEFORE deadline */}
            {!isDeadlinePassed && !isLateCancelPending && (
              <button
                onClick={handleCancelReservation}
                disabled={loadingAction === "cancel"}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-700 text-slate-300 border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                {loadingAction === "cancel" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                Hủy giữ chỗ
              </button>
            )}

            {/* Late cancellation request button if AFTER deadline */}
            {isDeadlinePassed && !isLateCancelPending && (
              <button
                onClick={() => setIsLateCancelModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-600/50 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Yêu cầu Hủy muộn (Cần duyệt)
              </button>
            )}

            {/* QR Check-in Button */}
            <Link href={`/check-in?session_id=${session.id}`} className="flex-1 sm:flex-none">
              <button className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-black bg-white hover:bg-slate-100 text-slate-900 flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer">
                <QrCode className="w-4 h-4 text-primary" />
                Mở QR Quét Điểm Danh Sân
              </button>
            </Link>
          </>
        ) : !isWaitlistWaiting && !isWaitlistOffered ? (
          <>
            {/* If slots available -> Reserve Button */}
            {availableSlots > 0 ? (
              <button
                onClick={handleReserve}
                disabled={loadingAction === "reserve"}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-primary to-fuchsia-600 hover:from-primary-hover hover:to-fuchsia-500 text-white shadow-lg shadow-primary/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                {loadingAction === "reserve" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Calendar className="w-4 h-4" /> Giữ chỗ ngay ({availableSlots} slot)
                  </>
                )}
              </button>
            ) : (
              /* If session full -> Join Waitlist Button */
              <button
                onClick={handleJoinWaitlist}
                disabled={loadingAction === "join_waitlist"}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                {loadingAction === "join_waitlist" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Hourglass className="w-4 h-4" /> Tham gia Hàng chờ Waitlist
                  </>
                )}
              </button>
            )}
          </>
        ) : null}
      </div>

      {/* Feedback Toast */}
      {toastMessage && (
        <div className={`mt-3 p-2.5 rounded-xl text-xs font-medium border flex items-center gap-2 animate-fade-in ${
          toastMessage.type === "error"
            ? "bg-rose-950/80 border-rose-600 text-rose-200"
            : toastMessage.type === "info"
            ? "bg-blue-950/80 border-blue-600 text-blue-200"
            : "bg-emerald-950/80 border-emerald-600 text-emerald-200"
        }`}>
          {toastMessage.type === "error" ? <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" /> : <Check className="w-4 h-4 shrink-0 text-emerald-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* LATE CANCELLATION REQUEST MODAL */}
      {isLateCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl relative text-white">
            <button
              onClick={() => setIsLateCancelModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Gửi Yêu Cầu Hủy Muộn</h3>
                <p className="text-xs text-slate-400">Buổi tập đã qua hạn chót tự hủy</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              ⚠️ Vì bạn hủy sau hạn chót ({session.reservation_deadline ? formatVietnamDate(session.reservation_deadline) : "hạn quy định"}), slot của bạn sẽ chỉ được nhượng lại sau khi Ban Quản trị phê duyệt lý do chính đáng.
            </p>

            <form onSubmit={handleRequestLateCancel} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Lý do xin hủy muộn</label>
                <textarea
                  required
                  rows={3}
                  value={lateCancelReason}
                  onChange={(e) => setLateCancelReason(e.target.value)}
                  placeholder="Ví dụ: Bị ốm đột xuất, công việc khẩn cấp tại công ty..."
                  className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800/90 text-sm text-white focus:outline-none focus:border-amber-400 font-medium placeholder:text-slate-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLateCancelModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLateCancel}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {isSubmittingLateCancel ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Gửi yêu cầu
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
