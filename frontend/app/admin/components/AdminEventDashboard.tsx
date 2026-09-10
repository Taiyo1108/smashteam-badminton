"use client";

import React, { useState, useMemo } from "react";
import { 
  Calendar, Users, Plus, Check, X, Search, Filter, 
  Download, Award, CheckCircle2, AlertTriangle, Trash2, Edit2, Shield 
} from "lucide-react";

export interface EventRegistrationItem {
  id: string | number;
  full_name: string;
  phone_zalo: string;
  email?: string;
  category: "singles" | "doubles";
  partner_info?: string;
  seed?: number | null; // 1, 2, 3, 4 hoặc null
  status: "pending" | "approved" | "rejected" | "waitlist";
  created_at: string;
}

export default function AdminEventDashboard() {
  const [activeTab, setActiveTab] = useState<"registrations" | "create_event">("registrations");

  // State danh sách đơn đăng ký
  const [registrations, setRegistrations] = useState<EventRegistrationItem[]>([
    { id: "1", full_name: "Nguyễn Văn Thương", phone_zalo: "0912345678", email: "thuong@uit.edu.vn", category: "doubles", partner_info: "Trần Minh Quang (0988776655)", seed: 1, status: "approved", created_at: "2026-03-08 09:30" },
    { id: "2", full_name: "Lê Hoàng Bảo", phone_zalo: "0909887766", email: "bao.lh@gmail.com", category: "singles", seed: 2, status: "approved", created_at: "2026-03-08 10:15" },
    { id: "3", full_name: "Phạm Hải Đăng", phone_zalo: "0933445566", email: "dang.ph@gmail.com", category: "doubles", partner_info: "BTC ghép cặp ngẫu nhiên", seed: null, status: "pending", created_at: "2026-03-09 14:00" },
    { id: "4", full_name: "Đặng Thùy Linh", phone_zalo: "0977889900", email: "linh.dt@gmail.com", category: "singles", seed: null, status: "pending", created_at: "2026-03-09 15:20" },
    { id: "5", full_name: "Hoàng Minh Tâm", phone_zalo: "0966554433", email: "tam.hm@gmail.com", category: "doubles", partner_info: "Vũ Quốc Đạt", seed: null, status: "waitlist", created_at: "2026-03-09 16:45" }
  ]);

  // Bộ lọc & Tìm kiếm
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // State form tạo sự kiện mới
  const [newEvent, setNewEvent] = useState({
    title: "",
    category: "Giao lưu nội bộ",
    start_time: "",
    end_time: "",
    location: "Sân Cầu Lông Lan Anh, Q.10",
    max_slots: "32",
    require_partner: true,
    banner_url: ""
  });

  // Toggle chọn checkbox
  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredRegistrations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRegistrations.map((r) => String(r.id)));
    }
  };

  // Duyệt hoặc từ chối hàng loạt
  const handleBatchStatus = (newStatus: "approved" | "rejected" | "waitlist") => {
    if (selectedIds.length === 0) return;
    setRegistrations((prev) =>
      prev.map((item) =>
        selectedIds.includes(String(item.id)) ? { ...item, status: newStatus } : item
      )
    );
    setSelectedIds([]);
  };

  // Gắn hạt giống (Seed tagging)
  const handleSetSeed = (id: string | number, seedVal: number | null) => {
    setRegistrations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, seed: seedVal } : item))
    );
  };

  // Cập nhật trạng thái từng đơn lẻ
  const handleSingleStatus = (id: string | number, status: "approved" | "rejected" | "waitlist") => {
    setRegistrations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  // Xuất file CSV / Excel UTF-8 BOM chuẩn tiếng Việt
  const handleExportCSV = () => {
    const headers = ["STT", "Họ Tên", "Số Điện Thoại", "Email", "Nội Dung", "Đồng Đội", "Hạt Giống", "Trạng Thái", "Ngày Đăng Ký"];
    const rows = filteredRegistrations.map((r, idx) => [
      idx + 1,
      `"${r.full_name}"`,
      `"${r.phone_zalo}"`,
      `"${r.email || ""}"`,
      r.category === "doubles" ? "Đôi" : "Đơn",
      `"${r.partner_info || "Không"}"`,
      r.seed ? `Hạt giống ${r.seed}` : "Không",
      r.status === "approved" ? "Đã duyệt" : r.status === "rejected" ? "Từ chối" : r.status === "waitlist" ? "Chờ dự bị" : "Chờ duyệt",
      `"${r.created_at}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `danh_sach_vdv_smash_cup_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dữ liệu lọc
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      const matchSearch =
        r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.phone_zalo.includes(searchQuery);
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [registrations, searchQuery, statusFilter]);

  return (
    <div className="w-full space-y-6">
      {/* TOP STATS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Tổng số đơn</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{registrations.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-emerald-600">Đã phê duyệt</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {registrations.filter((r) => r.status === "approved").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-amber-500">Chờ duyệt</p>
          <p className="text-2xl font-black text-amber-500 mt-1">
            {registrations.filter((r) => r.status === "pending").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-primary">Danh sách chờ (Waitlist)</p>
          <p className="text-2xl font-black text-primary mt-1">
            {registrations.filter((r) => r.status === "waitlist").length}
          </p>
        </div>
      </div>

      {/* TABS SWITCHER: ĐIỀU PHỐI ĐƠN vs TẠO SỰ KIỆN */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("registrations")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
            activeTab === "registrations"
              ? "border-primary text-primary font-black"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Điều Phối Đơn Đăng Ký ({filteredRegistrations.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("create_event")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
            activeTab === "create_event"
              ? "border-primary text-primary font-black"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          + Tạo Sự Kiện Mới
        </button>
      </div>

      {/* TAB 1: BẢNG ĐIỀU PHỐI DANH SÁCH VĐV */}
      {activeTab === "registrations" && (
        <div className="space-y-4">
          {/* SEARCH, FILTER & BATCH ACTION BAR */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm tên hoặc SĐT Zalo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="waitlist">Danh sách chờ</option>
                <option value="rejected">Đã từ chối</option>
              </select>
            </div>

            {/* Batch actions & Export */}
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200 text-xs">
                  <span className="font-bold text-primary">Đã chọn {selectedIds.length}</span>
                  <button
                    type="button"
                    onClick={() => handleBatchStatus("approved")}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Duyệt
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBatchStatus("rejected")}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Từ chối
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Xuất Excel/CSV
              </button>
            </div>
          </div>

          {/* DATA TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black">
                  <tr>
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredRegistrations.length && filteredRegistrations.length > 0}
                        onChange={handleSelectAll}
                        className="rounded text-primary focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Vận động viên</th>
                    <th className="py-3 px-4">SĐT / Email</th>
                    <th className="py-3 px-4">Nội dung & Đồng đội</th>
                    <th className="py-3 px-4 text-center">Hạt giống</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRegistrations.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(String(item.id))}
                          onChange={() => handleSelectOne(String(item.id))}
                          className="rounded text-primary focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{item.full_name}</p>
                        <span className="text-[10px] text-slate-400">{item.created_at}</span>
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{item.phone_zalo}</p>
                        <p className="text-[10px] text-slate-400">{item.email}</p>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-primary">
                          {item.category === "doubles" ? "Đôi" : "Đơn"}
                        </span>
                        {item.partner_info && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Cặp cùng: <strong className="text-slate-700">{item.partner_info}</strong>
                          </p>
                        )}
                      </td>

                      {/* Gắn hạt giống */}
                      <td className="py-3 px-4 text-center">
                        <select
                          value={item.seed || ""}
                          onChange={(e) => handleSetSeed(item.id, e.target.value ? Number(e.target.value) : null)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                            item.seed
                              ? "bg-amber-50 border-amber-300 text-amber-900"
                              : "bg-slate-50 border-slate-200 text-slate-500"
                          }`}
                        >
                          <option value="">Không</option>
                          <option value="1">Hạt giống #1</option>
                          <option value="2">Hạt giống #2</option>
                          <option value="3">Hạt giống #3</option>
                          <option value="4">Hạt giống #4</option>
                        </select>
                      </td>

                      {/* Trạng thái đơn */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            item.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.status === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : item.status === "waitlist"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.status === "approved" ? "Đã duyệt" : item.status === "rejected" ? "Từ chối" : item.status === "waitlist" ? "Waitlist" : "Chờ duyệt"}
                        </span>
                      </td>

                      {/* Nút thao tác nhanh */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status !== "approved" && (
                            <button
                              type="button"
                              onClick={() => handleSingleStatus(item.id, "approved")}
                              title="Duyệt đơn"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {item.status !== "rejected" && (
                            <button
                              type="button"
                              onClick={() => handleSingleStatus(item.id, "rejected")}
                              title="Từ chối đơn"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FORM TẠO SỰ KIỆN MỚI */}
      {activeTab === "create_event" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs max-w-3xl space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900">Thiết Lập Sự Kiện / Giải Đấu Mới</h3>
            <p className="text-xs text-slate-500 mt-0.5">Cấu hình thông tin sự kiện để mở cổng cho thành viên đăng ký.</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert("Đã lưu và xuất bản sự kiện thành công!");
              setActiveTab("registrations");
            }}
            className="space-y-4 text-xs"
          >
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Tên sự kiện / Tên giải đấu *</label>
              <input
                type="text"
                required
                placeholder="VD: Giải Đấu SmashTeam Mùa Hè 2026"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Thời gian bắt đầu *</label>
                <input
                  type="datetime-local"
                  required
                  value={newEvent.start_time}
                  onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Giới hạn số lượng slots *</label>
                <input
                  type="number"
                  min="8"
                  max="128"
                  value={newEvent.max_slots}
                  onChange={(e) => setNewEvent({ ...newEvent, max_slots: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Địa điểm tổ chức *</label>
              <input
                type="text"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Banner URL ảnh bìa</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={newEvent.banner_url}
                onChange={(e) => setNewEvent({ ...newEvent, banner_url: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
              />
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={newEvent.require_partner}
                  onChange={(e) => setNewEvent({ ...newEvent, require_partner: e.target.checked })}
                  className="rounded text-primary focus:ring-0"
                />
                Kích hoạt nội dung đánh đôi (Cho phép nhập thông tin đồng đội)
              </label>
              <p className="text-[11px] text-slate-500 pl-6">
                Khi bật, form đăng ký sẽ hiển thị ô nhập tên và SĐT bạn đánh cùng hoặc ghép cặp ngẫu nhiên.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("registrations")}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-primary hover:bg-[#9D4EDD] text-white font-bold rounded-xl shadow-md shadow-primary/30 transition-colors cursor-pointer"
              >
                Lưu & Đăng Sự Kiện
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
