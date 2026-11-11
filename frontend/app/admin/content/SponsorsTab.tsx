"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, Trash2, Upload, Loader2, Save, AlertCircle, Check, 
  ChevronUp, ChevronDown, Sparkles, ExternalLink, RefreshCw, Eye
} from "lucide-react";
import { API_URL } from "@/app/config";
import SponsorsMarquee, { SponsorItem } from "@/app/components/home/SponsorsMarquee";

// Danh sách nhà tài trợ mẫu mặc định khi chưa có dữ liệu trong database
export const DEFAULT_SPONSORS: SponsorItem[] = [
  {
    id: "sp-yonex",
    name: "Yonex Badminton",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Yonex_logo.svg/320px-Yonex_logo.svg.png",
    website_url: "https://www.yonex.com"
  },
  {
    id: "sp-victor",
    name: "Victor Badminton",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Victor_logo.svg/320px-Victor_logo.svg.png",
    website_url: "https://victorsport.com"
  },
  {
    id: "sp-lining",
    name: "Li-Ning",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Li-Ning_logo.svg/320px-Li-Ning_logo.svg.png",
    website_url: "https://lining.com"
  },
  {
    id: "sp-kamito",
    name: "Kamito Sports",
    logo_url: "https://kamito.vn/images/logo.png",
    website_url: "https://kamito.vn"
  },
  {
    id: "sp-redbull",
    name: "Red Bull Energy",
    logo_url: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/RedBullEnergyDrink.svg/320px-RedBullEnergyDrink.svg.png",
    website_url: "https://www.redbull.com"
  }
];

