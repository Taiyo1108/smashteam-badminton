"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Upload, Plus, Trash2, Film, Image as ImageIcon, Star, Check, Loader2, Play, 
  AlertCircle, Eye, EyeOff, Clock, Sparkles, Bell, Edit3, ChevronUp, ChevronDown, X, Save 
} from "lucide-react";
import { API_URL } from "@/app/config";
import AnnouncementsTab from "./AnnouncementsTab";

export default function ContentManagementPage() {
  // Sub-tabs State
  const [activeSubTab, setActiveSubTab] = useState<"announcements" | "media" | "hero_settings">("announcements");

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
    font: "inter",
    style: "classic",
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

  // Edit Post Modal State
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    type: "image", // "image" | "video"
    videoUrl: "",
    isFeatured: false,
  });
  const [editFile, setEditFile] = useState<File | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);

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
        try {
          localStorage.setItem("site_settings_cache", JSON.stringify(data));
        } catch (e) {}
        setHeroForm({
          titleLine1: data.homepage_hero_title_line1 ?? "ĐAM MÊ DẪN LỐI",
          titleLine2: data.homepage_hero_title_line2 ?? "ĐẬP TAN GIỚI HẠN",
          subtitle: data.homepage_hero_subtitle ?? "Smash Team - Câu lạc bộ cầu lông sinh viên năng động, chuyên nghiệp và nhiệt huyết hàng đầu khu vực Làng Đại Học. Nơi thanh xuân bùng nổ cùng những đường cầu!",
          font: data.homepage_hero_font ?? "inter",
          style: data.homepage_hero_style ?? "classic",
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
            homepage_hero_subtitle: heroForm.subtitle.trim(),
            homepage_hero_font: heroForm.font,
            homepage_hero_style: heroForm.style,
          }
        })
      });

      if (res.ok) {
        setHeroSuccess(true);
        const updated = {
          ...settings,
          homepage_hero_title_line1: heroForm.titleLine1.trim(),
          homepage_hero_title_line2: heroForm.titleLine2.trim(),
          homepage_hero_subtitle: heroForm.subtitle.trim(),
          homepage_hero_font: heroForm.font,
          homepage_hero_style: heroForm.style,
        };
        setSettings(updated);
        try {
          localStorage.setItem("site_settings_cache", JSON.stringify(updated));
        } catch (e) {}
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

  // Handle Open Edit Post Modal
  const handleOpenEditPost = (post: any) => {
    const isVideo = post.content_url.includes("youtube.com") || 
                    post.content_url.includes("youtu.be") || 
                    post.content_url.includes("embed");
    setEditingPost(post);
    setEditForm({
      title: post.title || "",
      type: isVideo ? "video" : "image",
      videoUrl: isVideo ? post.content_url : "",
      isFeatured: Boolean(post.is_featured),
    });
    setEditFile(null);
    setEditError("");
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  // Handle Save Edit Post
  const handleSaveEditPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    setEditError("");

    if (!editForm.title.trim()) {
      setEditError("Vui lòng nhập tiêu đề bài đăng.");
      return;
    }

    if (editForm.type === "video" && !editForm.videoUrl.trim()) {
      setEditError("Vui lòng nhập đường dẫn video YouTube.");
      return;
    }

    setEditLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const formData = new FormData();
      formData.append("title", editForm.title.trim());
      formData.append("is_featured", String(editForm.isFeatured));

      if (editForm.type === "image") {
        if (editFile) {
          formData.append("image", editFile);
        }
      } else {
        const embedUrl = normalizeYoutubeUrl(editForm.videoUrl);
        formData.append("video_url", embedUrl);
      }

      const res = await fetch(`${API_URL}/api/media/${editingPost.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        setEditingPost(null);
        fetchMediaPosts();
      } else {
        const err = await res.json().catch(() => ({}));
        setEditError(err.error || "Không thể cập nhật bài viết.");
      }
    } catch (e) {
      setEditError("Lỗi kết nối mạng khi cập nhật bài viết.");
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Move Post Up or Down (Reorder)
  const handleMovePost = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= mediaPosts.length) return;

    const currentItem = mediaPosts[index];
    const targetItem = mediaPosts[targetIndex];

    // Optimistic UI Update
    const newPosts = [...mediaPosts];
    newPosts[index] = targetItem;
    newPosts[targetIndex] = currentItem;
    setMediaPosts(newPosts);
    setMovingId(currentItem.id);

    try {
      const token = localStorage.getItem("admin_token");
      const ordered_ids = newPosts.map((p) => p.id);
      const res = await fetch(`${API_URL}/api/media/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ordered_ids }),
      });

      if (!res.ok) {
        // Rollback upon error
        fetchMediaPosts();
      }
    } catch (e) {
      console.error("Lỗi khi sắp xếp thứ tự bài viết:", e);
      fetchMediaPosts();
    } finally {
      setMovingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-secondary mb-2">Quản lý nội dung</h1>
        <p className="text-slate-500">Cập nhật ảnh bìa giao diện và đăng các hoạt động truyền thông của câu lạc bộ.</p>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab("announcements")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "announcements"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-secondary"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>📢 Thông Báo Website</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("media")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "media"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-secondary"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>📸 Thư Viện Bài Viết & Hoạt Động</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("hero_settings")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "hero_settings"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-secondary"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>🎨 Tiêu Đề Hero & Giao Diện Trang Chủ</span>
        </button>
      </div>

      {/* SUB-TAB 1: THÔNG BÁO WEBSITE */}
      {activeSubTab === "announcements" && <AnnouncementsTab />}

      {/* SUB-TAB 3: CẤU HÌNH TIÊU ĐỀ HERO & ẢNH BÌA */}
      {activeSubTab === "hero_settings" && (
        <div className="max-w-4xl space-y-6">
          {/* CẤU HÌNH TIÊU ĐỀ HERO TRANG CHỦ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-secondary flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Tiêu đề & Phông chữ Trang chủ
            </h2>
            <p className="text-xs text-slate-500">
              Tùy chỉnh nội dung tiêu đề, lựa chọn phông chữ phổ biến và kiểu hiển thị (chữ đặc nguyên bản kiểu cũ, chữ rỗng, neon...) trên trang chủ.
            </p>

            <form onSubmit={handleSaveHeroTitles} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tiêu đề chính - Dòng 1
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
                  Tiêu đề chính - Dòng 2
                </label>
                <input
                  type="text"
                  value={heroForm.titleLine2}
                  onChange={(e) => setHeroForm({ ...heroForm, titleLine2: e.target.value })}
                  placeholder="Ví dụ: ĐẬP TAN GIỚI HẠN"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Lựa chọn Phông chữ (Font Family) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Phông chữ tiêu đề chính</span>
                  <span className="text-[11px] font-semibold text-primary">6 font tuyển chọn</span>
                </label>
                <select
                  value={heroForm.font}
                  onChange={(e) => setHeroForm({ ...heroForm, font: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white cursor-pointer"
                >
                  <option value="inter">1. Inter (Phông chữ cũ / Mặc định ban đầu)</option>
                  <option value="montserrat">2. Montserrat (Hiện đại, nét đậm thể thao - Rất đẹp)</option>
                  <option value="bevietnam">3. Be Vietnam Pro (Chuẩn tiếng Việt, thanh thoát hiện đại)</option>
                  <option value="oswald">4. Oswald (Thể thao cô đọng, cao ráo, poster)</option>
                  <option value="kanit">5. Kanit (Năng động, thể thao, bo góc cá tính)</option>
                  <option value="barlow">6. Barlow Condensed (Đậm chất giải đấu, tốc độ, sắc bén)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  * Hỗ trợ 100% đầy đủ dấu Tiếng Việt, hiển thị mượt mà trên mọi thiết bị.
                </p>
              </div>

              {/* Lựa chọn Kiểu hiển thị / Hiệu ứng */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Kiểu hiển thị / Hiệu ứng chữ</span>
                  <span className="text-[11px] font-semibold text-primary">4 kiểu thể thao</span>
                </label>
                <select
                  value={heroForm.style}
                  onChange={(e) => setHeroForm({ ...heroForm, style: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white cursor-pointer"
                >
                  <option value="classic">Chữ đặc nguyên bản (Kiểu cũ: Dòng 1 trắng, dòng 2 tím hồng)</option>
                  <option value="hollow">Chữ rỗng ruột (Hollow: Viền trắng dòng 1, viền neon tím dòng 2)</option>
                  <option value="neon">Chữ phát sáng Neon Glow (Trắng ánh sáng & Tím neon)</option>
                  <option value="solid_white">Chữ trắng đặc 3D (Trắng tuyết nguyên khối, đổ bóng thể thao)</option>
                </select>
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
              <div className="p-3.5 bg-secondary rounded-xl border border-primary/30 space-y-2 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black tracking-wider text-purple-300">
                    Xem trước tiêu đề
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Font: <strong className="text-purple-300 capitalize">{heroForm.font}</strong> | Kiểu: <strong className="text-purple-300 capitalize">{heroForm.style}</strong>
                  </span>
                </div>

                <div className={`text-base sm:text-lg font-black tracking-tight leading-tight ${
                  heroForm.font === "montserrat" ? "font-hero-montserrat" :
                  heroForm.font === "bevietnam" ? "font-hero-bevietnam" :
                  heroForm.font === "oswald" ? "font-hero-oswald uppercase" :
                  heroForm.font === "kanit" ? "font-hero-kanit" :
                  heroForm.font === "barlow" ? "font-hero-barlow uppercase" :
                  "font-hero-inter"
                }`}>
                  {heroForm.style === "hollow" ? (
                    <>
                      <span className="hero-hollow-text-white block">
                        {heroForm.titleLine1 || "ĐAM MÊ DẪN LỐI"}
                      </span>
                      {heroForm.titleLine2 && (
                        <span className="hero-hollow-text-glow block mt-0.5">
                          {heroForm.titleLine2}
                        </span>
                      )}
                    </>
                  ) : heroForm.style === "neon" ? (
                    <>
                      <span className="text-white block drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]">
                        {heroForm.titleLine1 || "ĐAM MÊ DẪN LỐI"}
                      </span>
                      {heroForm.titleLine2 && (
                        <span className="text-fuchsia-400 block mt-0.5 drop-shadow-[0_0_20px_rgba(217,70,239,0.9)]">
                          {heroForm.titleLine2}
                        </span>
                      )}
                    </>
                  ) : heroForm.style === "solid_white" ? (
                    <>
                      <span className="text-white block drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        {heroForm.titleLine1 || "ĐAM MÊ DẪN LỐI"}
                      </span>
                      {heroForm.titleLine2 && (
                        <span className="text-white/95 block mt-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                          {heroForm.titleLine2}
                        </span>
                      )}
                    </>
                  ) : (
                    /* Default classic: Kiểu cũ */
                    <>
                      <span className="text-white block drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        {heroForm.titleLine1 || "ĐAM MÊ DẪN LỐI"}
                      </span>
                      {heroForm.titleLine2 && (
                        <span className="bg-gradient-to-r from-purple-400 via-primary-hover to-pink-400 bg-clip-text text-transparent block mt-0.5 drop-shadow-[0_0_20px_rgba(157,78,221,0.6)]">
                          {heroForm.titleLine2}
                        </span>
                      )}
                    </>
                  )}
                </div>

                <p className="text-[11px] text-slate-300/80 line-clamp-2 leading-relaxed pt-1">
                  {heroForm.subtitle || "Smash Team - Câu lạc bộ cầu lông sinh viên..."}
                </p>
              </div>

              {/* Success / Error Alerts */}
              {heroSuccess && (
                <div className="p-3 bg-green-50 text-green-700 rounded-xl text-xs flex items-center gap-2 border border-green-200">
                  <Check className="w-4 h-4 shrink-0" /> Cập nhật tiêu đề & phông chữ trang chủ thành công!
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
                  <>Lưu thay đổi tiêu đề & phông chữ</>
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
      )}

      {/* SUB-TAB 2: THƯ VIỆN BÀI VIẾT & MEDIA */}
      {activeSubTab === "media" && (
        <div className="space-y-6 max-w-5xl">
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-secondary">Danh sách Hoạt động nổi bật</h2>
                <p className="text-xs text-slate-500">
                  Trang chủ sẽ ưu tiên hiển thị 6 bài viết đầu tiên theo thứ tự sắp xếp bên dưới.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-purple-50 text-primary rounded-full shrink-0">
                Tổng cộng: {mediaPosts.length} bài
              </span>
            </div>

            {postsLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : mediaPosts.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-8">Chưa có bài viết nào được đăng.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mediaPosts.map((post, index) => {
                  const isVideo = post.content_url.includes("youtube.com") || 
                                  post.content_url.includes("youtu.be") || 
                                  post.content_url.includes("embed");
                  const isTop6 = index < 6;

                  return (
                    <div
                      key={post.id}
                      className={`border rounded-2xl overflow-hidden hover:shadow-md transition-all flex flex-col justify-between bg-white ${
                        isTop6 ? "border-purple-200/80 shadow-xs" : "border-slate-200"
                      }`}
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

                        {/* Huy hiệu thứ tự hiển thị */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black shadow-sm flex items-center gap-1 ${
                              isTop6
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-700/80 text-slate-200"
                            }`}
                          >
                            <span>#{index + 1}</span>
                            <span>•</span>
                            <span>{isTop6 ? "Trang Chủ" : "Mở rộng"}</span>
                          </span>

                          {post.is_featured && (
                            <span className="bg-amber-500 text-white p-1 rounded-lg shadow-sm" title="Bài đăng nổi bật">
                              <Star className="w-3.5 h-3.5 fill-white text-white" />
                            </span>
                          )}
                        </div>

                        <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider backdrop-blur-xs">
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

                        {/* Thanh điều khiển Thứ tự hiển thị & Chỉnh sửa */}
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                          {/* Nút Sắp xếp thứ tự Lên / Xuống */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-400 mr-1 hidden sm:inline">Thứ tự:</span>
                            <button
                              type="button"
                              onClick={() => handleMovePost(index, "up")}
                              disabled={index === 0 || movingId !== null}
                              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                              title="Đẩy lên trước (Hiển thị ưu tiên hơn)"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleMovePost(index, "down")}
                              disabled={index === mediaPosts.length - 1 || movingId !== null}
                              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                              title="Hạ xuống sau"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Nút Sửa & Xóa */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPost(post)}
                              className="px-2.5 py-1.5 rounded-lg bg-purple-50 text-primary hover:bg-purple-100 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                              title="Chỉnh sửa bài viết"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Sửa</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeletePost(post.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa bài viết"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CHỈNH SỬA NỘI DUNG BÀI VIẾT ĐÃ ĐĂNG */}
      {editingPost && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setEditingPost(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-primary flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-secondary leading-tight">Chỉnh sửa nội dung bài đăng</h3>
                  <p className="text-[11px] text-slate-400">Cập nhật tiêu đề, ảnh hoặc liên kết video</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveEditPost} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tiêu đề bài đăng *</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Nhập tiêu đề bài đăng..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Loại nội dung</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary bg-white"
                  >
                    <option value="image">Hình ảnh (Upload)</option>
                    <option value="video">Video (YouTube URL)</option>
                  </select>
                </div>

                <div className="flex items-end pb-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editForm.isFeatured}
                      onChange={(e) => setEditForm({ ...editForm, isFeatured: e.target.checked })}
                      className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                    />
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      Đánh dấu nổi bật <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    </span>
                  </label>
                </div>
              </div>

              {/* Tùy biến input theo loại Image / Video */}
              {editForm.type === "image" ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600">Hình ảnh</label>
                  
                  {/* Xem trước ảnh hiện tại */}
                  {editingPost.content_url && !editForm.videoUrl && (
                    <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 max-h-44">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={editingPost.content_url}
                        alt="Ảnh hiện tại"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/60 text-white">
                        Ảnh đang dùng
                      </span>
                    </div>
                  )}

                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Tải ảnh mới để thay thế (để trống nếu muốn giữ nguyên ảnh hiện tại):
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      ref={editFileInputRef}
                      onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                      className="w-full p-2 border border-slate-200 rounded-xl text-xs outline-none bg-slate-50"
                    />
                    {editFile && (
                      <p className="text-xs text-emerald-600 font-semibold mt-1">
                        ✓ Đã chọn ảnh mới: {editFile.name} ({(editFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Đường dẫn video YouTube *</label>
                  <input
                    type="text"
                    required={editForm.type === "video"}
                    placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                    value={editForm.videoUrl}
                    onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    * Hệ thống sẽ tự động chuyển đổi thành đường dẫn Embed chuẩn.
                  </p>
                </div>
              )}

              {editError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {editError}
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {editLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu thay đổi</span>
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
