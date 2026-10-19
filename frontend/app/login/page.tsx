"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Phone, ArrowRight, Eye, EyeOff, ArrowLeft, Mail, UserPlus, Sparkles } from "lucide-react";
import { API_URL } from "@/app/config";

export default function UnifiedLogin() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const phoneParam = searchParams.get("phone");
      if (phoneParam) {
        setIdentifier(phoneParam);
      }
      const expiredParam = searchParams.get("expired");
      if (expiredParam) {
        setError("Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.");
      }
      const modeParam = searchParams.get("mode");
      if (modeParam === "register") {
        setMode("register");
      }
    }
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (mode === "login") {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone_zalo: identifier, password })
        });

        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("admin_token", data.token);
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          localStorage.setItem("user_role", data.user.role);

          // Chốt chặn Onboarding: nếu chưa điền hồ sơ thì lập tức sang /onboarding
          if (data.user.is_profile_completed === false) {
            router.push("/onboarding");
            return;
          }

          const searchParams = new URLSearchParams(window.location.search);
          const redirectTo = searchParams.get("redirect");
          if (redirectTo) {
            router.push(redirectTo);
          } else if (data.user.role === "admin") {
            router.push("/admin");
          } else {
            router.push("/profile");
          }
        } else {
          setError(data.error || "Số điện thoại/Email hoặc mật khẩu không chính xác.");
        }
      } else {
        // Đăng ký nhanh tài khoản Vãng lai (Guest)
        const res = await fetch(`${API_URL}/api/auth/register-guest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: identifier,
            password,
            full_name: fullName.trim() || undefined
          })
        });

        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("admin_token", data.token);
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          localStorage.setItem("user_role", data.user.role);

          // Luôn chuyển sang bước Onboarding để nhập SĐT và Giới tính
          router.push("/onboarding");
        } else {
          setError(data.error || "Không thể đăng ký tài khoản. Vui lòng thử lại.");
        }
      }
    } catch (err) {
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  // Google Login Callback / Trigger
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Prompt quick Google email entry (hoặc Google tokeninfo)
      const userEmail = prompt("Nhập địa chỉ Email Google của bạn để tiếp tục:");
      if (!userEmail || !userEmail.includes("@")) {
        setIsLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail.trim().toLowerCase(),
          name: userEmail.split("@")[0],
          picture: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=300&h=300&fit=crop&crop=faces"
        })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("admin_token", data.token);
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("user_role", data.user.role);

        if (data.user.is_profile_completed === false) {
          router.push("/onboarding");
        } else {
          router.push("/profile");
        }
      } else {
        setError(data.error || "Không thể xác thực với tài khoản Google.");
      }
    } catch (e) {
      setError("Lỗi kết nối khi đăng nhập Google.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 w-full h-1/2 bg-slate-900 skew-y-[-5deg] origin-top-left -z-10 shadow-xl" />
      
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 relative z-10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg transform rotate-3">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-secondary">
            {mode === "login" ? "Đăng Nhập" : "Đăng Ký Tài Khoản Giao Lưu"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {mode === "login" 
              ? "Dành cho Quản trị viên, Thành viên & Người chơi vãng lai" 
              : "Khởi tạo tài khoản Guest để tính điểm Elo và lên Bảng Xếp Hạng"}
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mt-4 border border-slate-200">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-white text-secondary shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-white text-secondary shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Đăng ký vãng lai
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium mb-6 text-center border border-red-100">
            {error}
          </div>
        )}

        {/* NÚT GOOGLE OAUTH NHANH */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full mb-5 py-3 px-4 rounded-2xl border border-slate-200 hover:border-purple-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Tiếp tục với Google OAuth (Đăng ký / Đăng nhập)</span>
        </button>

        <div className="relative flex items-center justify-center mb-5">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute">
            Hoặc
          </span>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Họ và tên / Biệt danh (Tuỳ chọn)
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-hidden"
                placeholder="VD: Tuấn Smash"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {mode === "login" ? "Số điện thoại Zalo hoặc Email" : "Địa chỉ Email đăng ký"}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                {mode === "login" ? <Phone className="h-4 w-4 text-slate-400" /> : <Mail className="h-4 w-4 text-slate-400" />}
              </div>
              <input
                type={mode === "login" ? "text" : "email"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-hidden"
                placeholder={mode === "login" ? "Nhập số điện thoại hoặc email" : "user@example.com"}
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">Mật khẩu</label>
              {mode === "login" && (
                <Link
                  href="/reset-password"
                  className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-colors"
                >
                  Quên mật khẩu?
                </Link>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-hidden"
                placeholder="Tối thiểu 6 ký tự"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-secondary hover:bg-slate-800 transition-all mt-6 disabled:opacity-70 group cursor-pointer"
          >
            {isLoading 
              ? "Đang xử lý..." 
              : mode === "login" 
              ? "Đăng nhập hệ thống" 
              : "Tiếp tục thiết lập Onboarding"}
            {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
          <Link
            href="/claim-account"
            className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            Bạn là thành viên cũ? Kích hoạt tài khoản tại đây
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Quay về Trang chủ
          </Link>
        </div>
      </div>
      
      {/* Absolute top-left back link */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-white/80 hover:text-white font-semibold transition-colors z-20 text-xs sm:text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Quay về Trang chủ
      </Link>
    </div>
  );
}
