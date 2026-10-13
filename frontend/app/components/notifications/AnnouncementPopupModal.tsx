"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  X,
  Check,
  AlertTriangle,
  Calendar,
  ShoppingBag,
  Sparkles,
  Bell,
  Download,
  FileText,
  ExternalLink,
  ZoomIn
} from "lucide-react";
import { useNotifications, Announcement } from "./NotificationContext";

// Helper lấy nhãn và kiểu dáng phân loại (phù hợp với nền tím mờ trong suốt cao cấp)
export function getCategoryBadge(category: Announcement["category"]) {
  switch (category) {
    case "urgent":
      return {
        label: "THAY ĐỔI ĐỘT XUẤT",
        icon: AlertTriangle,
        className: "bg-rose-500/25 text-rose-300 border-rose-400/40",
        glow: "shadow-[0_0_15px_rgba(244,63,94,0.4)]",
      };
    case "activity":
      return {
        label: "HOẠT ĐỘNG MỚI",
        icon: Calendar,
        className: "bg-emerald-500/25 text-emerald-300 border-emerald-400/40",
        glow: "shadow-[0_0_15px_rgba(16,185,129,0.4)]",
      };
    case "shop":
      return {
        label: "VẬT PHẨM & SHOP",
        icon: ShoppingBag,
        className: "bg-amber-500/25 text-amber-300 border-amber-400/40",
        glow: "shadow-[0_0_15px_rgba(245,158,11,0.4)]",
      };
    case "system":
      return {
        label: "CẬP NHẬT HỆ THỐNG",
        icon: Sparkles,
        className: "bg-purple-500/25 text-purple-200 border-purple-400/40",
        glow: "shadow-[0_0_15px_rgba(168,85,247,0.4)]",
      };
    case "general":
    default:
      return {
        label: "THÔNG BÁO CHUNG",
        icon: Bell,
        className: "bg-cyan-500/25 text-cyan-200 border-cyan-400/40",
        glow: "shadow-[0_0_15px_rgba(6,182,212,0.4)]",
      };
  }
}

