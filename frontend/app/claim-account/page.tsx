"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Lock, Phone, ShieldCheck, ArrowRight, UserCheck, AlertCircle, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { API_URL } from "@/app/config";

export default function ClaimAccount() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [fullName, setFullName] = useState("");
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(3);
  
  const router = useRouter();

  // Step 1: Verify phone and PIN
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/auth/claim-account/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_zalo: phone, verification_pin: pin })
      });

      const data = await res.json();
      if (res.ok) {
        setFullName(data.full_name);
        setStep(2);
      } else {
        setError(data.error || "Số điện thoại không hợp lệ hoặc mã PIN xác thực không chính xác.");
      }
    } catch (err) {
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Setup new password and activate
  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (newPassword.length < 6) {
      setError("Mật khẩu phải có độ dài tối thiểu là 6 ký tự.");
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/claim-account/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_zalo: phone,
          verification_pin: pin,
          new_password: newPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess("Kích hoạt tài khoản thành công!");
        setStep(3);
      } else {
        setError(data.error || "Có lỗi xảy ra trong quá trình kích hoạt.");
      }
    } catch (err) {
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect countdown
  useEffect(() => {
    if (step === 3 && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (step === 3 && countdown === 0) {
      router.replace("/login");
    }
  }, [step, countdown, router]);

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4 relative overflow-hidden text-foreground">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-primary/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary-hover/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Bar Back Link */}
      <Link 
        href="/login" 
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-300 hover:text-white font-semibold text-xs sm:text-sm transition-colors z-20 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md focus-ring cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> 
        <span>Quay lại Đăng nhập</span>
      </Link>
      
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-9 relative z-10 border border-purple-100 my-8">
        
        {/* Step 1: Verify */}
        {step === 1 && (
          <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-tr from-primary to-smash-violet rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(122,34,224,0.4)] transform rotate-3 text-white">
                <ShieldCheck className="w-8 h-8" aria-hidden="true" />
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary bg-purple-50 px-3 py-1 rounded-full border border-primary/20 mb-2">
                <Sparkles className="w-3 h-3 text-primary" aria-hidden="true" /> Xác Thực Thành Viên
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-secondary tracking-tight">Kích Hoạt Tài Khoản</h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">Dành cho hội viên đã có tên trong danh sách CLB</p>
            </div>

            {error && (
              <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-2xl text-xs sm:text-sm font-medium mb-6 flex items-start gap-2.5 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label htmlFor="claim-phone" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Số điện thoại Zalo <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  </div>
                  <input
                    id="claim-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full min-h-[48px] pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    placeholder="Số điện thoại đăng ký thành viên"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="claim-pin" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Mã PIN xác thực CLB <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  </div>
                  <input
                    id="claim-pin"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="block w-full min-h-[48px] pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    placeholder="Mã PIN được BQT cung cấp"
                    required
                  />
                </div>
              </div>

              <button
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
                    <span>Xác nhận thông tin</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center mt-6 pt-5 border-t border-purple-100">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-secondary transition-colors focus-ring"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Quay lại Đăng nhập
              </Link>
            </div>
          </div>
        )}

        {/* Step 2: Set Password */}
        {step === 2 && (
          <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(16,185,129,0.4)] transform -rotate-3 text-white">
                <UserCheck className="w-8 h-8" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold text-secondary">Chào mừng {fullName}!</h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">Vui lòng thiết lập mật khẩu mới để hoàn tất kích hoạt</p>
            </div>

            {error && (
              <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-2xl text-xs sm:text-sm font-medium mb-6 flex items-start gap-2.5 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleActivate} className="space-y-5">
              <div>
                <label htmlFor="new-password" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Mật khẩu mới (tối thiểu 6 ký tự) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  </div>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full min-h-[48px] pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    placeholder="Nhập mật khẩu mới"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  </div>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full min-h-[48px] pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    placeholder="Nhập lại mật khẩu mới"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || newPassword.length < 6 || newPassword !== confirmPassword}
                className="w-full min-h-[48px] flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all mt-6 disabled:opacity-50 cursor-pointer focus-ring"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Đang kích hoạt...</span>
                  </>
                ) : (
                  <span>Kích hoạt tài khoản</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step 3: Success Redirect */}
        {step === 3 && (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-emerald-100 rounded-full mx-auto flex items-center justify-center mb-5 text-emerald-600 animate-bounce">
              <CheckCircle2 className="w-12 h-12" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-secondary mb-2">{success}</h1>
            <p className="text-slate-500 text-sm">
              Tài khoản của bạn đã được kích hoạt thành công.
            </p>
            <p className="text-slate-400 text-xs mt-6 tabular-nums">
              Đang tự động chuyển hướng về trang Đăng nhập sau {countdown} giây...
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
