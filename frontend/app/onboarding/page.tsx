"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  User, Phone, Sparkles, Check, ArrowRight, 
  ShieldCheck, AlertCircle, Loader2 
} from "lucide-react";
import confetti from "canvas-confetti";
import { API_URL } from "@/app/config";

// Danh sách bộ Avatar hoạt hình cầu lông dễ thương cho người chơi vãng lai
const DEFAULT_AVATARS = [
  { id: "avatar_shuttlecock", label: "Bé Trái Cầu", url: "/avatars/avatar_shuttlecock.jpg" },
  { id: "avatar_boy", label: "Tay Vợt Champion", url: "/avatars/avatar_boy.jpg" },
  { id: "avatar_girl", label: "Nữ Thần Smash", url: "/avatars/avatar_girl.jpg" },
  { id: "avatar_tiger", label: "Bé Hổ Con", url: "/avatars/avatar_tiger.jpg" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phoneZalo, setPhoneZalo] = useState("");
  const [gender, setGender] = useState<"Nam" | "Nữ">("Nam");
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const [honeypot, setHoneypot] = useState(""); // Chống bot tự động submit
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("admin_token");
    const userStr = localStorage.getItem("user");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // Nếu user đã hoàn tất onboarding trước đó, chuyển hướng ngay về /profile
        if (user.is_profile_completed) {
          router.replace("/profile");
          return;
        }

        // Khởi tạo các giá trị có sẵn từ Google Auth
        if (user.name) setFullName(user.name);
        if (user.phone_zalo) setPhoneZalo(user.phone_zalo);
        if (user.avatar_url) setSelectedAvatar(user.avatar_url);
        else setSelectedAvatar(DEFAULT_AVATARS[0].url);
      } catch (e) {
        setSelectedAvatar(DEFAULT_AVATARS[0].url);
      }
    } else {
      setSelectedAvatar(DEFAULT_AVATARS[0].url);
    }

    setCheckingAuth(false);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Kiểm tra Họ và tên đầy đủ
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setError("Họ và Tên đầy đủ phải từ 2 đến 50 ký tự.");
      return;
    }

    // 2. Validate và chuẩn hóa số điện thoại Việt Nam
    let cleanedPhone = phoneZalo.replace(/[\s\.\-\(\)]/g, "");
    if (cleanedPhone.startsWith("+84")) {
      cleanedPhone = "0" + cleanedPhone.slice(3);
    } else if (cleanedPhone.startsWith("84") && cleanedPhone.length === 11) {
      cleanedPhone = "0" + cleanedPhone.slice(2);
    }

    const phoneRegex = /^(03|05|07|08|09)[0-9]{8}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      setError("Số điện thoại Zalo không đúng chuẩn Việt Nam (10 chữ số, đầu số 03, 05, 07, 08, 09).");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/auth/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: trimmedName,
          phone_zalo: cleanedPhone,
          gender,
          avatar_url: selectedAvatar || null,
          honeypot: honeypot || ""
        })
      });

      const data = await res.json();

      if (res.ok) {
        // Cập nhật token và user trong localStorage
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("admin_token", data.token);
        }
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          localStorage.setItem("user_role", data.user.role || "guest");
        }

        // Bắn pháo hoa chào mừng hoàn tất onboarding
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#7A22E0", "#fbbf24", "#38bdf8", "#4ade80"]
        });

        // Chuyển hướng tới trang cá nhân
        setTimeout(() => {
          router.replace("/profile");
        }, 800);
      } else {
        setError(data.error || "Không thể hoàn tất thông tin. Vui lòng thử lại.");
      }
    } catch (err) {
      setError("Lỗi kết nối máy chủ. Vui lòng kiểm tra lại mạng.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#120726] via-[#0b0318] to-black flex items-center justify-center p-4 sm:p-6 text-white relative overflow-hidden">
      {/* Background hình nền hoạt hình cầu lông dễ thương */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-[1px] pointer-events-none scale-105"
        style={{ backgroundImage: "url('/avatars/cute_badminton_bg.jpg')" }}
      />
      {/* Background radial glowing ambient */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-lg bg-white/5 backdrop-blur-2xl rounded-3xl border border-purple-500/30 p-6 sm:p-8 shadow-[0_0_60px_rgba(122,34,224,0.35)] overflow-hidden">
        {/* Top glow border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-200 text-xs font-bold uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>Thiết Lập Hồ Sơ Người Chơi (2/2)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Chào Mừng Đến Với <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">Smash Team</span>
          </h1>
          <p className="text-xs sm:text-sm text-purple-200/70 mt-1.5 leading-relaxed">
            Chỉ còn 3 thông tin cơ bản để hệ thống nhận diện bạn khi ghép trận và tính điểm Bảng Xếp Hạng.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Honeypot field chống bot tự động (người dùng thật không thấy trường này) */}
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              name="honeypot"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {/* 1. HỌ VÀ TÊN ĐẦY ĐỦ */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-200 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-300" />
                Họ và Tên đầy đủ <span className="text-rose-400">*</span>
              </span>
              <span className="text-[10px] text-amber-300 font-bold bg-amber-400/15 px-2 py-0.5 rounded-full border border-amber-400/30">
                Tên chính chủ bắt buộc
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={50}
                placeholder="VD: Nguyễn Văn Nam"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-purple-400/40 text-white placeholder-purple-300/40 text-sm focus:outline-hidden focus:border-amber-400 transition-colors shadow-inner"
              />
            </div>
            <p className="text-[11px] text-purple-200/60 mt-1">
              Vui lòng nhập họ và tên thật chính xác để hệ thống lưu hồ sơ thi đấu và xếp hạng.
            </p>
          </div>

          {/* 2. SỐ ĐIỆN THOẠI ZALO ĐỊNH DANH DUY NHẤT */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-200 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-300" />
                Số Điện Thoại Zalo <span className="text-rose-400">*</span>
              </span>
              <span className="text-[10px] text-purple-300/60 font-normal">Định danh duy nhất</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                placeholder="VD: 0987654321 hoặc +84987654321"
                value={phoneZalo}
                onChange={(e) => setPhoneZalo(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-purple-400/30 text-white placeholder-purple-300/30 text-sm focus:outline-hidden focus:border-amber-400 transition-colors shadow-inner font-mono"
              />
            </div>
            <p className="text-[11px] text-purple-200/60 mt-1">
              Dùng để tìm kiếm tuyển thủ khi ghép cặp trận đấu và nhận thông báo kết quả.
            </p>
          </div>

          {/* 3. GIỚI TÍNH */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-200 mb-2">
              Giới Tính (Phục vụ ghép trận Đôi nam / Đôi nữ / Đôi nam-nữ) <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["Nam", "Nữ"] as const).map((g) => (
                <button
                  type="button"
                  key={g}
                  onClick={() => setGender(g)}
                  className={`py-3 px-4 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    gender === g
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 border-amber-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                      : "bg-black/30 border-purple-400/20 text-purple-200/70 hover:bg-white/5"
                  }`}
                >
                  <span>{g === "Nam" ? "🏸 Tuyển thủ Nam" : "🏸 Tuyển thủ Nữ"}</span>
                  {gender === g && <Check className="w-4 h-4 text-amber-300 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* 4. CHỌN HÌNH ĐẠI DIỆN HOẠT HÌNH CẦU LÔNG DỄ THƯƠNG */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-200 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Chọn Hình Nền / Avatar Hoạt Hình Cầu Lông Dễ Thương
              </span>
              <span className="text-[10px] text-purple-300/70 font-normal">Chibi độc quyền</span>
            </label>
            <div className="grid grid-cols-4 gap-3">
              {DEFAULT_AVATARS.map((av) => {
                const isChosen = selectedAvatar === av.url;
                return (
                  <button
                    type="button"
                    key={av.id}
                    onClick={() => setSelectedAvatar(av.url)}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group bg-black/40 ${
                      isChosen
                        ? "border-amber-400 scale-105 shadow-[0_0_20px_rgba(251,191,36,0.6)] ring-2 ring-amber-400/40"
                        : "border-purple-400/30 opacity-75 hover:opacity-100 hover:border-purple-300"
                    }`}
                  >
                    <Image
                      src={av.url}
                      alt={av.label}
                      fill
                      sizes="90px"
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                      unoptimized
                    />
                    {isChosen && (
                      <div className="absolute inset-0 bg-amber-500/20 backdrop-blur-[0.5px] flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/60">
                          <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                        </div>
                      </div>
                    )}
                    <span className="absolute bottom-0 inset-x-0 bg-black/75 backdrop-blur-xs text-[9px] font-bold text-center py-0.5 truncate px-1 text-purple-200">
                      {av.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* NÚT HOÀN TẤT */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-6 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.5)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Đang Lưu Hồ Sơ...</span>
              </>
            ) : (
              <>
                <span>Hoàn Tất & Vào Sân Ngay</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-[11px] text-purple-300/50 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Thông tin được mã hóa bảo mật theo chuẩn thành viên SmashTeam.
          </p>
        </div>
      </div>
    </div>
  );
}
