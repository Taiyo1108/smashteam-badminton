"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Plus, Trash2, Film, Image as ImageIcon, Star, Check, Loader2, Play, AlertCircle, Eye, EyeOff, Clock, Sparkles } from "lucide-react";
import { API_URL } from "@/app/config";

export default function ContentManagementPage() {
  // States for Site settings (Cover Image)
  const [settings, setSettings] = useState<any>({});
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [coverSuccess, setCoverSuccess] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // States for Hero Titles (Tiêu đề chính & Tiêu đề phụ Trang chủ)
  const [heroForm, setHeroForm] = useState({
    titleLine1: "",
    titleLine2: "",
    subtitle: "",
  });
  const [heroLoading, setHeroLoading] = useState(false);
  const [heroSuccess, setHeroSuccess] = useState(false);
  const [heroError, setHeroError] = useState("");

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

  // Fetch all settings
  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setHeroForm({
          titleLine1: data.homepage_hero_title_line1 ?? "ĐAM MÊ DẪN LỐI",
          titleLine2: data.homepage_hero_title_line2 ?? "ĐẬP TAN GIỚI HẠN",
          subtitle: data.homepage_hero_subtitle ?? "Smash Team - Câu lạc bộ cầu lông sinh viên năng động, chuyên nghiệp và nhiệt huyết hàng đầu khu vực Làng Đại Học. Nơi thanh xuân bùng nổ cùng những đường cầu!",
        });
      }
    } catch (e) {
      console.error("Error fetching settings:", e);
    }
  };

  // Save hero titles (batch update settings)
  const handleSaveHeroTitles = async (e: React.FormEvent) => {
    e.preventDefault();
    setHeroLoading(true);
    setHeroSuccess(false);
    setHeroError("");

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          settings: {
            homepage_hero_title_line1: heroForm.titleLine1.trim(),
            homepage_hero_title_line2: heroForm.titleLine2.trim(),
            homepage_hero_subtitle: heroForm.subtitle.trim()
          }
        })
      });

      if (res.ok) {
        setHeroSuccess(true);
        setSettings((prev: any) => ({
          ...prev,
          homepage_hero_title_line1: heroForm.titleLine1.trim(),
          homepage_hero_title_line2: heroForm.titleLine2.trim(),
          homepage_hero_subtitle: heroForm.subtitle.trim()
        }));
        setTimeout(() => setHeroSuccess(false), 3500);
      } else {
        const data = await res.json().catch(() => ({}));
        setHeroError(data.error || "Không thể lưu tiêu đề.");
      }
    } catch (err) {
      setHeroError("Lỗi kết nối khi lưu tiêu đề.");
    } finally {
      setHeroLoading(false);
    }
  };

  // Toggle homepage modules
  const [toggleLoading, setToggleLoading] = useState(false);
  const handleToggleModule = async (key: string, currentVal: boolean) => {
    const nextVal = !currentVal;
    setToggleLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ key, value: String(nextVal) })
      });
      if (res.ok) {
        setSettings((prev: any) => ({ ...prev, [key]: String(nextVal) }));
      }
    } catch (e) {
      console.error("Error toggling module:", e);
    } finally {
      setToggleLoading(false);
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
        alert("Đăng bài viết mới thành công!");
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
  const handleDeletePost = async (postId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này không? Điều này sẽ gỡ bài khỏi Trang chủ và xóa file ảnh liên quan.")) return;

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/media/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        alert("Xóa bài viết thành công!");
        fetchMediaPosts();
      } else {
        const err = await res.json();
        alert(err.error || "Lỗi khi xóa bài viết.");
      }
    } catch (e) {
      alert("Lỗi kết nối mạng.");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-secondary mb-2">Quản lý nội dung</h1>
        <p className="text-slate-500">Cập nhật ảnh bìa giao diện và đăng các hoạt động truyền thông của câu lạc bộ.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CỘT TRÁI: TIÊU ĐỀ HERO, THAY THẾ ẢNH BÌA & MODULES */}
        <div className="lg:col-span-1 space-y-6">
          {/* CẤU HÌNH TIÊU ĐỀ HERO TRANG CHỦ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-secondary flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Tiêu đề Hero Trang chủ
            </h2>
            <p className="text-xs text-slate-500">
              Tùy chỉnh tiêu đề chính (hiển thị hiệu ứng chữ rỗng thể thao) và tiêu đề phụ giới thiệu câu lạc bộ trên trang chủ.
            </p>

            <form onSubmit={handleSaveHeroTitles} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tiêu đề chính - Dòng 1 (Viền trắng rỗng)
                </label>
                <input
                  type="text"
                  value={heroForm.titleLine1}
                  onChange={(e) => setHeroForm({ ...heroForm, titleLine1: e.target.value })}
                  placeholder="Ví dụ: ĐAM MÊ DẪN LỐI"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tiêu đề chính - Dòng 2 (Viền neon phát sáng)
                </label>
                <input
                  type="text"
                  value={heroForm.titleLine2}
                  onChange={(e) => setHeroForm({ ...heroForm, titleLine2: e.target.value })}
                  placeholder="Ví dụ: ĐẬP TAN GIỚI HẠN"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tiêu đề phụ (Mô tả nhỏ ở dưới)
                </label>
                <textarea
                  rows={3}
                  value={heroForm.subtitle}
                  onChange={(e) => setHeroForm({ ...heroForm, subtitle: e.target.value })}
                  placeholder="Mô tả ngắn gọn về câu lạc bộ..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-3.5 bg-secondary rounded-xl border border-primary/30 space-y-1.5 shadow-inner">
                <span className="text-[10px] uppercase font-black tracking-wider text-purple-300 block">
                  Xem trước tiêu đề
                </span>
                <div className="text-sm font-black tracking-tight leading-tight">
                  <span className="hero-hollow-text-white block">
                    {heroForm.titleLine1 || "ĐAM MÊ DẪN LỐI"}
                  </span>
                  {heroForm.titleLine2 && (
                    <span className="hero-hollow-text-glow block mt-0.5">
                      {heroForm.titleLine2}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300/80 line-clamp-2 leading-relaxed pt-1">
                  {heroForm.subtitle || "Smash Team - Câu lạc bộ cầu lông sinh viên..."}
                </p>
              </div>

              {/* Success / Error Alerts */}
              {heroSuccess && (
                <div className="p-3 bg-green-50 text-green-700 rounded-xl text-xs flex items-center gap-2 border border-green-200">
                  <Check className="w-4 h-4 shrink-0" /> Cập nhật tiêu đề trang chủ thành công!
                </div>
              )}

              {heroError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {heroError}
                </div>
              )}

              <button
                type="submit"
                disabled={heroLoading}
                className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {heroLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang lưu...
                  </>
                ) : (
                  <>Lưu thay đổi tiêu đề</>
                )}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" /> Ảnh bìa Trang chủ
            </h2>

            <div className="space-y-4">
              {/* Cover Photo Preview */}
              <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                {settings.homepage_cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.homepage_cover_url}
                    alt="Homepage Cover"
                    className="w-full h-full object-cover"
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
                  className="w-full py-3 px-4 border border-dashed border-slate-300 hover:border-primary hover:bg-slate-50 text-slate-600 hover:text-primary rounded-xl font-bold transition-all flex items-center justify-center gap-2"
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

          {/* CẤU HÌNH BẬT / TẮT MODULES TRANG CHỦ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-secondary flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" /> Hiển thị Modules Trang Chủ
            </h2>
            <p className="text-xs text-slate-500">
              Bật hoặc tắt hiển thị các thành phần nổi bật trên trang chủ câu lạc bộ.
            </p>

            <div className="space-y-3 pt-2">
              {/* Toggle 1: Box Đếm Ngược */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    settings.featured_event_enabled !== "false" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                  }`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Box Đếm Ngược Sự Kiện</p>
                    <p className="text-[11px] text-slate-500">
                      {settings.featured_event_enabled !== "false" ? "🟢 Đang hiển thị" : "⚪ Đang ẩn"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={toggleLoading}
                  onClick={() => handleToggleModule("featured_event_enabled", settings.featured_event_enabled !== "false")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    settings.featured_event_enabled !== "false"
                      ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {settings.featured_event_enabled !== "false" ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Tắt</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Bật</span>
                    </>
                  )}
                </button>
              </div>

              {/* Toggle 2: Box Tuyển Quân */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    settings.recruitment_card_enabled !== "false" ? "bg-cyan-100 text-cyan-700" : "bg-slate-200 text-slate-500"
                  }`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Box Sự Kiện / Tuyển Quân</p>
                    <p className="text-[11px] text-slate-500">
                      {settings.recruitment_card_enabled !== "false" ? "🟢 Đang hiển thị" : "⚪ Đang ẩn"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={toggleLoading}
                  onClick={() => handleToggleModule("recruitment_card_enabled", settings.recruitment_card_enabled !== "false")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    settings.recruitment_card_enabled !== "false"
                      ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                      : "bg-cyan-600 hover:bg-cyan-700 text-white"
                  }`}
                >
                  {settings.recruitment_card_enabled !== "false" ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Tắt</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Bật</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: ĐĂNG BÀI MỚI & DANH SÁCH BÀI VIẾT */}
        <div className="lg:col-span-2 space-y-6">
          {/* Biểu mẫu đăng bài */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Đăng bài viết / Hoạt động mới
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
                  className="w-full p-3 border rounded-xl text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Loại bài đăng</label>
                  <select
                    value={postForm.type}
                    onChange={(e) => setPostForm({ ...postForm, type: e.target.value })}
                    className="w-full p-3 border rounded-xl text-sm outline-none focus:border-primary bg-white"
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
                      className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
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
                    className="w-full p-2.5 border rounded-xl text-sm outline-none bg-slate-50"
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
                    className="w-full p-3 border rounded-xl text-sm outline-none focus:border-primary"
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
                  className="px-6 py-3 bg-secondary hover:bg-slate-900 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm"
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
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : mediaPosts.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-8">Chưa có bài viết nào được đăng.</p>
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
                              className="w-full h-full pointer-events-none opacity-40"
                              frameBorder="0"
                            />
                          </>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.content_url}
                            alt={post.title}
                            className="w-full h-full object-cover"
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
                            Đăng ngày: {new Date(post.created_at).toLocaleDateString("vi-VN", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                          <span className="text-[11px] text-slate-500 truncate max-w-[70%]" title={post.content_url}>
                            {post.content_url}
                          </span>
                          <button
                            onClick={() => handleDeletePost(post.id)}
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
    </div>
  );
}