export default function SponsorsTab() {
  const [sponsorsEnabled, setSponsorsEnabled] = useState(true);
  const [sponsorsSpeed, setSponsorsSpeed] = useState<"fast" | "normal" | "slow" | "paused">("normal");
  const [sponsorsTitle, setSponsorsTitle] = useState("Nhà Tài Trợ & Đối Tác Đồng Hành");
  const [sponsorsList, setSponsorsList] = useState<SponsorItem[]>(DEFAULT_SPONSORS);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Modal / Form thêm nhà tài trợ mới
  const [newSponsorName, setNewSponsorName] = useState("");
  const [newSponsorLogo, setNewSponsorLogo] = useState("");
  const [newSponsorWebsite, setNewSponsorWebsite] = useState("");
  const [isAddingUploading, setIsAddingUploading] = useState(false);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSponsorSettings();
  }, []);

  const fetchSponsorSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        setSponsorsEnabled(data.sponsors_enabled !== "false");
        setSponsorsSpeed(data.sponsors_speed || "normal");
        setSponsorsTitle(data.sponsors_title || "Nhà Tài Trợ & Đối Tác Đồng Hành");
        
        if (data.sponsors_list) {
          try {
            const parsed = JSON.parse(data.sponsors_list);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSponsorsList(parsed);
            }
          } catch (e) {
            console.error("Lỗi parse sponsors_list:", e);
          }
        }
      }
    } catch (err) {
      console.error("Lỗi khi tải cấu hình nhà tài trợ:", err);
    } finally {
      setLoading(false);
    }
  };

  // Upload file ảnh logo lên Cloudinary qua /api/settings/upload-sponsor
  const handleFileUpload = async (file: File, targetId?: string) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn tệp hình ảnh (PNG, JPG, SVG, WebP).");
      return;
    }

    if (targetId) {
      setUploadingId(targetId);
    } else {
      setIsAddingUploading(true);
    }

    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`${API_URL}/api/settings/upload-sponsor`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.url) {
        if (targetId) {
          setSponsorsList((prev) =>
            prev.map((item) => (item.id === targetId ? { ...item, logo_url: data.url } : item))
          );
        } else {
          setNewSponsorLogo(data.url);
        }
      } else {
        alert(data.error || "Không thể tải ảnh lên. Vui lòng thử lại.");
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ khi tải ảnh.");
    } finally {
      setUploadingId(null);
      setIsAddingUploading(false);
    }
  };

  // Thêm nhà tài trợ mới vào danh sách
  const handleAddSponsor = () => {
    if (!newSponsorName.trim()) {
      alert("Vui lòng nhập tên nhà tài trợ / đối tác.");
      return;
    }
    if (!newSponsorLogo.trim()) {
      alert("Vui lòng tải lên hoặc nhập link logo nhà tài trợ.");
      return;
    }

    const newItem: SponsorItem = {
      id: `sp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: newSponsorName.trim(),
      logo_url: newSponsorLogo.trim(),
      website_url: newSponsorWebsite.trim() || undefined
    };

    setSponsorsList((prev) => [...prev, newItem]);
    setNewSponsorName("");
    setNewSponsorLogo("");
    setNewSponsorWebsite("");
  };

  // Xóa nhà tài trợ khỏi danh sách
  const handleDeleteSponsor = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa nhà tài trợ này?")) {
      setSponsorsList((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Thay đổi thứ tự (Lên / Xuống)
  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sponsorsList.length) return;

    const updated = [...sponsorsList];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setSponsorsList(updated);
  };

  // Lưu toàn bộ cấu hình vào site_settings
  const handleSaveAll = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage("");

    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const payload = {
        settings: {
          sponsors_enabled: sponsorsEnabled ? "true" : "false",
          sponsors_speed: sponsorsSpeed,
          sponsors_title: sponsorsTitle.trim(),
          sponsors_list: JSON.stringify(sponsorsList)
        }
      };

      const res = await fetch(`${API_URL}/api/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);

        // Cập nhật cache localStorage để trang chủ nhận ngay tức thì
        try {
          const cached = localStorage.getItem("site_settings_cache");
          const settingsObj = cached ? JSON.parse(cached) : {};
          settingsObj.sponsors_enabled = sponsorsEnabled ? "true" : "false";
          settingsObj.sponsors_speed = sponsorsSpeed;
          settingsObj.sponsors_title = sponsorsTitle.trim();
          settingsObj.sponsors_list = JSON.stringify(sponsorsList);
          localStorage.setItem("site_settings_cache", JSON.stringify(settingsObj));
        } catch (e) {}
      } else {
        setErrorMessage(data.error || "Không thể lưu cấu hình.");
      }
    } catch (err) {
      setErrorMessage("Lỗi kết nối khi lưu cấu hình nhà tài trợ.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span>Đang tải cấu hình nhà tài trợ...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-8 pb-12">
      {/* HEADER & LƯU CẤU HÌNH */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Thanh Nhà Tài Trợ Chạy Ngang (Hero Footer)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-secondary">
            Cấu Hình Nhà Tài Trợ & Đối Tác CLB
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Dải logo các thương hiệu và đối tác sẽ chạy ngang tự động và vô tận ở phía dưới khu vực hình nền trang chủ.
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSaveAll}
          className="px-6 py-3.5 bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? "Đang Lưu Cấu Hình..." : "Lưu Thay Đổi"}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 font-medium">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Đã lưu thành công cấu hình nhà tài trợ! Trang chủ đã được cập nhật ngay lập tức.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2 font-medium">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* CÀI ĐẶT CHUNG: BẬT/TẮT, TỐC ĐỘ, TIÊU ĐỀ */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <span>⚙️ Tùy Chọn Hiển Thị & Chế Độ Chạy Ngang</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* BẬT / TẮT */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Trạng thái hiển thị
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSponsorsEnabled(!sponsorsEnabled)}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  sponsorsEnabled ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    sponsorsEnabled ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-xs font-bold text-slate-800">
                {sponsorsEnabled ? "Đang BẬT trên Trang chủ" : "Đang TẮT"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Bật để hiển thị dải đối tác ở chân hình nền đại diện trang chủ.
            </p>
          </div>

          {/* CHẾ ĐỘ TỐC ĐỘ CHẠY NGANG */}
          <div className="md:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Tốc độ chạy ngang (Marquee Speed)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "fast", label: "🚀 Nhanh", desc: "16 giây / vòng" },
                { id: "normal", label: "⚡ Vừa chuẩn", desc: "32 giây / vòng" },
                { id: "slow", label: "🐢 Chậm nhẹ", desc: "55 giây / vòng" },
                { id: "paused", label: "⏸️ Dừng lại", desc: "Đứng yên không cuộn" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSponsorsSpeed(opt.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    sponsorsSpeed === opt.id
                      ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className="text-xs font-black">{opt.label}</div>
                  <div className={`text-[10px] mt-0.5 ${sponsorsSpeed === opt.id ? "text-purple-200" : "text-slate-400"}`}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              * Khi người dùng rê chuột lên dải logo, dải cuộn sẽ tự động tạm dừng để xem chi tiết hoặc bấm vào link.
            </p>
          </div>
        </div>

        {/* TIÊU ĐỀ DẢI ĐỐI TÁC */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Tiêu đề nhãn đối tác
          </label>
          <input
            type="text"
            value={sponsorsTitle}
            onChange={(e) => setSponsorsTitle(e.target.value)}
            placeholder="VD: Nhà Tài Trợ & Đối Tác Đồng Hành"
            className="w-full max-w-md px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs sm:text-sm focus:outline-hidden focus:border-primary"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Hiển thị trong nhãn nhỏ bên góc trái dải chạy ngang (để trống nếu không muốn hiện chữ này).
          </p>
        </div>
      </div>

      {/* LIVE PREVIEW NGAY TRONG TRANG ADMIN */}
      <div className="bg-slate-950 rounded-3xl p-6 sm:p-7 border border-purple-500/30 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Eye className="w-4 h-4 text-amber-300" />
            <h3 className="text-sm font-black uppercase tracking-wider">Xem Trước Trực Quan Dải Nhà Tài Trợ (Live Preview)</h3>
          </div>
          <span className="text-[10px] font-mono text-purple-300/80 bg-purple-900/40 px-2.5 py-1 rounded-full border border-purple-400/30">
            Tốc độ: {sponsorsSpeed}
          </span>
        </div>

        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 shadow-inner">
          <SponsorsMarquee
            sponsors={sponsorsList}
            speed={sponsorsSpeed}
            title={sponsorsTitle}
            enabled={sponsorsEnabled}
          />
        </div>
      </div>

      {/* DANH SÁCH NHÀ TÀI TRỢ & THAO TÁC SỬA / XÓA */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Danh Sách Các Nhà Tài Trợ ({sponsorsList.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Bạn có thể tải ảnh logo mới, thay đổi thứ tự hoặc xóa nhà tài trợ theo ý muốn.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSponsorsList(DEFAULT_SPONSORS)}
            className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Khôi phục logo mặc định
          </button>
        </div>

        <div className="space-y-3">
          {sponsorsList.map((sponsor, index) => (
            <div
              key={sponsor.id}
              className="p-4 rounded-2xl border border-slate-200 hover:border-purple-300 bg-slate-50/50 hover:bg-white transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                {/* Logo Preview */}
                <div className="w-20 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-2 shrink-0 shadow-sm">
                  {sponsor.logo_url ? (
                    <img
                      src={sponsor.logo_url}
                      alt={sponsor.name}
                      className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-500">No logo</span>
                  )}
                </div>

                {/* Info Fields */}
                <div className="space-y-1.5 flex-1 min-w-[220px]">
                  <input
                    type="text"
                    value={sponsor.name}
                    onChange={(e) => {
                      const updated = [...sponsorsList];
                      updated[index].name = e.target.value;
                      setSponsorsList(updated);
                    }}
                    placeholder="Tên nhà tài trợ"
                    className="w-full text-xs font-bold text-slate-800 bg-transparent border-b border-dashed border-slate-300 focus:border-primary focus:outline-hidden py-0.5"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={sponsor.website_url || ""}
                      onChange={(e) => {
                        const updated = [...sponsorsList];
                        updated[index].website_url = e.target.value;
                        setSponsorsList(updated);
                      }}
                      placeholder="Link website (tùy chọn: https://...)"
                      className="w-full text-[11px] font-mono text-slate-500 bg-transparent border-b border-dashed border-slate-200 focus:border-primary focus:outline-hidden py-0.5"
                    />
                    {sponsor.website_url && (
                      <a
                        href={sponsor.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-primary shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions: Upload Image, Reorder, Delete */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                {/* File Upload Button */}
                <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors">
                  {uploadingId === sponsor.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>Đổi Ảnh Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingId === sponsor.id}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, sponsor.id);
                    }}
                  />
                </label>

                {/* Move Up */}
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => handleMove(index, "up")}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Di chuyển lên"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>

                {/* Move Down */}
                <button
                  type="button"
                  disabled={index === sponsorsList.length - 1}
                  onClick={() => handleMove(index, "down")}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Di chuyển xuống"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDeleteSponsor(sponsor.id)}
                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer transition-colors"
                  title="Xóa nhà tài trợ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FORM THÊM NHÀ TÀI TRỢ MỚI */}
      <div className="bg-gradient-to-br from-slate-50 to-purple-50/40 rounded-3xl p-6 sm:p-7 border border-purple-200/60 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Plus className="w-4 h-4 text-primary" />
          <span>Thêm Nhà Tài Trợ / Đối Tác Mới</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên thương hiệu / Nhà tài trợ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Cầu Lông Ba Sao, Decathlon..."
              value={newSponsorName}
              onChange={(e) => setNewSponsorName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-hidden focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Logo (Tải ảnh từ máy hoặc dán URL) <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="https://... hoặc bấm Tải ảnh"
                value={newSponsorLogo}
                onChange={(e) => setNewSponsorLogo(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-hidden focus:border-primary font-mono"
              />
              <button
                type="button"
                onClick={() => newFileInputRef.current?.click()}
                disabled={isAddingUploading}
                className="px-3.5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
              >
                {isAddingUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>Tải Ảnh</span>
              </button>
              <input
                type="file"
                ref={newFileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Đường dẫn liên kết (Tùy chọn)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={newSponsorWebsite}
              onChange={(e) => setNewSponsorWebsite(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-hidden focus:border-primary font-mono"
            />
          </div>
        </div>

        {newSponsorLogo && (
          <div className="flex items-center gap-3 pt-2">
            <span className="text-xs text-slate-500 font-medium">Xem trước logo:</span>
            <div className="h-10 px-3 py-1 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800">
              <img src={newSponsorLogo} alt="Preview" className="max-h-full max-w-[120px] object-contain" />
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={handleAddSponsor}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Thêm Vào Danh Sách</span>
          </button>
        </div>
      </div>
    </div>
  );
}
