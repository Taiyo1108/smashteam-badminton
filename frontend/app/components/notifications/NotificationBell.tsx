"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  CheckCheck,
  X,
  FileText,
  Download,
  Image as ImageIcon,
  ChevronRight,
  ExternalLink,
  ZoomIn
} from "lucide-react";
import {
  useNotifications,
  Announcement
} from "./NotificationContext";
import {
  getCategoryBadge,
  formatFileSize,
  formatDateTimeVN
} from "./AnnouncementPopupModal";

// Helper tính khoảng cách thời gian tương đối
function getRelativeTime(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày trước`;
    return formatDateTimeVN(dateStr);
  } catch {
    return "";
  }
}

export default function NotificationBell() {
  const {
    announcements,
    unreadCount,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    markAsRead,
    markAllAsRead,
    isLoading
  } = useNotifications();

  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [activeItem, setActiveItem] = useState<Announcement | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [drawerPos, setDrawerPos] = useState<{ top: number; right: number } | null>(null);

  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cập nhật vị trí hiển thị bảng thông báo chính xác bên dưới nút chuông
  const updateDrawerPosition = useCallback(() => {
    if (bellButtonRef.current) {
      const rect = bellButtonRef.current.getBoundingClientRect();
      setDrawerPos({
        top: Math.round(rect.bottom + 8),
        right: Math.max(12, Math.round(window.innerWidth - rect.right)),
      });
    }
  }, []);

  useEffect(() => {
    if (!isDrawerOpen) return;

    updateDrawerPosition();
    window.addEventListener("resize", updateDrawerPosition);
    window.addEventListener("scroll", updateDrawerPosition, true);

    return () => {
      window.removeEventListener("resize", updateDrawerPosition);
      window.removeEventListener("scroll", updateDrawerPosition, true);
    };
  }, [isDrawerOpen, updateDrawerPosition]);

  // Đóng drawer khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isDrawerOpen) return;
      const target = event.target as Node;
      if (
        drawerRef.current &&
        !drawerRef.current.contains(target) &&
        bellButtonRef.current &&
        !bellButtonRef.current.contains(target)
      ) {
        closeDrawer();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (zoomImage) {
          setZoomImage(null);
        } else if (activeItem) {
          setActiveItem(null);
        } else if (isDrawerOpen) {
          closeDrawer();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDrawerOpen, closeDrawer, activeItem, zoomImage]);

  // Lọc thông báo theo tab
  const filteredList = announcements.filter((item) => {
    if (filter === "unread") {
      return !item.is_read;
    }
    return true;
  });

  const handleSelectItem = (item: Announcement) => {
    setActiveItem(item);
    if (!item.is_read) {
      markAsRead(item.id);
    }
  };

  // Tính toán style động cho bảng thông báo để không bao giờ bị tràn hay che khuất
  const getDrawerStyle = (): React.CSSProperties => {
    if (typeof window === "undefined") return {};
    const isMobile = window.innerWidth < 640;
    const top = drawerPos?.top ?? 72;
    const maxH = `calc(100vh - ${top + 16}px)`;

    if (isMobile) {
      return {
        top: `${top}px`,
        left: "12px",
        right: "12px",
        width: "auto",
        maxHeight: maxH,
      };
    }

    return {
      top: `${top}px`,
      right: `${drawerPos?.right ?? 24}px`,
      left: "auto",
      width: "420px",
      maxWidth: "calc(100vw - 24px)",
      maxHeight: maxH,
    };
  };

  return (
    <>
      {/* NÚT CHUÔNG DUY NHẤT TRÊN NAVBAR */}
      <div className="relative inline-flex items-center">
        <button
          ref={bellButtonRef}
          id="nav-notification-bell-btn"
          onClick={() => {
            if (isDrawerOpen) {
              closeDrawer();
            } else {
              openDrawer();
            }
          }}
          className={`relative p-2.5 rounded-full transition-all flex items-center justify-center cursor-pointer min-h-[40px] min-w-[40px] ${
            isDrawerOpen
              ? "bg-purple-100 text-primary"
              : "text-slate-600 hover:text-primary hover:bg-purple-50/80 active:scale-95"
          }`}
          title="Thông báo câu lạc bộ"
          aria-label={`Thông báo (${unreadCount} chưa đọc)`}
        >
          <Bell className="w-5 h-5 transition-transform" />

          {/* Huy hiệu số lượng chưa đọc */}
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black leading-none text-white bg-rose-600 rounded-full shadow-sm border-2 border-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            </span>
          )}
        </button>
      </div>

      {/* NOTIFICATION DRAWER / POPOVER (PORTAL RA BODY ĐỂ KHÔNG BỊ TRAP BỞI BACKDROP-FILTER/OVERFLOW) */}
      {mounted && isDrawerOpen && typeof document !== "undefined" && createPortal(
        <div
          ref={drawerRef}
          style={getDrawerStyle()}
          className="fixed bg-white rounded-3xl shadow-2xl border border-purple-100/80 z-[9990] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/60 to-white shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-secondary">
                Thông báo CLB
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-600">
                  {unreadCount} mới
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary-hover px-2.5 py-1 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Đọc tất cả</span>
                </button>
              )}

              <button
                onClick={closeDrawer}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Đóng bảng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-tabs Lọc: Tất cả / Chưa đọc */}
          <div className="px-4 py-2 border-b border-slate-100 flex gap-2 bg-slate-50/50 shrink-0">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filter === "all"
                  ? "bg-secondary text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Tất cả ({announcements.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filter === "unread"
                  ? "bg-secondary text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          {/* Danh sách thông báo */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {isLoading && announcements.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                Đang tải thông báo...
              </div>
            ) : filteredList.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-purple-50 text-primary flex items-center justify-center mx-auto">
                  <Bell className="w-6 h-6 opacity-60" />
                </div>
                <p className="text-xs font-bold text-slate-600">
                  {filter === "unread"
                    ? "Bạn đã đọc hết mọi thông báo!"
                    : "Chưa có thông báo nào."}
                </p>
                <p className="text-[11px] text-slate-400">
                  Các tin tức, giải đấu và hoạt động mới sẽ xuất hiện tại đây.
                </p>
              </div>
            ) : (
              filteredList.map((item) => {
                const badge = getCategoryBadge(item.category);
                const CategoryIcon = badge.icon;
                const isUnread = !item.is_read;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className={`p-4 transition-colors cursor-pointer flex items-start gap-3 hover:bg-purple-50/40 relative ${
                      isUnread ? "bg-purple-50/20" : ""
                    }`}
                  >
                    {/* Chấm tròn báo chưa đọc */}
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    )}

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${badge.className}`}
                        >
                          <CategoryIcon className="w-3.5 h-3.5" />
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {getRelativeTime(item.created_at)}
                        </span>
                      </div>

                      <h4
                        className={`text-xs leading-snug truncate ${
                          isUnread
                            ? "font-black text-secondary"
                            : "font-semibold text-slate-700"
                        }`}
                      >
                        {item.title}
                      </h4>

                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {item.content}
                      </p>

                      {/* Thẻ phụ nếu có ảnh hoặc file */}
                      {(item.image_url || item.attachment_url) && (
                        <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                          {item.image_url && (
                            <span className="inline-flex items-center gap-0.5 text-primary">
                              <ImageIcon className="w-3 h-3" /> Có ảnh
                            </span>
                          )}
                          {item.attachment_url && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-600">
                              <FileText className="w-3 h-3" /> Tệp đính kèm
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 self-center shrink-0" />
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}

      {/* MODAL CHI TIẾT KHI NHẤP VÀO 1 THÔNG BÁO TRONG CHUÔNG (PORTAL RA BODY, FROSTED GLASS TÍM) */}
      {mounted && activeItem && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveItem(null)}
        >
          <div 
            className="relative w-full max-w-lg bg-[#140827]/95 backdrop-blur-2xl border border-purple-500/30 rounded-3xl shadow-[0_0_50px_rgba(122,34,224,0.35)] flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden text-white my-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-purple-500/20 flex items-start justify-between gap-3 bg-gradient-to-b from-purple-900/35 to-transparent shrink-0">
              <div className="space-y-1.5 flex-1 min-w-0">
                {(() => {
                  const b = getCategoryBadge(activeItem.category);
                  const Icon = b.icon;
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black border ${b.className} ${b.glow}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {b.label}
                    </span>
                  );
                })()}
                <h3 className="text-base sm:text-lg font-black text-white leading-snug drop-shadow-sm">
                  {activeItem.title}
                </h3>
                <p className="text-[11px] text-purple-300/70">
                  {formatDateTimeVN(activeItem.created_at)}
                </p>
              </div>

              <button
                onClick={() => setActiveItem(null)}
                className="p-1.5 rounded-full text-purple-300/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                aria-label="Đóng chi tiết"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nội dung chi tiết cuộn */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* Khung chứa ảnh đính kèm (Nền mờ trong suốt) */}
              {activeItem.image_url && (
                <div className="relative group rounded-2xl overflow-hidden border border-purple-500/25 bg-purple-950/40 backdrop-blur-md shadow-inner flex items-center justify-center min-h-[180px]">
                  {/* Lớp nền mờ lấy từ ảnh ambient */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-40 scale-125"
                    style={{ backgroundImage: `url(${activeItem.image_url})` }}
                    aria-hidden="true"
                  />
                  <div className="absolute inset-0 bg-[#120722]/50 backdrop-blur-[2px]" aria-hidden="true" />

                  <img
                    src={activeItem.image_url}
                    alt={activeItem.title}
                    className="relative z-10 max-h-72 w-auto max-w-full object-contain mx-auto transition-transform group-hover:scale-102 duration-300 rounded-xl drop-shadow-lg"
                  />
                  <button
                    onClick={() => setZoomImage(activeItem.image_url)}
                    className="absolute bottom-2.5 right-2.5 z-20 px-2.5 py-1.5 rounded-xl bg-purple-950/80 text-purple-100 border border-purple-400/30 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md hover:bg-primary hover:text-white transition-all cursor-pointer shadow-lg active:scale-95"
                  >
                    <ZoomIn className="w-3.5 h-3.5" /> Phóng to
                  </button>
                </div>
              )}

              {/* Văn bản nội dung */}
              <div className="text-sm text-purple-100/95 leading-relaxed whitespace-pre-line">
                {activeItem.content}
              </div>

              {/* File đính kèm */}
              {activeItem.attachment_url && (
                <div className="p-3.5 rounded-2xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-between gap-3 text-purple-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/20 text-purple-200 border border-purple-400/30 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {activeItem.attachment_name || "Tệp đính kèm"}
                      </p>
                      <p className="text-[10px] text-purple-300/70">
                        {formatFileSize(activeItem.attachment_size) || "Tài liệu"}
                      </p>
                    </div>
                  </div>

                  <a
                    href={activeItem.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(122,34,224,0.35)] shrink-0 active:scale-95 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Tải về
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-purple-500/20 bg-purple-950/50 flex justify-end shrink-0">
              <button
                onClick={() => setActiveItem(null)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* LIGHTBOX PHÓNG TO ẢNH (PORTAL RA BODY) */}
      {mounted && zoomImage && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setZoomImage(null)}
        >
          <button
            onClick={() => setZoomImage(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 cursor-pointer transition-colors"
            aria-label="Đóng ảnh"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={zoomImage}
            alt="Phóng to"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </>
  );
}
