"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, Trophy, Play, Image as ImageIcon, Calendar,
  MapPin, Clock, Check, X, User, Sparkles, Shield,
  QrCode, Search, History, Users, Activity, CheckCircle2,
  Info, Award, Flame, ArrowUpRight, Crown, ArrowRight, Phone, LogOut
} from "lucide-react";
import { useState, useEffect } from "react";
import { API_URL } from "@/app/config";
import AvatarWithFrame from "@/app/components/AvatarWithFrame";
import RankingHubSection from "@/app/components/ranking/RankingHubSection";
import FeaturedEventCountdown from "@/app/components/FeaturedEventCountdown";
import { getRankName, getRankBadgeClass, getShortName } from "@/app/utils/rank";
import ClubStats from "@/app/components/recruitment/ClubStats";
import ClubBenefitsBento from "@/app/components/recruitment/ClubBenefitsBento";
import ClubHighlightsMasonry from "@/app/components/recruitment/ClubHighlightsMasonry";
import EventRecruitmentCard from "@/app/components/recruitment/EventRecruitmentCard";
import RegistrationModal from "@/app/components/recruitment/RegistrationModal";
import { formatVietnamDate } from "@/app/utils/date";
import { format } from "date-fns";
import SessionReservationWidget from "@/app/components/SessionReservationWidget";

// ===== Giới thiệu & Liên hệ động từ site_settings (admin chỉnh ở Quản lý nội dung) =====
const ADDRESS_FALLBACK = "304 ĐT743A, Đông Hòa, Hồ Chí Minh";
const SOCIAL_FALLBACK = [
  { label: "Facebook", url: "" },
  { label: "Instagram", url: "" },
  { label: "Youtube", url: "" },
];

// Tự thêm https:// nếu link thiếu protocol (VD: facebook.com/... -> https://facebook.com/...).
function normalizeSocialUrl(url: unknown): string {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return "";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// Parse chuỗi JSON từ site_settings, rớt về fallback khi lỗi/thiếu.
function parseJsonSetting<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    const parsed = JSON.parse(value) as T;
    return Array.isArray(fallback)
      ? (Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback)
      : (parsed ?? fallback);
  } catch {
    return fallback;
  }
}

