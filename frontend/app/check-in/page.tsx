"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2, AlertCircle, Loader2, Home, User, Sparkles,
  Camera, KeyRound, ArrowRight, ArrowLeft, RefreshCw, XCircle, LogIn, ShieldCheck, MapPin, Clock
} from "lucide-react";
import { API_URL } from "@/app/config";
import confetti from "canvas-confetti";
import { Html5Qrcode } from "html5-qrcode";

function CheckInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const urlCode = searchParams.get("code");

  // Mode: "auto" (khi có params), "manual" (nhập code 5 ký tự), "camera" (quét QR)
  const [activeTab, setActiveTab] = useState<"code" | "camera">("code");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successData, setSuccessData] = useState<any>(null);

  // Form code 5 ký tự
  const [manualCode, setManualCode] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // User auth state
  const [currentUser, setCurrentUser] = useState<{ id?: string; name?: string; role?: string } | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(true);

  // Camera Scanner state
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Âm thanh thông báo nhẹ nhàng
  const playSuccessSound = () => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // AudioContext có thể bị chặn trước khi user tương tác
    }
  };

  // Khởi tạo kiểm tra Auth
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setHasToken(false);
    } else {
      setHasToken(true);
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        }
      } catch {
        // ignore parse error
      }
    }
  }, []);

  // Tự động check-in nếu URL có tham số hợp lệ
  useEffect(() => {
    if (!sessionId && !urlCode) {
      // Người dùng truy cập trực tiếp /check-in -> hiển thị form nhập mã & quét camera
      return;
    }

    const token = localStorage.getItem("admin_token");
    if (!token) {
      const currentUrl = window.location.pathname + window.location.search;
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }

    // Tiến hành tự động điểm danh
    handleAutoCheckIn(token, sessionId, urlCode);
  }, [sessionId, urlCode]);

  const handleAutoCheckIn = async (token: string, sId: string | null, code: string | null) => {
    setStatus("loading");
    setStatusMessage("Đang tiến hành xác thực điểm danh...");

    try {
      let res: Response;
      if (sId) {
        // Gọi API theo session_id
        res = await fetch(`${API_URL}/api/sessions/${sId}/qr-check-in`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ code: code || "" })
        });
      } else {
        // Chỉ có code -> gọi code-check-in
        res = await fetch(`${API_URL}/api/sessions/code-check-in`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ code: code || "" })
        });
      }

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setSuccessData(data);
        setStatusMessage(data.message || "Điểm danh buổi tập thành công!");
        playSuccessSound();
        confetti({
          particleCount: 160,
          spread: 90,
          origin: { y: 0.6 }
        });
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Điểm danh thất bại. Vui lòng liên hệ ban quản trị sân.");
      }
    } catch (err) {
      console.error("Auto Check-in error:", err);
      setStatus("error");
      setErrorMessage("Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng.");
    }
  };

  // Xử lý điểm danh thủ công bằng mã 5 ký tự
  const handleManualSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = manualCode.trim().toUpperCase();

    if (!cleanCode || cleanCode.length < 4) {
      setErrorMessage("Vui lòng nhập đúng mã điểm danh 5 ký tự.");
      return;
    }

    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push(`/login?redirect=${encodeURIComponent("/check-in")}`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch(`${API_URL}/api/sessions/code-check-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: cleanCode })
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setSuccessData(data);
        setStatusMessage(data.message || "Điểm danh thành công!");
        playSuccessSound();
        confetti({
          particleCount: 160,
          spread: 90,
          origin: { y: 0.6 }
        });
      } else {
        setErrorMessage(data.error || "Mã điểm danh không hợp lệ hoặc buổi tập chưa mở.");
      }
    } catch (err) {
      console.error("Manual check-in error:", err);
      setErrorMessage("Lỗi kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quản lý Camera Scanner
  const startCameraScanner = async () => {
    setCameraError(null);
    setIsCameraActive(true);

    // Chờ DOM mount thẻ #qr-checkin-camera
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("qr-checkin-camera");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          (decodedText) => {
            handleQrScanned(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        console.error("Lỗi khởi tạo camera:", err);
        setCameraError("Không thể mở camera. Vui lòng cấp quyền truy cập camera trên trình duyệt hoặc sử dụng mã 5 ký tự.");
        setIsCameraActive(false);
      }
    }, 250);
  };

  const stopCameraScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) {
        // ignore
      }
    }
    setIsCameraActive(false);
  };

  // Khi camera quét được chuỗi
  const handleQrScanned = async (decodedText: string) => {
    stopCameraScanner();

    // Phân tích nếu decodedText là URL hoặc chuỗi code thuần
    let sId: string | null = null;
    let code: string = decodedText.trim();

    try {
      if (decodedText.includes("http://") || decodedText.includes("https://") || decodedText.includes("/check-in")) {
        const urlObj = new URL(decodedText, window.location.origin);
        sId = urlObj.searchParams.get("session_id");
        const c = urlObj.searchParams.get("code");
        if (c) code = c;
      }
    } catch (e) {
      // parse text
    }

    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    handleAutoCheckIn(token, sId, code);
  };

  // Dọn dẹp camera khi unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center p-4 sm:p-6 text-white relative overflow-hidden">
      {/* Purple Neon Glow Ambient Background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[400px] bg-primary/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[250px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Nút quay lại trang chủ */}
      <button
        onClick={() => router.push("/")}
        aria-label="Quay lại trang chủ"
        className="absolute top-4 left-4 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 text-slate-300 hover:text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Trang chủ</span>
      </button>

      <div className="w-full max-w-lg bg-secondary-surface/90 backdrop-blur-xl border border-primary/30 rounded-3xl p-6 sm:p-9 shadow-2xl z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-smash-violet flex items-center justify-center border border-primary/50 text-2xl font-black text-white shadow-[0_0_15px_rgba(122,34,224,0.5)] select-none">
              S
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">Cổng Điểm Danh CLB</h1>
              <p className="text-xs text-slate-400">CLB Cầu Lông SmashTeam UIT</p>
            </div>
          </div>
          {currentUser?.name && (
            <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs text-slate-300">
              <User className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold truncate max-w-[120px]">{currentUser.name}</span>
            </div>
          )}
        </div>

        {/* LOADING AUTO CHECK-IN */}
        {status === "loading" && (
          <div className="space-y-4 py-8 text-center animate-fade-in">
            <Loader2 className="w-12 h-12 text-smash-violet animate-spin mx-auto" aria-hidden="true" />
            <h2 className="text-xl font-bold text-white tracking-wide">{statusMessage}</h2>
            <p className="text-xs text-slate-400">Đang đồng bộ dữ liệu và trao thưởng XP...</p>
          </div>
        )}

        {/* SUCCESS CARD */}
        {status === "success" && (
          <div className="space-y-6 text-center animate-fade-in py-2">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.35)]">
              <CheckCircle2 className="w-12 h-12" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Điểm Danh Thành Công!</h2>
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                {statusMessage}
              </p>
            </div>

            {/* Chi tiết phần thưởng */}
            <div className="bg-gradient-to-br from-white/5 to-white/10 border border-emerald-500/30 rounded-2xl p-4 text-left space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Phần thưởng nhận được
                </span>
                <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  +1 Buổi tham gia
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                  <div className="text-xs text-slate-400 font-semibold mb-0.5">Kinh nghiệm</div>
                  <div className="text-lg font-black text-emerald-400">+25 XP</div>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                  <div className="text-xs text-slate-400 font-semibold mb-0.5">Smash Coins</div>
                  <div className="text-lg font-black text-amber-400">+10 Coins</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => router.push("/profile")}
                className="min-h-[46px] flex-1 py-3 px-5 bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Xem Trang Cá Nhân</span>
              </button>
              <button
                onClick={() => router.push("/")}
                className="min-h-[46px] flex-1 py-3 px-5 bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-sm rounded-2xl border border-white/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Về Trang Chủ</span>
              </button>
            </div>
          </div>
        )}

        {/* ERROR STATE FROM AUTO CHECK-IN */}
        {status === "error" && (
          <div className="space-y-6 text-center animate-fade-in py-2">
            <div className="w-20 h-20 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(244,63,94,0.35)]">
              <AlertCircle className="w-12 h-12" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">Điểm danh chưa thành công</h2>
              <p className="text-sm text-rose-300 bg-rose-950/40 border border-rose-500/30 px-4 py-3 rounded-2xl leading-relaxed font-medium">
                {errorMessage}
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => {
                  setStatus("idle");
                  setErrorMessage("");
                }}
                className="min-h-[46px] w-full py-3 px-5 bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Nhập mã 5 ký tự khác</span>
              </button>
              <button
                onClick={() => router.push("/")}
                className="min-h-[46px] w-full py-3 px-5 bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-sm rounded-2xl border border-white/15 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Quay lại Trang chủ</span>
              </button>
            </div>
          </div>
        )}

        {/* IDLE PORTAL: NHẬP MÃ 5 KÝ TỰ HOẶC MỞ CAMERA QUÉT QR */}
        {status === "idle" && (
          <div className="space-y-6 animate-fade-in">
            {/* Cảnh báo chưa đăng nhập */}
            {!hasToken && (
              <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-left">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Chưa đăng nhập
                  </div>
                  <div className="text-[11px] text-slate-300 leading-snug">
                    Bạn cần đăng nhập để được cộng +25 XP và Smash Coins.
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/login?redirect=${encodeURIComponent("/check-in")}`)}
                  className="shrink-0 px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1"
                >
                  <LogIn className="w-3.5 h-3.5" /> Đăng nhập
                </button>
              </div>
            )}

            {/* Tab Selection */}
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("code");
                  stopCameraScanner();
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "code"
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>Nhập mã 5 ký tự</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("camera");
                  startCameraScanner();
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "camera"
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Quét mã QR</span>
              </button>
            </div>

            {/* TAB 1: NHẬP MÃ 5 KÝ TỰ (DÀNH CHO THIẾT BỊ KHÔNG CÓ CAMERA) */}
            {activeTab === "code" && (
              <form onSubmit={handleManualSubmit} className="space-y-5">
                <div className="text-center space-y-1.5">
                  <h2 className="text-lg sm:text-xl font-bold text-white">Nhập Mã Buổi Tập Tại Sân</h2>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Dành cho thành viên không có camera hoặc quét QR không được. Mã code 5 ký tự được hiển thị trên bảng điều khiển của Ban chủ nhiệm.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="checkin-code-input" className="block text-xs font-bold text-slate-300 text-center uppercase tracking-wider">
                    Mã điểm danh (5 ký tự)
                  </label>
                  <div className="relative">
                    <input
                      id="checkin-code-input"
                      type="text"
                      maxLength={8}
                      value={manualCode}
                      onChange={(e) => {
                        setManualCode(e.target.value.toUpperCase());
                        setErrorMessage("");
                      }}
                      placeholder="VD: FNAQ8"
                      className="w-full bg-white/5 border-2 border-primary/40 focus:border-primary focus:outline-none rounded-2xl py-3.5 px-4 text-center font-mono text-2xl sm:text-3xl font-black tracking-[0.25em] text-white placeholder:text-slate-600 uppercase shadow-inner transition-all"
                      autoFocus
                      autoComplete="off"
                    />
                    {manualCode && (
                      <button
                        type="button"
                        onClick={() => setManualCode("")}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  {errorMessage && (
                    <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium text-center flex items-center justify-center gap-1.5 animate-fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || manualCode.trim().length < 4}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-primary to-smash-violet hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Đang xác thực mã...</span>
                    </>
                  ) : (
                    <>
                      <span>Xác nhận điểm danh</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-center text-[11px] text-slate-400 flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Cộng ngay <strong className="text-emerald-400 font-bold">+25 XP</strong> và <strong className="text-amber-400 font-bold">+10 Coins</strong> khi xác nhận thành công.</span>
                </div>
              </form>
            )}

            {/* TAB 2: QUÉT MÃ QR BẰNG CAMERA */}
            {activeTab === "camera" && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-bold text-white">Quét Mã QR Bằng Camera</h2>
                  <p className="text-xs text-slate-400">
                    Hướng camera điện thoại hoặc laptop về phía mã QR trên màn hình sân tập.
                  </p>
                </div>

                {cameraError ? (
                  <div className="p-5 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-center space-y-3 animate-fade-in">
                    <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                    <p className="text-xs text-rose-300 leading-relaxed">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("code")}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow"
                    >
                      Chuyển sang nhập mã 5 ký tự
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border-2 border-primary/50 shadow-inner bg-black flex items-center justify-center min-h-[260px]">
                      <div id="qr-checkin-camera" className="w-full h-full" />
                      {!isCameraActive && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-secondary/80 backdrop-blur-sm space-y-3">
                          <Camera className="w-12 h-12 text-slate-400 animate-pulse" />
                          <p className="text-xs text-slate-300">Đang khởi động camera...</p>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-center text-slate-400">
                      Nếu camera không mở được hoặc máy không có webcam, bạn hãy chọn tab <strong>"Nhập mã 5 ký tự"</strong> ở trên nhé!
                    </p>
                  </div>
                )}
              </div>
            )}
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
