"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Lock, Phone, ShieldCheck, ArrowRight, UserCheck, AlertCircle, ArrowLeft } from "lucide-react";

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
      const res = await fetch("http://localhost:5000/api/auth/claim-account/verify", {
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
      const res = await fetch("http://localhost:5000/api/auth/claim-account/activate", {
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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 w-full h-1/2 bg-slate-900 skew-y-[-5deg] origin-top-left -z-10 shadow-xl" />
      
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 relative z-10">
        
        {/* Step 1: Verify */}
        {step === 1 && (
          <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg transform rotate-3 text-white">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-secondary">Kích hoạt tài khoản</h1>
              <p className="text-slate-500 text-sm mt-2">Xác thực thông tin thành viên của câu lạc bộ</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium mb-6 text-center border border-red-100 flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Số điện thoại Zalo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
                    placeholder="Số điện thoại đăng ký thành viên"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mã PIN xác thực CLB</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
                    placeholder="Mã PIN chung của CLB"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-secondary hover:bg-slate-800 focus:outline-none transition-all mt-8 disabled:opacity-70 group"
              >
                {isLoading ? "Đang xác thực..." : "Xác nhận tài khoản"}
                {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>

            <div className="text-center mt-6 pt-4 border-t border-slate-100">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại Đăng nhập
              </Link>
            </div>
          </div>
        )}

        {/* Step 2: Set Password */}
        {step === 2 && (
          <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg transform -rotate-3 text-white">
                <UserCheck className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-secondary">Chào {fullName},</h1>
              <p className="text-slate-500 text-sm mt-2">Vui lòng thiết lập mật khẩu mới cho tài khoản của bạn</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium mb-6 text-center border border-red-100 flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleActivate} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mật khẩu mới (tối thiểu 6 ký tự)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
                    placeholder="Mật khẩu của bạn"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
                    placeholder="Nhập lại mật khẩu mới"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || newPassword.length < 6 || newPassword !== confirmPassword}
                className="w-full flex items-center justify-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none transition-all mt-8 disabled:opacity-50"
              >
                {isLoading ? "Đang kích hoạt..." : "Kích hoạt tài khoản"}
              </button>
            </form>
          </div>
        )}

        {/* Step 3: Success Redirect */}
        {step === 3 && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-6 text-green-600 animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold text-secondary mb-2">{success}</h1>
            <p className="text-slate-500 text-sm">
              Tài khoản của bạn đã kích hoạt thành công.
            </p>
            <p className="text-slate-400 text-xs mt-6">
              Đang tự động chuyển hướng về trang Đăng nhập sau {countdown} giây...
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
