"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Users, Search, CheckCircle, AlertTriangle, Loader2, X, Check, 
  Sparkles, ShieldAlert, ArrowRight, UserCheck, Clock
} from "lucide-react";
import { API_URL } from "@/app/config";
import { formatVietnamDate } from "@/app/utils/date";

interface BulkAddAttendeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  allMembers: any[];
  currentAttendees?: any[];
  onSuccess: () => void;
}

export default function BulkAddAttendeesModal({
  isOpen,
  onClose,
  session,
  allMembers,
  currentAttendees = [],
  onSuccess
}: BulkAddAttendeesModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"CONFIRMED" | "RESERVED" | "CHECKED_IN">("CONFIRMED");
  const [registrationType, setRegistrationType] = useState<"ADMIN_ADDED" | "CASUAL" | "MONTHLY_FIXED">("ADMIN_ADDED");
  const [reason, setReason] = useState("Admin thêm hàng loạt vào buổi tập");
  const [allowExceedCapacity, setAllowExceedCapacity] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fixedSubscribers, setFixedSubscribers] = useState<any[]>([]);
  const [isLoadingFixed, setIsLoadingFixed] = useState(false);

  // Set các user_id đã có mặt trong session
  const attendeeUserIdsSet = useMemo(() => {
    return new Set(currentAttendees.map((a: any) => a.user_id));
  }, [currentAttendees]);

  // Capacity calculations
  const totalCapacity = session?.capacity || 40;
  const currentOccupied = currentAttendees.filter((a: any) => 
    ['RESERVED', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'MISSING_CHECKOUT', 'going'].includes(a.status)
  ).length;
  const availableSlots = Math.max(0, totalCapacity - currentOccupied);

  // Xác định slot_code chính xác của session
  const sessDate = session ? new Date(session.session_start || session.date_time) : null;
  const sessEnd = session?.session_end 
    ? new Date(session.session_end) 
    : (sessDate ? new Date(sessDate.getTime() + 2 * 3600000) : null);

  const sessionSlotCode = useMemo(() => {
    if (!session || !sessDate) return "";
    if (session.slot_code) return session.slot_code;

    const vnWeekday = sessDate.toLocaleDateString("en-US", { timeZone: "Asia/Ho_Chi_Minh", weekday: "short" }).toUpperCase().slice(0, 3);
    const vnStartHour = parseInt(sessDate.toLocaleTimeString("en-US", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", hour12: false }), 10);
    const vnEndHour = sessEnd ? parseInt(sessEnd.toLocaleTimeString("en-US", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", hour12: false }), 10) : vnStartHour + 2;
    return `${vnWeekday}_${vnStartHour}_${vnEndHour}`;
  }, [session, sessDate, sessEnd]);

  const slotLabelMap: Record<string, string> = {
    WED_18_20: "Thứ 4 — 18:00–20:00",
    THU_17_19: "Thứ 5 — 17:00–19:00",
    THU_18_20: "Thứ 5 — 18:00–20:00",
    SAT_18_20: "Thứ 7 — 18:00–20:00"
  };

  const sessionSlotLabel = session?.slot_label || slotLabelMap[sessionSlotCode] || sessionSlotCode;

  // Khi modal mở, reset form
  useEffect(() => {
    if (isOpen && session) {
      setSelectedUserIds(new Set());
      setAllowExceedCapacity(false);
      setSearchQuery("");
      fetchFixedSubscribersForSession();
    }
  }, [isOpen, session]);

  // Lấy danh sách thành viên cố định của tháng
  const fetchFixedSubscribersForSession = async () => {
    if (!session) return;
    setIsLoadingFixed(true);
    try {
      const sessDate = new Date(session.session_start || session.date_time);
      const y = sessDate.getFullYear();
      const m = String(sessDate.getMonth() + 1).padStart(2, "0");
      const monthYear = `${y}-${m}`;

      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/subscriptions/stats?month=${monthYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success && data.stats) {
        setFixedSubscribers(data.stats.subscribers || []);
      }
    } catch (err) {
      console.error("Lỗi fetchFixedSubscribers:", err);
    } finally {
      setIsLoadingFixed(false);
    }
  };

  if (!isOpen || !session) return null;

  // Lọc danh sách thành viên
  const filteredMembers = allMembers.filter((m: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.full_name && m.full_name.toLowerCase().includes(q)) ||
      (m.phone_zalo && m.phone_zalo.includes(q)) ||
      (m.nickname && m.nickname.toLowerCase().includes(q))
    );
  });

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const next = new Set(selectedUserIds);
    filteredMembers.forEach((m: any) => {
      // Chỉ chọn những người chưa có trong buổi tập
      if (!attendeeUserIdsSet.has(m.id)) {
        next.add(m.id);
      }
    });
    setSelectedUserIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedUserIds(new Set());
  };

  // Chọn nhanh các thành viên cố định khớp ĐÚNG SLOT CODE này (không cross-enroll nhầm ca)
  const handleSelectFixedSubscribers = () => {
    const next = new Set(selectedUserIds);
    let matchedCount = 0;

    const dayOfWeek = sessDate ? sessDate.getDay() : 0;
    const mapDay: Record<number, string> = {
      1: "MONDAY",
      2: "TUESDAY",
      3: "WEDNESDAY",
      4: "THURSDAY",
      5: "FRIDAY",
      6: "SATURDAY",
      0: "SUNDAY"
    };
    const currentWeekdayToken = mapDay[dayOfWeek];

    fixedSubscribers.forEach((sub: any) => {
      const slots = Array.isArray(sub.registeredSlots) && sub.registeredSlots.length > 0
        ? sub.registeredSlots
        : [];
      
      // Match chính xác theo sessionSlotCode (ví dụ THU_17_19)
      const matchesSlot = slots.length > 0
        ? slots.includes(sessionSlotCode)
        : (Array.isArray(sub.registeredDays) && sub.registeredDays.includes(currentWeekdayToken));

      if (matchesSlot && !attendeeUserIdsSet.has(sub.userId)) {
        next.add(sub.userId);
        matchedCount++;
      }
    });

    setSelectedUserIds(next);
    if (matchedCount === 0) {
      alert(`Tất cả thành viên cố định của ca "${sessionSlotLabel}" đã có mặt trong buổi tập!`);
    }
  };

  const selectedCount = selectedUserIds.size;
  const isExceeding = selectedCount > availableSlots;

  const handleSubmit = async () => {
    if (selectedCount === 0) {
      alert("Vui lòng chọn ít nhất 1 thành viên.");
      return;
    }

    if (isExceeding && !allowExceedCapacity) {
      alert(`Số lượng chọn (${selectedCount}) vượt quá chỗ trống (${availableSlots}). Vui lòng tick cho phép vượt sức chứa hoặc giảm bớt số người.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/sessions/${session.id}/bulk-add-attendees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          user_ids: Array.from(selectedUserIds),
          status,
          registration_type: registrationType,
          reason,
          allow_exceed_capacity: allowExceedCapacity
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(`✓ ${data.message}`);
        onSuccess();
        onClose();
      } else {
        alert(data.error || "Lỗi thêm hàng loạt thành viên.");
      }
    } catch (err: any) {
      alert("Lỗi kết nối máy chủ: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-secondary text-primary">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-secondary tracking-tight">Thêm Thành Viên Hàng Loạt</h3>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>Buổi: <strong className="text-secondary">{session.title}</strong></span>
                <span>• Ca: <strong className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold">{sessionSlotLabel}</strong></span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LIVE CAPACITY METER */}
        <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 text-xs font-bold transition-colors ${
          isExceeding 
            ? "bg-rose-50 border-rose-200 text-rose-800" 
            : "bg-emerald-50 border-emerald-200 text-emerald-800"
        }`}>
          <div className="flex items-center gap-2">
            {isExceeding ? <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> : <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
            <span>
              Sức chứa: <strong>{currentOccupied}/{totalCapacity}</strong> đã xếp • Còn trống <strong>{availableSlots}</strong> slot.
            </span>
          </div>
          <div>
            Đã chọn: <strong className="underline text-sm">{selectedCount}</strong> thành viên
            {isExceeding && (
              <span className="text-rose-600 font-extrabold ml-1.5">(Vượt {selectedCount - availableSlots} slot!)</span>
            )}
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* TOOLBAR & PRESETS */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm tên, số điện thoại, biệt danh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleSelectFixedSubscribers}
                  disabled={isLoadingFixed}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title={`Chọn tất cả thành viên đăng ký cố định ca ${sessionSlotLabel} mà chưa có trong buổi`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Chọn cố định ca này ({sessionSlotCode})
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                >
                  Chọn tất cả
                </button>
                {selectedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer"
                  >
                    Bỏ chọn ({selectedCount})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* MEMBER SELECTION LIST */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm max-h-72 overflow-y-auto divide-y divide-slate-100">
            {filteredMembers.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Không tìm thấy thành viên nào phù hợp.
              </div>
            ) : (
              filteredMembers.map((m: any) => {
                const isAlreadyIn = attendeeUserIdsSet.has(m.id);
                const isSelected = selectedUserIds.has(m.id);

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      if (!isAlreadyIn) toggleSelectUser(m.id);
                    }}
                    className={`p-3 flex items-center justify-between text-xs transition-colors ${
                      isAlreadyIn 
                        ? "bg-slate-50/70 text-slate-400 cursor-not-allowed" 
                        : isSelected 
                          ? "bg-amber-50/60 hover:bg-amber-50 cursor-pointer" 
                          : "hover:bg-slate-50 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={isAlreadyIn || isSelected}
                        disabled={isAlreadyIn}
                        onChange={() => {}}
                        className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isAlreadyIn ? "line-through text-slate-400" : "text-secondary"}`}>
                            {m.full_name}
                          </span>
                          {m.nickname && (
                            <span className="text-[10px] text-slate-400">({m.nickname})</span>
                          )}
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 uppercase">
                            {m.role || "MEMBER"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {m.phone_zalo || "Chưa có SĐT"} • Trình độ: {m.badminton_level || "Chưa set"}
                        </p>
                      </div>
                    </div>

                    <div>
                      {isAlreadyIn ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                          Đã trong buổi
                        </span>
                      ) : isSelected ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                          ✓ Đã chọn
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* PARAMETERS CONFIGURATION */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h5 className="text-xs font-black text-secondary uppercase tracking-wider">Cấu hình thêm thành viên</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Trạng thái đặt chỗ:</label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="CONFIRMED">CONFIRMED (Chốt slot tham gia)</option>
                  <option value="RESERVED">RESERVED (Giữ chỗ chờ chốt)</option>
                  <option value="CHECKED_IN">CHECKED_IN (Đã có mặt tại sân)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Loại đăng ký:</label>
                <select
                  value={registrationType}
                  onChange={(e: any) => setRegistrationType(e.target.value)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ADMIN_ADDED">ADMIN_ADDED (Admin thêm trực tiếp)</option>
                  <option value="CASUAL">CASUAL (Khách vãng lai / Đánh bù)</option>
                  <option value="MONTHLY_FIXED">MONTHLY_FIXED (Đăng ký cố định)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-600 block mb-1 text-xs">Lý do / Ghi chú (Ghi vào Audit Log):</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Nhập lý do thêm hàng loạt..."
              />
            </div>

            {/* Over capacity toggle if exceeding */}
            {isExceeding && (
              <div className="p-3 rounded-xl bg-rose-100/70 border border-rose-300 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="overrideCapacityCheck"
                  checked={allowExceedCapacity}
                  onChange={(e) => setAllowExceedCapacity(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="overrideCapacityCheck" className="text-xs font-bold text-rose-900 cursor-pointer">
                  Cho phép vượt quá sức chứa buổi tập ({selectedCount}/{availableSlots} slot) — Admin Override
                </label>
              </div>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-all cursor-pointer"
          >
            Hủy
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedCount === 0 || (isExceeding && !allowExceedCapacity)}
            className="px-6 py-2.5 rounded-xl text-xs font-black bg-primary text-secondary hover:bg-primary-hover transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang thêm...
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" /> Xác nhận Thêm {selectedCount} Thành Viên
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
