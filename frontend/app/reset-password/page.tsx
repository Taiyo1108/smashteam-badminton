"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Phone,
  Mail,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { API_URL } from "@/app/config";

export default function ResetPasswordPage() {
  const router = useRouter();

  // Navigation & Flow State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);

  // Form Fields
  const [identifier, setIdentifier] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [phoneZalo, setPhoneZalo] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI Status
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  // Timers
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(900); // 15 mins
  const [redirectCountdown, setRedirectCountdown] = useState(4);

  // 1. Check URL parameters on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    const urlToken = searchParams.get("token");
    const urlId = searchParams.get("identifier") || searchParams.get("phone");

    if (urlId) {
      setIdentifier(urlId);
    }

    if (urlToken) {
      setToken(urlToken);
      verifyToken(urlToken);
    }
  }, []);

  // Verify direct token from email link
  const verifyToken = async (resetToken: string) => {
    setIsVerifyingToken(true);
    setError("");
    try {
      const res = await fetch(
        `${API_URL}/api/auth/reset-password/verify?token=${encodeURIComponent(resetToken)}`
      );
      const data = await res.json();
      if (res.ok && data.valid) {
        setFullName(data.full_name || "");
        setMaskedEmail(data.masked_email || "");
        if (data.phone_zalo) {
          setPhoneZalo(data.phone_zalo);
          setIdentifier(data.phone_zalo);
        }
        setStep(2);
        setInfoMessage(
          `Chào ${data.full_name || "bạn"}, liên kết xác thực hợp lệ. Hãy thiết lập mật khẩu mới bên dưới.`
        );
      } else {
        setError(
          data.error ||
            "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn (sau 15 phút). Vui lòng yêu cầu mã mới."
        );
        setStep(1);
        setToken(null);
      }
    } catch (err) {
      setError("Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại sau.");
      setStep(1);
      setToken(null);
    } finally {
      setIsVerifyingToken(false);
    }
  };

  // Cooldown timers
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    if (step !== 2 || otpExpiresIn <= 0) return;
    const interval = setInterval(() => {
      setOtpExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, otpExpiresIn]);

  // Success redirect countdown
  useEffect(() => {
    if (step !== 3 || redirectCountdown <= 0) return;
    const timer = setTimeout(() => {
      if (redirectCountdown === 1) {
        router.push(phoneZalo ? `/login?phone=${encodeURIComponent(phoneZalo)}` : "/login");
      } else {
        setRedirectCountdown((prev) => prev - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [step, redirectCountdown, phoneZalo, router]);

  // Handle Step 1: Request OTP email
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError("Vui lòng nhập Số điện thoại Zalo hoặc Email đã đăng ký.");
      return;
    }

    setIsLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: cleanId })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMaskedEmail(data.masked_email || "");
        if (data.identifier) {
          setPhoneZalo(data.identifier);
        }
        setStep(2);
        setOtpExpiresIn(900); // 15 mins
        setResendCooldown(60); // 60s cooldown
        setInfoMessage(data.message || `Mã OTP đã được gửi đến email ${data.masked_email}.`);
      } else {
        setError(data.error || "Không thể thực hiện yêu cầu đặt lại mật khẩu.");
      }
    } catch (err) {
      setError("Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền mạng.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 2: Submit OTP and set new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token && (!otpCode || otpCode.trim().length !== 6)) {
      setError("Vui lòng nhập đúng mã OTP 6 chữ số được gửi qua email.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có độ dài tối thiểu 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = {
        new_password: newPassword
      };

      if (token) {
        payload.token = token;
      } else {
        payload.otp_code = otpCode.trim();
        payload.identifier = identifier.trim();
      }

      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.phone_zalo) {
          setPhoneZalo(data.phone_zalo);
        }
        setStep(3);
      } else {
        setError(data.error || "Mã xác thực không chính xác hoặc đã hết hạn.");
      }
    } catch (err) {
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration matching brand style */}
      <div className="absolute top-0 w-full h-1/2 bg-slate-900 skew-y-[-5deg] origin-top-left -z-10 shadow-xl" />

      {/* Top back navigation */}
      <Link
        href="/login"
        className="absolute top-6 left-6 flex items-center gap-2 text-white/80 hover:text-white font-semibold transition-colors z-20 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại Đăng nhập
      </Link>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10 border border-slate-100">
        {/* Header Icon & Title */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-purple-700 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg transform rotate-2">
            {step === 3 ? (
              <CheckCircle2 className="w-8 h-8 text-white" />
            ) : step === 2 ? (
              <KeyRound className="w-8 h-8 text-white" />
            ) : (
              <Lock className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {step === 3
              ? "Hoàn Tất Đổi Mật Khẩu"
              : step === 2
              ? "Thiết Lập Mật Khẩu Mới"
              : "Quên Mật Khẩu?"}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5 leading-relaxed">
            {step === 3
              ? "Mật khẩu của bạn đã được cập nhật an toàn."
              : step === 2
              ? token
                ? "Nhập mật khẩu mới để hoàn tất khôi phục tài khoản."
                : `Nhập mã OTP 6 số đã được gửi qua email ${maskedEmail ? `(${maskedEmail})` : ""}.`
              : "Nhập số điện thoại Zalo hoặc Email để nhận mã xác nhận OTP."}
          </p>
        </div>

        {/* Loading overlay when verifying link token */}
        {isVerifyingToken && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-600">Đang kiểm tra liên kết xác thực...</p>
          </div>
        )}

        {/* Global Error Banner */}
        {error && !isVerifyingToken && (
          <div className="bg-rose-50 text-rose-700 p-3.5 rounded-xl text-xs sm:text-sm font-medium mb-5 border border-rose-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="leading-snug">{error}</div>
          </div>
        )}

        {/* Info Banner */}
        {infoMessage && !error && !isVerifyingToken && step !== 3 && (
          <div className="bg-purple-50 text-purple-900 p-3.5 rounded-xl text-xs sm:text-sm font-medium mb-5 border border-purple-200 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div className="leading-snug">{infoMessage}</div>
          </div>
        )}

        {/* STEP 1: REQUEST OTP FORM */}
        {!isVerifyingToken && step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Số điện thoại Zalo hoặc Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-colors outline-none"
                  placeholder="VD: 0987654321 hoặc ten@domain.com"
                  autoFocus
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Hệ thống sẽ gửi mã bảo mật 6 số đến email đăng ký trong hồ sơ thành viên của bạn.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !identifier.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none transition-all mt-6 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang gửi mã xác thực...</span>
                </>
              ) : (
                <>
                  <span>Gửi mã xác nhận OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: VERIFY OTP + SET NEW PASSWORD */}
        {!isVerifyingToken && step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Show OTP input only if not using verified link token */}
            {!token && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Mã xác nhận OTP (6 số) *
                  </label>
                  <span className="text-[11px] font-semibold text-purple-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Còn lại {formatTime(otpExpiresIn)}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="block w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-center text-xl font-mono font-bold tracking-widest focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-colors outline-none"
                    placeholder="••••••"
                    autoFocus
                    required
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span className="text-slate-500">Chưa nhận được mã?</span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isLoading}
                    onClick={handleRequestOtp}
                    className="font-bold text-purple-700 hover:text-purple-900 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {resendCooldown > 0 ? `Gửi lại sau (${resendCooldown}s)` : "Gửi lại mã OTP"}
                  </button>
                </div>
              </div>
            )}

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mật khẩu mới (Tối thiểu 6 ký tự) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-colors outline-none"
                  placeholder="Nhập mật khẩu mới"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Xác nhận mật khẩu mới *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-colors outline-none"
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || (!token && otpCode.length !== 6) || !newPassword}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-purple-700 hover:bg-purple-800 focus:outline-none transition-all mt-6 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang lưu mật khẩu...</span>
                </>
              ) : (
                <>
                  <span>Xác nhận & Đổi mật khẩu</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setToken(null);
                setError("");
                setInfoMessage("");
              }}
              className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 pt-2 transition-colors"
            >
              &larr; Nhập số điện thoại / email khác
            </button>
          </form>
        )}

        {/* STEP 3: SUCCESS STATE */}
        {!isVerifyingToken && step === 3 && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-900">Cập Nhật Mật Khẩu Thành Công!</h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Tài khoản của bạn đã được bảo vệ với mật khẩu mới. Bạn có thể đăng nhập ngay bây giờ.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              Tự động chuyển về trang Đăng nhập sau{" "}
              <span className="font-bold text-purple-700 font-mono text-sm">{redirectCountdown}s</span>...
            </div>

            <Link
              href={phoneZalo ? `/login?phone=${encodeURIComponent(phoneZalo)}` : "/login"}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all"
            >
              <span>Đăng nhập ngay</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Footer Links */}
        <div className="text-center mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Nhớ ra mật khẩu? <span className="text-purple-700 underline">Đăng nhập</span>
          </Link>
          <Link
            href="/claim-account"
            className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
          >
            Thành viên cũ chưa kích hoạt tài khoản? Bấm vào đây
          </Link>
        </div>
      </div>
    </div>
  );
}
