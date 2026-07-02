"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (errorMessage: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onScanSuccess, onScanFailure, onClose }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const html5Qrcode = new Html5Qrcode("qr-reader-container");
    scannerRef.current = html5Qrcode;

    const config = { fps: 10, qrbox: { width: 220, height: 220 } };

    html5Qrcode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        onScanSuccess(decodedText);
      },
      (errorMessage) => {
        if (onScanFailure) onScanFailure(errorMessage);
      }
    ).catch((err) => {
      console.error("Failed to start scanner:", err);
    });

    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch((err) => console.error("Failed to stop scanner:", err));
        }
      }
    };
  }, [onScanSuccess, onScanFailure]);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-950/90 rounded-2xl border border-purple-500/30 w-full max-w-sm mx-auto shadow-2xl backdrop-blur-md">
      <div className="flex justify-between items-center w-full mb-3">
        <span className="text-sm font-black text-white tracking-wide">Quét mã QR nhận quà</span>
        <button 
          onClick={onClose} 
          className="text-xs font-black text-red-400 hover:text-red-300 transition-colors cursor-pointer px-2.5 py-1 bg-red-950/20 border border-red-500/20 rounded-lg"
        >
          Đóng
        </button>
      </div>
      
      {/* Container quét */}
      <div 
        id="qr-reader-container" 
        className="w-full aspect-square overflow-hidden rounded-xl bg-black border border-purple-950/40 relative shadow-inner"
      ></div>
      
      <span className="text-[10px] text-slate-400 font-medium mt-3 text-center">
        Hướng camera về mã QR động hiển thị trên điện thoại của học viên
      </span>
    </div>
  );
}
