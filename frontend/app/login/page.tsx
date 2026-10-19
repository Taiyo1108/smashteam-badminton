"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Phone, ArrowRight, Eye, EyeOff, ArrowLeft, Mail, UserPlus, Sparkles } from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { API_URL } from "@/app/config";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "924372495544-vtcoadl8go2gf8oqqqhrr0s21fi10ecd.apps.googleusercontent.com";

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

  // Google OAuth 2.0 Success Handler (Nhận id_token từ Google Popup)
  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse?.credential) {
      setError("Không nhận được mã xác thực Google.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: credentialResponse.credential
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
          const searchParams = new URLSearchParams(window.location.search);
          const redirectTo = searchParams.get("redirect");
          if (redirectTo) {
            router.push(redirectTo);
          } else if (data.user.role === "admin") {
            router.push("/admin");
          } else {
            router.push("/profile");
          }
        }
      } else {
        setError(data.error || "Xác thực tài khoản Google thất bại.");
      }
    } catch (e) {
      setError("Lỗi kết nối máy chủ khi đăng nhập bằng Google.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Đăng nhập bằng tài khoản Google bị hủy hoặc gặp sự cố kết nối.");
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 w-full h-1/2 bg-slate-900 skew-y-[-5deg] origin-top-left -z-10 shadow-xl" />
        
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 relative z-10">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg transform rotate-3">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-secondary">
              {mode === "login" ? "Đăng Nhập" : "Đăng Ký Tài Khoản Vãng Lai"}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {mode === "login" 
                ? "Dành cho Quản trị viên, Thành viên & Người chơi vãng lai" 
                : "Khởi tạo tài khoản Guest để tính điểm Elo và lên Bảng Xếp Hạng"}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium mb-6 text-center border border-red-100">
              {error}
            </div>
          )}

          {/* NÚT GOOGLE OAUTH 2.0 CHÍNH THỨC */}
          <div className="w-full mb-5 flex flex-col items-center justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              shape="pill"
              size="large"
              text={mode === "login" ? "signin_with" : "signup_with"}
              width="360"
            />
          </div>

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
          {mode === "login" ? (
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); }}
              className="text-xs font-bold text-primary hover:text-primary-hover transition-colors cursor-pointer flex items-center justify-center gap-1.5 py-1"
            >
              <span>Chưa có tài khoản? Đăng ký tài khoản vãng lai</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className="text-xs font-bold text-primary hover:text-primary-hover transition-colors cursor-pointer flex items-center justify-center gap-1.5 py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Đã có tài khoản? Đăng nhập ngay</span>
            </button>
          )}

          <Link
            href="/claim-account"
            className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
          >
            Kích hoạt tài khoản thành viên cũ SmashTeam
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 pt-0.5"
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
  </GoogleOAuthProvider>
  );
}
