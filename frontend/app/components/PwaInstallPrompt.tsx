"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle2 } from "lucide-react";

export default function PwaInstallPrompt() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // 1. Kiểm tra nếu app đang chạy ở chế độ Standalone (đã cài đặt làm app)
    const checkStandalone = 
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    
    setIsStandalone(checkStandalone);
    if (checkStandalone) return;

    // 2. Kiểm tra xem người dùng đã bấm tắt thông báo trong vòng 7 ngày qua chưa
    const dismissedTime = localStorage.getItem("pwa_prompt_dismissed");
    if (dismissedTime) {
      const daysPassed = (Date.now() - parseInt(dismissedTime, 10)) / (1000 * 60 * 60 * 24);
      if (daysPassed < 7) {
        return; // Chưa quá 7 ngày thì không làm phiền
      }
    }

    // 3. Nhận diện thiết bị iOS (iPhone / iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isAppleDevice);

    // 4. Lắng nghe sự kiện cài đặt trên Android / Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Nếu là iOS và chưa cài đặt, hiển thị banner sau 3 giây vào web
    let iosTimer: any;
    if (isAppleDevice) {
      iosTimer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIosGuide(false);
    localStorage.setItem("pwa_prompt_dismissed", Date.now().toString());
  };

  const handleInstallClick = async () => {
    if (isIos) {
      // Mở hướng dẫn cho iOS
      setShowIosGuide(true);
    } else if (deferredPrompt) {
      // Kích hoạt popup cài đặt chuẩn của Android/Chrome
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      // Thiết bị Android khác hoặc browser không hỗ trợ trigger tự động -> mở hướng dẫn
      setShowIosGuide(true);
    }
  };

  // Không hiển thị nếu đã ở dạng standalone
  if (isStandalone || !showBanner) return null;

  return (
    <>
      {/* BANNER THÔNG BÁO Ở CHÂN MÀN HÌNH (iOS Home Indicator Safe Area) */}
      <div 
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="bg-slate-900/95 backdrop-blur-xl border border-primary/40 rounded-2xl p-4 shadow-2xl shadow-primary/20 text-white flex items-center justify-between gap-3.5">
          {/* Logo */}
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-primary/20 border border-primary/30 flex-shrink-0 flex items-center justify-center p-1.5 shadow-md">
            <Image 
              src="/logo.png" 
              alt="SmashTeam App" 
              width={48} 
              height={48} 
              className="w-full h-full object-contain"
            />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase text-primary tracking-wider">Ứng Dụng Di Động</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <h4 className="text-sm font-bold text-white truncate">Cài đặt SmashTeam</h4>
            <p className="text-[11px] text-slate-300 truncate">Mở toàn màn hình, vào nhanh như App</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 bg-primary hover:bg-primary-hover active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Cài đặt</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL HƯỚNG DẪN DÀNH CHO IOS SAFARI & THIẾT BỊ KHÁC */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl text-white space-y-5 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center p-1">
                  <Image src="/logo.png" alt="SmashTeam" width={32} height={32} className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Thêm SmashTeam vào màn hình</h3>
                  <p className="text-[10px] text-slate-400">Áp dụng cho iPhone & iPad</p>
                </div>
              </div>
              <button 
                onClick={() => setShowIosGuide(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-6 h-6 rounded-lg bg-primary/30 text-primary flex items-center justify-center font-black shrink-0 text-xs">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-200">
                    Bấm vào nút <span className="text-primary font-black">Chia sẻ (Share)</span> ở thanh dưới cùng trình duyệt Safari.
                  </p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    Biểu tượng ô vuông có mũi tên chỉ lên <Share className="w-3.5 h-3.5 inline text-sky-400" />
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-6 h-6 rounded-lg bg-primary/30 text-primary flex items-center justify-center font-black shrink-0 text-xs">
                  2
                </div>
                <div>
                  <p className="font-bold text-slate-200">
                    Cuộn xuống dưới và bấm chọn <span className="text-amber-300 font-black">"Thêm vào MH chính"</span>.
                  </p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <PlusSquare className="w-3.5 h-3.5 inline text-amber-300" /> (Add to Home Screen)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-6 h-6 rounded-lg bg-primary/30 text-primary flex items-center justify-center font-black shrink-0 text-xs">
                  3
                </div>
                <div>
                  <p className="font-bold text-slate-200">
                    Bấm <span className="text-emerald-400 font-black">"Thêm" (Add)</span> ở góc phải trên màn hình.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Logo SmashTeam sẽ hiện ngay trên màn hình chính như 1 ứng dụng thật!
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowIosGuide(false)}
                className="w-full py-3 bg-primary hover:bg-primary-hover active:scale-95 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Tôi đã hiểu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
