"use client";

import { useState, useEffect } from "react";
import { 
  Calendar, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, 
  XCircle, RefreshCw, Users, Search, Loader2, X, Check, ArrowRight,
  ExternalLink, Sparkles, Filter, Clock, Trash2, Edit2, UserPlus
} from "lucide-react";
import { API_URL } from "@/app/config";
import SearchableMemberSelect from "@/app/components/admin/SearchableMemberSelect";

interface MonthlySubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  allMembers?: any[];
}

export interface ClubSlotItem {
  id?: string | null;
  code: string;
  weekday: number;
  dayPrefix?: string;
  weekdayToken?: string;
  startTime: string;
  endTime: string;
  startHour?: number;
  endHour?: number;
  label: string;
  shortLabel: string;
  labelShort?: string;
  color: string;
  displayOrder?: number;
  isActive?: boolean;
}

const DEFAULT_CLUB_SLOTS: ClubSlotItem[] = [
  { code: "WED_18_20", weekday: 3, startTime: "18:00", endTime: "20:00", label: "Thứ 4 — 18:00–20:00", shortLabel: "T4 (18-20h)", color: "emerald" },
  { code: "THU_17_19", weekday: 4, startTime: "17:00", endTime: "19:00", label: "Thứ 5 — 17:00–19:00", shortLabel: "T5 Ca 1 (17-19h)", color: "indigo" },
  { code: "THU_18_20", weekday: 4, startTime: "18:00", endTime: "20:00", label: "Thứ 5 — 18:00–20:00", shortLabel: "T5 Ca 2 (18-20h)", color: "blue" },
  { code: "SAT_18_20", weekday: 6, startTime: "18:00", endTime: "20:00", label: "Thứ 7 — 18:00–20:00", shortLabel: "T7 (18-20h)", color: "purple" }
];

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Thứ 2", prefix: "MON", viShort: "T2" },
  { value: 2, label: "Thứ 3", prefix: "TUE", viShort: "T3" },
  { value: 3, label: "Thứ 4", prefix: "WED", viShort: "T4" },
  { value: 4, label: "Thứ 5", prefix: "THU", viShort: "T5" },
  { value: 5, label: "Thứ 6", prefix: "FRI", viShort: "T6" },
  { value: 6, label: "Thứ 7", prefix: "SAT", viShort: "T7" },
  { value: 0, label: "Chủ Nhật", prefix: "SUN", viShort: "CN" }
];

const COLOR_OPTIONS = [
  { value: "emerald", label: "Xanh lá", bg: "bg-emerald-500" },
  { value: "indigo", label: "Tím chàm", bg: "bg-indigo-500" },
  { value: "blue", label: "Xanh dương", bg: "bg-blue-500" },
  { value: "purple", label: "Tím nhạt", bg: "bg-purple-500" },
  { value: "amber", label: "Cam hổ phách", bg: "bg-amber-500" },
  { value: "rose", label: "Đỏ hồng", bg: "bg-rose-500" },
  { value: "teal", label: "Xanh ngọc", bg: "bg-teal-500" },
  { value: "cyan", label: "Xanh lục lam", bg: "bg-cyan-500" }
];

const getSlotBadgeClass = (color: string, isSelected: boolean) => {
  if (!isSelected) {
    return "bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600";
  }
  switch (color) {
    case "indigo": return "bg-indigo-600 text-white border-indigo-600 shadow-xs";
    case "blue": return "bg-blue-600 text-white border-blue-600 shadow-xs";
    case "emerald": return "bg-emerald-600 text-white border-emerald-600 shadow-xs";
    case "purple": return "bg-purple-600 text-white border-purple-600 shadow-xs";
    case "amber": return "bg-amber-600 text-white border-amber-600 shadow-xs";
    case "rose": return "bg-rose-600 text-white border-rose-600 shadow-xs";
    case "teal": return "bg-teal-600 text-white border-teal-600 shadow-xs";
    case "cyan": return "bg-cyan-600 text-white border-cyan-600 shadow-xs";
    default: return "bg-slate-700 text-white border-slate-700 shadow-xs";
  }
};

const getSlotCardClass = (color: string) => {
  switch (color) {
    case "indigo": return "bg-indigo-50/70 border-indigo-200/70 text-indigo-700 font-bold";
    case "blue": return "bg-blue-50/70 border-blue-200/70 text-blue-700 font-bold";
    case "emerald": return "bg-emerald-50/70 border-emerald-200/70 text-emerald-700 font-bold";
    case "purple": return "bg-purple-50/70 border-purple-200/70 text-purple-700 font-bold";
    case "amber": return "bg-amber-50/70 border-amber-200/70 text-amber-700 font-bold";
    case "rose": return "bg-rose-50/70 border-rose-200/70 text-rose-700 font-bold";
    case "teal": return "bg-teal-50/70 border-teal-200/70 text-teal-700 font-bold";
    case "cyan": return "bg-cyan-50/70 border-cyan-200/70 text-cyan-700 font-bold";
    default: return "bg-slate-50 border-slate-200/70 text-slate-700 font-bold";
  }
};

const safeFetchJson = async (res: Response) => {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await res.json();
  }
  const text = await res.text();
  let cleanMsg = text.trim();
  if (cleanMsg.startsWith("<!DOCTYPE") || cleanMsg.startsWith("<html")) {
    cleanMsg = `Máy chủ phản hồi mã lỗi (${res.status}). Vui lòng khởi động lại backend.`;
  }
  throw new Error(cleanMsg || `Lỗi máy chủ (${res.status})`);
};

