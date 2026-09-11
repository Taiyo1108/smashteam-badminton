"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Phone, ArrowRight, Eye, EyeOff, ArrowLeft, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { API_URL } from "@/app/config";

export default function UnifiedLogin() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_zalo: phone, password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("admin_token", data.token);
        localStorage.setItem("user_role", data.user.role);
        
        const searchParams = new URLSearchParams(window.location.search);
        const redirectTo = searchParams.get("redirect");
        if (redirectTo) {
          router.push(redirectTo);
        } else if (data.user.role === 'admin') {
          router.push("/admin");
        } else {
          router.push("/profile");
        }
      } else {
        const errData = await res.json();
        setError(errData.error || "Số điện thoại hoặc mật khẩu không chính xác.");
      }
    } catch (err) {
      setError("Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4 relative overflow-hidden text-foreground">
      {/* Background Glows & Mesh */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-primary/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary-hover/15 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Top Bar Back Link */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-300 hover:text-white font-semibold text-xs sm:text-sm transition-colors z-20 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md focus-ring cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> 
        <span>Quay về Trang chủ</span>
      </Link>

      {/* Main Glassmorphic Login Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-9 relative z-10 border border-purple-100 my-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-primary to-smash-violet rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(122,34,224,0.4)] transform -rotate-3 transition-transform hover:rotate-0">
            <Lock className="w-8 h-8 text-white" aria-hidden="true" />
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary bg-purple-50 px-3 py-1 rounded-full border border-primary/20 mb-2">
            <Sparkles className="w-3 h-3 text-primary" aria-hidden="true" /> Cổng Xác Thực SmashTeam
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-secondary tracking-tight">Đăng Nhập</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">Dành cho Hội viên và Ban quản trị</p>
        </div>

        {error && (
          <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-2xl text-xs sm:text-sm font-medium mb-6 flex items-start gap-2.5 border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="login-phone" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Số điện thoại Zalo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </div>
              <input
                id="login-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="block w-full min-h-[48px] pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                placeholder="0912345678"
                autoComplete="tel"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Mật khẩu <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </div>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full min-h-[48px] pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center justify-center text-slate-400 hover:text-primary transition-colors cursor-pointer min-h-[44px] min-w-[44px] focus-ring"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
          </div>

          <button
            id="btn-submit-login"
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-hover shadow-lg shadow-primary/30 active:scale-[0.98] transition-all mt-6 disabled:opacity-60 cursor-pointer focus-ring group"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <>
                <span>Đăng nhập hệ thống</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6 pt-5 border-t border-purple-100 flex flex-col gap-2.5">
          <Link
            href="/claim-account"
            className="text-xs sm:text-sm font-bold text-primary hover:text-primary-hover transition-colors py-1 focus-ring"
          >
            Bạn là thành viên cũ? Kích hoạt tài khoản tại đây
          </Link>
          <Link
            href="/register"
            className="text-xs sm:text-sm font-medium text-slate-500 hover:text-secondary transition-colors py-1 focus-ring"
          >
            Chưa có tài khoản? <strong className="text-secondary font-bold underline">Đăng ký gia nhập</strong>
          </Link>
        </div>
      </div>
    </div>
  );
}
