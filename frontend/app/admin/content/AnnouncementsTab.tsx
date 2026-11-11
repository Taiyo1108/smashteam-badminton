"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Bell,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Calendar,
  ShoppingBag,
  Sparkles,
  FileText,
  Download,
  Eye,
  Upload,
  Clock,
  Layers,
  ArrowUpRight,
  ExternalLink,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { API_URL } from "@/app/config";
import {
  getCategoryBadge,
  formatFileSize,
  formatDateTimeVN
} from "@/app/components/notifications/AnnouncementPopupModal";

interface AdminAnnouncement {
  id: number;
  title: string;
  content: string;
  category: "urgent" | "activity" | "shop" | "system" | "general";
  image_url: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  attachment_mime_type: string | null;
  is_popup: boolean;
  is_active: boolean;
  priority: number;
  publish_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  creator_name: string | null;
  read_by_users_count?: number;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  active: number;
  popup: number;
  expired: number;
  draft: number;
}

export default function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, popup: 0, expired: 0, draft: 0 });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "draft" | "popup">("all");
  const [search, setSearch] = useState("");

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "general" as "urgent" | "activity" | "shop" | "system" | "general",
    is_popup: true,
    is_active: false,
    priority: 0,
    publish_at: "",
    expires_at: "",
    remove_image: false,
    remove_attachment: false,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Preview Modal
  const [previewItem, setPreviewItem] = useState<AdminAnnouncement | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/announcements`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.error("Error fetching admin announcements:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      category: "general",
      is_popup: true,
      is_active: false,
      priority: 0,
      publish_at: "",
      expires_at: "",
      remove_image: false,
      remove_attachment: false,
    });
    setImageFile(null);
    setImagePreview(null);
    setAttachmentFile(null);
    setEditingId(null);
    setFormError("");
    setFormSuccess("");
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: AdminAnnouncement) => {
    resetForm();
    setEditingId(item.id);
    setFormData({
      title: item.title,
      content: item.content,
      category: item.category,
      is_popup: item.is_popup,
      is_active: item.is_active,
      priority: item.priority,
      publish_at: item.publish_at ? new Date(item.publish_at).toISOString().slice(0, 16) : "",
      expires_at: item.expires_at ? new Date(item.expires_at).toISOString().slice(0, 16) : "",
      remove_image: false,
      remove_attachment: false,
    });
    setImagePreview(item.image_url);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        setFormError("Ảnh vượt quá dung lượng tối đa 15MB.");
        return;
      }
      setImageFile(file);
      setFormData((prev) => ({ ...prev, remove_image: false }));
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        setFormError("Tài liệu đính kèm vượt quá 15MB.");
        return;
      }
      setAttachmentFile(file);
      setFormData((prev) => ({ ...prev, remove_attachment: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formData.title.trim()) {
      setFormError("Tiêu đề thông báo là bắt buộc.");
      return;
    }
    if (!formData.content.trim()) {
      setFormError("Nội dung thông báo là bắt buộc.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const data = new FormData();
      data.append("title", formData.title.trim());
      data.append("content", formData.content.trim());
      data.append("category", formData.category);
      data.append("is_popup", String(formData.is_popup));
      data.append("is_active", String(formData.is_active));
      data.append("priority", String(formData.priority));

      if (formData.publish_at) {
        data.append("publish_at", new Date(formData.publish_at).toISOString());
      } else {
        data.append("publish_at", "");
      }

      if (formData.expires_at) {
        data.append("expires_at", new Date(formData.expires_at).toISOString());
      } else {
        data.append("expires_at", "");
      }

      if (imageFile) {
        data.append("image", imageFile);
      }
      if (attachmentFile) {
        data.append("attachment", attachmentFile);
      }

      if (editingId) {
        data.append("remove_image", String(formData.remove_image));
        data.append("remove_attachment", String(formData.remove_attachment));
      }

      const url = editingId
        ? `${API_URL}/api/admin/announcements/${editingId}`
        : `${API_URL}/api/admin/announcements`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: data
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || "Lỗi khi lưu thông báo.");
      }

      setFormSuccess(editingId ? "Cập nhật thông báo thành công!" : "Tạo thông báo mới thành công!");
      fetchAnnouncements();

      setTimeout(() => {
        setIsFormOpen(false);
        resetForm();
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || "Lỗi khi gửi dữ liệu.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: number, field: "is_active" | "is_popup") => {
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/announcements/${id}/toggle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ field })
      });

      if (res.ok) {
        fetchAnnouncements();
      }
    } catch (e) {
      console.error("Error toggling:", e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa vĩnh viễn thông báo này không?")) return;
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/announcements/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchAnnouncements();
      } else {
        const err = await res.json();
        alert(err.error || "Lỗi khi xóa.");
      }
    } catch (e) {
      alert("Lỗi kết nối khi xóa.");
    }
  };

  const handlePriorityChange = async (id: number, delta: number) => {
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/announcements/${id}/priority`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ delta })
      });
      if (res.ok) {
        fetchAnnouncements();
      }
    } catch (e) {
      console.error("Error changing priority:", e);
    }
  };

  // Lọc thông báo hiển thị
  const filteredAnnouncements = announcements.filter((item) => {
    if (filter === "active" && !item.is_active) return false;
    if (filter === "draft" && item.is_active) return false;
    if (filter === "popup" && !item.is_popup) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* THẺ THỐNG KÊ NHANH */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng thông báo</p>
          <p className="text-2xl font-black text-secondary mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Đang phát hành</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Pop-up đang bật</p>
          <p className="text-2xl font-black text-primary mt-1">{stats.popup}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Bản nháp</p>
          <p className="text-2xl font-black text-slate-700 mt-1">{stats.draft}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Đã hết hạn</p>
          <p className="text-2xl font-black text-rose-500 mt-1">{stats.expired}</p>
        </div>
      </div>

      {/* THANH ĐIỀU HƯỚNG VÀ NÚT TẠO MỚI */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === "all" ? "bg-secondary text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Tất cả ({stats.total})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === "active" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            Đang chạy ({stats.active})
          </button>
          <button
            onClick={() => setFilter("popup")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === "popup" ? "bg-primary text-white shadow-xs" : "text-purple-700 hover:bg-purple-50"
            }`}
          >
            Pop-up ({stats.popup})
          </button>
          <button
            onClick={() => setFilter("draft")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === "draft" ? "bg-slate-700 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Bản nháp ({stats.draft})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Tìm theo tiêu đề..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-primary w-full sm:w-48"
          />

          {!isFormOpen && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Soạn thông báo mới
            </button>
          )}
        </div>
      </div>

      {/* BIỂU MẪU SOẠN THẢO / CHỈNH SỬA THÔNG BÁO */}
      {isFormOpen && (
        <div className="bg-white rounded-3xl border-2 border-primary/20 shadow-lg p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-secondary flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                {editingId ? `Chỉnh sửa thông báo #${editingId}` : "Soạn thông báo mới"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Thông báo sẽ hiển thị Pop-up khi người dùng vào trang và lưu trong mục Chuông thông báo.
              </p>
            </div>
            <button
              onClick={() => {
                setIsFormOpen(false);
                resetForm();
              }}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tiêu đề & Phân loại */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Tiêu đề thông báo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ví dụ: THAY ĐỔI LỊCH TẬP CHIỀU THỨ 7 DO BẢO TRÌ SÂN"
                  maxLength={255}
                  required
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Phân loại thông báo
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white outline-none focus:border-primary"
                >
                  <option value="urgent">⚡ Thay đổi đột xuất / Khẩn cấp</option>
                  <option value="activity">🏸 Hoạt động & Sự kiện mới</option>
                  <option value="shop">🛍️ Vật phẩm & Shop mới</option>
                  <option value="system">⚙️ Cập nhật hệ thống</option>
                  <option value="general">📢 Thông báo chung</option>
                </select>
              </div>
            </div>

            {/* Nội dung chi tiết */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Nội dung chi tiết <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={5}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Nhập nội dung thông báo. Có thể dán đường link liên kết để tự động hiển thị liên kết an toàn..."
                required
                className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-y"
              />
            </div>

            {/* Upload File Hình ảnh và File Tài liệu */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ảnh đính kèm (Tối đa 15MB) */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Hình ảnh đính kèm (Tối đa 15MB)
                  </span>
                  <span className="text-[10px] text-slate-400">JPG, PNG, WEBP</span>
                </div>

                {imagePreview ? (
                  <div className="relative group rounded-xl overflow-hidden border border-purple-500/30 bg-purple-950/40 backdrop-blur-md flex items-center justify-center p-2 min-h-[140px]">
                    <div 
                      className="absolute inset-0 bg-cover bg-center filter blur-xl opacity-35 scale-110"
                      style={{ backgroundImage: `url(${imagePreview})` }}
                      aria-hidden="true"
                    />
                    <div className="absolute inset-0 bg-[#120722]/50 backdrop-blur-[1px]" aria-hidden="true" />
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="relative z-10 max-h-36 w-auto max-w-full object-contain mx-auto rounded-lg drop-shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                        setFormData((prev) => ({ ...prev, remove_image: true }));
                        if (imageInputRef.current) imageInputRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 z-20 p-1.5 bg-rose-600 text-white rounded-lg shadow-sm hover:bg-rose-700 cursor-pointer"
                      title="Gỡ ảnh này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-primary hover:bg-purple-50/30 transition-colors">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-600">Chọn file ảnh (Tối đa 15MB)</span>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Tệp tài liệu đính kèm */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Tài liệu đính kèm (Tối đa 15MB)
                  </span>
                  <span className="text-[10px] text-slate-400">PDF, DOC, XLS, ZIP</span>
                </div>

                {attachmentFile ? (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-5 h-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-secondary truncate">{attachmentFile.name}</p>
                        <p className="text-[10px] text-slate-400">{formatFileSize(attachmentFile.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentFile(null);
                        if (attachmentInputRef.current) attachmentInputRef.current.value = "";
                      }}
                      className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : editingId && announcements.find((a) => a.id === editingId)?.attachment_url && !formData.remove_attachment ? (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-5 h-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-secondary truncate">
                          {announcements.find((a) => a.id === editingId)?.attachment_name || "File hiện tại"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatFileSize(announcements.find((a) => a.id === editingId)?.attachment_size ?? null)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, remove_attachment: true }))}
                      className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                      title="Xóa tài liệu này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-primary hover:bg-purple-50/30 transition-colors">
                    <FileText className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-600">Chọn file PDF, DOCX, ZIP...</span>
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.zip"
                      onChange={handleAttachmentChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Các tùy chọn: Pop-up, Kích hoạt, Ưu tiên & Lịch trình */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-purple-50/40 border border-purple-100">
              {/* Cờ Pop-up */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_popup}
                  onChange={(e) => setFormData({ ...formData, is_popup: e.target.checked })}
                  className="w-4 h-4 text-primary rounded-md focus:ring-primary accent-primary"
                />
                <div>
                  <span className="text-xs font-bold text-secondary block">Bật Pop-up</span>
                  <span className="text-[10px] text-slate-500">Bật khi vào trang</span>
                </div>
              </label>

              {/* Cờ Kích hoạt phát hành */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 accent-emerald-600"
                />
                <div>
                  <span className="text-xs font-bold text-secondary block">Phát hành ngay</span>
                  <span className="text-[10px] text-slate-500">{formData.is_active ? "Đang công khai" : "Lưu dạng nháp"}</span>
                </div>
              </label>

              {/* Thứ tự ưu tiên */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Độ ưu tiên (0 = Bình thường, 10 = Cao)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value, 10) || 0 })}
                  className="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>

              {/* Lịch phát hành & hết hạn */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">
                  Hẹn giờ hết hạn (Tùy chọn)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full p-1.5 border border-slate-200 rounded-lg text-[11px] outline-none"
                />
              </div>
            </div>

            {/* Các nút hành động */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setPreviewItem({
                    id: 0,
                    title: formData.title || "Tiêu đề xem trước",
                    content: formData.content || "Nội dung xem trước của thông báo...",
                    category: formData.category,
                    image_url: imagePreview,
                    attachment_url: attachmentFile ? "#" : null,
                    attachment_name: attachmentFile ? attachmentFile.name : null,
                    attachment_size: attachmentFile ? attachmentFile.size : null,
                    attachment_mime_type: null,
                    is_popup: formData.is_popup,
                    is_active: formData.is_active,
                    priority: formData.priority,
                    publish_at: formData.publish_at || null,
                    expires_at: formData.expires_at || null,
                    created_by: null,
                    creator_name: "Admin",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4 text-slate-500" /> Xem trước Pop-up (Preview)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-purple-700 hover:from-primary-hover hover:to-purple-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> {editingId ? "Cập nhật thông báo" : "Tạo & Lưu thông báo"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* DANH SÁCH QUẢN LÝ THÔNG BÁO DẠNG CARDS */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-semibold">Đang tải danh sách thông báo...</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-full bg-purple-50 text-primary flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6 opacity-60" />
            </div>
            <p className="text-sm font-bold text-slate-700">Chưa có thông báo nào phù hợp.</p>
            <p className="text-xs text-slate-400">Hãy nhấn nút "+ Soạn thông báo mới" để tạo thông báo đầu tiên.</p>
          </div>
        ) : (
          filteredAnnouncements.map((item) => {
            const badge = getCategoryBadge(item.category);
            const CategoryIcon = badge.icon;
            const isExpired = item.expires_at && new Date(item.expires_at) <= new Date();

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all hover:shadow-md space-y-4 ${
                  !item.is_active ? "border-slate-200 opacity-80" : "border-slate-200"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badge.className} ${badge.glow}`}
                    >
                      <CategoryIcon className="w-3.5 h-3.5" />
                      {badge.label}
                    </span>

                    {item.priority > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                        ⭐ Ưu tiên: {item.priority}
                      </span>
                    )}

                    {isExpired ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-600">
                        Đã hết hạn
                      </span>
                    ) : item.is_active ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        ✓ Đang phát hành
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        Bản nháp (Ẩn)
                      </span>
                    )}

                    {item.is_popup && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                        Pop-up: BẬT
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Tạo: {formatDateTimeVN(item.created_at)}
                    {item.read_by_users_count !== undefined && (
                      <span className="ml-2 font-bold text-slate-600">
                        • {item.read_by_users_count} thành viên đã đọc
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  {/* Thumbnail ảnh nếu có */}
                  {item.image_url && (
                    <div className="relative w-full md:w-36 h-24 rounded-xl overflow-hidden border border-purple-500/20 shrink-0 bg-purple-950/30 flex items-center justify-center">
                      <div 
                        className="absolute inset-0 bg-cover bg-center filter blur-lg opacity-40 scale-125"
                        style={{ backgroundImage: `url(${item.image_url})` }}
                        aria-hidden="true"
                      />
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="relative z-10 max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5 min-w-0">
                    <h3 className="text-base font-bold text-secondary leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line">
                      {item.content}
                    </p>

                    {item.attachment_url && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-primary font-bold pt-1">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{item.attachment_name || "Tệp đính kèm"} ({formatFileSize(item.attachment_size)})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Thanh công cụ quản lý nhanh */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                  {/* Switches */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.is_active}
                        onChange={() => handleToggle(item.id, "is_active")}
                        className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">Công khai</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.is_popup}
                        onChange={() => handleToggle(item.id, "is_popup")}
                        className="w-3.5 h-3.5 accent-primary cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">Pop-up</span>
                    </label>

                    {/* Quick Priority Reorder */}
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200" title="Điểm ưu tiên hiển thị">
                      <span className="text-[10px] font-bold text-slate-600">Ưu tiên: {item.priority}</span>
                      <button
                        type="button"
                        onClick={() => handlePriorityChange(item.id, 1)}
                        className="p-0.5 hover:bg-slate-200 rounded text-slate-600 transition-colors cursor-pointer"
                        title="Tăng ưu tiên (Đẩy lên trước)"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePriorityChange(item.id, -1)}
                        disabled={item.priority <= 0}
                        className="p-0.5 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30 transition-colors cursor-pointer"
                        title="Giảm ưu tiên"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Nút hành động */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold flex items-center gap-1 cursor-pointer"
                      title="Xem trước Popup"
                    >
                      <Eye className="w-3.5 h-3.5" /> Xem trước
                    </button>

                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="px-3 py-1.5 rounded-lg bg-purple-50 text-primary hover:bg-purple-100 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Sửa
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL XEM TRƯỚC (PREVIEW - Purple Frosted Glassmorphism Theme) */}
      {previewItem && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative w-full max-w-lg bg-[#140827]/90 backdrop-blur-2xl border border-purple-500/30 rounded-3xl shadow-[0_0_50px_rgba(122,34,224,0.35)] overflow-hidden max-h-[90vh] flex flex-col text-white animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-purple-500/20 flex items-start justify-between gap-3 bg-gradient-to-b from-purple-900/35 to-transparent">
              <div className="space-y-1.5 flex-1">
                {(() => {
                  const b = getCategoryBadge(previewItem.category);
                  const Icon = b.icon;
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black border ${b.className} ${b.glow}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {b.label}
                    </span>
                  );
                })()}
                <h3 className="text-base sm:text-lg font-black text-white leading-snug drop-shadow-sm">
                  {previewItem.title}
                </h3>
                <p className="text-[10px] text-purple-300/70">
                  Xem trước giao diện Pop-up người dùng
                </p>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1.5 rounded-full text-purple-300/70 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nội dung */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {previewItem.image_url && (
                <div className="relative group rounded-2xl overflow-hidden border border-purple-500/25 bg-purple-950/40 backdrop-blur-md shadow-inner flex items-center justify-center min-h-[180px]">
                  <div 
                    className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-40 scale-125"
                    style={{ backgroundImage: `url(${previewItem.image_url})` }}
                    aria-hidden="true"
                  />
                  <div className="absolute inset-0 bg-[#120722]/50 backdrop-blur-[2px]" aria-hidden="true" />
                  <img
                    src={previewItem.image_url}
                    alt={previewItem.title}
                    className="relative z-10 max-h-72 w-auto max-w-full object-contain mx-auto rounded-xl drop-shadow-lg"
                  />
                </div>
              )}

              <div className="text-sm text-purple-100/95 leading-relaxed whitespace-pre-line">
                {previewItem.content}
              </div>

              {previewItem.attachment_url && (
                <div className="p-3.5 bg-purple-900/30 rounded-2xl border border-purple-500/30 flex items-center justify-between text-xs text-purple-100">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-bold text-white">{previewItem.attachment_name || "File đính kèm"}</span>
                  </div>
                  <span className="text-[10px] text-purple-300/70">Tải về</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-purple-500/20 bg-purple-950/50 flex items-center justify-between">
              <span className="text-[11px] text-purple-300/70">Chế độ xem trước</span>
              <button
                onClick={() => setPreviewItem(null)}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-500 text-white font-black text-xs shadow-[0_0_15px_rgba(122,34,224,0.4)] cursor-pointer"
              >
                Đã hiểu (Thử nghiệm)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
