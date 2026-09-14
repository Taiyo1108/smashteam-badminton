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
  // Giữ callbacks trong ref để effect chỉ chạy 1 lần, không restart camera mỗi render
  const successRef = useRef(onScanSuccess);
  const failureRef = useRef(onScanFailure);
  successRef.current = onScanSuccess;
  failureRef.current = onScanFailure;

  useEffect(() => {
    let cancelled = false;
    const html5Qrcode = new Html5Qrcode("qr-reader-container");
    scannerRef.current = html5Qrcode;

    const config = { fps: 10, qrbox: { width: 220, height: 220 } };

    html5Qrcode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        successRef.current(decodedText);
      },
      (errorMessage) => {
        failureRef.current?.(errorMessage);
      }
    ).catch((err) => {
      if (!cancelled) console.error("Failed to start scanner:", err);
    });

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        // stop rồi clear để giải phóng camera + DOM đúng cách
        // (clear() có thể trả void hoặc Promise tùy bản html5-qrcode)
        scanner.stop()
          .catch(() => {})
          .finally(() => {
            try {
              const result = scanner.clear() as unknown;
              if (result instanceof Promise) result.catch(() => {});
            } catch {}
          });
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 w-full max-w-sm mx-auto shadow-xl">
      <div className="flex justify-between items-center w-full mb-3">
        <span className="text-sm font-bold tracking-tight">Quét mã QR nhận quà</span>
        <button
          onClick={onClose}
          className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors cursor-pointer px-2.5 py-1 bg-red-50 border border-red-100 rounded-lg"
        >
          Đóng
        </button>
      </div>

      {/* Container quét */}
      <div
        id="qr-reader-container"
        className="w-full aspect-square overflow-hidden rounded-xl bg-black border border-slate-200 relative shadow-inner"
      ></div>

      <span className="text-[10px] text-slate-500 font-medium mt-3 text-center">
        Hướng camera về mã QR động hiển thị trên điện thoại của học viên
      </span>
    </div>
  );
}
