"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Trophy, Calendar, MapPin, Clock, Plus, Edit2, Trash2, CheckCircle2, 
  AlertCircle, Loader2, Sparkles, ExternalLink, RefreshCw, Flame, Users, 
  ShieldCheck, Eye, EyeOff, Star, Award, Check, Save, ChevronRight, X
} from "lucide-react";
import { format } from "date-fns";
import { API_URL } from "@/app/config";

export default function AdminEventsPage() {
  const [activeMainTab, setActiveMainTab] = useState<"featured" | "recruitment">("featured");
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // =========================================================================
  // PHÂN HỆ 1: GIẢI ĐẤU & SỰ KIỆN NỔI BẬT (FEATURED TOURNAMENT COUNTDOWN)
  // =========================================================================
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [eventHistoryFilter, setEventHistoryFilter] = useState<"all" | "active" | "history">("all");
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  // Form State cho sự kiện nổi bật đang hiển thị trên trang chủ
  const [featuredForm, setFeaturedForm] = useState({
    id: "",
    title: "Giải Đấu Cầu Lông Mở Rộng SmashTeam Championship 2026",
    subtitle: "Sự kiện quy tụ hơn 50 vợt thủ tranh cúp ELO Vàng, vinh danh tay vợt xuất sắc và phần thưởng tài trợ độc quyền.",
    date: "2026-09-20T08:30",
    location: "Cụm Sân Cầu Lông Lan Anh, 291 CMT8, Q.10, TP.HCM",
    badge: "GIẢI ĐẤU NỔI BẬT",
    actionText: "Đăng ký tham gia ngay",
    actionLink: "/schedule",
    enabled: true,
    max_participants: 50,
    description: "",
    results_summary: ""
  });
  const [isSavingFeatured, setIsSavingFeatured] = useState(false);

  // =========================================================================
  // PHÂN HỆ 2: CHIẾN DỊCH TUYỂN QUÂN & CASTING (RECRUITMENT & CASTING)
  // =========================================================================
  const [campaignsList, setCampaignsList] = useState<any[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<any | null>(null);
  const [campaignSlots, setCampaignSlots] = useState<any[]>([]);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);

  // Form State cho Chiến dịch Đang chạy
  const [campaignForm, setCampaignForm] = useState({
    id: "",
    name: "Chiến Dịch Tuyển Vợt Thủ SmashTeam Mùa Giải 2026",
    badge_text: "Mùa Tuyển Quân 2026",
    start_date: "2026-03-01T00:00",
    end_date: "2026-03-30T23:59",
    location: "Sân Cầu Lông Lan Anh, 291 CMT8, Q.10, TP.HCM",
    target_audience: "Mọi cấp độ tay vợt",
    target_capacity: 60,
    description: "Chào đón mọi cấp độ vợt thủ đam mê cầu lông gia nhập ngôi nhà chung SmashTeam. Tham gia ngay để tỏa sáng, nâng hạng ELO và rèn luyện thể lực hàng tuần!",
    is_active: true
  });

  // Slot Form
  const [slotForm, setSlotForm] = useState({
    casting_time: "2026-03-22T08:30",
    location: "Sân Cầu Lông Lan Anh, Q.10 - Sân số 2",
    max_capacity: 20
  });
  const [isSavingSlot, setIsSavingSlot] = useState(false);

  // =========================================================================
  // DATA FETCHING
  // =========================================================================
  const fetchAllEventsData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch club events (all & history)
      const eventsRes = await fetch(`${API_URL}/api/events`, { headers });
      if (eventsRes.ok) {
        const events = await eventsRes.json();
        setEventsList(events);

        // Tìm event nổi bật
        const featured = events.find((e: any) => e.is_featured) || events[0];
        if (featured) {
          setFeaturedForm({
            id: featured.id,
            title: featured.title,
            subtitle: featured.subtitle || "",
            date: featured.event_date ? featured.event_date.substring(0, 16) : "2026-09-20T08:30",
            location: featured.location || "",
            badge: featured.badge || "GIẢI ĐẤU NỔI BẬT",
            actionText: featured.action_text || "Đăng ký tham gia ngay",
            actionLink: featured.action_link || "/schedule",
            enabled: featured.status !== "cancelled",
            max_participants: featured.max_participants || 50,
            description: featured.description || "",
            results_summary: featured.results_summary || ""
          });
        }
      }

      // 2. Fetch campaigns list & active campaign
      const campRes = await fetch(`${API_URL}/api/campaigns`, { headers });
      if (campRes.ok) {
        const camps = await campRes.json();
        setCampaignsList(camps);

        const activeCamp = camps.find((c: any) => c.is_active) || camps[0];
        if (activeCamp) {
          setActiveCampaign(activeCamp);
          setCampaignForm({
            id: activeCamp.id,
            name: activeCamp.name,
            badge_text: activeCamp.badge_text || "Mùa Tuyển Quân 2026",
            start_date: activeCamp.start_date ? activeCamp.start_date.substring(0, 16) : "2026-03-01T00:00",
            end_date: activeCamp.end_date ? activeCamp.end_date.substring(0, 16) : "2026-03-30T23:59",
            location: activeCamp.location || "Sân Cầu Lông Lan Anh",
            target_audience: activeCamp.target_audience || "Mọi cấp độ tay vợt",
            target_capacity: activeCamp.target_capacity || 60,
            description: activeCamp.description || "",
            is_active: activeCamp.is_active !== false
          });

          // Fetch stats & slots
          fetchCampaignSlots(activeCamp.id, token);
        }
      }
    } catch (err) {
      console.error("Error fetching events data:", err);
      showToast("Lỗi khi tải dữ liệu sự kiện.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCampaignSlots = async (campaignId: string, token?: string | null) => {
    try {
      const authToken = token || localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/campaigns/${campaignId}/stats`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaignSlots(data.slots || []);
        setActiveCampaign((prev: any) => ({ ...prev, total_registered: data.total_registered }));
      }
    } catch (err) {
      console.error("Error fetching slots:", err);
    }
  };

  useEffect(() => {
    fetchAllEventsData();
  }, []);

  // =========================================================================
  // HANDLERS PHÂN HỆ 1: GIẢI ĐẤU
  // =========================================================================
  const handleSaveFeatured = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFeatured(true);
    try {
      const token = localStorage.getItem("admin_token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      };

      if (featuredForm.id) {
        // Cập nhật sự kiện hiện tại
        const res = await fetch(`${API_URL}/api/events/${featuredForm.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            title: featuredForm.title,
            subtitle: featuredForm.subtitle,
            event_date: featuredForm.date,
            location: featuredForm.location,
            badge: featuredForm.badge,
            action_text: featuredForm.actionText,
            action_link: featuredForm.actionLink,
            is_featured: true,
            max_participants: featuredForm.max_participants,
            description: featuredForm.description,
            results_summary: featuredForm.results_summary
          })
        });

        if (!res.ok) throw new Error("Cập nhật thất bại.");
      } else {
        // Tạo mới sự kiện nổi bật
        const res = await fetch(`${API_URL}/api/events`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: featuredForm.title,
            subtitle: featuredForm.subtitle,
            event_date: featuredForm.date,
            location: featuredForm.location,
            badge: featuredForm.badge,
            action_text: featuredForm.actionText,
            action_link: featuredForm.actionLink,
            is_featured: true,
            max_participants: featuredForm.max_participants,
            description: featuredForm.description
          })
        });

        if (!res.ok) throw new Error("Tạo sự kiện thất bại.");
      }

      showToast("Đã lưu sự kiện nổi bật và cập nhật Trang Chủ Real-time!");
      fetchAllEventsData();
    } catch (err: any) {
      showToast(err.message || "Lỗi khi lưu sự kiện.", "error");
    } finally {
      setIsSavingFeatured(false);
    }
  };

  const handleSetFeaturedEvent = async (event: any) => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/events/${event.id}/set-featured`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        showToast(`Đã đưa "${event.title}" lên làm Sự Kiện Nổi Bật trang chủ!`);
        fetchAllEventsData();
      } else {
        showToast("Không thể đặt sự kiện này.", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "error");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa sự kiện/giải đấu này?")) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/events/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Đã xóa sự kiện thành công.");
        fetchAllEventsData();
      }
    } catch {
      showToast("Lỗi khi xóa sự kiện.", "error");
    }
  };

  // Mở modal tạo mới (không gắn với giải nào)
  const openCreateEventModal = () => {
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  // Mở modal chỉnh sửa trực tiếp 1 giải bất kỳ (không cần đặt nổi bật trước)
  const openEditEventModal = (evt: any) => {
    setEditingEvent(evt);
    setIsEventModalOpen(true);
  };

  const closeEventModal = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
  };

  // Submit chung cho modal Tạo mới / Chỉnh sửa giải đấu
  const handleSubmitEventModal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingEvent(true);
    const formData = new FormData(e.currentTarget);
    try {
      const token = localStorage.getItem("admin_token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      };

      if (editingEvent) {
        // Chỉnh sửa trực tiếp, giữ nguyên trạng thái nổi bật/trạng thái trừ khi admin đổi
        const res = await fetch(`${API_URL}/api/events/${editingEvent.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            title: formData.get("title"),
            subtitle: formData.get("subtitle"),
            event_date: formData.get("event_date"),
            location: formData.get("location"),
            badge: formData.get("badge") || "GIẢI ĐẤU NỔI BẬT",
            max_participants: Number(formData.get("max_participants")) || 50,
            is_featured: formData.get("is_featured") === "on",
            status: formData.get("status") || "upcoming"
          })
        });
        if (!res.ok) throw new Error();
        showToast("Đã cập nhật thông tin giải đấu thành công!");
      } else {
        const res = await fetch(`${API_URL}/api/events`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: formData.get("title"),
            subtitle: formData.get("subtitle"),
            event_date: formData.get("event_date"),
            location: formData.get("location"),
            badge: formData.get("badge") || "GIẢI ĐẤU NỔI BẬT",
            max_participants: Number(formData.get("max_participants")) || 50,
            is_featured: formData.get("is_featured") === "on",
            status: "upcoming"
          })
        });
        if (!res.ok) throw new Error();
        showToast("Đã tạo sự kiện giải đấu mới thành công!");
      }

      closeEventModal();
      fetchAllEventsData();
    } catch {
      showToast(editingEvent ? "Không thể lưu thay đổi." : "Không thể tạo sự kiện.", "error");
    } finally {
      setIsSavingEvent(false);
    }
  };

  // =========================================================================
  // HANDLERS PHÂN HỆ 2: TUYỂN QUÂN
  // =========================================================================
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.id) return;
    setIsSavingCampaign(true);

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/campaigns/${campaignForm.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(campaignForm)
      });

      if (res.ok) {
        showToast("Đã cập nhật chiến dịch tuyển quân Real-time!");
        fetchAllEventsData();
      } else {
        showToast("Lỗi khi cập nhật chiến dịch.", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "error");
    } finally {
      setIsSavingCampaign(false);
    }
  };

  const handleToggleCampaignActive = async (id: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/campaigns/${id}/toggle-active`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Đã đổi trạng thái chiến dịch!");
        fetchAllEventsData();
      }
    } catch {
      showToast("Lỗi khi đổi trạng thái.", "error");
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.id) return;
    setIsSavingSlot(true);

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/campaigns/${campaignForm.id}/slots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(slotForm)
      });

      if (res.ok) {
        showToast("Đã thêm ca casting mới thành công!");
        setIsSlotModalOpen(false);
        fetchCampaignSlots(campaignForm.id, token);
      } else {
        showToast("Không thể thêm ca casting.", "error");
      }
    } catch {
      showToast("Lỗi kết nối.", "error");
    } finally {
      setIsSavingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Bạn có chắc muốn xóa ca casting này?")) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/campaigns/slots/${slotId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Đã xóa ca casting!");
        fetchCampaignSlots(campaignForm.id, token);
      } else {
        showToast(data.error || "Không thể xóa ca này.", "error");
      }
    } catch {
      showToast("Lỗi kết nối.", "error");
    }
  };

  // Filter events list
  const filteredEvents = eventsList.filter((e) => {
    if (eventHistoryFilter === "active") return e.status === "upcoming" || e.status === "ongoing";
    if (eventHistoryFilter === "history") return e.status === "completed" || e.status === "cancelled";
    return true;
  });

  return (
    <div className="space-y-6 text-slate-800 pb-12">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold text-white transition-all animate-bounce ${
          toast.type === "success" ? "bg-emerald-600 shadow-emerald-600/30" : "bg-rose-600 shadow-rose-600/30"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-black tracking-wider uppercase text-primary mb-1">
            <Trophy className="w-4 h-4" /> Trung Tâm Quản Lý Sự Kiện CLB
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-secondary tracking-tight">
            Quản Lý Sự Kiện & Giải Đấu Real-Time
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
            Chỉnh sửa thời gian thực bảng đếm ngược giải đấu, chiến dịch tuyển quân và truy cập lịch sử các sự kiện thi đấu.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Xem Trang Chủ
          </a>
          <button
            onClick={openCreateEventModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" /> Thêm Giải Đấu
          </button>
        </div>
      </div>

      {/* TOP TABS: 2 MODULES */}
      <div className="flex bg-slate-200/80 p-1.5 rounded-2xl w-full sm:w-fit gap-1">
        <button
          onClick={() => setActiveMainTab("featured")}
          className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeMainTab === "featured"
              ? "bg-secondary text-white shadow-md font-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Giải Đấu & Sự Kiện Nổi Bật ({eventsList.length})</span>
        </button>
        <button
          onClick={() => setActiveMainTab("recruitment")}
          className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeMainTab === "recruitment"
              ? "bg-secondary text-white shadow-md font-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-4 h-4 text-cyan-400" />
          <span>Chiến Dịch Tuyển Vợt Thủ ({campaignsList.length})</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-xs text-slate-500 font-bold tracking-wider">ĐANG TẢI DỮ LIỆU SỰ KIỆN...</p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* PHÂN HỆ 1: GIẢI ĐẤU & SỰ KIỆN NỔI BẬT                                    */}
          {/* ========================================================================= */}
          {activeMainTab === "featured" && (
            <div className="space-y-8 animate-fade-in">
              
              {/* LIVE PREVIEW & EDIT FORM GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* FORM CHỈNH SỬA REAL-TIME (7 CỘT) */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded bg-amber-100 text-amber-900">
                        Chỉnh sửa Real-Time
                      </span>
                      <h2 className="text-lg font-black text-secondary mt-1.5">
                        Cấu Hình Sự Kiện Nổi Bật Đang Chiếu
                      </h2>
                    </div>
                    <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Đồng bộ Trang Chủ
                    </span>
                  </div>

                  <form onSubmit={handleSaveFeatured} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Tiêu đề giải đấu / sự kiện *
                        </label>
                        <input
                          type="text"
                          required
                          value={featuredForm.title}
                          onChange={(e) => setFeaturedForm({ ...featuredForm, title: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Mô tả phụ đề / Giới thiệu giải
                        </label>
                        <textarea
                          rows={2}
                          value={featuredForm.subtitle}
                          onChange={(e) => setFeaturedForm({ ...featuredForm, subtitle: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs leading-relaxed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-primary" /> Ngày & Giờ Bắt Đầu (Đếm ngược) *
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={featuredForm.date}
                          onChange={(e) => setFeaturedForm({ ...featuredForm, date: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-cyan-600" /> Địa điểm thi đấu *
                        </label>
                        <input
                          type="text"
                          required
                          value={featuredForm.location}
                          onChange={(e) => setFeaturedForm({ ...featuredForm, location: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-amber-500" /> Huy hiệu / Nhãn giải
                        </label>
                        <input
                          type="text"
                          value={featuredForm.badge}
                          onChange={(e) => setFeaturedForm({ ...featuredForm, badge: e.target.value })}
                          placeholder="GIẢI ĐẤU NỔI BẬT"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-purple-600" /> Số VĐV tối đa
                        </label>
                        <input
                          type="number"
                          value={featuredForm.max_participants}
                          onChange={(e) => setFeaturedForm({ ...featuredForm, max_participants: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Chữ trên nút đăng ký
                        </label>
                        <input
                          type="text"
                          value={featuredForm.actionText}
                          onChange={(e) => setFeaturedForm({ ...featuredForm, actionText: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Đường dẫn nút (Link)
                        </label>
                        <input
                          type="text"
                          value={featuredForm.actionLink}
                          onChange={(e) => setFeaturedForm({ ...featuredForm, actionLink: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Tất cả thay đổi sẽ hiển thị ngay trên Trang Chủ khi bấm Lưu.
                      </span>
                      <button
                        type="submit"
                        disabled={isSavingFeatured}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {isSavingFeatured ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{isSavingFeatured ? "Đang lưu..." : "Lưu Thay Đổi Real-time"}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* LIVE PREVIEW THỜI GIAN THỰC (5 CỘT) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-primary" /> Live Preview (Trang Chủ)
                    </span>
                    <span className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded font-bold">
                      Khớp 100% Giao diện
                    </span>
                  </div>

                  {/* Miniature Countdown Card */}
                  <div className="rounded-3xl bg-[#120e26] border border-primary/40 shadow-xl p-5 text-white relative overflow-hidden space-y-4">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-[70px] pointer-events-none" />

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-400/30">
                        {featuredForm.badge || "GIẢI ĐẤU NỔI BẬT"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        SẮP BẮT ĐẦU
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-black leading-snug line-clamp-2">
                        {featuredForm.title || "Tiêu đề giải đấu mẫu"}
                      </h3>
                      <p className="text-slate-300 text-xs mt-1 line-clamp-2 leading-relaxed">
                        {featuredForm.subtitle || "Mô tả sự kiện quy tụ các tay vợt..."}
                      </p>
                    </div>

                    {/* Countdown Mock Boxes */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Thời gian đếm ngược</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        <div className="bg-white/10 p-1.5 rounded-lg text-center">
                          <div className="text-sm font-black text-white">09</div>
                          <div className="text-[8px] text-slate-400 uppercase">Ngày</div>
                        </div>
                        <div className="bg-white/10 p-1.5 rounded-lg text-center">
                          <div className="text-sm font-black text-white">17</div>
                          <div className="text-[8px] text-slate-400 uppercase">Giờ</div>
                        </div>
                        <div className="bg-white/10 p-1.5 rounded-lg text-center">
                          <div className="text-sm font-black text-white">37</div>
                          <div className="text-[8px] text-slate-400 uppercase">Phút</div>
                        </div>
                        <div className="bg-purple-600/30 border border-purple-500/40 p-1.5 rounded-lg text-center">
                          <div className="text-sm font-black text-purple-300">14</div>
                          <div className="text-[8px] text-purple-200 uppercase">Giây</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-semibold text-white">
                          {featuredForm.date ? format(new Date(featuredForm.date), "dd/MM/yyyy HH:mm") : "20/09/2026 08:30"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] truncate">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{featuredForm.location || "Sân Lan Anh, CMT8"}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow cursor-pointer text-center"
                    >
                      {featuredForm.actionText || "Đăng ký tham gia ngay"}
                    </button>
                  </div>
                </div>
              </div>

              {/* LỊCH SỬ CÁC GIẢI ĐẤU & SỰ KIỆN */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-secondary tracking-tight">
                      Lịch Sử Các Giải Đấu & Sự Kiện ({filteredEvents.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Danh sách giải đấu qua các mùa. Bấm nút sao ⭐ để đưa giải đấu lên trang chủ đếm ngược ngay lập tức.
                    </p>
                  </div>

                  <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                    <button
                      onClick={() => setEventHistoryFilter("all")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                        eventHistoryFilter === "all" ? "bg-white text-secondary shadow-xs font-black" : "text-slate-500"
                      }`}
                    >
                      Tất cả
                    </button>
                    <button
                      onClick={() => setEventHistoryFilter("active")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                        eventHistoryFilter === "active" ? "bg-white text-secondary shadow-xs font-black" : "text-slate-500"
                      }`}
                    >
                      Sắp tới
                    </button>
                    <button
                      onClick={() => setEventHistoryFilter("history")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                        eventHistoryFilter === "history" ? "bg-white text-secondary shadow-xs font-black" : "text-slate-500"
                      }`}
                    >
                      Lịch sử đã kết thúc
                    </button>
                  </div>
                </div>

                {filteredEvents.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    Chưa có giải đấu nào trong danh mục này.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className={`p-5 rounded-2xl border transition-all space-y-3 relative ${
                          evt.is_featured
                            ? "bg-purple-50/60 border-primary/50 shadow-md ring-2 ring-primary/20"
                            : "bg-white hover:bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            evt.status === "completed"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {evt.badge || "SỰ KIỆN"}
                          </span>
                          {evt.is_featured && (
                            <span className="text-[10px] bg-primary text-white font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                              <Star className="w-3 h-3 fill-amber-300 text-amber-300" /> Đang Nổi Bật
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-secondary line-clamp-1">{evt.title}</h4>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">{evt.subtitle || evt.description}</p>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600 pt-1">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{format(new Date(evt.event_date), "dd/MM/yyyy HH:mm")}</span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                            <span className="truncate">{evt.location}</span>
                          </div>
                          {evt.results_summary && (
                            <div className="p-2 bg-amber-50/80 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 font-medium mt-2">
                              {evt.results_summary}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 pt-3 gap-2">
                          {!evt.is_featured ? (
                            <button
                              onClick={() => handleSetFeaturedEvent(evt)}
                              className="flex-1 py-1.5 px-3 bg-secondary hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                              title="Chiếu sự kiện này lên bảng đếm ngược Trang Chủ"
                            >
                              <Star className="w-3.5 h-3.5 text-amber-300" /> Đặt Nổi Bật
                            </button>
                          ) : (
                            <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Đang chiếu Trang Chủ
                            </span>
                          )}

                          <button
                            onClick={() => handleDeleteEvent(evt.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa sự kiện"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PHÂN HỆ 2: CHIẾN DỊCH TUYỂN VỢT THỦ & CASTING                              */}
          {/* ========================================================================= */}
          {activeMainTab === "recruitment" && (
            <div className="space-y-8 animate-fade-in">
              
              {/* LIVE PREVIEW & EDIT FORM GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* FORM CHỈNH SỬA CHIẾN DỊCH REAL-TIME (7 CỘT) */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded bg-purple-100 text-purple-900">
                        Chiến Dịch Tuyển Quân
                      </span>
                      <h2 className="text-lg font-black text-secondary mt-1.5">
                        Chỉnh Sửa Chiến Dịch Tuyển Vợt Thủ
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleCampaignActive(campaignForm.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
                          campaignForm.is_active
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-rose-100 text-rose-800 border border-rose-300"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${campaignForm.is_active ? "bg-emerald-500 animate-ping" : "bg-rose-500"}`} />
                        <span>{campaignForm.is_active ? "Đang Mở Đơn" : "Đã Đóng Đơn"}</span>
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleSaveCampaign} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Tên chiến dịch tuyển quân *
                        </label>
                        <input
                          type="text"
                          required
                          value={campaignForm.name}
                          onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Slogan / Lời kêu gọi tham gia
                        </label>
                        <textarea
                          rows={2}
                          value={campaignForm.description}
                          onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs leading-relaxed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-primary" /> Ngày mở nhận đơn *
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={campaignForm.start_date}
                          onChange={(e) => setCampaignForm({ ...campaignForm, start_date: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-primary" /> Ngày đóng nhận đơn *
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={campaignForm.end_date}
                          onChange={(e) => setCampaignForm({ ...campaignForm, end_date: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-cyan-600" /> Địa điểm test kỹ năng
                        </label>
                        <input
                          type="text"
                          value={campaignForm.location}
                          onChange={(e) => setCampaignForm({ ...campaignForm, location: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-amber-500" /> Đối tượng ứng tuyển
                        </label>
                        <input
                          type="text"
                          value={campaignForm.target_audience}
                          onChange={(e) => setCampaignForm({ ...campaignForm, target_audience: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-orange-500" /> Chỉ tiêu tuyển (Chỗ trống)
                        </label>
                        <input
                          type="number"
                          value={campaignForm.target_capacity}
                          onChange={(e) => setCampaignForm({ ...campaignForm, target_capacity: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-purple-600" /> Nhãn mùa giải (Badge)
                        </label>
                        <input
                          type="text"
                          value={campaignForm.badge_text}
                          onChange={(e) => setCampaignForm({ ...campaignForm, badge_text: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Cập nhật tức thì thanh tiến độ và thông tin tuyển quân trên Trang Chủ.
                      </span>
                      <button
                        type="submit"
                        disabled={isSavingCampaign}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {isSavingCampaign ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{isSavingCampaign ? "Đang lưu..." : "Lưu Chiến Dịch"}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* LIVE PREVIEW THẺ TUYỂN QUÂN (5 CỘT) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-primary" /> Live Preview Thẻ Tuyển Quân
                    </span>
                    <span className="text-[10px] text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded font-bold">
                      Trang Chủ
                    </span>
                  </div>

                  {/* Miniature Recruitment Card */}
                  <div className="rounded-3xl bg-[#120e26] border border-primary/40 shadow-xl p-5 text-white relative overflow-hidden space-y-4">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-[70px] pointer-events-none" />

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-400/30">
                        {campaignForm.is_active ? "Đang Mở Nhận Đơn" : "Tạm Đóng Đơn"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white/5 text-purple-300 text-[10px] font-bold">
                        {campaignForm.badge_text || "Mùa Tuyển Quân 2026"}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-black leading-snug line-clamp-2">
                        {campaignForm.name}
                      </h3>
                      <p className="text-slate-300 text-xs mt-1 line-clamp-2 leading-relaxed">
                        {campaignForm.description}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-300 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-400" /> Tiến độ nhận đơn:
                        </span>
                        <span className="font-extrabold text-white">
                          {activeCampaign?.total_registered || 0}/{campaignForm.target_capacity} ({Math.round(((activeCampaign?.total_registered || 0) / (campaignForm.target_capacity || 60)) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary to-cyan-400 h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.round(((activeCampaign?.total_registered || 0) / (campaignForm.target_capacity || 60)) * 100))}%`
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 flex justify-between pt-0.5">
                        <span>Còn lại: <strong className="text-emerald-400">{Math.max(0, (campaignForm.target_capacity || 60) - (activeCampaign?.total_registered || 0))} chỗ trống</strong></span>
                        <span>Ưu tiên nộp sớm</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300">
                      <div className="p-2 rounded-xl bg-white/5 border border-white/5 truncate">
                        <span className="text-slate-400 block font-bold">Địa điểm test</span>
                        <span className="font-bold text-white truncate block">{campaignForm.location}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white/5 border border-white/5 truncate">
                        <span className="text-slate-400 block font-bold">Đối tượng</span>
                        <span className="font-bold text-white truncate block">{campaignForm.target_audience}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* QUẢN LÝ CA CASTING THỬ SÂN (SLOTS) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-secondary tracking-tight">
                      Danh Sách Ca Casting & Thử Sân ({campaignSlots.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Các khung giờ thử kỹ năng để ứng viên lựa chọn khi điền đơn đăng ký tuyển quân.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsSlotModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm Ca Test
                  </button>
                </div>

                {campaignSlots.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Chiến dịch này chưa có ca casting nào. Bấm nút "+ Thêm Ca Test" để tạo khung giờ.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {campaignSlots.map((slot, idx) => (
                      <div
                        key={slot.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-900">
                            Ca #{idx + 1}
                          </span>
                          <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {slot.registered_count || 0}/{slot.max_capacity} Đã Đăng Ký
                          </span>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-secondary">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            <span>{format(new Date(slot.casting_time), "dd/MM/yyyy HH:mm")}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 truncate">
                            <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                            <span className="truncate">{slot.location}</span>
                          </div>
                        </div>

                        <div className="flex justify-end pt-2 border-t border-slate-100">
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Xóa ca
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* LỊCH SỬ CÁC ĐỢT TUYỂN QUÂN CŨ */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-black text-secondary tracking-tight">
                    Lịch Sử Các Đợt Tuyển Quân SmashTeam ({campaignsList.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Lưu trữ tất cả các đợt tuyển quân đã qua của câu lạc bộ theo từng mùa giải.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <tr>
                        <th className="p-3">Tên Chiến Dịch</th>
                        <th className="p-3">Thời Gian</th>
                        <th className="p-3">Hồ Sơ Đã Nhận</th>
                        <th className="p-3">Trạng Thái</th>
                        <th className="p-3 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {campaignsList.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-bold text-secondary">
                            <div>{c.name}</div>
                            <span className="text-[10px] text-slate-400 font-normal">{c.badge_text || "Tuyển quân"}</span>
                          </td>
                          <td className="p-3 font-medium text-slate-600">
                            {format(new Date(c.start_date), "dd/MM/yyyy")} - {format(new Date(c.end_date), "dd/MM/yyyy")}
                          </td>
                          <td className="p-3">
                            <span className="font-extrabold text-primary">{c.total_registered || 0}</span>
                            <span className="text-slate-400"> / {c.target_capacity || 60} hồ sơ</span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                              c.is_active
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}>
                              {c.is_active ? "Đang chạy" : "Lịch sử đã đóng"}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {!c.is_active ? (
                              <button
                                onClick={() => handleToggleCampaignActive(c.id)}
                                className="px-3 py-1 bg-secondary text-white rounded-lg text-[11px] font-bold hover:bg-slate-800 cursor-pointer shadow-xs active:scale-95"
                              >
                                Kích hoạt lại
                              </button>
                            ) : (
                              <span className="text-emerald-600 font-bold text-[11px]">Đang mở</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL THÊM GIẢI ĐẤU MỚI                                                   */}
      {/* ========================================================================= */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-secondary/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-fade-in border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-lg text-secondary">Tạo Giải Đấu / Sự Kiện Mới</h3>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSavingEvent(true);
                const formData = new FormData(e.currentTarget);
                try {
                  const token = localStorage.getItem("admin_token");
                  const res = await fetch(`${API_URL}/api/events`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      title: formData.get("title"),
                      subtitle: formData.get("subtitle"),
                      event_date: formData.get("event_date"),
                      location: formData.get("location"),
                      badge: formData.get("badge") || "GIẢI ĐẤU NỔI BẬT",
                      max_participants: Number(formData.get("max_participants")) || 50,
                      is_featured: formData.get("is_featured") === "on",
                      status: "upcoming"
                    })
                  });

                  if (res.ok) {
                    showToast("Đã tạo sự kiện giải đấu mới thành công!");
                    setIsEventModalOpen(false);
                    fetchAllEventsData();
                  } else {
                    showToast("Không thể tạo sự kiện.", "error");
                  }
                } catch {
                  showToast("Lỗi kết nối.", "error");
                } finally {
                  setIsSavingEvent(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Tên giải đấu *</label>
                <input
                  name="title"
                  required
                  placeholder="VD: Giải Đấu Cầu Lông SmashTeam Championship 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Mô tả / Slogan</label>
                <textarea
                  name="subtitle"
                  rows={2}
                  placeholder="VD: Sự kiện quy tụ hơn 50 vợt thủ tranh cúp ELO Vàng..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Thời gian diễn ra *</label>
                  <input
                    name="event_date"
                    type="datetime-local"
                    required
                    defaultValue="2026-09-20T08:30"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Số VĐV tối đa</label>
                  <input
                    name="max_participants"
                    type="number"
                    defaultValue={50}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Địa điểm thi đấu *</label>
                <input
                  name="location"
                  required
                  placeholder="VD: Sân Cầu Lông Lan Anh, 291 CMT8, Q.10"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  id="is_featured_check"
                  name="is_featured"
                  type="checkbox"
                  defaultChecked={true}
                  className="w-4 h-4 text-primary rounded"
                />
                <label htmlFor="is_featured_check" className="font-bold text-slate-700 cursor-pointer">
                  Đặt làm sự kiện nổi bật trên Trang Chủ (Thay thế sự kiện hiện tại)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 font-bold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingEvent}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow cursor-pointer disabled:opacity-50"
                >
                  {isSavingEvent ? "Đang tạo..." : "Tạo Sự Kiện"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL THÊM CA CASTING MỚI                                                 */}
      {/* ========================================================================= */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 bg-secondary/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 animate-fade-in border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-secondary">Thêm Ca Casting Thử Sân Mới</h3>
              <button onClick={() => setIsSlotModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Thời gian thử sân *</label>
                <input
                  type="datetime-local"
                  required
                  value={slotForm.casting_time}
                  onChange={(e) => setSlotForm({ ...slotForm, casting_time: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Địa điểm cụ thể *</label>
                <input
                  type="text"
                  required
                  value={slotForm.location}
                  onChange={(e) => setSlotForm({ ...slotForm, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Chỉ tiêu số lượng ứng viên tối đa</label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={slotForm.max_capacity}
                  onChange={(e) => setSlotForm({ ...slotForm, max_capacity: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs font-bold"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 text-slate-500 font-bold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingSlot}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow cursor-pointer disabled:opacity-50"
                >
                  {isSavingSlot ? "Đang thêm..." : "Thêm Ca Test"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
