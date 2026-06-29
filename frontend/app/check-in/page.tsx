"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Home, User } from "lucide-react";
import { API_URL } from "@/app/config";
import confetti from "canvas-confetti";

function CheckInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Đang tiến hành điểm danh...");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setErrorMsg("Mã buổi tập không hợp lệ hoặc thiếu.");
      return;
    }

    const token = localStorage.getItem("admin_token");
    if (!token) {
      // Lưu lại link để quay lại sau khi đăng nhập
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
          setMessage(data.message || "Điểm danh thành công!");
          
          // Chạy hiệu ứng pháo hoa chúc mừng
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        } else {
          setStatus("error");
          setErrorMsg(data.error || "Điểm danh thất bại.");
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white bg-radial-gradient">
      {/* Background design */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(122,34,224,0.15),transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-md border border-purple-950/40 rounded-3xl p-8 shadow-2xl text-center z-10">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-purple-950/50 flex items-center justify-center border border-purple-500/20 text-3xl font-black text-smash-violet select-none">
            S
          </div>
        </div>

        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-smash-violet animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-white tracking-wide">{message}</h2>
            <p className="text-sm text-slate-400">Vui lòng đợi trong giây lát...</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-wide">{message}</h2>
              <p className="text-sm text-slate-400 mt-2">
                Chúc mừng! Bạn đã được cộng <span className="text-emerald-400 font-extrabold">+25 XP</span> và <span className="text-amber-400 font-extrabold">+10 Smash Coins</span> và cập nhật tiến trình nhiệm vụ điểm danh ngày.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => router.push("/profile")}
                className="flex-1 py-3 bg-smash-purple hover:bg-smash-violet text-white font-bold text-sm rounded-full shadow-lg shadow-smash-purple/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <User className="w-4 h-4" /> Trang Cá Nhân
              </button>
              <button
                onClick={() => router.push("/")}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm rounded-full border border-purple-950/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-4 h-4" /> Trang Chủ
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-wide">Điểm danh thất bại</h2>
              <p className="text-sm text-rose-400 mt-3 bg-rose-950/10 border border-rose-500/10 px-4 py-3 rounded-2xl leading-relaxed">
                {errorMsg}
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button
                onClick={() => router.push("/profile")}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-full border border-purple-950/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <User className="w-4 h-4" /> Về Trang cá nhân
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <Loader2 className="w-12 h-12 text-smash-violet animate-spin mx-auto" />
      </div>
    }>
      <CheckInContent />
    </Suspense>
  );
}