export default function Home() {
  const router = useRouter();

  // Active section tab: "intro" | "leaderboard" | "schedule" | "media"
  const [activeTab, setActiveTab] = useState<"intro" | "leaderboard" | "schedule" | "media">("intro");

  // Cấu hình các tab điều hướng trang chủ (dùng chung cho desktop + mobile)
  const homeTabs = [
    { id: "intro", label: "Giới thiệu", shortLabel: "Giới thiệu", icon: Sparkles },
    { id: "leaderboard", label: "Bảng xếp hạng", shortLabel: "Xếp hạng", icon: Trophy },
    { id: "schedule", label: "Lịch đánh", shortLabel: "Lịch đánh", icon: Calendar },
    { id: "media", label: "Hoạt động", shortLabel: "Hoạt động", icon: ImageIcon },
  ] as const;

  // Recruitment modal & active campaign state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<any>(null);

  // Site Settings (Featured event, cover, config)
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [featuredEvent, setFeaturedEvent] = useState<any>(null);

  // Số liệu thật cho dải stats (rớt về số mặc định của ClubStats khi API lỗi)
  const [clubStats, setClubStats] = useState<any>(null);

  // Giới thiệu & Liên hệ do admin cấu hình (Quản lý nội dung -> Giới thiệu & Liên hệ)
  const address = (siteSettings.contact_address || "").trim() || ADDRESS_FALLBACK;
  const contacts = parseJsonSetting<{ name: string; phone: string; role: string }[]>(
    siteSettings.contacts, []
  ).filter((c) => c && (String(c.name || "").trim() || String(c.phone || "").trim()));
  const socialLinks = parseJsonSetting<{ label: string; url: string }[]>(
    siteSettings.social_links, [...SOCIAL_FALLBACK]
  ).filter((s) => s && String(s.label || "").trim());

  // User auth and profile state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Home cover image
  const [coverUrl, setCoverUrl] = useState("");

  // Media Feed
  const [mediaFeed, setMediaFeed] = useState<any[]>([
    { id: 1, title: "Giải đấu SmashTeam Mùa Xuân", type: "image", url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" },
    { id: 2, title: "Buổi tập luyện chiến thuật nâng cao", type: "image", url: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" },
    { id: 3, title: "Highlight Pha Cầu Smash Kịch Tính", type: "video", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }
  ]);

  // Leaderboard data
  const [leaderboard, setLeaderboard] = useState<any[]>([
    { id: "1", full_name: "Nguyễn Văn A", elo_score: 1850, win_rate: 78.5, rank_name: getRankName(1850), total_matches: 24 },
    { id: "2", full_name: "Trần Thị B", elo_score: 1680, win_rate: 71.0, rank_name: getRankName(1680), total_matches: 18 },
    { id: "3", full_name: "Lê Hoàng C", elo_score: 1480, win_rate: 62.5, rank_name: getRankName(1480), total_matches: 14 },
    { id: "4", full_name: "Phạm D", elo_score: 1320, win_rate: 54.0, rank_name: getRankName(1320), total_matches: 10 },
    { id: "5", full_name: "Đặng E", elo_score: 1150, win_rate: 48.0, rank_name: getRankName(1150), total_matches: 6 },
    { id: "6", full_name: "Hoàng Văn F", elo_score: 1050, win_rate: 40.0, rank_name: getRankName(1050), total_matches: 4 },
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [leaderboardType, setLeaderboardType] = useState<"singles" | "doubles">("doubles");

  // Sessions / Schedule data
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [scheduleViewMode, setScheduleViewMode] = useState<"upcoming" | "history">("upcoming");
  const [upcomingSessionHighlight, setUpcomingSessionHighlight] = useState<any>(null);
  const [updatingRsvp, setUpdatingRsvp] = useState(false);
  const [rsvpToast, setRsvpToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setRsvpToast(msg);
    setTimeout(() => setRsvpToast(null), 3500);
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUserRole("");
    setCurrentUser(null);
    setActiveTab("intro");
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("Đã đăng xuất tài khoản thành công.");
  };

  // Load initial user state and profile
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const role = localStorage.getItem("user_role");
    if (token) {
      setIsLoggedIn(true);
      if (role) setUserRole(role);

      fetch(`${API_URL}/api/profile/me?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.player) {
            setCurrentUser(data.player);
            if (data.upcomingSession) {
              setUpcomingSessionHighlight(data.upcomingSession);
            }
          }
        })
        .catch(e => console.error("Error loading user profile:", e));
    }

    const cachedCover = localStorage.getItem("homepage_cover_url");
    if (cachedCover) setCoverUrl(cachedCover);

    fetch(`${API_URL}/api/settings?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          setSiteSettings(data);
          if (data.homepage_cover_url) {
            setCoverUrl(data.homepage_cover_url);
            localStorage.setItem("homepage_cover_url", data.homepage_cover_url);
          }
        }
      })
      .catch(e => console.error("Error loading settings:", e));

    fetch(`${API_URL}/api/media?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((item: any) => {
            const isVideo = item.content_url.includes("youtube.com") || 
                            item.content_url.includes("youtu.be") || 
                            item.content_url.includes("embed");
            return {
              id: item.id,
              title: item.title,
              type: isVideo ? "video" : "image",
              url: item.content_url
            };
          });
          setMediaFeed(mapped);
        }
      })
      .catch(e => console.error("Error loading media:", e));

    fetch(`${API_URL}/api/stats?t=${Date.now()}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setClubStats(data);
      })
      .catch(e => console.error("Error loading club stats:", e));

    fetch(`${API_URL}/api/campaigns/active?t=${Date.now()}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setActiveCampaign(data);
      })
      .catch(e => console.error("Error loading active campaign:", e));

    fetch(`${API_URL}/api/events/featured?t=${Date.now()}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setFeaturedEvent(data);
      })
      .catch(e => console.error("Error loading featured event:", e));

    fetchSessions();
  }, []);

  const fetchSessions = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch(`${API_URL}/api/sessions?t=${Date.now()}`, { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setUpcomingSessions(data);
          if (data.length > 0) {
            setUpcomingSessionHighlight((prev: any) => {
              if (!prev) return data[0];
              const match = data.find((s: any) => s.id === prev.id);
              return match || data[0];
            });
          }
        }
      })
      .catch(e => console.error("Error loading upcoming sessions:", e));

    fetch(`${API_URL}/api/sessions?history=true&t=${Date.now()}`, { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setPastSessions(data);
        }
      })
      .catch(e => console.error("Error loading past sessions:", e));
  };

  useEffect(() => {
    fetch(`${API_URL}/api/users/leaderboard?type=${leaderboardType}&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const formatted = data.map((item: any) => {
            const elo = Number(item.elo_score) || 1000;
            return {
              id: item.id,
              full_name: item.full_name,
              elo_score: elo,
              win_rate: item.win_rate ? parseFloat(item.win_rate) : 0,
              rank_name: getRankName(elo),
              total_matches: item.total_matches || 0
            };
          });
          setLeaderboard(formatted);
        }
      })
      .catch(e => console.error("Error loading leaderboard:", e));
  }, [leaderboardType]);

  const handleRsvp = async (sessionId: number, status: "going" | "absent") => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/login?redirect=/");
      return;
    }

    setUpdatingRsvp(true);
    try {
      const res = await fetch(`${API_URL}/api/profile/rsvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ session_id: sessionId, status })
      });

      if (res.ok) {
        showToast(status === "going" ? "Đã đăng ký tham gia buổi tập thành công!" : "Đã cập nhật trạng thái vắng mặt.");
        if (upcomingSessionHighlight && upcomingSessionHighlight.id === sessionId) {
          setUpcomingSessionHighlight({
            ...upcomingSessionHighlight,
            rsvp_status: status
          });
        }
      } else {
        const err = await res.json();
        showToast(err.error || "Không thể cập nhật RSVP.");
      }
    } catch (e) {
      showToast("Lỗi kết nối khi cập nhật RSVP.");
    } finally {
      setUpdatingRsvp(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return formatVietnamDate(dateStr) || dateStr;
  };

  const shortSessionId = (id: unknown) => {
    const s = String(id ?? "").replace(/-/g, "");
    if (!s) return "";
    return s.slice(0, 6).toUpperCase();
  };

  return (
    <main className="flex-1 w-full bg-background min-h-screen text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Toast Notification */}
      <AnimatePresence>
        {rsvpToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            role="status"
            aria-live="polite"
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-full bg-secondary text-white font-medium text-xs md:text-sm shadow-2xl border border-primary/40 flex items-center gap-2.5 backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>{rsvpToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP NAVBAR (Glassmorphism + Purple Brand + iOS Safe Area Notch Support) */}
      <header 
        className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-purple-100 shadow-sm transition-all pt-safe"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-3">
          
          {/* LOGO LINK */}
          <Link 
            href="/"
            id="brand-logo-link"
            onClick={() => {
              setActiveTab("intro");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2.5 group cursor-pointer focus-ring rounded-xl p-1"
            title="SmashTeam - Về trang chủ"
          >
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(122,34,224,0.35)] border border-primary/30 group-hover:border-primary group-hover:scale-105 transition-all bg-secondary">
              <Image
                src="/logo.png"
                alt="SmashTeam Logo"
                fill
                sizes="40px"
                className="object-cover"
                priority
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-black text-xl sm:text-2xl tracking-tight text-secondary leading-none group-hover:text-primary transition-colors">
                Smash<span className="text-primary">Team</span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Badminton Club</span>
            </div>
          </Link>

          {/* SEGMENTED NAVIGATION TABS (Desktop & Tablet) — pill trượt qua lại */}
          <nav aria-label="Điều hướng chính" className="hidden md:flex items-center bg-slate-100/90 p-1.5 rounded-full border border-slate-200/80 shadow-inner">
            {homeTabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  id={`tab-btn-${t.id}`}
                  onClick={() => setActiveTab(t.id)}
                  className={`relative flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-colors duration-200 cursor-pointer focus-ring ${
                    isActive ? "text-white" : "text-slate-600 hover:text-secondary"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="desktop-tab-pill"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      className="absolute inset-0 bg-primary rounded-full shadow-md shadow-primary/35"
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
                  <span className="relative z-10">{t.label}</span>
                </button>
              );
            })}
          </nav>

          {/* RIGHT ACTIONS: AUTH BUTTONS / USER PROFILE */}
          <div className="flex gap-2 sm:gap-3 items-center">
            {isLoggedIn ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Nút Quản trị cho Admin */}
                {userRole === "admin" && (
                  <Link href="/admin">
                    <button 
                      id="nav-admin-link"
                      className="min-h-[40px] px-4 py-1.5 bg-secondary hover:bg-slate-900 text-white rounded-full font-bold text-xs shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer focus-ring border border-slate-700"
                    >
                      Quản trị
                    </button>
                  </Link>
                )}

                {/* Profile Avatar Chip */}
                <button
                  id="nav-user-profile"
                  onClick={() => router.push("/profile")}
                  className="group relative flex items-center gap-2.5 p-1 rounded-full hover:bg-purple-50 transition-all focus-ring cursor-pointer min-h-[44px]"
                  title={`Trang cá nhân: ${currentUser?.full_name || "Hội viên"}`}
                  aria-label={`Trang cá nhân của ${currentUser?.full_name || "Hội viên"}`}
                >
                  {currentUser?.selected_avatar_frame ? (
                    <div className="relative transition-transform group-hover:scale-105">
                      <AvatarWithFrame
                        avatarUrl={currentUser.avatar_url || ""}
                        frameStyle={currentUser.selected_avatar_frame}
                        sizeClass="w-9 h-9 sm:w-10 sm:h-10"
                        alt={currentUser.full_name || "Profile"}
                      />
                      <span className="absolute bottom-0 right-0 z-30 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" aria-hidden="true" />
                    </div>
                  ) : (
                    <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0.5 bg-gradient-to-tr from-primary to-smash-violet shadow-sm transition-transform group-hover:scale-105 group-hover:shadow-[0_0_12px_rgba(122,34,224,0.4)]">
                      <div className="w-full h-full rounded-full overflow-hidden bg-secondary flex items-center justify-center relative">
                        {currentUser?.avatar_url ? (
                          <Image
                            src={currentUser.avatar_url}
                            alt={currentUser.full_name || "Profile"}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary to-purple-900 flex items-center justify-center text-white font-bold px-0.5 text-center overflow-hidden">
                            {currentUser?.full_name ? (
                              <span className={`truncate max-w-full uppercase ${getShortName(currentUser.full_name).length > 2 ? 'text-[9px]' : 'text-xs sm:text-sm'} font-black`}>
                                {getShortName(currentUser.full_name)}
                              </span>
                            ) : (
                              <User className="w-4 h-4 text-white" aria-hidden="true" />
                            )}
                          </div>
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" aria-hidden="true" />
                    </div>
                  )}

                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-secondary group-hover:text-primary transition-colors line-clamp-1 max-w-[120px]">
                      {currentUser?.nickname || currentUser?.full_name || "Hội viên"}
                    </span>
                    <span className="text-[10px] text-slate-400 leading-tight">Trang cá nhân</span>
                  </div>
                </button>

                {/* Nút Đăng xuất */}
                <button
                  id="nav-logout-btn"
                  onClick={handleLogout}
                  title="Đăng xuất khỏi tài khoản"
                  aria-label="Đăng xuất khỏi tài khoản"
                  className="min-h-[40px] min-w-[40px] sm:min-w-0 sm:px-4 py-1.5 rounded-full border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer focus-ring"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <button 
                    id="nav-login-btn"
                    className="min-h-[40px] px-4 py-1.5 text-secondary hover:text-primary transition-all font-bold text-xs cursor-pointer focus-ring rounded-full hover:bg-slate-100"
                  >
                    Đăng nhập
                  </button>
                </Link>
                <button 
                  id="nav-register-btn"
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="min-h-[40px] px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-full font-bold transition-all transform active:scale-95 shadow-md shadow-primary/30 text-xs cursor-pointer focus-ring"
                >
                  Gia nhập ngay
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MOBILE SUB-NAVBAR TABS (Touch Target >= 44px) — pill trượt qua lại */}
        <nav aria-label="Điều hướng di động" className="md:hidden flex items-center justify-around border-t border-purple-100 bg-white/95 px-2 py-1">
          {homeTabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                id={`mobile-tab-${t.id}`}
                onClick={() => setActiveTab(t.id)}
                className={`relative min-h-[44px] flex flex-col items-center justify-center py-1 px-4 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                  isActive ? "text-primary font-black" : "text-slate-500 hover:text-secondary"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="mobile-tab-pill"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="absolute inset-0 bg-purple-50 rounded-xl"
                  />
                )}
                <Icon className="w-4 h-4 mb-0.5 relative z-10" aria-hidden="true" />
                <span className="relative z-10">{t.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* BODY CONTENT AREA */}
      <div className="pt-[calc(7.25rem+env(safe-area-inset-top,0px))] md:pt-[calc(5.5rem+env(safe-area-inset-top,0px))] flex-1 flex flex-col">

        {/* ========================================================================= */}
        {/* TAB 1: GIỚI THIỆU & TUYỂN QUÂN (REDESIGNED SPORTY LANDING)                */}
        {/* ========================================================================= */}
        {activeTab === "intro" && (
          <motion.div
            key="tab-intro"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            {/* HERO SECTION: High-Energy Athletic Purple-Black Theme */}
            <section aria-labelledby="hero-title" className="relative min-h-[620px] md:min-h-[700px] flex items-center justify-center overflow-hidden bg-secondary">
              {/* Background Cover + Radial Gradient Mesh */}
              <div className="absolute inset-0 z-0">
                {coverUrl ? (
                  <motion.div
                    key={coverUrl}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.35 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={coverUrl}
                      alt="SmashTeam Hero Badminton"
                      fill
                      sizes="100vw"
                      className="object-cover"
                      priority
                    />
                  </motion.div>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary via-[#190d33] to-secondary" />
                )}
                
                {/* Athletic Court Lines & Rich Purple Glow Spotlight */}
                <div className="absolute inset-0 bg-[radial-gradient(#7A22E0_1px,transparent_1px)] [background-size:32px_32px] opacity-15 pointer-events-none" />
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-primary/30 rounded-full blur-[140px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-fuchsia-600/20 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/70 to-transparent" />
              </div>

              <div className="relative z-10 text-center px-4 sm:px-6 max-w-5xl mx-auto py-16 sm:py-20 space-y-7">
                {/* Brand / Campaign Tag */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-primary/25 border border-primary/50 text-purple-200 text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-[0_0_20px_rgba(157,78,221,0.35)]"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <span>Chiến Dịch Tuyển Vợt Thủ Mùa Giải {new Date().getFullYear()}</span>
                </motion.div>

                {/* Primary H1 Heading */}
                <motion.h1 
                  id="hero-title"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.08]"
                >
                  ĐAM MÊ DẪN LỐI <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-purple-400 via-primary-hover to-pink-400 bg-clip-text text-transparent">ĐẬP TAN GIỚI HẠN</span>
                </motion.h1>
                
                {/* Value Proposition Subtitle */}
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal"
                >
                  Smash Team - Câu lạc bộ cầu lông sinh viên năng động, chuyên nghiệp và nhiệt huyết hàng đầu khu vực Làng Đại Học. Nơi thanh xuân bùng nổ cùng những đường cầu!
                </motion.p>

                {/* 2 Prominent Action CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="flex flex-wrap items-center justify-center gap-4 pt-2"
                >
                  <button 
                    id="hero-cta-apply-now"
                    onClick={() => setIsRegisterModalOpen(true)}
                    className="min-h-[52px] px-8 sm:px-10 py-4 bg-primary hover:bg-primary-hover text-white text-sm sm:text-base font-black rounded-full shadow-[0_0_30px_rgba(122,34,224,0.6)] hover:shadow-[0_0_40px_rgba(157,78,221,0.85)] transition-all transform active:scale-95 flex items-center gap-2.5 cursor-pointer focus-ring"
                  >
                    <Sparkles className="w-5 h-5 text-amber-300" aria-hidden="true" />
                    <span>Ứng tuyển thành viên ngay</span>
                    <ArrowRight className="w-4 h-4 text-purple-200" aria-hidden="true" />
                  </button>

                  <button 
                    id="hero-cta-explore-activities"
                    onClick={() => {
                      const el = document.getElementById('recruitment-event-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="min-h-[52px] px-8 sm:px-9 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-sm sm:text-base font-bold rounded-full border border-white/25 hover:border-white/50 transition-all transform active:scale-95 flex items-center gap-2 cursor-pointer focus-ring"
                  >
                    <Activity className="w-4 h-4 text-cyan-300" aria-hidden="true" />
                    <span>Khám phá hoạt động CLB</span>
                  </button>
                </motion.div>

                {/* DẢI STATS COUNTER UY TÍN (số thật từ /api/stats) */}
                <motion.div
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="pt-6 w-full"
                >
                  <ClubStats
                    memberCount={clubStats ? String(clubStats.activeMembers) : undefined}
                     sessionsPerWeek="2 - 3"
                    tournamentsCount={clubStats ? String(clubStats.eventsCount) : undefined}
                    topElo={clubStats ? String(clubStats.topElo) : undefined}
                  />
                </motion.div>
              </div>
            </section>

            {/* FEATURED EVENT COUNTDOWN BOARD (For Upcoming Sessions / Matches / Recruitment) */}
            <FeaturedEventCountdown
              settings={siteSettings}
              featuredEvent={featuredEvent}
              upcomingSession={upcomingSessionHighlight || upcomingSessions[0]}
              onViewSchedule={() => {
                setActiveTab("schedule");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onRecruitmentClick={() => {
                const el = document.getElementById("recruitment-event-section");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                }
                setIsRegisterModalOpen(true);
              }}
              isLoggedIn={isLoggedIn}
            />

            {/* RECRUITMENT EVENT HIGHLIGHT CARD (MODULE 2A - User Flow) */}
            <div id="recruitment-event-section" className="pt-8">
              <EventRecruitmentCard
                campaign={activeCampaign}
                onOpenRegister={() => setIsRegisterModalOpen(true)}
              />
            </div>

            {/* BENTO GRID: WHY JOIN US & CULTURE */}
            <div id="club-benefits-section">
              <ClubBenefitsBento />
            </div>

            {/* CLUB HIGHLIGHTS MASONRY GALLERY */}
            <div id="club-highlights-section">
              <ClubHighlightsMasonry mediaFeed={mediaFeed} />
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: BẢNG XẾP HẠNG (LEADERBOARD PODIUM & FULL LIST)                     */}
        {/* ========================================================================= */}
        {activeTab === "leaderboard" && (
          <motion.div
            key="tab-leaderboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full"
          >
            <RankingHubSection />
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: LỊCH ĐÁNH (SCHEDULE & RSVP)                                        */}
        {/* ========================================================================= */}
        {activeTab === "schedule" && (
          <motion.div
            key="tab-schedule"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8"
          >
            {/* Header Mục Lịch Đánh */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100 pb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-primary text-xs font-bold uppercase tracking-wider mb-2">
                  <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Lịch Sinh Hoạt SmashTeam</span>
                </div>
                <h2 className="text-3xl font-black text-secondary tracking-tight">Lịch Đánh & Buổi Tập</h2>
                <p className="text-sm text-slate-500 mt-1">Đăng ký tham gia sinh hoạt định kỳ và giao lưu nội bộ</p>
              </div>

              {/* Mode Switcher: Sắp tới vs Lịch sử */}
              <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/80 self-start sm:self-auto">
                <button
                  id="btn-schedule-upcoming"
                  onClick={() => setScheduleViewMode("upcoming")}
                  className={`min-h-[40px] px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer focus-ring ${
                    scheduleViewMode === "upcoming"
                      ? "bg-white text-primary shadow-sm border border-slate-200/40 scale-[1.02]"
                      : "text-slate-500 hover:text-secondary"
                  }`}
                >
                  Sắp Diễn Ra
                </button>
                <button
                  id="btn-schedule-history"
                  onClick={() => setScheduleViewMode("history")}
                  className={`min-h-[40px] px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer focus-ring ${
                    scheduleViewMode === "history"
                      ? "bg-white text-primary shadow-sm border border-slate-200/40 scale-[1.02]"
                      : "text-slate-500 hover:text-secondary"
                  }`}
                >
                  Lịch Sử Buổi Tập
                </button>
              </div>
            </div>

            {/* FEATURED NEXT MATCH CARD */}
            {scheduleViewMode === "upcoming" && upcomingSessionHighlight && (
              <div className="bg-gradient-to-br from-secondary via-[#190e38] to-secondary rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl border border-primary/30 space-y-6">
                {/* Purple decorative spotlight */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1 rounded-full bg-primary/30 text-purple-200 border border-primary/40">
                      <Sparkles className="w-3 h-3 text-purple-300" aria-hidden="true" />
                      <span>Buổi tập tâm điểm</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                      #{shortSessionId(upcomingSessionHighlight.id)}
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight">{upcomingSessionHighlight.title}</h3>
                  
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-smash-violet" aria-hidden="true" /> 
                      <span className="tabular-nums">{formatDateTime(upcomingSessionHighlight.session_start || upcomingSessionHighlight.date_time)}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-smash-violet" aria-hidden="true" /> 
                      <span>{upcomingSessionHighlight.location}</span>
                    </span>
                  </div>
                </div>

                {/* Session Reservation & QR Widget */}
                <div className="relative z-10 pt-2 border-t border-white/10">
                  <SessionReservationWidget
                    session={upcomingSessionHighlight}
                    isLoggedIn={isLoggedIn}
                    onActionSuccess={() => {
                      fetchSessions();
                    }}
                  />
                </div>
              </div>
            )}

            {/* GRID DANH SÁCH BUỔI TẬP */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-secondary">
                {scheduleViewMode === "upcoming" ? "Tất cả buổi tập sắp tới" : "Lịch sử các buổi tập đã diễn ra"}
              </h3>

              {scheduleViewMode === "upcoming" ? (
                upcomingSessions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {upcomingSessions.map((session) => (
                      <div
                        key={session.id}
                        className="group relative bg-white rounded-[20px] p-5 border border-purple-100 shadow-[0_2px_16px_-6px_rgba(122,34,224,0.15)] hover:shadow-[0_12px_32px_-8px_rgba(122,34,224,0.28)] hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between gap-4 overflow-hidden min-w-0"
                      >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-fuchsia-500 to-primary" aria-hidden="true" />
                        <div className="space-y-3 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-fuchsia-600 text-white shadow-sm shadow-primary/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
                              Lịch sắp tới
                            </span>
                            <span
                              title={String(session.id ?? "")}
                              className="shrink-0 max-w-[110px] truncate font-mono text-[11px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-md px-2 py-1 tabular-nums"
                            >
                              #{shortSessionId(session.id)}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-[17px] leading-snug text-secondary line-clamp-2 text-balance">{session.title}</h4>

                          <div className="grid gap-2 bg-slate-50/80 border border-slate-100 rounded-2xl p-3">
                            <div className="flex items-center gap-2.5 text-[13px] text-slate-600 min-w-0">
                              <span className="w-7 h-7 rounded-full bg-white border border-purple-100 shadow-sm flex items-center justify-center shrink-0">
                                <Clock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                              </span>
                              <span className="font-semibold tabular-nums truncate">{formatDateTime(session.session_start || session.date_time)}</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-[13px] text-slate-600 min-w-0">
                              <span className="w-7 h-7 rounded-full bg-white border border-purple-100 shadow-sm flex items-center justify-center shrink-0">
                                <MapPin className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                              </span>
                              <span className="font-medium truncate">{session.location}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-dashed border-slate-200 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            {session.available_slots !== undefined ? (
                              session.available_slots > 0 ? (
                                <span className="text-emerald-600 font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Còn {session.available_slots}/{session.capacity || 40} slot
                                </span>
                              ) : (
                                <span className="text-rose-500 font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Đã đủ {session.capacity || 40} slot
                                </span>
                              )
                            ) : (
                              <span className="text-slate-500 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                                Điểm danh trực tiếp
                              </span>
                            )}
                          </span>
                          <button
                            onClick={() => {
                              setUpcomingSessionHighlight(session);
                              window.scrollTo({ top: 350, behavior: "smooth" });
                            }}
                            className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                              upcomingSessionHighlight?.id === session.id
                                ? "bg-primary text-white"
                                : "bg-secondary text-white hover:bg-slate-800"
                            }`}
                          >
                            <span>{upcomingSessionHighlight?.id === session.id ? "Đang chọn" : "Giữ chỗ / Chi tiết"}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-10 border border-dashed border-purple-200 text-center space-y-2">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto" aria-hidden="true" />
                    <p className="font-bold text-slate-700 text-sm">Chưa có buổi tập mới nào được xếp lịch</p>
                    <p className="text-xs text-slate-400">Ban quản trị sẽ cập nhật lịch sinh hoạt tiếp theo sớm nhất.</p>
                  </div>
                )
              ) : (
                pastSessions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pastSessions.map((session) => (
                      <div
                        key={session.id}
                        className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-sm space-y-3 opacity-80 hover:opacity-100 transition-opacity min-w-0"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex items-center shrink-0 whitespace-nowrap text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-slate-100 text-slate-600">
                            Đã hoàn thành
                          </span>
                          <span
                            title={String(session.id ?? "")}
                            className="shrink-0 max-w-[110px] truncate font-mono text-[11px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-md px-2 py-1 tabular-nums"
                          >
                            #{shortSessionId(session.id)}
                          </span>
                        </div>
                        <h4 className="font-bold text-[16px] leading-snug text-secondary line-clamp-2">{session.title}</h4>
                        <div className="grid gap-2 bg-slate-50/70 border border-slate-100 rounded-2xl p-3 text-[13px] text-slate-500">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                            <span className="font-medium tabular-nums truncate">{formatDateTime(session.session_start || session.date_time)}</span>
                          </div>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                            <span className="truncate">{session.location}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-10 border border-dashed border-slate-200 text-center space-y-2">
                    <History className="w-8 h-8 text-slate-300 mx-auto" aria-hidden="true" />
                    <p className="font-bold text-slate-700 text-sm">Chưa có dữ liệu lịch sử buổi tập</p>
                  </div>
                )
              )}
            </div>

            {/* NỘI QUY SÂN CẦU */}
            <div className="bg-purple-50/70 rounded-3xl p-6 sm:p-7 border border-purple-100 space-y-3">
              <h4 className="font-bold text-sm text-secondary flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" aria-hidden="true" />
                <span>Lưu ý khi tham gia sinh hoạt SmashTeam:</span>
              </h4>
              <ul className="text-xs text-slate-600 space-y-2 pl-4 list-disc leading-relaxed">
                <li>Vui lòng mang theo <strong>giày cầu lông chuyên dụng</strong> (đế cao su gum) để bảo vệ mặt thảm sân và tránh chấn thương.</li>
                <li>Có mặt trước giờ tập <strong>10 - 15 phút</strong> để khởi động kỹ các khớp và nhận sân thi đấu.</li>
                <li>Mở trang <strong>Điểm danh</strong> và quét mã QR tại bàn tiếp tân sân để nhận thưởng <strong>+25 XP</strong> và <strong>+10 Smash Coins</strong>.</li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: HOẠT ĐỘNG (MEDIA FEED — ẢNH & VIDEO CLB)                            */}
        {/* ========================================================================= */}
        {activeTab === "media" && (
          <motion.div
            key="tab-media"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8"
          >
            {/* Header Mục Hoạt Động */}
            <div className="border-b border-purple-100 pb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-primary text-xs font-bold uppercase tracking-wider mb-2">
                <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Góc nhìn SmashTeam</span>
              </div>
              <h2 className="text-3xl font-black text-secondary tracking-tight">Hoạt Động & Khoảnh Khắc</h2>
              <p className="text-sm text-slate-500 mt-1">Hình ảnh sinh hoạt, giải đấu và video highlight của câu lạc bộ</p>
            </div>

            {/* Gallery ảnh & video (dữ liệu từ Quản lý nội dung) */}
            <ClubHighlightsMasonry mediaFeed={mediaFeed} hideHeader />
          </motion.div>
        )}

      </div>

      {/* CONTACT + FOOTER (động từ site_settings, link tự mở tab mới) */}
      <footer className="bg-secondary text-slate-400 py-12 border-t border-purple-950/60 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between gap-10">
            <div className="max-w-[320px] mx-auto md:mx-0 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="font-black text-xl text-white tracking-tight">
                  Smash<span className="text-primary">Team</span>
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed flex items-start justify-center md:justify-start gap-2">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
                <span>{address}, Việt Nam</span>
              </p>
              {contacts.length > 0 && (
                <div className="mt-4 space-y-2">
                  {contacts.map((c) => (
                    <p key={c.phone || c.name} className="text-sm">
                      <span className="font-bold text-slate-200">{c.name}</span>
                      {c.role && <span className="text-primary text-xs"> • {c.role}</span>}
                      <br />
                      <a href={`tel:${String(c.phone).replace(/\s/g, "")}`} className="text-xs text-slate-400 hover:text-white">
                        <Phone className="w-3 h-3 inline mr-1" aria-hidden />
                        {c.phone}
                      </a>
                    </p>
                  ))}
                </div>
              )}
            </div>
            <nav aria-label="Liên hệ" className="text-center md:text-left">
              <p className="text-white font-semibold mb-4 text-[15px]">Liên hệ</p>
              <div className="space-y-2.5 text-sm">
                {socialLinks.map((s) => {
                  const label = String(s.label || "").trim();
                  const url = normalizeSocialUrl(s.url);
                  return url ? (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block hover:text-white"
                    >
                      {label}
                    </a>
                  ) : (
                    <span key={label} className="block">
                      {label}
                    </span>
                  );
                })}
              </div>
            </nav>
          </div>
          <div className="mt-10 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-300">© {new Date().getFullYear()} SmashTeam Badminton Club. All rights reserved.</p>
            <p className="text-xs text-slate-500">Nơi đam mê hội tụ • Tinh thần thể thao trung thực • Nâng tầm bản lĩnh</p>
          </div>
        </div>
      </footer>

      {/* Global Recruitment Registration Modal */}
      <RegistrationModal 
        isOpen={isRegisterModalOpen} 
        onClose={() => setIsRegisterModalOpen(false)} 
      />
    </main>
  );
}
