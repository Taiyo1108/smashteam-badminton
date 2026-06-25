"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Phone, ArrowRight } from "lucide-react";

export default function UnifiedLogin() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_zalo: phone, password })
      });

      if (res.ok) {
        const data = await res.json();
        // Save token and role
        localStorage.setItem("admin_token", data.token); // using admin_token for compatibility with existing codebase
        localStorage.setItem("user_role", data.user.role);
        
        // Redirect based on role
        if (data.user.role === 'admin') {
          router.push("/admin");
        } else {
          router.push("/");
        }
      } else {
        const errData = await res.json();
        setError(errData.error || "Số điện thoại hoặc mật khẩu không chính xác.");
      }
    } catch (err) {
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 w-full h-1/2 bg-slate-900 skew-y-[-5deg] origin-top-left -z-10 shadow-xl" />
      
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg transform rotate-3">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-secondary">Đăng Nhập</h1>
          <p className="text-slate-500 text-sm mt-2">Dành cho Quản trị viên và Thành viên</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium mb-6 text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
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
                placeholder="Nhập số điện thoại"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Mật khẩu</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-secondary hover:bg-slate-800 focus:outline-none transition-all mt-8 disabled:opacity-70 group"
          >
            {isLoading ? "Đang đăng nhập..." : "Đăng nhập hệ thống"}
            {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-slate-100">
          <Link
            href="/claim-account"
            className="text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            Bạn là thành viên cũ? Kích hoạt tài khoản tại đây
          </Link>
        </div>
      </div>
    </div>
  );
}
