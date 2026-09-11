"use client";

import { useState } from "react";
import { 
  Search, Download, CheckCircle2, Eye, Trash2, 
  Copy, Check, Phone, Calendar, MapPin, Filter, 
  X, ChevronDown, User, Sparkles, Loader2 
} from "lucide-react";
import { format } from "date-fns";
import { CandidateItem } from "./RecruitmentKPIs";

export interface SlotOption {
  id: string | number;
  casting_time: string;
  location: string;
}

interface ApplicantTableProps {
  candidates: CandidateItem[];
  isLoading?: boolean;
  slots?: SlotOption[];
  onOpenDetail: (candidate: CandidateItem) => void;
  onApprove: (candidate: CandidateItem) => void;
  onReject: (candidateId: string | number) => void;
}

export default function ApplicantTable({
  candidates = [],
  isLoading = false,
  slots = [],
  onOpenDetail,
  onApprove,
  onReject
}: ApplicantTableProps) {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [slotFilter, setSlotFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  const copyPhone = (id: string | number, phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Filter candidates locally for snappy UX
  const filteredCandidates = candidates.filter(c => {
    const matchSearch = !search || 
      c.full_name?.toLowerCase().includes(search.toLowerCase()) || 
      c.phone_zalo?.includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()));

    const matchLevel = levelFilter === "all" || c.badminton_level === levelFilter;
    const matchSlot = slotFilter === "all" || String(c.casting_slot_id) === String(slotFilter);
    const matchGender = genderFilter === "all" || c.gender === genderFilter;

    return matchSearch && matchLevel && matchSlot && matchGender;
  });

  // Export CSV function with UTF-8 BOM
  const handleExportCSV = () => {
    if (filteredCandidates.length === 0) {
      alert("Không có dữ liệu ứng viên để xuất.");
      return;
    }

    const headers = [
      "Họ và tên",
      "Số điện thoại Zalo",
      "Email",
      "Giới tính",
      "Trường / Học vấn",
      "Trình độ",
      "Thời gian Casting",
      "Địa điểm",
      "Ngày nộp đơn"
    ];

    const rows = filteredCandidates.map(c => [
      `"${c.full_name || ""}"`,
      `"${c.phone_zalo || ""}"`,
      `"${c.email || ""}"`,
      `"${c.gender || ""}"`,
      `"${c.academic_info || ""}"`,
      `"${c.badminton_level || ""}"`,
      `"${c.casting_time ? format(new Date(c.casting_time), "dd/MM/yyyy HH:mm") : "Chưa chọn"}"`,
      `"${c.location || ""}"`,
      `"${c.created_at ? format(new Date(c.created_at), "dd/MM/yyyy HH:mm") : ""}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SmashTeam_Ung_Vien_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case "Khá/Giỏi":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Trung bình":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Mới chơi":
      default:
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
    }
  };

  return (
    <div className="space-y-4">
      {/* Smart Filter & Action Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, số điện thoại Zalo, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-secondary focus:outline-none focus:border-primary focus:bg-white transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Middle: Select Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-primary cursor-pointer min-w-[130px]"
          >
            <option value="all">Mọi trình độ</option>
            <option value="Mới chơi">Mới chơi</option>
            <option value="Trung bình">Trung bình</option>
            <option value="Khá/Giỏi">Khá/Giỏi</option>
          </select>

          {/* Slot Filter */}
          <select
            value={slotFilter}
            onChange={e => setSlotFilter(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-primary cursor-pointer min-w-[150px] max-w-[200px] truncate"
          >
            <option value="all">Tất cả ca Casting</option>
            {slots.map(s => (
              <option key={s.id} value={s.id}>
                {format(new Date(s.casting_time), "dd/MM/yyyy HH:mm")} - {s.location}
              </option>
            ))}
          </select>

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-primary cursor-pointer min-w-[110px]"
          >
            <option value="all">Mọi giới tính</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>
        </div>

        {/* Right: Export CSV Button */}
        <button
          onClick={handleExportCSV}
          className="min-h-[42px] px-4 py-2 bg-secondary hover:bg-slate-900 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs cursor-pointer shrink-0"
          title="Tải danh sách ứng viên (File CSV có hỗ trợ tiếng Việt trên Excel)"
        >
          <Download className="w-4 h-4 text-purple-300" />
          <span>Xuất CSV ({filteredCandidates.length})</span>
        </button>

      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden min-h-[350px] relative flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-primary bg-white/80 z-20 space-y-2 py-16">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-xs font-bold text-slate-500">Đang tải danh sách ứng viên...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-16 text-center text-slate-400 space-y-2">
            <User className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-600 text-base">Không tìm thấy ứng viên nào phù hợp</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Thử tìm kiếm với từ khóa khác hoặc điều chỉnh lại các bộ lọc trình độ/ca casting phía trên.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="p-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Ứng Viên & Học Vấn
                  </th>
                  <th className="p-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Liên Hệ Zalo / Email
                  </th>
                  <th className="p-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Trình Độ
                  </th>
                  <th className="p-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Ca Thử Sân (Casting)
                  </th>
                  <th className="p-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">
                    Thao Tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCandidates.map(c => {
                  const isCopied = copiedId === c.id;
                  return (
                    <tr 
                      key={c.id} 
                      className="hover:bg-purple-50/40 transition-colors group"
                    >
                      {/* Column 1: Candidate Name & School */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-100 text-primary font-black text-sm flex items-center justify-center shrink-0">
                            {c.full_name ? c.full_name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-secondary group-hover:text-primary transition-colors">
                              {c.full_name}
                            </p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              {c.gender && <span className="font-semibold text-slate-700">{c.gender} •</span>}
                              <span>{c.academic_info || "Chưa nhập học vấn"}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Phone & Email */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-secondary">{c.phone_zalo}</span>
                            <button
                              onClick={() => copyPhone(c.id, c.phone_zalo)}
                              className="p-1 text-slate-400 hover:text-primary transition-colors cursor-pointer"
                              title="Sao chép SĐT Zalo"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                            {c.email || "Chưa có email"}
                          </p>
                        </div>
                      </td>

                      {/* Column 3: Level Badge */}
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${getLevelBadgeClass(c.badminton_level)}`}>
                          {c.badminton_level}
                        </span>
                      </td>

                      {/* Column 4: Casting Slot */}
                      <td className="p-4">
                        {c.casting_time ? (
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-800 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-primary" />
                              <span>{format(new Date(c.casting_time), "dd/MM/yyyy HH:mm")}</span>
                            </p>
                            <p className="text-[11px] text-slate-500 truncate max-w-[180px] flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{c.location || "Sân CLB"}</span>
                            </p>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Chưa chọn ca</span>
                        )}
                      </td>

                      {/* Column 5: Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Detail Button */}
                          <button
                            onClick={() => onOpenDetail(c)}
                            className="p-2 text-slate-500 hover:text-primary hover:bg-purple-50 rounded-xl transition-all cursor-pointer"
                            title="Xem chi tiết hồ sơ"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Quick Approve Button */}
                          <button
                            onClick={() => onApprove(c)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                            title="Duyệt ứng viên & chấm điểm"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Duyệt</span>
                          </button>

                          {/* Reject / Delete Button */}
                          <button
                            onClick={() => onReject(c.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                            title="Loại bỏ ứng viên"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer Summary */}
        <div className="mt-auto p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>
            Hiển thị <strong>{filteredCandidates.length}</strong> / {candidates.length} ứng viên
          </span>
          <span className="text-purple-700 font-bold">
            SmashTeam Recruitment Management Engine
          </span>
        </div>
      </div>
    </div>
  );
}
