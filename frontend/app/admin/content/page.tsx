"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Plus, Trash2, Film, Image as ImageIcon, Star, Check, Loader2, Play, AlertCircle } from "lucide-react";

export default function ContentManagementPage() {
  // States for Site settings (Cover Image)
  const [settings, setSettings] = useState<any>({});
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [coverSuccess, setCoverSuccess] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
      const res = await fetch("http://localhost:5000/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error("Error fetching settings:", e);
    }
  };

  // Fetch all media posts
  const fetchMediaPosts = async () => {
    setPostsLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/media");
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

      const res = await fetch("http://localhost:5000/api/settings/upload-cover", {
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

      const res = await fetch("http://localhost:5000/api/media", {
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
      const res = await fetch(`http://localhost:5000/api/media/${postId}`, {
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
        {/* CỘT TRÁI: THAY THẾ ẢNH BÌA */}
        <div className="lg:col-span-1 space-y-6">
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
