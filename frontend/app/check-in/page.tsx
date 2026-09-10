"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Home, User, Sparkles } from "lucide-react";
import { API_URL } from "@/app/config";
import confetti from "canvas-confetti";

function CheckInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Đang tiến hành xác thực điểm danh...");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setErrorMsg("Mã buổi tập không hợp lệ hoặc bị thiếu trên đường dẫn.");
      return;
    }

    const token = localStorage.getItem("admin_token");
    if (!token) {
      const currentUrl = window.location.pathname + window.location.search;
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }

    const performCheckIn = async () => {
      try {
        const res = await fetch(`${API_URL}/api/sessions/${sessionId}/qr-check-in`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        });

        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Điểm danh buổi tập thành công!");

          confetti({
            particleCount: 160,
            spread: 90,
            origin: { y: 0.6 }
          });
        } else {
          setStatus("error");
          setErrorMsg(data.error || "Điểm danh thất bại. Vui lòng liên hệ ban quản trị sân.");
        }
      } catch (err) {
        console.error("QR Check-in error:", err);
        setStatus("error");
        setErrorMsg("Không thể kết nối đến máy chủ.");
      }
    };

    performCheckIn();
  }, [sessionId, router]);

  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
      {/* Purple Neon Spotlight */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-primary/25 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-md bg-secondary-surface/90 backdrop-blur-xl border border-primary/30 rounded-3xl p-8 sm:p-9 shadow-2xl text-center z-10 space-y-6">
        {/* Brand Icon Badge */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-smash-violet flex items-center justify-center border border-primary/50 text-3xl font-black text-white shadow-[0_0_20px_rgba(122,34,224,0.5)] select-none">
            S
          </div>
        </div>

        {status === "loading" && (
          <div className="space-y-4 py-4">
            <Loader2 className="w-12 h-12 text-smash-violet animate-spin mx-auto" aria-hidden="true" />
            <h1 className="text-xl font-bold text-white tracking-wide">{message}</h1>
            <p className="text-xs text-slate-400">Vui lòng giữ nguyên màn hình trong giây lát...</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6 animate-fade-in">
            <div className="w-18 h-18 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-10 h-10" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white tracking-tight">{message}</h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Tuyệt vời! Bạn đã được cộng thưởng <strong className="text-emerald-400 font-extrabold">+25 XP</strong> và <strong className="text-amber-400 font-extrabold">+10 Smash Coins</strong> vào tài khoản.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <button
                onClick={() => router.push("/profile")}
                className="min-h-[44px] flex-1 py-3 px-5 bg-primary hover:bg-primary-hover text-white font-bold text-xs sm:text-sm rounded-full shadow-lg shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer focus-ring"
              >
                <User className="w-4 h-4" aria-hidden="true" />
                <span>Trang cá nhân</span>
              </button>
              <button
                onClick={() => router.push("/")}
                className="min-h-[44px] flex-1 py-3 px-5 bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs sm:text-sm rounded-full border border-white/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer focus-ring"
              >
                <Home className="w-4 h-4" aria-hidden="true" />
                <span>Trang chủ</span>
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6 animate-fade-in">
            <div className="w-18 h-18 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <AlertCircle className="w-10 h-10" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white tracking-tight">Điểm danh thất bại</h1>
              <p className="text-sm text-rose-300 bg-rose-950/30 border border-rose-500/20 px-4 py-3 rounded-2xl leading-relaxed">
                {errorMsg}
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-3">
              <button
                onClick={() => router.push("/profile")}
                className="min-h-[44px] w-full py-3 px-5 bg-primary hover:bg-primary-hover text-white font-bold text-xs sm:text-sm rounded-full shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer focus-ring"
              >
                <User className="w-4 h-4" aria-hidden="true" />
                <span>Về Trang cá nhân</span>
              </button>
              <button
                onClick={() => router.push("/")}
                className="min-h-[44px] w-full py-3 px-5 bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs sm:text-sm rounded-full border border-white/15 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer focus-ring"
              >
                <Home className="w-4 h-4" aria-hidden="true" />
                <span>Quay lại Trang chủ</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-secondary flex flex-col items-center justify-center p-6 text-white">
        <Loader2 className="w-12 h-12 text-smash-violet animate-spin mx-auto" aria-hidden="true" />
      </div>
    }>
      <CheckInContent />
    </Suspense>
  );
}
