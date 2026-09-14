"use client";

import React, { useState, useMemo } from "react";
import { 
  Calendar, MapPin, ExternalLink, Plus, Edit2, Trash2, 
  Search, Filter, Check, Eye, QrCode, Archive, Sparkles, X, 
  Clock, Users, DollarSign, Image as ImageIcon, Save
} from "lucide-react";
import QRScannerModal from "@/app/components/QRScannerModal";

export interface ClubEventItem {
  id: string | number;
  title: string;
  category: "tournament" | "regular_practice" | "friendly";
  banner_url?: string;
  start_time: string;
  end_time?: string;
  venue_name: string;
  venue_address: string;
  google_maps_url?: string;
  max_slots: number;
  registered_count: number;
  format_notes?: string;
  entry_fee?: number;
  is_featured: boolean; // Hiện trên trang chủ
  status: "active" | "archived";
}

export default function AdminEventTable() {
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // State danh sách sự kiện
  const [events, setEvents] = useState<ClubEventItem[]>([
    {
      id: "EVT-01",
      title: "Giải Đấu SmashTeam Mở Rộng - Mùa Xuân 2026",
      category: "tournament",
      banner_url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80",
      start_time: "2026-03-22T08:00",
      end_time: "2026-03-22T17:30",
      venue_name: "Sân Cầu Lông Lan Anh",
      venue_address: "291 Cách Mạng Tháng 8, P.12, Quận 10, TP.HCM",
      google_maps_url: "https://maps.app.goo.gl/LanAnhBadminton",
      max_slots: 32,
      registered_count: 26,
      format_notes: "Vòng bảng vòng tròn 3 set 21 điểm, chọn 8 đội vào tứ kết loại trực tiếp.",
      entry_fee: 100000,
      is_featured: true,
      status: "active"
    },
    {
      id: "EVT-02",
      title: "Buổi Sinh Hoạt Định Kỳ Thứ Bảy Tuần Này",
      category: "regular_practice",
      banner_url: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=800&q=80",
      start_time: "2026-03-14T18:00",
      end_time: "2026-03-14T21:00",
      venue_name: "Sân Cầu Lông Viettel Hoàng Hoa Thám",
      venue_address: "158 Hoàng Hoa Thám, P.12, Tân Bình, TP.HCM",
      google_maps_url: "https://maps.google.com/?q=San+Cau+Long+Viettel",
      max_slots: 20,
      registered_count: 18,
      format_notes: "Giao lưu rèn luyện thể lực, ghép kèo ngẫu nhiên test ELO.",
      entry_fee: 50000,
      is_featured: false,
      status: "active"
    },
    {
      id: "EVT-03",
      title: "Giải Cầu Lông Mùa Đông SmashTeam 2025",
      category: "tournament",
      banner_url: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=800&q=80",
      start_time: "2025-12-20T08:00",
      end_time: "2025-12-20T17:00",
      venue_name: "Sân Cầu Lông Thể Thao ĐHQG",
      venue_address: "Khu phố 6, Linh Trung, Thủ Đức, TP.HCM",
      google_maps_url: "https://maps.google.com/?q=DHQG+Badminton",
      max_slots: 48,
      registered_count: 48,
      format_notes: "Giải đấu khép lại mùa giải 2025.",
      entry_fee: 80000,
      is_featured: false,
      status: "archived"
    }
  ]);

  // Drawer Edit/Create State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClubEventItem | null>(null);

  // Scanner Modal State
  const [activeScannerEvent, setActiveScannerEvent] = useState<ClubEventItem | null>(null);

  // Bật/Tắt hiển thị trên Trang Chủ (Featured Toggle Switch)
  const handleToggleFeatured = (id: string | number) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, is_featured: !e.is_featured } : e))
    );
  };

  // Mở Drawer Tạo hoặc Sửa
  const handleOpenEdit = (event?: ClubEventItem) => {
    if (event) {
      setEditingEvent({ ...event });
    } else {
      setEditingEvent({
        id: `EVT-${Date.now().toString().slice(-4)}`,
        title: "",
        category: "regular_practice",
        banner_url: "",
        start_time: "",
        end_time: "",
        venue_name: "",
        venue_address: "",
        google_maps_url: "",
        max_slots: 24,
        registered_count: 0,
        format_notes: "",
        entry_fee: 0,
        is_featured: false,
        status: "active"
      });
    }
    setIsDrawerOpen(true);
  };

  // Lưu Sự kiện từ Drawer
  const handleSaveDrawer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    setEvents((prev) => {
      const exists = prev.some((item) => item.id === editingEvent.id);
      if (exists) {
        return prev.map((item) => (item.id === editingEvent.id ? editingEvent : item));
      } else {
        return [editingEvent, ...prev];
      }
    });

    setIsDrawerOpen(false);
    setEditingEvent(null);
  };

  // Lưu trữ hoặc Kích hoạt lại
  const handleToggleArchive = (id: string | number) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: e.status === "active" ? "archived" : "active" } : e
      )
    );
  };

  // Lọc danh sách
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchTab = e.status === activeTab;
      const matchSearch =
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.venue_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === "all" || e.category === categoryFilter;
      return matchTab && matchSearch && matchCat;
    });
  }, [events, activeTab, searchQuery, categoryFilter]);

  return (
    <div className="w-full space-y-6">
      {/* HEADER & TABS SWITCHER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Sự Kiện & Lịch Hoạt Động
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu hình các giải đấu, buổi tập, ghim hiển thị Landing Page và điểm danh QR tại sân.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenEdit()}
          className="min-h-[42px] px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-md shadow-primary/30 flex items-center gap-2 cursor-pointer self-start sm:self-auto transition-all"
        >
          <Plus className="w-4 h-4" /> Thêm sự kiện mới
        </button>
      </div>

      {/* TABS: ACTIVE vs ARCHIVED */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "active"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Đang & Sắp diễn ra ({events.filter((e) => e.status === "active").length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("archived")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "archived"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Kho lưu trữ lịch sử ({events.filter((e) => e.status === "archived").length})
        </button>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm tên sự kiện hoặc địa điểm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">Tất cả phân loại</option>
            <option value="tournament">Giải đấu tranh cúp</option>
            <option value="regular_practice">Sinh hoạt định kỳ</option>
            <option value="friendly">Giao lưu mở rộng</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Hiển thị <strong>{filteredEvents.length}</strong> sự kiện
        </span>
      </div>

      {/* EVENT DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black">
              <tr>
                <th className="py-3 px-4">Sự kiện & Phân loại</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Địa điểm & Google Maps</th>
                <th className="py-3 px-4 text-center">Slot đã nộp</th>
                <th className="py-3 px-4 text-center">Hiện Trang Chủ</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.map((evt) => {
                const fillPercent = Math.min(
                  Math.round((evt.registered_count / evt.max_slots) * 100),
                  100
                );

                return (
                  <tr key={evt.id} className="hover:bg-purple-50/40 transition-colors group">
                    {/* Sự kiện & Phân loại */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-200">
                          {evt.banner_url ? (
                            <img src={evt.banner_url} alt={evt.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-purple-950 text-purple-300">
                              <Calendar className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 group-hover:text-primary transition-colors truncate">
                            {evt.title}
                          </p>
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 mt-1">
                            {evt.category === "tournament"
                              ? "Giải Đấu ELO"
                              : evt.category === "regular_practice"
                              ? "Sinh Hoạt Định Kỳ"
                              : "Giao Lưu Mở"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Thời gian */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {new Date(evt.start_time).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric"
                        })}
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(evt.start_time).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </td>

                    {/* Địa điểm & Link Google Maps */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-bold text-slate-800 truncate">{evt.venue_name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{evt.venue_address}</p>
                      {evt.google_maps_url ? (
                        <a
                          href={evt.google_maps_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary-hover font-bold mt-1"
                        >
                          <MapPin className="w-3 h-3" /> Xem vị trí sân <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400">Chưa gắn Maps link</span>
                      )}
                    </td>

                    {/* Slot đăng ký */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-block text-center">
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {evt.registered_count} / {evt.max_slots}
                        </span>
                        <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1 mx-auto">
                          <div
                            className={`h-full rounded-full ${
                              fillPercent >= 100 ? "bg-rose-500" : "bg-primary"
                            }`}
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* TOGGLE SWITCH: HIỆN TRANG CHỦ (FEATURED) */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(evt.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          evt.is_featured ? "bg-primary shadow-[0_0_10px_rgba(122,34,224,0.6)]" : "bg-slate-300"
                        }`}
                        title={evt.is_featured ? "Đang ghim Trang Chủ" : "Chưa ghim Trang Chủ"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            evt.is_featured ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Nút bật Camera quét QR Check-in */}
                        <button
                          type="button"
                          onClick={() => setActiveScannerEvent(evt)}
                          title="Quét QR điểm danh tại sân"
                          className="p-1.5 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        {/* Nút sửa */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(evt)}
                          title="Chỉnh sửa thông tin"
                          className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Nút chuyển trạng thái Kho lưu trữ */}
                        <button
                          type="button"
                          onClick={() => handleToggleArchive(evt.id)}
                          title={evt.status === "active" ? "Chuyển vào Kho lưu trữ" : "Khôi phục sự kiện"}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredEvents.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-semibold">Không có sự kiện nào trong danh mục này.</p>
          </div>
        )}
      </div>

      {/* SLIDE-OVER CRUD DRAWER / MODAL */}
      {isDrawerOpen && editingEvent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingEvent.title ? "Cập Nhật Sự Kiện" : "Tạo Mới Sự Kiện CLB"}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">ID: {editingEvent.id}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Form Body */}
            <form onSubmit={handleSaveDrawer} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Tiêu đề */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">Tên sự kiện / Giải đấu *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Giải Giao Lưu Mùa Xuân 2026"
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                />
              </div>

              {/* Phân loại & Slot */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Phân loại sự kiện</label>
                  <select
                    value={editingEvent.category}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        category: e.target.value as ClubEventItem["category"]
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900 cursor-pointer"
                  >
                    <option value="tournament">Giải Đấu Tranh Cúp ELO</option>
                    <option value="regular_practice">Sinh Hoạt Định Kỳ</option>
                    <option value="friendly">Giao Lưu Mở Rộng</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Giới hạn số slots *</label>
                  <input
                    type="number"
                    min="4"
                    max="128"
                    required
                    value={editingEvent.max_slots}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, max_slots: Number(e.target.value) })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                  />
                </div>
              </div>

              {/* Thời gian */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Bắt đầu lúc *</label>
                  <input
                    type="datetime-local"
                    required
                    value={editingEvent.start_time.slice(0, 16)}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, start_time: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Kết thúc (Dự kiến)</label>
                  <input
                    type="datetime-local"
                    value={editingEvent.end_time ? editingEvent.end_time.slice(0, 16) : ""}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, end_time: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                  />
                </div>
              </div>

              {/* KHỐI ĐỊA ĐIỂM THÔNG MINH (SMART VENUE) */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-3">
                <span className="font-black text-primary flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> Thông tin Sân Cầu Lông & Bản đồ Maps
                </span>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Tên sân cầu lông *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Sân Cầu Lông Lan Anh"
                    value={editingEvent.venue_name}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, venue_name: e.target.value })
                    }
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Địa chỉ cụ thể *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 291 Cách Mạng Tháng 8, P.12, Quận 10, TP.HCM"
                    value={editingEvent.venue_address}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, venue_address: e.target.value })
                    }
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Đường dẫn Google Maps (URL)</label>
                  <input
                    type="url"
                    placeholder="https://maps.app.goo.gl/... hoặc https://maps.google.com/?q=..."
                    value={editingEvent.google_maps_url || ""}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, google_maps_url: e.target.value })
                    }
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                  />
                  <p className="text-[10px] text-slate-500">
                    Thành viên bấm nút &quot;Xem vị trí sân&quot; trên website sẽ mở trực tiếp link chỉ đường này.
                  </p>
                </div>
              </div>

              {/* Chi phí & Banner */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Chi phí tham gia (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={editingEvent.entry_fee || 0}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, entry_fee: Number(e.target.value) })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Banner URL ảnh bìa</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={editingEvent.banner_url || ""}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, banner_url: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                  />
                </div>
              </div>

              {/* Thể thức & Điều lệ */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">Thể thức & Ghi chú thi đấu</label>
                <textarea
                  rows={3}
                  placeholder="Quy định bốc thăm, số set thi đấu, tiêu chuẩn cầu..."
                  value={editingEvent.format_notes || ""}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, format_notes: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                ></textarea>
              </div>

              {/* Tùy chọn ghim Trang Chủ */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">Hiển thị trên Trang Chủ (Landing Page)</p>
                  <p className="text-[11px] text-slate-500">Xuất hiện tại Hero Card nổi bật để thành viên đăng ký nhanh.</p>
                </div>
                <input
                  type="checkbox"
                  checked={editingEvent.is_featured}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, is_featured: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Drawer Action Buttons */}
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-md shadow-primary/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCANNER MODAL TRIGGER */}
      {activeScannerEvent && (
        <QRScannerModal
          isOpen={!!activeScannerEvent}
          onClose={() => setActiveScannerEvent(null)}
          eventId={activeScannerEvent.id}
          eventName={activeScannerEvent.title}
          onAttendeeUpdated={() => {
            setEvents((prev) =>
              prev.map((e) =>
                e.id === activeScannerEvent.id
                  ? { ...e, registered_count: Math.min(e.max_slots, e.registered_count + 1) }
                  : e
              )
            );
          }}
        />
      )}
    </div>
  );
}
