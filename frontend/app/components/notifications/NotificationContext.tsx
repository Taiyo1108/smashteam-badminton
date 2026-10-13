"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { API_URL } from "@/app/config";

export interface Announcement {
  id: number;
  title: string;
  content: string;
  category: "urgent" | "activity" | "shop" | "system" | "general";
  image_url: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  attachment_mime_type: string | null;
  is_popup: boolean;
  priority: number;
  publish_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  is_read?: boolean;
}

interface NotificationContextType {
  announcements: Announcement[];
  unreadCount: number;
  isLoading: boolean;
  activePopup: Announcement | null;
  isPopupOpen: boolean;
  isDrawerOpen: boolean;
  selectedAnnouncement: Announcement | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  openDetail: (announcement: Announcement) => void;
  closeDetail: () => void;
  closePopupTemporarily: () => void;
  confirmPopupRead: (id: number) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const GUEST_STORAGE_KEY = "smashteam_read_announcements";
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Helper đọc và làm sạch dữ liệu localStorage cho khách
function getGuestReadIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((v) => parseInt(v, 10))
        .filter((v) => Number.isInteger(v) && v > 0);
    }
  } catch (e) {
    console.warn("[Notifications] Corrupted guest read storage, resetting.");
    localStorage.removeItem(GUEST_STORAGE_KEY);
  }
  return [];
}

function saveGuestReadId(id: number) {
  if (typeof window === "undefined") return;
  try {
    const ids = getGuestReadIds();
    if (!ids.includes(id)) {
      const updated = [id, ...ids].slice(0, 300); // Giới hạn 300 ID gần nhất
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn("[Notifications] Error saving guest read id:", e);
  }
}

function saveAllGuestReadIds(newIds: number[]) {
  if (typeof window === "undefined") return;
  try {
    const current = getGuestReadIds();
    const set = new Set([...newIds, ...current]);
    const updated = Array.from(set).slice(0, 500);
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("[Notifications] Error saving all guest read ids:", e);
  }
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || localStorage.getItem("admin_token");
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activePopup, setActivePopup] = useState<Announcement | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // Bộ nhớ tạm các pop-up đã bị đóng bằng X hoặc Escape trong phiên (không pop-up lại ngay lập tức)
  const temporarilyClosedIdsRef = useRef<Set<number>>(new Set());
  const lastTokenRef = useRef<string | null>(null);

  // Lấy danh sách thông báo và số lượng chưa đọc
  const fetchAnnouncements = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      const guestIds = token ? [] : getGuestReadIds();
      const guestQuery = guestIds.length > 0 ? `?guest_read_ids=${guestIds.join(",")}` : "";

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/api/announcements${guestQuery}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
        setUnreadCount(data.unread_count ?? 0);
      }
    } catch (err) {
      console.error("[Notifications] Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Kiểm tra và hiển thị Pop-up mới nhất hợp lệ chưa đọc
  const checkPopup = useCallback(async () => {
    try {
      const token = getAuthToken();
      const guestIds = token ? [] : getGuestReadIds();
      const guestQuery = guestIds.length > 0 ? `?guest_read_ids=${guestIds.join(",")}` : "";

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/api/announcements/popup${guestQuery}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.has_popup && data.announcement) {
          const popupItem = data.announcement as Announcement;
          // Nếu thông báo chưa bị đóng tạm trong phiên hiện tại
          if (!temporarilyClosedIdsRef.current.has(popupItem.id)) {
            setActivePopup(popupItem);
            setIsPopupOpen(true);
          }
        } else {
          setActivePopup(null);
          setIsPopupOpen(false);
        }
      }
    } catch (err) {
      console.error("[Notifications] Check popup error:", err);
    }
  }, []);

  // Làm mới toàn bộ
  const refreshNotifications = useCallback(async () => {
    await fetchAnnouncements();
    await checkPopup();
  }, [fetchAnnouncements, checkPopup]);

  // Khởi động và theo dõi thay đổi danh tính (Đăng nhập / Đăng xuất)
  useEffect(() => {
    const currentToken = getAuthToken();
    lastTokenRef.current = currentToken;
    refreshNotifications();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token" || e.key === "admin_token" || e.key === "user_role") {
        const newToken = getAuthToken();
        if (newToken !== lastTokenRef.current) {
          lastTokenRef.current = newToken;
          temporarilyClosedIdsRef.current.clear();
          refreshNotifications();
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [refreshNotifications]);

  // Hành động 1: Đóng Pop-up tạm thời (nhấn X hoặc Escape) — không ghi nhận đã đọc
  const closePopupTemporarily = useCallback(() => {
    if (activePopup) {
      temporarilyClosedIdsRef.current.add(activePopup.id);
    }
    setIsPopupOpen(false);
  }, [activePopup]);

  // Hành động 2: Nhấn "Đã hiểu" trên Pop-up — ghi nhận đã đọc, đóng, và kiểm tra thông báo kế tiếp
  const confirmPopupRead = useCallback(async (id: number) => {
    const token = getAuthToken();

    // Cập nhật state lạc quan
    setAnnouncements((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    if (!token) {
      saveGuestReadId(id);
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      await fetch(`${API_URL}/api/announcements/${id}/read`, {
        method: "POST",
        headers,
      });
    } catch (err) {
      console.error("[Notifications] Confirm popup read error:", err);
    }

    // Đóng popup hiện tại
    setIsPopupOpen(false);
    setActivePopup(null);

    // Kiểm tra xem còn thông báo pop-up kế tiếp nào chưa đọc không
    setTimeout(() => {
      checkPopup();
    }, 300);
  }, [checkPopup]);

  // Đánh dấu 1 thông báo đã đọc (trong Drawer / Chi tiết)
  const markAsRead = useCallback(async (id: number) => {
    const target = announcements.find((a) => a.id === id);
    if (target?.is_read) return;

    const token = getAuthToken();
    setAnnouncements((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    if (!token) {
      saveGuestReadId(id);
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      await fetch(`${API_URL}/api/announcements/${id}/read`, {
        method: "POST",
        headers,
      });
    } catch (err) {
      console.error("[Notifications] Mark as read error:", err);
    }
  }, [announcements]);

  // Đánh dấu tất cả đã đọc
  const markAllAsRead = useCallback(async () => {
    const token = getAuthToken();

    // Cập nhật state lạc quan
    setAnnouncements((prev) => prev.map((item) => ({ ...item, is_read: true })));
    setUnreadCount(0);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/announcements/read-all`, {
        method: "POST",
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        if (!token && data.read_ids && Array.isArray(data.read_ids)) {
          saveAllGuestReadIds(data.read_ids);
        }
      }
    } catch (err) {
      console.error("[Notifications] Mark all as read error:", err);
      // Re-fetch nếu lỗi
      fetchAnnouncements();
    }
  }, [fetchAnnouncements]);

  // Quản lý Drawer & Modal chi tiết
  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  const openDetail = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    if (!announcement.is_read) {
      markAsRead(announcement.id);
    }
  };

  const closeDetail = () => setSelectedAnnouncement(null);

  return (
    <NotificationContext.Provider
      value={{
        announcements,
        unreadCount,
        isLoading,
        activePopup,
        isPopupOpen,
        isDrawerOpen,
        selectedAnnouncement,
        openDrawer,
        closeDrawer,
        openDetail,
        closeDetail,
        closePopupTemporarily,
        confirmPopupRead,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