export default function MonthlySubscriptionModal({
  isOpen,
  onClose,
  onSuccess,
  allMembers
}: MonthlySubscriptionModalProps) {
  // Tab: 'dashboard' | 'import'
  const [activeTab, setActiveTab] = useState<"dashboard" | "import">("dashboard");
  
    // Month selection: YYYY-MM
  const currentMonthStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr());
  
  // Dynamic club slots for selected month
  const [clubSlots, setClubSlots] = useState<ClubSlotItem[]>(DEFAULT_CLUB_SLOTS);
  const [isCustomizedSlots, setIsCustomizedSlots] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Slot Configuration Dialog states
  const [isSlotConfigOpen, setIsSlotConfigOpen] = useState(false);
  const [editingSlotsDraft, setEditingSlotsDraft] = useState<ClubSlotItem[]>([]);
  const [isSavingSlots, setIsSavingSlots] = useState(false);
  const [isResettingSlots, setIsResettingSlots] = useState(false);

  // Form thêm / sửa 1 slot trong dialog
  const [slotFormMode, setSlotFormMode] = useState<"NONE" | "ADD" | "EDIT">("NONE");
  const [slotFormIndex, setSlotFormIndex] = useState<number | null>(null);
  const [slotFormWeekday, setSlotFormWeekday] = useState<number>(3);
  const [slotFormStartTime, setSlotFormStartTime] = useState<string>("18:00");
  const [slotFormEndTime, setSlotFormEndTime] = useState<string>("20:00");
  const [slotFormLabel, setSlotFormLabel] = useState<string>("");
  const [slotFormShortLabel, setSlotFormShortLabel] = useState<string>("");
  const [slotFormColor, setSlotFormColor] = useState<string>("emerald");
  const [slotFormCode, setSlotFormCode] = useState<string>("");
  
  // Danh sách hội viên dùng cho SearchableMemberSelect
  const [membersList, setMembersList] = useState<any[]>(allMembers || []);
  
  // Popup thêm hội viên cố định thủ công
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [manualAddUserId, setManualAddUserId] = useState("");
  const [manualAddMonth, setManualAddMonth] = useState(selectedMonth);
  const [manualAddSlots, setManualAddSlots] = useState<string[]>([]);
  const [manualAddPaymentStatus, setManualAddPaymentStatus] = useState<"PAID" | "PENDING">("PAID");
  const [manualAddNote, setManualAddNote] = useState("");
  const [manualAddSyncSessions, setManualAddSyncSessions] = useState(true);
  const [isSubmittingManualAdd, setIsSubmittingManualAdd] = useState(false);

  // Popup gán lại hội viên cho dòng preview Excel
  const [reassignRowIndex, setReassignRowIndex] = useState<number | null>(null);

  // Đảm bảo membersList luôn được nạp đầy đủ
  useEffect(() => {
    if (allMembers && allMembers.length > 0) {
      setMembersList(allMembers);
    } else if (isOpen) {
      const fetchInternalMembers = async () => {
        try {
          const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
          const res = await fetch(`${API_URL}/api/users/members`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setMembersList(data);
          }
        } catch (e) {
          console.error("Error fetching members:", e);
        }
      };
      fetchInternalMembers();
    }
  }, [isOpen, allMembers]);

  // Cập nhật tháng thêm thủ công khi selectedMonth thay đổi
  useEffect(() => {
    setManualAddMonth(selectedMonth);
  }, [selectedMonth]);
  
  // Dashboard states
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsData, setStatsData] = useState<any>(null);
  const [subscriberSearch, setSubscriberSearch] = useState("");
  const [isSyncingMonth, setIsSyncingMonth] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Reset month modal states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetCleanupAttendances, setResetCleanupAttendances] = useState(true);
  const [isResettingMonth, setIsResettingMonth] = useState(false);

  // Edit single subscription modal states
  const [editingSub, setEditingSub] = useState<any>(null);
  const [editSlots, setEditSlots] = useState<string[]>([]);
  const [editPaymentStatus, setEditPaymentStatus] = useState<string>("PAID");
  const [editNote, setEditNote] = useState<string>("");
  const [editSyncSessions, setEditSyncSessions] = useState<boolean>(true);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [autoSyncSessions, setAutoSyncSessions] = useState(true);
  const [isCommitting, setIsCommitting] = useState(false);
  const [importStatusFilter, setImportStatusFilter] = useState<"ALL" | "VALID" | "WARNING" | "ERROR">("ALL");

    // Fetch club slots configuration for selected month
  const fetchClubSlots = async (month: string) => {
    setIsLoadingSlots(true);
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/subscriptions/slots?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await safeFetchJson(res);
      if (res.ok && data.success && Array.isArray(data.slotsArray) && data.slotsArray.length > 0) {
        setClubSlots(data.slotsArray);
        setIsCustomizedSlots(Boolean(data.isCustomized));
      }
    } catch (err) {
      console.error("Lỗi fetchClubSlots:", err);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Fetch stats and slots when modal opens or month changes
  useEffect(() => {
    if (isOpen) {
      fetchStats(selectedMonth);
      fetchClubSlots(selectedMonth);
    }
  }, [isOpen, selectedMonth]);

  const fetchStats = async (month: string) => {
    setIsLoadingStats(true);
    setSyncMessage(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/subscriptions/stats?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await safeFetchJson(res);
      if (res.ok && data.success) {
        setStatsData(data.stats);
        if (Array.isArray(data.stats?.clubSlotsArray) && data.stats.clubSlotsArray.length > 0) {
          setClubSlots(data.stats.clubSlotsArray);
          setIsCustomizedSlots(Boolean(data.stats.isCustomizedSlots));
        }
      } else {
        console.error("Lỗi lấy stats:", data.error);
      }
    } catch (err) {
      console.error("Lỗi fetchStats:", err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleSyncMonth = async () => {
    if (!confirm(`Bạn có chắc chắn muốn đồng bộ lại danh sách cố định tháng ${selectedMonth} vào tất cả các buổi tập không?\n(Lưu ý: Các buổi thành viên đã báo Hủy sẽ được bảo toàn nguyên trạng).`)) {
      return;
    }

    setIsSyncingMonth(true);
    setSyncMessage(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/subscriptions/sync-month`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ monthYear: selectedMonth })
      });
      const data = await safeFetchJson(res);
      if (res.ok && data.success) {
        setSyncMessage(`✓ Đồng bộ thành công: ${data.syncStats.totalEnrolled} lượt xếp chỗ mới trên ${data.syncStats.totalSessionsProcessed} buổi tập (${data.syncStats.totalProtectedCancellations} lượt hủy được bảo toàn).`);
        fetchStats(selectedMonth);
        if (onSuccess) onSuccess();
      } else {
        alert(data.error || "Lỗi đồng bộ lịch tháng.");
      }
    } catch (err: any) {
      alert("Lỗi kết nối máy chủ: " + err.message);
    } finally {
      setIsSyncingMonth(false);
    }
  };

  // Handlers cho Cấu hình Ca Đánh Tháng
  const handleOpenSlotConfig = () => {
    setEditingSlotsDraft(JSON.parse(JSON.stringify(clubSlots)));
    setSlotFormMode("NONE");
    setSlotFormIndex(null);
    setIsSlotConfigOpen(true);
  };

  const handleStartAddSlot = () => {
    setSlotFormMode("ADD");
    setSlotFormIndex(null);
    setSlotFormWeekday(3);
    setSlotFormStartTime("18:00");
    setSlotFormEndTime("20:00");
    setSlotFormLabel("Thứ 4 — 18:00–20:00");
    setSlotFormShortLabel("T4 (18-20h)");
    setSlotFormColor("emerald");
    setSlotFormCode("WED_18_20");
  };

  const handleStartEditSlot = (index: number) => {
    const s = editingSlotsDraft[index];
    if (!s) return;
    setSlotFormMode("EDIT");
    setSlotFormIndex(index);
    setSlotFormWeekday(s.weekday);
    setSlotFormStartTime(s.startTime || "18:00");
    setSlotFormEndTime(s.endTime || "20:00");
    setSlotFormLabel(s.label);
    setSlotFormShortLabel(s.shortLabel || s.labelShort || "");
    setSlotFormColor(s.color || "purple");
    setSlotFormCode(s.code);
  };

  const handleUpdateSlotFormTimes = (weekday: number, start: string, end: string) => {
    setSlotFormWeekday(weekday);
    setSlotFormStartTime(start);
    setSlotFormEndTime(end);

    const wd = WEEKDAY_OPTIONS.find(w => w.value === weekday) || WEEKDAY_OPTIONS[0];
    const sHour = parseInt(start.split(":")[0], 10) || 18;
    const eHour = parseInt(end.split(":")[0], 10) || 20;

    const suggestedCode = `${wd.prefix}_${sHour}_${eHour}`;
    const suggestedLabel = `${wd.label} — ${start}–${end}`;
    const suggestedShort = `${wd.viShort} (${sHour}-${eHour}h)`;

    setSlotFormCode(suggestedCode);
    setSlotFormLabel(suggestedLabel);
    setSlotFormShortLabel(suggestedShort);
  };

  const handleApplySlotForm = () => {
    if (!slotFormLabel.trim()) {
      alert("Vui lòng nhập tên ca (nhãn hiển thị).");
      return;
    }
    const derivedPrefix = WEEKDAY_OPTIONS.find(w => w.value === slotFormWeekday)?.prefix || "SLOT";
    const sHour = slotFormStartTime.split(":")[0] || "18";
    const eHour = slotFormEndTime.split(":")[0] || "20";
    const cleanCode = (slotFormCode || `${derivedPrefix}_${sHour}_${eHour}`).trim().toUpperCase();

    const duplicateIdx = editingSlotsDraft.findIndex((s, idx) => s.code === cleanCode && idx !== slotFormIndex);
    if (duplicateIdx >= 0) {
      alert(`Mã ca "${cleanCode}" đã tồn tại trong danh sách! Vui lòng chọn giờ hoặc thứ khác.`);
      return;
    }

    const newSlot: ClubSlotItem = {
      code: cleanCode,
      weekday: slotFormWeekday,
      startTime: slotFormStartTime,
      endTime: slotFormEndTime,
      label: slotFormLabel.trim(),
      shortLabel: slotFormShortLabel.trim() || slotFormLabel.trim(),
      color: slotFormColor
    };

    if (slotFormMode === "EDIT" && slotFormIndex !== null) {
      setEditingSlotsDraft(prev => {
        const copy = [...prev];
        copy[slotFormIndex] = newSlot;
        return copy;
      });
    } else {
      setEditingSlotsDraft(prev => [...prev, newSlot]);
    }

    setSlotFormMode("NONE");
    setSlotFormIndex(null);
  };

  const handleDeleteDraftSlot = (index: number) => {
    if (editingSlotsDraft.length <= 1) {
      alert("Phải giữ lại ít nhất 1 ca sinh hoạt trong tháng.");
      return;
    }
    const toDelete = editingSlotsDraft[index];
    if (confirm(`Bạn có chắc muốn xóa ca "${toDelete.label}" (${toDelete.code}) khỏi tháng ${selectedMonth}?`)) {
      setEditingSlotsDraft(prev => prev.filter((_, idx) => idx !== index));
      if (slotFormIndex === index) {
        setSlotFormMode("NONE");
        setSlotFormIndex(null);
      }
    }
  };

  const handleSaveSlotsConfig = async () => {
    if (editingSlotsDraft.length === 0) {
      alert("Cần có ít nhất 1 ca sinh hoạt.");
      return;
    }

    setIsSavingSlots(true);
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/subscriptions/slots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          monthYear: selectedMonth,
          slots: editingSlotsDraft
        })
      });
      const data = await safeFetchJson(res);
      if (res.ok && data.success) {
        alert(`✓ Đã lưu thành công cấu hình ${data.slotsArray.length} ca sinh hoạt cho tháng ${selectedMonth}!`);
        setClubSlots(data.slotsArray);
        setIsCustomizedSlots(true);
        setIsSlotConfigOpen(false);
        fetchStats(selectedMonth);
        if (importFile) {
          handlePreviewFile(importFile, selectedMonth);
        }
      } else {
        alert(data.error || "Lỗi khi lưu cấu hình ca.");
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setIsSavingSlots(false);
    }
  };

  const handleResetSlotsToDefault = async () => {
    if (!confirm(`Bạn có chắc muốn khôi phục ca sinh hoạt của tháng ${selectedMonth} về cấu hình chuẩn ban đầu của CLB (4 ca: T4 18-20h, T5 17-19h, T5 18-20h, T7 18-20h)?`)) {
      return;
    }
    setIsResettingSlots(true);
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/subscriptions/slots/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ monthYear: selectedMonth })
      });
      const data = await safeFetchJson(res);
      if (res.ok && data.success) {
        alert(`✓ Đã khôi phục ca sinh hoạt tháng ${selectedMonth} về chuẩn CLB!`);
        setClubSlots(data.slotsArray);
        setIsCustomizedSlots(false);
        setEditingSlotsDraft(JSON.parse(JSON.stringify(data.slotsArray)));
        setIsSlotConfigOpen(false);
        fetchStats(selectedMonth);
        if (importFile) {
          handlePreviewFile(importFile, selectedMonth);
        }
      } else {
        alert(data.error || "Lỗi khôi phục ca mặc định.");
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsResettingSlots(false);
    }
  };

  // Reset toàn bộ danh sách đăng ký cố định tháng
  const handleResetMonth = async () => {
    setIsResettingMonth(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/subscriptions/reset-month`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          monthYear: selectedMonth,
          cleanupAttendances: resetCleanupAttendances
        })
      });
      const data = await safeFetchJson(res);
      if (res.ok && data.success) {
        alert(`✓ Đã reset thành công danh sách cố định tháng ${selectedMonth}!\nĐã xóa ${data.deletedSubsCount} bản ghi đăng ký${data.deletedAttendancesCount ? ` và dọn dẹp ${data.deletedAttendancesCount} lượt ghi danh cố định` : ""}.`);
        setShowResetConfirm(false);
        fetchStats(selectedMonth);
        if (onSuccess) onSuccess();
      } else {
        alert(data.error || "Lỗi khi reset tháng.");
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsResettingMonth(false);
    }
  };

  // Mở popup sửa ca cho thành viên
  const handleOpenEditModal = (sub: any) => {
    setEditingSub(sub);
    setEditSlots(Array.isArray(sub.registeredSlots) ? [...sub.registeredSlots] : []);
    setEditPaymentStatus(sub.paymentStatus || "PAID");
    setEditNote(sub.note || "");
    setEditSyncSessions(true);
  };

  const handleToggleEditSlot = (slotCode: string) => {
    setEditSlots(prev => 
      prev.includes(slotCode) ? prev.filter(c => c !== slotCode) : [...prev, slotCode]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingSub) return;
    if (editSlots.length === 0) {
      alert("Vui lòng chọn ít nhất 1 ca tập cố định cho thành viên.");
      return;
    }
    setIsSavingEdit(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/subscriptions/${editingSub.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          registeredSlots: editSlots,
          paymentStatus: editPaymentStatus,
          note: editNote,
          syncSessions: editSyncSessions
        })
      });
      const data = await safeFetchJson(res);
      if (res.ok && data.success) {
        alert(`✓ Đã cập nhật thành công ca cố định cho ${editingSub.fullName}!`);
        setEditingSub(null);
        fetchStats(selectedMonth);
        if (onSuccess) onSuccess();
      } else {
        alert(data.error || "Lỗi khi cập nhật ca.");
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteSub = async (sub: any) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa thành viên "${sub.fullName}" khỏi danh sách cố định tháng ${selectedMonth}?\n(Hệ thống sẽ đồng thời hủy các lượt xếp chỗ cố định chưa diễn ra của thành viên này trong tháng).`)) {
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/subscriptions/${sub.id}?cleanupAttendances=true`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await safeFetchJson(res);
      if (res.ok && data.success) {
        alert(`✓ Đã xóa thành viên "${sub.fullName}" khỏi danh sách cố định tháng.`);
        fetchStats(selectedMonth);
        if (onSuccess) onSuccess();
      } else {
        alert(data.error || "Lỗi khi xóa thành viên.");
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleToggleManualAddSlot = (slotCode: string) => {
    setManualAddSlots(prev =>
      prev.includes(slotCode) ? prev.filter(c => c !== slotCode) : [...prev, slotCode]
    );
  };

  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAddUserId) {
      alert("Vui lòng chọn thành viên cần thêm.");
      return;
    }
    if (manualAddSlots.length === 0) {
      alert("Vui lòng chọn ít nhất 1 ca tập cố định cho thành viên.");
      return;
    }

    setIsSubmittingManualAdd(true);
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/subscriptions/manual-add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: manualAddUserId,
          monthYear: manualAddMonth,
          registeredSlots: manualAddSlots,
          paymentStatus: manualAddPaymentStatus,
          note: manualAddNote.trim() || undefined,
          syncSessions: manualAddSyncSessions
        })
      });
      const data = await safeFetchJson(res);
      if (res.ok && data.success) {
        alert(data.message || `✓ Đã thêm thành công thành viên vào danh sách cố định tháng ${manualAddMonth}!`);
        setIsManualAddOpen(false);
        setManualAddUserId("");
        setManualAddSlots([]);
        setManualAddNote("");
        if (manualAddMonth === selectedMonth) {
          fetchStats(selectedMonth);
        } else {
          setSelectedMonth(manualAddMonth);
        }
        if (onSuccess) onSuccess();
      } else {
        alert(data.error || "Lỗi thêm thành viên cố định.");
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsSubmittingManualAdd(false);
    }
  };

  const handleReassignMember = (rowIndex: number, member: any) => {
    if (!previewData || !member) return;
    setPreviewData((prev: any) => {
      const nextRows = prev.rows.map((r: any) => {
        if (r.rowIndex === rowIndex) {
          const nextIssues = (r.issues || []).filter(
            (iss: string) => !iss.includes("Không tìm thấy") && !iss.includes("Chưa khớp SĐT") && !iss.includes("Chưa có nick")
          );
          return {
            ...r,
            matchedUser: {
              id: member.id,
              fullName: member.full_name,
              nickname: member.nickname,
              role: member.role,
              badmintonLevel: member.badminton_level,
              phoneZalo: member.phone_zalo
            },
            status: (Array.isArray(r.registeredSlots) && r.registeredSlots.length > 0) ? "VALID" : "WARNING",
            selectedForImport: true,
            issues: nextIssues
          };
        }
        return r;
      });

      const validCount = nextRows.filter((r: any) => r.status === "VALID" && r.selectedForImport).length;
      const warningCount = nextRows.filter((r: any) => r.status === "WARNING" || (r.status === "VALID" && !r.selectedForImport)).length;
      const errorCount = nextRows.filter((r: any) => r.status === "ERROR").length;

      return {
        ...prev,
        validCount,
        warningCount,
        errorCount,
        rows: nextRows
      };
    });
    setReassignRowIndex(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImportFile(file);
      handlePreviewFile(file, selectedMonth);
    }
  };

  const handlePreviewFile = async (file: File, month: string) => {
    setIsParsing(true);
    setPreviewData(null);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("monthYear", month);

      const res = await fetch(`${API_URL}/api/admin/subscriptions/preview-import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await safeFetchJson(res);
      if (res.ok && data.success) {
        setPreviewData(data.preview);
        if (Array.isArray(data.preview?.clubSlotsArray) && data.preview.clubSlotsArray.length > 0) {
          setClubSlots(data.preview.clubSlotsArray);
          setIsCustomizedSlots(Boolean(data.preview.isCustomizedSlots));
        }
      } else {
        alert(data.error || "Lỗi khi đọc file Excel.");
      }
    } catch (err: any) {
      alert("Lỗi đọc file: " + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  // Toggle chọn hoặc bỏ chọn dòng để import
  const toggleRowSelection = (rowIndex: number) => {
    if (!previewData || !previewData.rows) return;
    setPreviewData((prev: any) => {
      const nextRows = prev.rows.map((r: any) => {
        if (r.rowIndex !== rowIndex) return r;
        return {
          ...r,
          selectedForImport: !r.selectedForImport
        };
      });

      const validCount = nextRows.filter((r: any) => r.status === "VALID" && r.selectedForImport).length;
      const warningCount = nextRows.filter((r: any) => r.status === "WARNING" || (r.status === "VALID" && !r.selectedForImport)).length;
      const errorCount = nextRows.filter((r: any) => r.status === "ERROR").length;

      const slotDist: Record<string, number> = {};
      for (const s of clubSlots) { slotDist[s.code] = 0; }
      for (const r of nextRows) {
        if (r.status !== "ERROR" && r.selectedForImport && Array.isArray(r.registeredSlots)) {
          for (const s of r.registeredSlots) {
            if (slotDist[s] !== undefined) slotDist[s]++;
          }
        }
      }

      return {
        ...prev,
        validCount,
        warningCount,
        errorCount,
        slotDistribution: slotDist,
        rows: nextRows
      };
    });
  };

  // Toggle hoặc chọn slot thủ công cho một dòng preview bất kỳ
  const toggleRowSlot = (rowIndex: number, slotCode: string) => {
    if (!previewData || !previewData.rows) return;

    setPreviewData((prev: any) => {
      const nextRows = prev.rows.map((r: any) => {
        if (r.rowIndex !== rowIndex) return r;

        const currentSlots = Array.isArray(r.registeredSlots) ? [...r.registeredSlots] : [];
        const idx = currentSlots.indexOf(slotCode);
        if (idx >= 0) {
          currentSlots.splice(idx, 1);
        } else {
          currentSlots.push(slotCode);
        }

        const isStillAmbiguous = currentSlots.length === 0;
        const newStatus = r.matchedUser && currentSlots.length > 0 ? "VALID" : (isStillAmbiguous ? "WARNING" : "ERROR");

        return {
          ...r,
          registeredSlots: currentSlots,
          registeredSlotsLabels: currentSlots.map((c: string) => {
            const found = clubSlots.find(s => s.code === c);
            return found ? found.label : c;
          }),
          isAmbiguous: isStillAmbiguous,
          status: newStatus,
          issues: isStillAmbiguous ? ["Vui lòng chọn ít nhất 1 ca"] : []
        };
      });

      const validCount = nextRows.filter((r: any) => r.status === "VALID" && r.selectedForImport).length;
      const warningCount = nextRows.filter((r: any) => r.status === "WARNING" || (r.status === "VALID" && !r.selectedForImport)).length;
      const errorCount = nextRows.filter((r: any) => r.status === "ERROR").length;

      const slotDist: Record<string, number> = {};
      for (const s of clubSlots) { slotDist[s.code] = 0; }
      for (const r of nextRows) {
        if (r.status !== "ERROR" && r.selectedForImport && Array.isArray(r.registeredSlots)) {
          for (const s of r.registeredSlots) {
            if (slotDist[s] !== undefined) slotDist[s]++;
          }
        }
      }

      return {
        ...prev,
        validCount,
        warningCount,
        errorCount,
        slotDistribution: slotDist,
        rows: nextRows
      };
    });
  };

  const handleCommitImport = async () => {
    if (!previewData || !previewData.rows) return;

    // Lọc ra các dòng hợp lệ có user_id, được chọn import và có ít nhất 1 slot
    const validRows = previewData.rows.filter((r: any) => 
      r.matchedUser?.id &&
      r.selectedForImport !== false && (
        (Array.isArray(r.registeredSlots) && r.registeredSlots.length > 0) ||
        (Array.isArray(r.registeredDays) && r.registeredDays.length > 0)
      )
    );

    if (validRows.length === 0) {
      alert("Không có thành viên hợp lệ nào được chọn để lưu.");
      return;
    }

    if (!confirm(`⚠️ XÁC NHẬN NHẬP DANH SÁCH CỐ ĐỊNH:\n\nBạn đang chuẩn bị lưu danh sách cho: THÁNG ${selectedMonth}\nSố lượng thành viên: ${validRows.length} người\n\nLƯU Ý: Nếu đây là file đăng ký của tháng khác (ví dụ Tháng 10), vui lòng HỦY và chọn đúng tháng ở trên trước khi bấm lưu!\n\nBấm OK để tiếp tục lưu vào THÁNG ${selectedMonth}.`)) {
      return;
    }

    setIsCommitting(true);
    try {
      const token = localStorage.getItem("token");
      const subscriptionsPayload = validRows.map((r: any) => ({
        userId: r.matchedUser.id,
        registeredSlots: r.registeredSlots || [],
        registeredDays: r.registeredDays || [],
        paymentStatus: "PAID",
        receiptUrl: r.receiptUrl || null,
        note: r.note || null
      }));

      const res = await fetch(`${API_URL}/api/admin/subscriptions/commit-import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          monthYear: selectedMonth,
          subscriptions: subscriptionsPayload,
          syncSessions: autoSyncSessions
        })
      });

      const data = await safeFetchJson(res);
      if (res.ok && data.success) {
        alert(`✓ Đã lưu thành công ${data.committedCount} thành viên đăng ký cố định!${data.syncStats ? ` Đã xếp ${data.syncStats.totalEnrolled} lượt vào các buổi tập.` : ''}`);
        setActiveTab("dashboard");
        setImportFile(null);
        setPreviewData(null);
        fetchStats(selectedMonth);
        if (onSuccess) onSuccess();
      } else {
        alert(data.error || "Lỗi lưu đăng ký tháng.");
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  if (!isOpen) return null;

  // Lọc subscribers trong tab dashboard
  const subscribersList = statsData?.subscribers || [];
  const filteredSubscribers = subscribersList.filter((s: any) => {
    if (!subscriberSearch.trim()) return true;
    const q = subscriberSearch.toLowerCase();
    return (
      (s.fullName && s.fullName.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q)) ||
      (s.registeredSlots && s.registeredSlots.some((slot: string) => slot.toLowerCase().includes(q))) ||
      (s.registeredSlotsLabels && s.registeredSlotsLabels.some((l: string) => l.toLowerCase().includes(q))) ||
      (s.registeredDaysVi && s.registeredDaysVi.some((d: string) => d.toLowerCase().includes(q)))
    );
  });

  // Lọc rows trong tab preview
  const previewRows = previewData?.rows || [];
  const filteredPreviewRows = previewRows.filter((r: any) => {
    if (importStatusFilter === "ALL") return true;
    return r.status === importStatusFilter;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/20 text-secondary border border-primary/30">
              <Calendar className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h3 className="text-xl font-black text-secondary tracking-tight">Quản lý Đăng ký Cố định Tháng</h3>
              <p className="text-xs text-slate-500">
                {isCustomizedSlots ? "⚡ Đang áp dụng ca sinh hoạt tùy chỉnh tháng này" : "Chuẩn ca sinh hoạt CLB"}: {clubSlots.map(s => s.shortLabel || s.labelShort || s.code).join(" • ")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Nút Cấu hình Ca Đánh Tháng */}
            <button
              type="button"
              onClick={handleOpenSlotConfig}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all cursor-pointer"
              title="Tùy chỉnh thêm, sửa, xóa các ca tập của tháng này"
            >
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Ca đánh tháng</span>
              {isCustomizedSlots ? (
                <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-amber-100 text-amber-800 font-extrabold">Tùy biến</span>
              ) : (
                <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-slate-100 text-slate-600 font-medium">Chuẩn CLB</span>
              )}
            </button>

            {/* Month Picker */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500">Tháng:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-extrabold text-secondary focus:outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-slate-200 bg-white px-6 gap-6 shrink-0">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`py-3.5 text-xs font-extrabold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "border-secondary text-secondary"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <Users className="w-4 h-4" /> Tổng quan & Danh sách ({subscribersList.length})
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`py-3.5 text-xs font-extrabold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "import"
                ? "border-secondary text-secondary"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Smart Import Excel
            {previewData && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-700 font-bold">
                {previewData.validCount}/{previewData.totalRows}
              </span>
            )}
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: DASHBOARD & SUBSCRIBERS ROSTER */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Stat Cards - Chi tiết từng khung giờ */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng thành viên</p>
                  <p className="text-xl font-black text-secondary mt-1">
                    {isLoadingStats ? "..." : subscribersList.length}
                  </p>
                </div>
                {clubSlots.map((slot) => {
                  const cardColor = getSlotCardClass(slot.color);
                  return (
                    <div key={slot.code} className={`p-3.5 rounded-2xl border ${cardColor}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider">{slot.shortLabel || slot.labelShort || slot.label}</p>
                      <p className="text-xl font-black mt-1">
                        {isLoadingStats ? "..." : (statsData?.slotCounts?.[slot.code] || 0)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Action sync alert */}
              {syncMessage && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
                  <span>{syncMessage}</span>
                  <button onClick={() => setSyncMessage(null)} className="text-emerald-500 hover:text-emerald-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm tên, SĐT, khung giờ..."
                    value={subscriberSearch}
                    onChange={(e) => setSubscriberSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setManualAddMonth(selectedMonth);
                      setManualAddUserId("");
                      setManualAddSlots([]);
                      setManualAddNote("");
                      setIsManualAddOpen(true);
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    title="Thêm thành viên đăng ký cố định tháng này thủ công"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> + Thêm Cố Định
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    disabled={isResettingMonth || subscribersList.length === 0}
                    className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Xóa toàn bộ danh sách đăng ký cố định tháng này để nhập lại"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    Reset tháng
                  </button>
                  <button
                    onClick={handleSyncMonth}
                    disabled={isSyncingMonth || subscribersList.length === 0}
                    className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Đồng bộ danh sách cố định vào các buổi tập"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMonth ? "animate-spin" : ""}`} />
                    {isSyncingMonth ? "Đang đồng bộ..." : "Đồng bộ lại lịch tập tháng"}
                  </button>
                  <button
                    onClick={() => setActiveTab("import")}
                    className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl bg-primary text-secondary hover:bg-primary-hover transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> + Nhập file Excel
                  </button>
                </div>
              </div>

              {/* Subscribers Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0 z-10">
                      <tr>
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Thành viên</th>
                        <th className="py-3 px-4">Số điện thoại</th>
                        <th className="py-3 px-4">Khung giờ cố định</th>
                        <th className="py-3 px-4">Thanh toán</th>
                        <th className="py-3 px-4 text-center">Thao tác</th>
                        <th className="py-3 px-4 text-right">Biên lai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {isLoadingStats ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                            Đang tải danh sách đăng ký tháng...
                          </td>
                        </tr>
                      ) : filteredSubscribers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            Chưa có dữ liệu đăng ký cố định nào cho tháng {selectedMonth}.
                          </td>
                        </tr>
                      ) : (
                        filteredSubscribers.map((sub: any, idx: number) => {
                          const slotsLabels = sub.registeredSlotsLabels && sub.registeredSlotsLabels.length > 0
                            ? sub.registeredSlotsLabels
                            : (sub.registeredDaysVi || []);

                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                              <td className="py-3 px-4">
                                <span className="font-bold text-secondary block">{sub.fullName}</span>
                                {sub.note && <span className="text-[10px] text-slate-400 italic line-clamp-1">{sub.note}</span>}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600">{sub.phone || "—"}</td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1">
                                  {sub.registeredSlots && sub.registeredSlots.length > 0 ? (
                                    sub.registeredSlots.map((code: string, i: number) => {
                                      const slot = clubSlots.find(s => s.code === code);
                                      const lbl = slot ? (slot.shortLabel || slot.labelShort || slot.label) : code;
                                      const cardClass = getSlotCardClass(slot?.color || 'amber');
                                      return (
                                        <span key={i} className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${cardClass}`}>
                                          {lbl}
                                        </span>
                                      );
                                    })
                                  ) : (
                                    slotsLabels.map((lbl: string, i: number) => (
                                      <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                                        {lbl}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  {sub.paymentStatus || "PAID"}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(sub)}
                                    className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-primary/20 hover:text-secondary text-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                                    title="Chỉnh sửa ca của thành viên này"
                                  >
                                    <Edit2 className="w-3 h-3" /> Sửa ca
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSub(sub)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                                    title="Xóa thành viên khỏi danh sách cố định"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {sub.receiptUrl ? (
                                  <a
                                    href={sub.receiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-bold"
                                  >
                                    Xem ảnh <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-slate-300 text-[11px]">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SMART IMPORT EXCEL */}
          {activeTab === "import" && (
            <div className="space-y-6">
              {/* Month Selection Notice & Switcher */}
              <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-900">
                      Đang nhập cho: <span className="text-sm font-black text-amber-950 underline">Tháng {selectedMonth}</span>
                    </p>
                    <p className="text-[11px] text-amber-700 font-medium">
                      Hãy đảm bảo chọn đúng tháng bạn muốn nhập danh sách (Tháng 10 hay Tháng 9).
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold text-slate-500">Chọn nhanh:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMonth("2026-09");
                      if (importFile) handlePreviewFile(importFile, "2026-09");
                    }}
                    className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                      selectedMonth === "2026-09"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Tháng 09/2026
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMonth("2026-10");
                      if (importFile) handlePreviewFile(importFile, "2026-10");
                    }}
                    className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                      selectedMonth === "2026-10"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Tháng 10/2026
                  </button>
                </div>
              </div>

              {/* File Upload Box */}
              <div className="p-6 border-2 border-dashed border-slate-300 hover:border-primary rounded-3xl bg-slate-50/50 text-center transition-all">
                <input
                  type="file"
                  id="excelFileInput"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="excelFileInput"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="p-4 rounded-2xl bg-white shadow-sm border border-slate-200 text-emerald-600">
                    {isParsing ? (
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    ) : (
                      <FileSpreadsheet className="w-8 h-8" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-secondary">
                      {importFile ? importFile.name : "Kéo thả hoặc bấm để tải lên file Excel (.xlsx, .csv)"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Hỗ trợ định dạng mới (${clubSlots.map(s => s.code).join(", ")}) và định dạng khảo sát cũ
                    </p>
                  </div>
                </label>
              </div>

              {/* Preview Dashboard & Stats */}
              {previewData && (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-black flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" /> Đối soát dữ liệu tháng {previewData.monthYear}
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Tổng số: <strong className="text-white">{previewData.totalRows}</strong> dòng | Chọn nhập: <strong className="text-emerald-400">{previewData.validCount}</strong> | Cần xem lại: <strong className="text-amber-400">{previewData.warningCount}</strong> | Lỗi: <strong className="text-rose-400">{previewData.errorCount}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoSyncSessions}
                          onChange={(e) => setAutoSyncSessions(e.target.checked)}
                          className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                        Tự động đồng bộ lịch vào các buổi tập
                      </label>

                      <button
                        onClick={handleCommitImport}
                        disabled={isCommitting || previewData.validCount === 0}
                        className="px-5 py-2.5 rounded-xl font-black text-xs bg-primary text-secondary hover:bg-primary-hover transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        {isCommitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Xác nhận Nhập ({previewData.validCount})
                      </button>
                    </div>
                  </div>

                  {/* Banner thông báo trùng form nếu có */}
                  {previewData.duplicateCount > 0 && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-2.5">
                      <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
                      <div className="leading-relaxed">
                        <strong>Tự động gộp ca thông minh:</strong> Phát hiện <strong>{previewData.duplicateCount}</strong> thành viên nộp form nhiều lần (đổi ca / bổ sung ca). Hệ thống đã tự động gộp các ca (ví dụ: giữ Thứ 4 & Thứ 7, cập nhật ca Thứ 5 mới). Bạn có thể bấm chọn/bỏ ca trực tiếp trên từng dòng nếu muốn thay đổi.
                      </div>
                    </div>
                  )}

                  {/* Filter Status Buttons & Slot Breakdown */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => setImportStatusFilter("ALL")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          importStatusFilter === "ALL" ? "bg-white text-secondary shadow-sm" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Tất cả ({previewData.totalRows})
                      </button>
                      <button
                        onClick={() => setImportStatusFilter("VALID")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          importStatusFilter === "VALID" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        🟢 Hợp lệ ({previewData.validCount})
                      </button>
                      <button
                        onClick={() => setImportStatusFilter("WARNING")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          importStatusFilter === "WARNING" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        🟡 Cảnh báo ({previewData.warningCount})
                      </button>
                      <button
                        onClick={() => setImportStatusFilter("ERROR")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          importStatusFilter === "ERROR" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        🔴 Lỗi ({previewData.errorCount})
                      </button>
                    </div>

                    <div className="text-xs text-slate-500 font-medium flex flex-wrap gap-x-2 gap-y-1">
                      <span className="font-bold text-slate-700">Phân bổ slot đã chọn:</span>
                      {clubSlots.map((slot) => (
                        <span key={slot.code}>
                          {slot.shortLabel || slot.labelShort || slot.label} ({previewData.slotDistribution?.[slot.code] || 0})
                        </span>
                      )).reduce((prev, curr, idx) => [prev, <span key={`sep-${idx}`} className="text-slate-300">•</span>, curr] as any)}
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0 z-10">
                          <tr>
                            <th className="py-3 px-3 text-center w-12">Nhập</th>
                            <th className="py-3 px-3">Dòng</th>
                            <th className="py-3 px-3">Họ tên Form</th>
                            <th className="py-3 px-3">Số ĐT</th>
                            <th className="py-3 px-3">Tài khoản đối soát</th>
                            <th className="py-3 px-3">Khung giờ đăng ký (Bấm để chọn/bỏ ca)</th>
                            <th className="py-3 px-3">Trạng thái & Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {filteredPreviewRows.map((r: any) => {
                            const isErr = r.status === "ERROR";
                            const isWarn = r.status === "WARNING";
                            return (
                              <tr 
                                key={r.rowIndex}
                                className={`transition-colors ${
                                  !r.selectedForImport ? "opacity-60 bg-slate-50/50" :
                                  isErr ? "bg-rose-50/40" : isWarn ? "bg-amber-50/30" : "hover:bg-slate-50"
                                }`}
                              >
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={r.selectedForImport !== false}
                                    disabled={isErr}
                                    onChange={() => toggleRowSelection(r.rowIndex)}
                                    className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer disabled:opacity-40"
                                    title={r.selectedForImport !== false ? "Bỏ chọn dòng này" : "Chọn nhập dòng này"}
                                  />
                                </td>
                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">#{r.rowIndex}</td>
                                <td className="py-2.5 px-3 font-bold text-secondary">{r.fullName}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-600">{r.normalizedPhone || r.rawPhone || "—"}</td>
                                <td className="py-2.5 px-3">
                                  {r.matchedUser ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                        <span className="font-bold text-emerald-900">{r.matchedUser.fullName}</span>
                                        {r.matchedUser.nickname && (
                                          <span className="text-[10px] text-slate-500 font-medium">
                                            &bull; &ldquo;{r.matchedUser.nickname}&rdquo;
                                          </span>
                                        )}
                                        {r.matchedUser.badmintonLevel && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                            {r.matchedUser.badmintonLevel}
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setReassignRowIndex(r.rowIndex)}
                                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                        title="Gán lại tài khoản thành viên khác cho dòng này"
                                      >
                                        <Edit2 className="w-2.5 h-2.5" /> Đổi nick
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <span className="text-rose-600 font-bold text-[11px] flex items-center gap-1">
                                        <XCircle className="w-3.5 h-3.5 shrink-0" /> Chưa có nick
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setReassignRowIndex(r.rowIndex)}
                                        className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                                        title="Chọn tài khoản thành viên trong CLB để gán"
                                      >
                                        <UserPlus className="w-2.5 h-2.5" /> Gán nick CLB
                                      </button>
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="space-y-1.5">
                                    <div className="flex flex-wrap gap-1 items-center">
                                      {clubSlots.map((slot) => {
                                        const isSelected = r.registeredSlots?.includes(slot.code);
                                        return (
                                          <button
                                            key={slot.code}
                                            type="button"
                                            onClick={() => toggleRowSlot(r.rowIndex, slot.code)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${getSlotBadgeClass(slot.color, isSelected)}`}
                                            title={`${isSelected ? "Bỏ chọn ca" : "Thêm ca"} ${slot.label}`}
                                          >
                                            {isSelected ? "✓ " : "+ "}{slot.shortLabel || slot.labelShort || slot.code}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {r.isMergedDuplicate && (
                                      <span className="inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                        ⚡ Đã gộp ca từ dòng {r.mergedFromRows?.join(", ")}
                                      </span>
                                    )}
                                    {r.isSuperseded && (
                                      <span className="inline-block text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                        Bản gửi cũ (Đã có bản mới sau)
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  {r.issues && r.issues.length > 0 ? (
                                    <div className="space-y-0.5">
                                      {r.issues.map((iss: string, idx: number) => (
                                        <p 
                                          key={idx}
                                          className={`text-[10px] ${
                                            isErr ? "text-rose-600 font-bold" : "text-amber-700 font-medium"
                                          }`}
                                        >
                                          • {iss}
                                        </p>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Sẵn sàng nhập
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            Hệ thống SmashTeam tự động định danh chính xác theo slot code và bảo toàn lượt hủy.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>

      {/* POPUP MODAL: SỬA CA CỐ ĐỊNH CHO 1 THÀNH VIÊN */}
      {editingSub && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-secondary flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-primary" /> Sửa ca cố định
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Thành viên: <strong className="text-slate-800">{editingSub.fullName}</strong> ({editingSub.phone || "—"})
                </p>
              </div>
              <button 
                onClick={() => setEditingSub(null)} 
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Chọn các khung giờ cố định tham gia ({editSlots.length} ca đã chọn):
                </label>
                <div className="space-y-2">
                  {clubSlots.map((slot) => {
                    const isChecked = editSlots.includes(slot.code);
                    return (
                      <label
                        key={slot.code}
                        className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-bold cursor-pointer transition-all ${
                          isChecked
                            ? "border-primary bg-primary/10 text-secondary shadow-xs"
                            : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleEditSlot(slot.code)}
                            className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          />
                          <span>{slot.label}</span>
                        </div>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {slot.shortLabel || slot.labelShort || slot.code}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái thanh toán</label>
                  <select
                    value={editPaymentStatus}
                    onChange={(e) => setEditPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold"
                  >
                    <option value="PAID">PAID (Đã đóng phí)</option>
                    <option value="PENDING">PENDING (Chờ thu)</option>
                    <option value="EXEMPT">EXEMPT (Miễn phí)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú</label>
                  <input
                    type="text"
                    placeholder="VD: Đổi ca, thêm ca..."
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={editSyncSessions}
                  onChange={(e) => setEditSyncSessions(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                Tự động đồng bộ ngay vào các buổi tập trong tháng
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingSub(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit || editSlots.length === 0}
                className="px-5 py-2 text-xs font-black rounded-xl bg-primary text-secondary hover:bg-primary-hover transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: XÁC NHẬN RESET THÁNG */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Reset danh sách tháng {selectedMonth}?</h3>
                <p className="text-xs text-slate-500 font-medium">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-2xl text-xs text-rose-800 leading-relaxed font-medium">
              Bạn sắp xóa toàn bộ <strong>{subscribersList.length}</strong> thành viên đăng ký cố định của tháng <strong>{selectedMonth}</strong>. Sau khi reset, bạn có thể tải file Excel mới lên để nhập lại hoàn toàn sạch sẽ.
            </div>

            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={resetCleanupAttendances}
                onChange={(e) => setResetCleanupAttendances(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
              />
              Xóa cả các lượt tự động xếp chỗ (CONFIRMED) trong các buổi tập chưa diễn ra
            </label>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleResetMonth}
                disabled={isResettingMonth}
                className="px-5 py-2 text-xs font-black rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isResettingMonth ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Xác nhận Reset tháng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: THÊM THÀNH VIÊN ĐĂNG KÝ CỐ ĐỊNH THỦ CÔNG */}
      {isManualAddOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-secondary flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-600" /> Thêm hội viên cố định tháng
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Đăng ký trực tiếp cho thành viên mà không cần file Excel
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManualAddOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualAddSubmit} className="space-y-4 text-xs">
              {/* Chọn tháng */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Tháng đăng ký
                </label>
                <input
                  type="month"
                  required
                  value={manualAddMonth}
                  onChange={(e) => setManualAddMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Searchable Member Select */}
              <SearchableMemberSelect
                label="Chọn thành viên"
                placeholder="Gõ tên, biệt danh hoặc SĐT..."
                required
                members={membersList}
                selectedMemberId={manualAddUserId}
                onSelectMember={(id) => setManualAddUserId(id)}
                helperText="Tìm nhanh theo tên (có dấu/không dấu), biệt danh hoặc số điện thoại"
              />

              {/* Chọn các khung giờ */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1.5">
                  Chọn các khung giờ cố định ({manualAddSlots.length} ca đã chọn) <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  {clubSlots.map((slot) => {
                    const isChecked = manualAddSlots.includes(slot.code);
                    return (
                      <label
                        key={slot.code}
                        className={`flex items-center justify-between p-2.5 rounded-xl border font-bold cursor-pointer transition-all ${
                          isChecked
                            ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleManualAddSlot(slot.code)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          />
                          <span>{slot.label}</span>
                        </div>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {slot.shortLabel || slot.labelShort || slot.code}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Trạng thái thanh toán & Ghi chú */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Thanh toán
                  </label>
                  <select
                    value={manualAddPaymentStatus}
                    onChange={(e) => setManualAddPaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 focus:bg-white"
                  >
                    <option value="PAID">ĐÃ THANH TOÁN (PAID)</option>
                    <option value="PENDING">CHỜ THANH TOÁN (PENDING)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Ghi chú
                  </label>
                  <input
                    type="text"
                    placeholder="VD: CK Vietcombank..."
                    value={manualAddNote}
                    onChange={(e) => setManualAddNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Đồng bộ lịch tập */}
              <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={manualAddSyncSessions}
                  onChange={(e) => setManualAddSyncSessions(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                Tự động xếp lịch vào các buổi tập trong tháng {manualAddMonth}
              </label>

              {/* Nút hành động */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualAddOpen(false)}
                  className="px-4 py-2 font-bold rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManualAdd || !manualAddUserId || manualAddSlots.length === 0}
                  className="px-5 py-2 font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingManualAdd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Xác nhận Thêm Cố Định
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* POPUP MODAL: CẤU HÌNH CA SINH HOẠT THÁNG */}
      {isSlotConfigOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-black text-secondary flex items-center gap-2">
                    Cấu hình Ca Sinh Hoạt Tháng {selectedMonth}
                    {isCustomizedSlots ? (
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-800 font-extrabold">
                        ⚡ Đã tùy chỉnh
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-600 font-bold">
                        Chuẩn CLB
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Thêm, sửa, xóa các ca tập trong tuần áp dụng riêng cho tháng này trước khi import hoặc thêm hội viên.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSlotConfigOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Alert reminder */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-800">Lưu ý khi đổi khung giờ tháng:</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hệ thống sẽ dùng cấu hình này để phân tích file Excel Google Form, thống kê thành viên, và đồng bộ tự động vào các buổi tập trong tháng {selectedMonth}.
                  </p>
                </div>
              </div>

              {/* Slot Cards List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Danh sách ca tập áp dụng ({editingSlotsDraft.length} ca):
                  </span>
                  {slotFormMode === "NONE" && (
                    <button
                      type="button"
                      onClick={handleStartAddSlot}
                      className="px-3 py-1 text-xs font-bold rounded-xl bg-primary text-secondary hover:bg-primary-hover transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      + Thêm ca mới
                    </button>
                  )}
                </div>

                {editingSlotsDraft.map((slot, idx) => {
                  const cardColor = getSlotCardClass(slot.color);
                  return (
                    <div
                      key={slot.code || idx}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${cardColor}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-xl bg-white/80 shadow-xs flex items-center justify-center font-black text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm">{slot.label}</span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/90 text-slate-700 shadow-2xs font-bold">
                              {slot.code}
                            </span>
                          </div>
                          <p className="text-[11px] opacity-80 mt-0.5">
                            Viết tắt: <strong className="font-semibold">{slot.shortLabel || slot.labelShort}</strong> &bull; {slot.startTime} – {slot.endTime}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEditSlot(idx)}
                          className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-700 shadow-2xs transition-all cursor-pointer"
                          title="Chỉnh sửa ca này"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDraftSlot(idx)}
                          className="p-1.5 rounded-lg bg-white/80 hover:bg-rose-50 text-rose-600 shadow-2xs transition-all cursor-pointer"
                          title="Xóa ca này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Form Thêm/Sửa Ca */}
              {slotFormMode !== "NONE" && (
                <div className="p-4 rounded-2xl border-2 border-primary/40 bg-primary/5 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-secondary flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-primary" />
                      {slotFormMode === "ADD" ? "Thêm ca tập mới cho tháng" : `Chỉnh sửa ca #${(slotFormIndex || 0) + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSlotFormMode("NONE")}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Hủy form
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Thứ trong tuần
                      </label>
                      <select
                        value={slotFormWeekday}
                        onChange={(e) => handleUpdateSlotFormTimes(parseInt(e.target.value, 10), slotFormStartTime, slotFormEndTime)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                      >
                        {WEEKDAY_OPTIONS.map((w) => (
                          <option key={w.value} value={w.value}>{w.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Giờ bắt đầu
                      </label>
                      <input
                        type="time"
                        value={slotFormStartTime}
                        onChange={(e) => handleUpdateSlotFormTimes(slotFormWeekday, e.target.value, slotFormEndTime)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Giờ kết thúc
                      </label>
                      <input
                        type="time"
                        value={slotFormEndTime}
                        onChange={(e) => handleUpdateSlotFormTimes(slotFormWeekday, slotFormStartTime, e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Tên ca đầy đủ (Hiển thị)
                      </label>
                      <input
                        type="text"
                        value={slotFormLabel}
                        onChange={(e) => setSlotFormLabel(e.target.value)}
                        placeholder="VD: Thứ 3 — 18:00–20:00"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Tên viết tắt (Badge / Tab)
                      </label>
                      <input
                        type="text"
                        value={slotFormShortLabel}
                        onChange={(e) => setSlotFormShortLabel(e.target.value)}
                        placeholder="VD: T3 (18-20h)"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Mã hệ thống (Code)
                      </label>
                      <input
                        type="text"
                        value={slotFormCode}
                        onChange={(e) => setSlotFormCode(e.target.value.toUpperCase())}
                        placeholder="VD: TUE_18_20"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Màu đại diện
                      </label>
                      <div className="flex items-center gap-1.5 pt-1">
                        {COLOR_OPTIONS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setSlotFormColor(c.value)}
                            className={`w-5 h-5 rounded-full ${c.bg} transition-all cursor-pointer ${
                              slotFormColor === c.value ? "ring-2 ring-offset-2 ring-slate-800 scale-110" : "opacity-60 hover:opacity-100"
                            }`}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSlotFormMode("NONE")}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/50 rounded-xl transition-all cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleApplySlotForm}
                      className="px-4 py-1.5 text-xs font-extrabold text-white bg-slate-900 hover:bg-black rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {slotFormMode === "ADD" ? "Thêm vào danh sách" : "Cập nhật ca"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 shrink-0">
              <button
                type="button"
                onClick={handleResetSlotsToDefault}
                disabled={isResettingSlots}
                className="px-3.5 py-2 text-xs font-bold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-1.5"
                title="Khôi phục danh sách 4 ca chuẩn mặc định của CLB"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResettingSlots ? "animate-spin" : ""}`} />
                Khôi phục chuẩn CLB
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSlotConfigOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveSlotsConfig}
                  disabled={isSavingSlots || editingSlotsDraft.length === 0}
                  className="px-4 py-2 text-xs font-extrabold rounded-xl bg-primary text-secondary hover:bg-primary-hover transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSavingSlots ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang lưu cấu hình...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Lưu cấu hình ca tháng {selectedMonth}
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* POPUP MODAL: GÁN TÀI KHOẢN CLB CHO DÒNG EXCEL PREVIEW */}
      {reassignRowIndex !== null && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-secondary flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-600" /> Chọn tài khoản hội viên cho Dòng #{reassignRowIndex}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Gán thủ công tài khoản thành viên chính thức cho dòng dữ liệu này
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReassignRowIndex(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <SearchableMemberSelect
                label="Tìm kiếm thành viên"
                placeholder="Gõ tên, biệt danh hoặc SĐT..."
                required
                members={membersList}
                selectedMemberId=""
                onSelectMember={(_, member) => {
                  if (member && reassignRowIndex !== null) {
                    handleReassignMember(reassignRowIndex, member);
                  }
                }}
                helperText="Bấm vào thành viên tương ứng để gán ngay cho dòng này"
              />

              <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassignRowIndex(null)}
                  className="px-4 py-2 font-bold rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
