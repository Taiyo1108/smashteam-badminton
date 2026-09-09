"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Home, User } from "lucide-react";
import { API_URL } from "@/app/config";
import BrandLogo from "@/app/components/BrandLogo";

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

          // Pháo hoa chúc mừng (lazy-load để nhẹ trang)
          const { default: confetti } = await import("canvas-confetti");
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 shadow-xl text-center z-10">
        <div className="flex justify-center mb-6">
          <BrandLogo size={64} />
        </div>

        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-black animate-spin mx-auto" />
            <h2 className="text-xl font-bold tracking-wide">{message}</h2>
            <p className="text-sm text-slate-500">Vui lòng đợi trong giây lát...</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6 animate-fade-up">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{message}</h2>
              <p className="text-sm text-slate-500 mt-2">
                Chúc mừng! Bạn đã được cộng <span className="text-emerald-600 font-extrabold">+25 XP</span> và <span className="text-amber-600 font-extrabold">+10 Smash Coins</span> và cập nhật tiến trình nhiệm vụ điểm danh ngày.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => router.push("/profile")}
                className="flex-1 h-11 bg-black hover:bg-black/85 text-white font-bold text-sm rounded-full active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <User className="w-4 h-4" /> Trang Cá Nhân
              </button>
              <button
                onClick={() => router.push("/")}
                className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-full active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-4 h-4" /> Trang Chủ
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6 animate-fade-up">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Điểm danh thất bại</h2>
              <p className="text-sm text-rose-600 mt-3 bg-rose-50 border border-rose-100 px-4 py-3 rounded-2xl leading-relaxed">
                {errorMsg}
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button
                onClick={() => router.push("/profile")}
                className="w-full h-11 bg-black hover:bg-black/85 text-white font-bold text-sm rounded-full active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-black animate-spin mx-auto" />
      </div>
    }>
      <CheckInContent />
    </Suspense>
  );
}