// Format bytes
export function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Format date in Vietnamese
export function formatDateTimeVN(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

// Chuyển văn bản thành link an toàn nếu có URL
function renderFormattedContent(text: string) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <div className="text-sm text-purple-100/95 leading-relaxed whitespace-pre-line space-y-2">
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline font-semibold break-all"
            >
              <span>{part}</span>
              <ExternalLink className="w-3.5 h-3.5 inline shrink-0" />
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

export default function AnnouncementPopupModal() {
  const {
    activePopup,
    isPopupOpen,
    closePopupTemporarily,
    confirmPopupRead
  } = useNotifications();

  const [isZoomImageOpen, setIsZoomImageOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lắng nghe phím Escape để đóng tạm thời
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPopupOpen) {
        if (isZoomImageOpen) {
          setIsZoomImageOpen(false);
        } else {
          closePopupTemporarily();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPopupOpen, isZoomImageOpen, closePopupTemporarily]);

  if (!isPopupOpen || !activePopup) {
    return null;
  }

  const badge = getCategoryBadge(activePopup.category);
  const CategoryIcon = badge.icon;

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await confirmPopupRead(activePopup.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Dialog với Nền Tím Mờ Trong Suốt (Purple Frosted Glassmorphism) */}
      <div 
        className="relative w-full max-w-lg bg-[#140827]/85 backdrop-blur-2xl border border-purple-500/30 rounded-3xl shadow-[0_0_50px_rgba(122,34,224,0.35)] overflow-hidden flex flex-col max-h-[90vh] text-white animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-popup-title"
      >
        {/* Header với dải màu tím mờ trong suốt */}
        <div className="relative px-6 pt-6 pb-4 border-b border-purple-500/20 flex items-start justify-between gap-4 bg-gradient-to-b from-purple-900/35 to-transparent">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border ${badge.className} ${badge.glow}`}>
                <CategoryIcon className="w-3.5 h-3.5" />
                {badge.label}
              </span>

              {activePopup.priority > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                  ⭐ Ưu tiên
                </span>
              )}
            </div>

            <h2
              id="announcement-popup-title"
              className="text-lg sm:text-xl font-black text-white leading-snug drop-shadow-sm"
            >
              {activePopup.title}
            </h2>

            <div className="text-[11px] font-medium text-purple-300/70">
              Phát hành: {formatDateTimeVN(activePopup.created_at)}
            </div>
          </div>

          {/* Nút X đóng tạm thời (không đánh dấu đã đọc) */}
          <button
            onClick={closePopupTemporarily}
            className="p-1.5 rounded-full text-purple-300/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Đóng tạm thời (Esc)"
            aria-label="Đóng thông báo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung cuộn riêng */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Khung chứa ảnh đính kèm (Nền mờ trong suốt, khử hoàn toàn khung trắng 2 bên bị dư) */}
          {activePopup.image_url && (
            <div className="relative group rounded-2xl overflow-hidden border border-purple-500/25 bg-purple-950/40 backdrop-blur-md shadow-inner flex items-center justify-center min-h-[200px]">
              {/* Lớp nền mờ lấy từ chính ảnh (ambient glow) che lấp toàn bộ khoảng trống 2 bên */}
              <div 
                className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-40 scale-125"
                style={{ backgroundImage: `url(${activePopup.image_url})` }}
                aria-hidden="true"
              />
              {/* Lớp phủ tím mờ mịn */}
              <div className="absolute inset-0 bg-[#120722]/50 backdrop-blur-[2px]" aria-hidden="true" />

              {/* Ảnh chính hiển thị rõ nét ở giữa */}
              <img
                src={activePopup.image_url}
                alt={activePopup.title}
                className="relative z-10 max-h-80 w-auto max-w-full object-contain mx-auto transition-transform group-hover:scale-102 duration-300 rounded-xl drop-shadow-lg"
              />

              <button
                onClick={() => setIsZoomImageOpen(true)}
                className="absolute bottom-2.5 right-2.5 z-20 px-2.5 py-1.5 rounded-xl bg-purple-950/80 text-purple-100 border border-purple-400/30 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md hover:bg-primary hover:text-white transition-all cursor-pointer shadow-lg active:scale-95"
              >
                <ZoomIn className="w-3.5 h-3.5" /> Xem ảnh lớn
              </button>
            </div>
          )}

          {/* Nội dung văn bản */}
          <div className="p-1">
            {renderFormattedContent(activePopup.content)}
          </div>

          {/* Tệp tài liệu đính kèm (nếu có) */}
          {activePopup.attachment_url && (
            <div className="p-4 rounded-2xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-between gap-3 text-purple-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/20 text-purple-200 border border-purple-400/30 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {activePopup.attachment_name || "Tài liệu đính kèm"}
                  </p>
                  <p className="text-[11px] text-purple-300/70">
                    {formatFileSize(activePopup.attachment_size) || "Tài liệu đi kèm"}
                  </p>
                </div>
              </div>

              <a
                href={activePopup.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(122,34,224,0.35)] shrink-0 active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Tải về
              </a>
            </div>
          )}
        </div>

        {/* Footer: Nút bấm Đã hiểu xác nhận */}
        <div className="p-4 sm:p-5 border-t border-purple-500/20 bg-purple-950/50 flex items-center justify-between gap-3">
          <span className="text-[11px] text-purple-300/70 hidden sm:inline">
            Bấm "Đã hiểu" để xác nhận và không hiện lại
          </span>

          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary via-purple-600 to-indigo-600 hover:from-primary-hover hover:to-purple-500 text-white font-black text-sm shadow-[0_0_20px_rgba(122,34,224,0.45)] hover:shadow-[0_0_25px_rgba(122,34,224,0.6)] transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer ml-auto"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{isSubmitting ? "Đang xử lý..." : "Đã hiểu"}</span>
          </button>
        </div>
      </div>

      {/* Lightbox phóng to ảnh lớn */}
      {isZoomImageOpen && activePopup.image_url && (
        <div 
          className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsZoomImageOpen(false)}
        >
          <button
            onClick={() => setIsZoomImageOpen(false)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
            aria-label="Đóng ảnh"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={activePopup.image_url}
            alt="Phóng to"
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
