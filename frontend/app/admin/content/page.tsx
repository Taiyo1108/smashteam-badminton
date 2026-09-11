"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Upload, Plus, Trash2, Film, Image as ImageIcon, Star, Check, Loader2, Play, AlertCircle, Clock, Flame, Calendar, MapPin, Save } from "lucide-react";
import { API_URL } from "@/app/config";
import { PageHeader, Modal, PillButton, EmptyState, CardSkeleton } from "@/app/components/ui";
import { format } from "date-fns";

export default function ContentManagementPage() {
  // States for Site settings (Cover Image)
  const [settings, setSettings] = useState<any>({});
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [coverSuccess, setCoverSuccess] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // States cho Giới thiệu & Liên hệ trang chủ (About)
  const [aboutBlocks, setAboutBlocks] = useState([
    { lead: "", tail: "" },
    { lead: "", tail: "" },
    { lead: "", tail: "" },
  ]);
  const [contactAddress, setContactAddress] = useState("");
  const [contactOrg, setContactOrg] = useState("");
  const [contacts, setContacts] = useState([{ name: "", phone: "", role: "" }]);
  // Kênh mạng xã hội hiển thị ở footer Liên hệ trang chủ (thêm/sửa link tùy ý)
  const [socialLinks, setSocialLinks] = useState([
    { label: "Facebook", url: "" },
    { label: "Instagram", url: "" },
    { label: "Youtube", url: "" },
  ]);
  const [aboutSaving, setAboutSaving] = useState(false);
  const [aboutError, setAboutError] = useState("");
  // States for Featured Event Countdown Settings
  const [eventForm, setEventForm] = useState({
    title: "",
    subtitle: "",
    date: "",
    location: "",
    badge: "GIẢI ĐẤU NỔI BẬT",
    actionText: "Đăng ký tham gia ngay",
    actionLink: "/schedule",
    enabled: true
  });
  const [eventSaving, setEventSaving] = useState(false);
  const [eventSuccess, setEventSuccess] = useState(false);
  const [eventError, setEventError] = useState("");

  // States for Media Posts
  const [mediaPosts, setMediaPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  
  // Create Post Form State
  const [postForm, setPostForm] = useState({
    title: "",
    type: "image", // "image" | "video"
    videoUrl: "",
    isFeatured: false,
  });
  const [postFile, setPostFile] = useState<File | null>(null);
  const postFileInputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState("");
  const [deletingPost, setDeletingPost] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Parse YouTube URL to Standard Embed URL
  const normalizeYoutubeUrl = (url: string): string => {
    if (!url) return "";
    // Match common YT URL patterns (watch?v=, share link, shorts, embed, etc.)
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
      const videoId = match[2];
      return `https://www.youtube.com/embed/${videoId}`;
    }

    return url;
  };

  // Tự thêm https:// nếu admin quên nhập (VD: facebook.com/... -> https://facebook.com/...)
  const normalizeSocialUrl = (url: string): string => {
    const trimmed = String(url ?? "").trim();
    if (!trimmed) return "";
    if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  // Fetch all settings
  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        // Nạp form About/Liên hệ từ settings (giữ trống để trang chủ dùng mặc định)
        try {
          const blocks = typeof data.about_blocks === "string" ? JSON.parse(data.about_blocks) : data.about_blocks;
          if (Array.isArray(blocks) && blocks.length > 0) {
            setAboutBlocks([0, 1, 2].map((i) => ({
              lead: String(blocks[i]?.lead ?? ""),
              tail: String(blocks[i]?.tail ?? ""),
            })));
          }
        } catch {}
        if (typeof data.contact_address === "string") setContactAddress(data.contact_address);
        if (typeof data.contact_org === "string") setContactOrg(data.contact_org);
        try {
          const list = typeof data.contacts === "string" ? JSON.parse(data.contacts) : data.contacts;
          if (Array.isArray(list) && list.length > 0) {
            setContacts(list.map((c: any) => ({
              name: String(c?.name ?? ""),
              phone: String(c?.phone ?? ""),
              role: String(c?.role ?? ""),
            })));
          }
        } catch {}
        try {
          const socials = typeof data.social_links === "string" ? JSON.parse(data.social_links) : data.social_links;
          if (Array.isArray(socials) && socials.length > 0) {
            setSocialLinks(socials.map((s: any) => ({
              label: String(s?.label ?? ""),
              url: String(s?.url ?? ""),
            })));
          }
        } catch {}
        if (data) {
          setEventForm({
            title: data.featured_event_title || "Giải Đấu Cầu Lông SmashTeam Championship 2026",
            subtitle: data.featured_event_subtitle || "Sự kiện quy tụ hơn 50 vợt thủ tranh cúp ELO Vàng, vinh danh tay vợt xuất sắc và phần thưởng tài trợ độc quyền.",
            date: data.featured_event_date ? data.featured_event_date.substring(0, 16) : "2026-09-20T08:30",
            location: data.featured_event_location || "Cụm Sân Cầu Lông Lan Anh, 291 CMT8, Q.10, TP.HCM",
            badge: data.featured_event_badge || "GIẢI ĐẤU NỔI BẬT",
            actionText: data.featured_event_action_text || "Đăng ký tham gia ngay",
            actionLink: data.featured_event_action_link || "/schedule",
            enabled: data.featured_event_enabled !== "false"
          });
        }
      }
    } catch (e) {
      console.error("Error fetching settings:", e);
    }
  };

  // Handle Save Featured Event Countdown
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventSaving(true);
    setEventError("");
    setEventSuccess(false);

    try {
      const token = localStorage.getItem("admin_token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      };

      const updates = [
        fetch(`${API_URL}/api/settings/featured_event_title`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ value: eventForm.title })
        }),
        fetch(`${API_URL}/api/settings/featured_event_subtitle`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ value: eventForm.subtitle })
        }),
        fetch(`${API_URL}/api/settings/featured_event_date`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ value: eventForm.date })
        }),
        fetch(`${API_URL}/api/settings/featured_event_location`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ value: eventForm.location })
        }),
        fetch(`${API_URL}/api/settings/featured_event_badge`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ value: eventForm.badge })
        }),
        fetch(`${API_URL}/api/settings/featured_event_action_text`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ value: eventForm.actionText })
        }),
        fetch(`${API_URL}/api/settings/featured_event_action_link`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ value: eventForm.actionLink })
        }),
        fetch(`${API_URL}/api/settings/featured_event_enabled`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ value: String(eventForm.enabled) })
        })
      ];

      await Promise.all(updates);
      setEventSuccess(true);
      setTimeout(() => setEventSuccess(false), 3500);
      fetchSettings();
    } catch (err) {
      setEventError("Lỗi kết nối khi lưu cài đặt sự kiện.");
    } finally {
      setEventSaving(false);
    }
  };

  // Fetch all media posts
  const fetchMediaPosts = async () => {
    setPostsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/media`);
      if (res.ok) {
        const data = await res.json();
        setMediaPosts(data);
      }
    } catch (e) {
      console.error("Error fetching media posts:", e);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchMediaPosts();
  }, []);

  // Handle Cover Image Upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic client validation
    if (!file.type.startsWith("image/")) {
      setCoverError("Vui lòng chọn một file hình ảnh (PNG, JPG, JPEG, WEBP).");
      return;
    }

    setCoverLoading(true);
    setCoverError("");
    setCoverSuccess(false);

    try {
      const token = localStorage.getItem("admin_token");
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`${API_URL}/api/settings/upload-cover`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setSettings((prev: any) => ({ ...prev, homepage_cover_url: data.url }));
        setCoverSuccess(true);
        setTimeout(() => setCoverSuccess(false), 3000);
      } else {
        const err = await res.json();
        setCoverError(err.error || "Không thể tải ảnh bìa lên.");
      }
    } catch (e) {
      setCoverError("Lỗi kết nối mạng khi tải lên.");
    } finally {
      setCoverLoading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  // Handle Create Media Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!postForm.title.trim()) {
      setCreateError("Vui lòng nhập tiêu đề bài đăng.");
      return;
    }

    if (postForm.type === "image" && !postFile) {
      setCreateError("Vui lòng chọn tệp hình ảnh để tải lên.");
      return;
    }

    if (postForm.type === "video" && !postForm.videoUrl.trim()) {
      setCreateError("Vui lòng nhập đường dẫn video YouTube.");
      return;
    }

    setCreateLoading(true);

    try {
      const token = localStorage.getItem("admin_token");
      const formData = new FormData();
      formData.append("title", postForm.title);
      formData.append("is_featured", String(postForm.isFeatured));

      if (postForm.type === "image" && postFile) {
        formData.append("image", postFile);
      } else if (postForm.type === "video") {
        // Standardize YT url before sending to API
        const embedUrl = normalizeYoutubeUrl(postForm.videoUrl);
        formData.append("video_url", embedUrl);
      }

      const res = await fetch(`${API_URL}/api/media`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        setNotice("Đăng bài viết mới thành công!");
        // Reset form
        setPostForm({
          title: "",
          type: "image",
          videoUrl: "",
          isFeatured: false,
        });
        setPostFile(null);
        if (postFileInputRef.current) postFileInputRef.current.value = "";

        // Refresh posts list
        fetchMediaPosts();
      } else {
        const err = await res.json();
        setCreateError(err.error || "Không thể tạo bài viết mới.");
      }
    } catch (e) {
      setCreateError("Lỗi kết nối mạng khi gửi dữ liệu.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Delete Post
  const handleDeletePost = async () => {
    if (!deletingPost) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/media/${deletingPost.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setDeletingPost(null);
        setNotice("Xóa bài viết thành công!");
        fetchMediaPosts();
      } else {
        const err = await res.json().catch(() => ({}));
        setCreateError(err.error || "Lỗi khi xóa bài viết.");
        setDeletingPost(null);
      }
    } catch (e) {
      setCreateError("Lỗi kết nối mạng.");
      setDeletingPost(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Lưu Giới thiệu & Liên hệ trang chủ (5 keys trong site_settings)
  const handleSaveAbout = async (e: React.FormEvent) => {
    e.preventDefault();
    setAboutError("");
    setAboutSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const payloads = [
        { key: "about_blocks", value: JSON.stringify(aboutBlocks) },
        { key: "contact_address", value: contactAddress },
        { key: "contact_org", value: contactOrg },
        { key: "contacts", value: JSON.stringify(contacts.filter((c) => c.name.trim() || c.phone.trim())) },
        { key: "social_links", value: JSON.stringify(socialLinks.filter((s) => s.label.trim()).map((s) => ({ label: s.label.trim(), url: normalizeSocialUrl(s.url) }))) },
      ];
      const results = await Promise.all(
        payloads.map((p) =>
          fetch(`${API_URL}/api/settings`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(p),
          })
        )
      );
      if (results.every((r) => r.ok)) {
        setNotice("Cập nhật Giới thiệu & Liên hệ trang chủ thành công!");
        fetchSettings();
      } else {
        setAboutError("Lưu chưa trọn vẹn, vui lòng thử lại.");
      }
    } catch (e) {
      setAboutError("Lỗi kết nối mạng khi lưu.");
    } finally {
      setAboutSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Nội dung"
        desc="Cập nhật ảnh bìa giao diện và đăng các hoạt động truyền thông của câu lạc bộ."
      />

      {notice && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-2xl font-medium">
          {notice}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CỘT TRÁI: THAY THẾ ẢNH BÌA */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-black" /> Ảnh bìa Trang chủ
            </h2>

            <div className="space-y-4">
              {/* Cover Photo Preview */}
              <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                {settings.homepage_cover_url ? (
                  <Image
                    src={settings.homepage_cover_url}
                    alt="Homepage Cover"
                    fill
                    sizes="(max-width: 1024px) 100vw, 380px"
                    loading="lazy"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                    Chưa có ảnh bìa
                  </div>
                )}
                {coverLoading && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                )}
              </div>

              {/* Upload Action */}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  ref={coverInputRef}
                  onChange={handleCoverUpload}
                  className="hidden"
                  id="cover-upload-input"
                  disabled={coverLoading}
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverLoading}
                  className="w-full py-3 px-4 border border-dashed border-slate-300 hover:border-black hover:bg-slate-50 text-slate-600 hover:text-black rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {coverLoading ? "Đang tải lên..." : "Tải ảnh bìa mới"}
                </button>
              </div>

              {/* Success / Error Alerts */}
              {coverSuccess && (
                <div className="p-3 bg-green-50 text-green-700 rounded-xl text-xs flex items-center gap-2 border border-green-200">
                  <Check className="w-4 h-4 shrink-0" /> Cập nhật ảnh bìa thành công!
                </div>
              )}

              {coverError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {coverError}
                </div>
              )}

              <p className="text-xs text-slate-400">
                * Khuyến nghị sử dụng ảnh ngang tỉ lệ 16:9, độ phân giải cao và được nén tối ưu để trang chủ tải nhanh nhất.
              </p>
            </div>
          </div>

          {/* CÀI ĐẶT SỰ KIỆN ĐẾM NGƯỢC NỔI BẬT */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Sự kiện Đếm ngược Trang chủ
            </h2>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tiêu đề sự kiện</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Giải Đấu Cầu Lông Mở Rộng..."
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Mô tả ngắn</label>
                <textarea
                  rows={2}
                  placeholder="Thông điệp sự kiện hoặc phần thưởng..."
                  value={eventForm.subtitle}
                  onChange={(e) => setEventForm({ ...eventForm, subtitle: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Thời gian diễn ra</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full p-2.5 border rounded-xl text-sm outline-none focus:border-primary bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Địa điểm tổ chức</label>
                  <input
                    type="text"
                    required
                    placeholder="Sân cầu lông Lan Anh, Q.10..."
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    className="w-full p-2.5 border rounded-xl text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Huy hiệu (Badge)</label>
                  <input
                    type="text"
                    placeholder="SỰ KIỆN NỔI BẬT"
                    value={eventForm.badge}
                    onChange={(e) => setEventForm({ ...eventForm, badge: e.target.value })}
                    className="w-full p-2.5 border rounded-xl text-xs outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Chữ nút bấm (CTA)</label>
                  <input
                    type="text"
                    placeholder="Đăng ký tham gia ngay"
                    value={eventForm.actionText}
                    onChange={(e) => setEventForm({ ...eventForm, actionText: e.target.value })}
                    className="w-full p-2.5 border rounded-xl text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={eventForm.enabled}
                    onChange={(e) => setEventForm({ ...eventForm, enabled: e.target.checked })}
                    className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Bật hiển thị bảng đếm ngược tại Trang chủ
                  </span>
                </label>
              </div>

              {eventSuccess && (
                <div className="p-3 bg-green-50 text-green-700 rounded-xl text-xs flex items-center gap-2 border border-green-200">
                  <Check className="w-4 h-4 shrink-0" /> Đã lưu cấu hình đếm ngược thành công!
                </div>
              )}

              {eventError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {eventError}
                </div>
              )}

              <button
                type="submit"
                disabled={eventSaving}
                className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {eventSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Lưu cấu hình sự kiện
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* CỘT PHẢI: ĐĂNG BÀI MỚI & DANH SÁCH BÀI VIẾT */}
        <div className="lg:col-span-2 space-y-6">
          {/* Biểu mẫu đăng bài */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-black" /> Đăng bài viết / Hoạt động mới
            </h2>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tiêu đề bài đăng</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Giải đấu Mùa Xuân 2026, Tập luyện hàng tuần..."
                  value={postForm.title}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                  className="w-full p-3 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Loại bài đăng</label>
                  <select
                    value={postForm.type}
                    onChange={(e) => setPostForm({ ...postForm, type: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-black bg-white"
                  >
                    <option value="image">Hình ảnh (Upload)</option>
                    <option value="video">Video (YouTube URL)</option>
                  </select>
                </div>

                <div className="flex items-end pb-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={postForm.isFeatured}
                      onChange={(e) => setPostForm({ ...postForm, isFeatured: e.target.checked })}
                      className="w-4 h-4 text-black rounded border-slate-300 focus:ring-black"
                    />
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      Đánh dấu nổi bật <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    </span>
                  </label>
                </div>
              </div>

              {/* Conditional Input based on Type */}
              {postForm.type === "image" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Tải ảnh lên (Cloudinary)</label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={postFileInputRef}
                    onChange={(e) => setPostFile(e.target.files?.[0] || null)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none bg-slate-50"
                  />
                  {postFile && (
                    <p className="text-xs text-green-600 mt-1">Đã chọn: {postFile.name} ({(postFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Đường dẫn video YouTube</label>
                  <input
                    type="text"
                    placeholder="Dán link YouTube (Ví dụ: https://www.youtube.com/watch?v=... hoặc https://youtu.be/...)"
                    value={postForm.videoUrl}
                    onChange={(e) => setPostForm({ ...postForm, videoUrl: e.target.value })}
                    className="w-full p-3 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-black"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    * Hệ thống sẽ tự động chuyển đổi thành link nhúng Embed dạng chuẩn.
                  </p>
                </div>
              )}

              {createError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {createError}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-6 h-12 bg-black hover:bg-black/85 text-white rounded-full font-bold transition-all flex items-center gap-2 shadow-sm"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...
                    </>
                  ) : (
                    <>Lưu & Đăng bài</>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Danh sách bài viết */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-secondary mb-4">Danh sách Hoạt động nổi bật</h2>

            {postsLoading ? (
              <CardSkeleton rows={2} />
            ) : mediaPosts.length === 0 ? (
              <EmptyState title="Chưa có bài viết nào" desc="Đăng hoạt động đầu tiên để hiển thị lên trang chủ." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mediaPosts.map((post) => {
                  const isVideo = post.content_url.includes("youtube.com") || 
                                  post.content_url.includes("youtu.be") || 
                                  post.content_url.includes("embed");

                  return (
                    <div
                      key={post.id}
                      className="border border-slate-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between bg-slate-50/50"
                    >
                      {/* Media Preview Thumbnail */}
                      <div className="relative aspect-[16/10] bg-slate-900 flex items-center justify-center overflow-hidden border-b border-slate-100">
                        {isVideo ? (
                          <>
                            <div className="absolute inset-0 bg-slate-800/80 flex items-center justify-center">
                              <Play className="w-12 h-12 text-white/60" />
                            </div>
                            <iframe
                              src={post.content_url}
                              title={post.title}
                              loading="lazy"
                              className="w-full h-full pointer-events-none opacity-40"
                              frameBorder="0"
                            />
                          </>
                        ) : (
                          <Image
                            src={post.content_url}
                            alt={post.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 400px"
                            loading="lazy"
                            unoptimized
                            className="object-cover"
                          />
                        )}

                        {post.is_featured && (
                          <span className="absolute top-2 left-2 bg-amber-500 text-white p-1 rounded-lg shadow-sm" title="Bài đăng nổi bật">
                            <Star className="w-4 h-4 fill-white text-white" />
                          </span>
                        )}

                        <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          {isVideo ? "Video" : "Hình ảnh"}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm line-clamp-2" title={post.title}>
                            {post.title}
                          </h3>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Đăng ngày: {format(new Date(post.created_at), "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                          <span className="text-[11px] text-slate-500 truncate max-w-[70%]" title={post.content_url}>
                            {post.content_url}
                          </span>
                          <button
                            onClick={() => setDeletingPost(post)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa bài viết"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GIỚI THIỆU & LIÊN HỆ TRANG CHỦ (About) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-secondary mb-1">Giới thiệu & Liên hệ trang chủ</h2>
        <p className="text-xs text-slate-400 mb-5">
          Nội dung hiển thị ở mục About trang chủ. Bỏ trống để dùng mặc định. Phần chữ mờ hỗ trợ{" "}
          <code className="px-1 bg-slate-100 rounded font-bold">{"{members}"}</code> (số hội viên thật),{" "}
          <code className="px-1 bg-slate-100 rounded font-bold">{"{address}"}</code> (địa chỉ),{" "}
          <code className="px-1 bg-slate-100 rounded font-bold">{"{org}"}</code> (đơn vị).
        </p>

        <form onSubmit={handleSaveAbout} className="space-y-5">
          {aboutBlocks.map((b, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="md:col-span-2 text-xs font-black text-slate-500 uppercase tracking-wider">
                Đoạn {i + 1}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Chữ nổi bật (trắng)</label>
                <input
                  type="text"
                  value={b.lead}
                  onChange={(e) => setAboutBlocks(aboutBlocks.map((x, j) => (j === i ? { ...x, lead: e.target.value } : x)))}
                  placeholder="Câu mở đầu nổi bật..."
                  className="w-full p-2.5 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Chữ mờ (xám)</label>
                <textarea
                  value={b.tail}
                  onChange={(e) => setAboutBlocks(aboutBlocks.map((x, j) => (j === i ? { ...x, tail: e.target.value } : x)))}
                  placeholder="Phần chữ mờ phía sau..."
                  rows={2}
                  className="w-full p-2.5 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-black resize-y"
                />
              </div>
            </div>
          ))}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Địa chỉ</label>
              <input
                type="text"
                value={contactAddress}
                onChange={(e) => setContactAddress(e.target.value)}
                placeholder="304 ĐT743A, Đông Hòa, Hồ Chí Minh"
                className="w-full p-2.5 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Đơn vị</label>
              <input
                type="text"
                value={contactOrg}
                onChange={(e) => setContactOrg(e.target.value)}
                placeholder="Đơn vị chủ quản (nếu có)"
                className="w-full p-2.5 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-black"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-600">Main contact</label>
              <button
                type="button"
                onClick={() => setContacts([...contacts, { name: "", phone: "", role: "" }])}
                className="text-xs font-bold text-slate-600 hover:text-black flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm liên hệ
              </button>
            </div>
            <div className="space-y-2">
              {contacts.map((c, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2">
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => setContacts(contacts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    placeholder="Họ tên"
                    className="p-2.5 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    value={c.phone}
                    onChange={(e) => setContacts(contacts.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))}
                    placeholder="SĐT"
                    className="p-2.5 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    value={c.role}
                    onChange={(e) => setContacts(contacts.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}
                    placeholder="Vai trò"
                    className="p-2.5 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-black"
                  />
                  <button
                    type="button"
                    onClick={() => setContacts(contacts.filter((_, j) => j !== i))}
                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="Xóa liên hệ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-600">Kênh mạng xã hội (footer Liên hệ)</label>
              <button
                type="button"
                onClick={() => setSocialLinks([...socialLinks, { label: "", url: "" }])}
                className="text-xs font-bold text-slate-600 hover:text-black flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm kênh
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Tên kênh hiển thị ở footer trang chủ. Dán link để bấm vào mở trang mới, bỏ trống link nếu chỉ hiển thị tên.
            </p>
            <div className="space-y-2">
              {socialLinks.map((s, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2">
                  <input
                    type="text"
                    value={s.label}
                    onChange={(e) => setSocialLinks(socialLinks.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                    placeholder="Tên kênh (VD: TikTok)"
                    className="p-2.5 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-black"
                  />
                  <input
                    type="url"
                    value={s.url}
                    onChange={(e) => setSocialLinks(socialLinks.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                    placeholder="Link (VD: https://facebook.com/...)"
                    className="p-2.5 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-black"
                  />
                  <button
                    type="button"
                    onClick={() => setSocialLinks(socialLinks.filter((_, j) => j !== i))}
                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="Xóa kênh"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {aboutError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" /> {aboutError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={aboutSaving}
              className="px-6 h-12 bg-black hover:bg-black/85 text-white rounded-full font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {aboutSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...
                </>
              ) : (
                <>Lưu Giới thiệu & Liên hệ</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* DELETE CONFIRM MODAL */}
      <Modal
        open={!!deletingPost}
        onClose={() => setDeletingPost(null)}
        title="Xóa bài viết?"
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Xóa bài <strong>“{deletingPost?.title}”</strong>? Bài sẽ bị gỡ khỏi trang chủ và xóa file ảnh liên quan.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <PillButton variant="ghost" onClick={() => setDeletingPost(null)}>
            Hủy
          </PillButton>
          <PillButton variant="danger" loading={isDeleting} onClick={handleDeletePost}>
            Xóa bài viết
          </PillButton>
        </div>
      </Modal>
    </div>
  );
}
