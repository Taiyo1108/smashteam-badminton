"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, Trophy, Play, Image as ImageIcon, Calendar,
  MapPin, Clock, Check, X, User, Sparkles, Shield,
  QrCode, Search, History, Users, Activity, CheckCircle2,
  Info, Award, Flame, ArrowUpRight, Crown, ArrowRight, Phone
} from "lucide-react";
import { useState, useEffect } from "react";
import { API_URL } from "@/app/config";
import AvatarWithFrame from "@/app/components/AvatarWithFrame";
import FeaturedEventCountdown from "@/app/components/FeaturedEventCountdown";
import { getRankName, getRankBadgeClass, getShortName } from "@/app/utils/rank";
import ClubStats from "@/app/components/recruitment/ClubStats";
import ClubBenefitsBento from "@/app/components/recruitment/ClubBenefitsBento";
import ClubHighlightsMasonry from "@/app/components/recruitment/ClubHighlightsMasonry";
import EventRecruitmentCard from "@/app/components/recruitment/EventRecruitmentCard";
import RegistrationModal from "@/app/components/recruitment/RegistrationModal";
import { format } from "date-fns";

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

  // Active section tab: "intro" | "leaderboard" | "schedule"
  const [activeTab, setActiveTab] = useState<"intro" | "leaderboard" | "schedule">("intro");

  // Recruitment modal & active campaign state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<any>(null);

  // Site Settings (Featured event, cover, config)
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});

  // Giới thiệu & Liên hệ do admin cấu hình (Quản lý nội dung -> Giới thiệu & Liên hệ)
  const address = (siteSettings.contact_address || "").trim() || ADDRESS_FALLBACK;
  const contacts = parseJsonSetting<{ name: string; phone: string; role: string }[]>(
    siteSettings.contacts, []
  ).filter((c) => c && (String(c.name || "").trim() || String(c.phone || "").trim()));
  const socialLinks = parseJsonSetting<{ label: string; url: string }[]>(
    siteSettings.social_links, [...SOCIAL_FALLBACK]
  ).filter((s) => s && String(s.label || "").trim());
  const aboutBlocks = parseJsonSetting<{ lead: string; tail: string }[]>(
    siteSettings.about_blocks, []
  )
    .map((b) => ({ lead: String(b?.lead ?? ""), tail: String(b?.tail ?? "") }))
    .filter((b) => b.lead.trim() || b.tail.trim());

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
  const [leaderboardType, setLeaderboardType] = useState<"singles" | "doubles">("singles");

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

    fetch(`${API_URL}/api/campaigns/active?t=${Date.now()}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setActiveCampaign(data);
      })
      .catch(e => console.error("Error loading active campaign:", e));

    fetchSessions();
  }, []);

  const fetchSessions = () => {
    fetch(`${API_URL}/api/sessions?t=${Date.now()}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setUpcomingSessions(data);
          if (data.length > 0 && !upcomingSessionHighlight) {
            setUpcomingSessionHighlight(data[0]);
          }
        }
      })
      .catch(e => console.error("Error loading upcoming sessions:", e));

    fetch(`${API_URL}/api/sessions?history=true&t=${Date.now()}`)
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
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, "dd/MM/yyyy HH:mm");
    } catch {
      return dateStr;
    }
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

      {/* TOP NAVBAR (Glassmorphism + Purple Brand) */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-purple-100 shadow-sm transition-all">
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

          {/* SEGMENTED NAVIGATION TABS (Desktop & Tablet) */}
          <nav aria-label="Điều hướng chính" className="hidden md:flex items-center bg-slate-100/90 p-1.5 rounded-full border border-slate-200/80 shadow-inner">
            <button
              id="tab-btn-intro"
              onClick={() => setActiveTab("intro")}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer focus-ring ${
                activeTab === "intro"
                  ? "bg-primary text-white shadow-md shadow-primary/35 scale-[1.02]"
                  : "text-slate-600 hover:text-secondary hover:bg-white/70"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Giới thiệu</span>
            </button>

            <button
              id="tab-btn-leaderboard"
              onClick={() => setActiveTab("leaderboard")}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer focus-ring ${
                activeTab === "leaderboard"
                  ? "bg-primary text-white shadow-md shadow-primary/35 scale-[1.02]"
                  : "text-slate-600 hover:text-secondary hover:bg-white/70"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Bảng xếp hạng</span>
            </button>

            <button
              id="tab-btn-schedule"
              onClick={() => setActiveTab("schedule")}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer focus-ring ${
                activeTab === "schedule"
                  ? "bg-primary text-white shadow-md shadow-primary/35 scale-[1.02]"
                  : "text-slate-600 hover:text-secondary hover:bg-white/70"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Lịch đánh</span>
            </button>
          </nav>

          {/* RIGHT ACTIONS: AUTH BUTTONS / USER PROFILE */}
          <div className="flex gap-2 sm:gap-3 items-center">
            {isLoggedIn ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Lối tắt Điểm danh QR */}
                <Link href="/check-in" className="hidden sm:inline-flex">
                  <button 
                    id="nav-quick-checkin"
                    className="min-h-[40px] px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-primary border border-primary/30 hover:border-primary rounded-full font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer focus-ring shadow-sm"
                  >
                    <QrCode className="w-4 h-4 text-primary" aria-hidden="true" />
                    <span>Điểm danh QR</span>
                  </button>
                </Link>

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

        {/* MOBILE SUB-NAVBAR TABS (Touch Target >= 44px) */}
        <nav aria-label="Điều hướng di động" className="md:hidden flex items-center justify-around border-t border-purple-100 bg-white/95 px-2 py-1">
          <button
            id="mobile-tab-intro"
            onClick={() => setActiveTab("intro")}
            className={`min-h-[44px] flex flex-col items-center justify-center py-1 px-4 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeTab === "intro" ? "text-primary font-black bg-purple-50" : "text-slate-500 hover:text-secondary"
            }`}
          >
            <Sparkles className="w-4 h-4 mb-0.5" aria-hidden="true" />
            <span>Giới thiệu</span>
          </button>
          <button
            id="mobile-tab-leaderboard"
            onClick={() => setActiveTab("leaderboard")}
            className={`min-h-[44px] flex flex-col items-center justify-center py-1 px-4 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeTab === "leaderboard" ? "text-primary font-black bg-purple-50" : "text-slate-500 hover:text-secondary"
            }`}
          >
            <Trophy className="w-4 h-4 mb-0.5" aria-hidden="true" />
            <span>Xếp hạng</span>
          </button>
          <button
            id="mobile-tab-schedule"
            onClick={() => setActiveTab("schedule")}
            className={`min-h-[44px] flex flex-col items-center justify-center py-1 px-4 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeTab === "schedule" ? "text-primary font-black bg-purple-50" : "text-slate-500 hover:text-secondary"
            }`}
          >
            <Calendar className="w-4 h-4 mb-0.5" aria-hidden="true" />
            <span>Lịch đánh</span>
          </button>
        </nav>
      </header>

      {/* BODY CONTENT AREA */}
      <div className="pt-28 md:pt-22 flex-1 flex flex-col">

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
                  <span>Chiến Dịch Tuyển Vợt Thủ Mùa Giải 2026</span>
                </motion.div>

                {/* Primary H1 Heading */}
                <motion.h1 
                  id="hero-title"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.08]"
                >
                  BỨT PHÁ <span className="bg-gradient-to-r from-purple-400 via-primary-hover to-pink-400 bg-clip-text text-transparent">GIỚI HẠN</span>
                  <br className="hidden sm:inline" /> CHINH PHỤC ĐỈNH CAO
                </motion.h1>
                
                {/* Value Proposition Subtitle */}
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal"
                >
                  Môi trường thể thao chuyên nghiệp và tràn đầy năng lượng dành cho mọi cấp độ vợt thủ. Tỏa sáng trên sân đấu, nâng tầm thứ hạng ELO và kết nối đam mê bền chặt cùng SmashTeam.
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

                {/* DẢI STATS COUNTER UY TÍN (ClubStats) */}
                <motion.div
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="pt-6 w-full"
                >
                  <ClubStats />
                </motion.div>
              </div>
            </section>

            {/* RECRUITMENT EVENT HIGHLIGHT CARD (MODULE 2A - User Flow) */}
            <div id="recruitment-event-section" className="pt-8">
              <EventRecruitmentCard
                campaign={activeCampaign}
                onOpenRegister={() => setIsRegisterModalOpen(true)}
              />
            </div>

            {/* FEATURED EVENT COUNTDOWN BOARD (For Upcoming Sessions / Matches) */}
            <FeaturedEventCountdown
              settings={siteSettings}
              upcomingSession={upcomingSessionHighlight || upcomingSessions[0]}
              onViewSchedule={() => {
                setActiveTab("schedule");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              isLoggedIn={isLoggedIn}
            />

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
            className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8"
          >
            {/* Header Mục BXH */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100 pb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
                  <Trophy className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                  <span>Hệ thống ELO SmashTeam</span>
                </div>
                <h2 className="text-3xl font-black text-secondary tracking-tight">Bảng Xếp Hạng Câu Lạc Bộ</h2>
                <p className="text-sm text-slate-500 mt-1">Cập nhật tự động dựa trên kết quả thi đấu thực tế</p>
              </div>

              {/* Segmented Control Switcher: Đơn vs Đôi */}
              <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/80 self-start sm:self-auto">
                <button
                  id="btn-rank-singles"
                  onClick={() => setLeaderboardType("singles")}
                  className={`min-h-[40px] px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer focus-ring ${
                    leaderboardType === "singles"
                      ? "bg-white text-primary shadow-sm border border-slate-200/40 scale-[1.02]"
                      : "text-slate-500 hover:text-secondary"
                  }`}
                >
                  Xếp Hạng Đơn
                </button>
                <button
                  id="btn-rank-doubles"
                  onClick={() => setLeaderboardType("doubles")}
                  className={`min-h-[40px] px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer focus-ring ${
                    leaderboardType === "doubles"
                      ? "bg-white text-primary shadow-sm border border-slate-200/40 scale-[1.02]"
                      : "text-slate-500 hover:text-secondary"
                  }`}
                >
                  Xếp Hạng Đôi
                </button>
              </div>
            </div>

            {/* PODIUM TOP 3 CHAMPIONS */}
            {leaderboard.length >= 3 && (
              <div className="bg-gradient-to-b from-purple-50/70 via-white to-white rounded-3xl p-6 sm:p-8 border border-purple-100 shadow-sm relative overflow-hidden">
                <div className="text-center mb-8">
                  <span className="text-xs font-black text-primary uppercase tracking-widest bg-purple-100/70 px-4 py-1.5 rounded-full border border-primary/20">
                    Vinh danh Top 3 Tay Vợt Dẫn Đầu
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-6 items-end max-w-2xl mx-auto pt-6 pb-2">
                  {/* 2ND PLACE (Silver) */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-3 border-slate-300 shadow-[0_0_18px_rgba(203,213,225,0.85)] flex items-center justify-center bg-slate-100 text-slate-700 font-bold px-1 text-center">
                      <span className={`truncate max-w-full uppercase ${getShortName(leaderboard[1].full_name).length > 2 ? 'text-xs sm:text-sm font-black' : 'text-base sm:text-lg font-black'}`}>
                        {getShortName(leaderboard[1].full_name)}
                      </span>
                    </div>
                    <span className="text-xs font-black text-slate-500 uppercase mt-2.5">Hạng 2</span>
                    <p className="text-xs sm:text-sm font-bold text-secondary truncate max-w-[95px] sm:max-w-[140px] text-center mt-0.5">
                      {leaderboard[1].full_name}
                    </p>
                    <p className="text-xs sm:text-sm font-black text-primary mt-0.5 tabular-nums">{leaderboard[1].elo_score} ELO</p>
                    <span className={`text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded mt-1.5 ${getRankBadgeClass(leaderboard[1].rank_name)}`}>
                      {leaderboard[1].rank_name}
                    </span>
                  </div>

                  {/* 1ST PLACE (Gold Champion) */}
                  <div className="flex flex-col items-center transform -translate-y-4 sm:-translate-y-6">
                    <div className="relative">
                      {/* Bouncing Crown */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-amber-500 fill-amber-500 animate-bounce">
                        <Crown className="w-7 h-7 text-amber-500 fill-amber-400 drop-shadow-md" aria-hidden="true" />
                      </div>
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-amber-400 shadow-[0_0_28px_rgba(251,191,36,0.7)] flex items-center justify-center bg-amber-50 text-amber-800 font-black px-1 text-center">
                        <span className={`truncate max-w-full uppercase ${getShortName(leaderboard[0].full_name).length > 2 ? 'text-sm sm:text-base font-black' : 'text-xl sm:text-2xl font-black'}`}>
                          {getShortName(leaderboard[0].full_name)}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm font-black text-amber-600 uppercase mt-2.5">Quán Quân</span>
                    <p className="text-sm sm:text-base font-black text-secondary truncate max-w-[110px] sm:max-w-[160px] text-center mt-0.5">
                      {leaderboard[0].full_name}
                    </p>
                    <p className="text-sm sm:text-base font-black text-primary mt-0.5 tabular-nums">{leaderboard[0].elo_score} ELO</p>
                    <span className={`text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded mt-1.5 ${getRankBadgeClass(leaderboard[0].rank_name)}`}>
                      {leaderboard[0].rank_name}
                    </span>
                  </div>

                  {/* 3RD PLACE (Bronze) */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-3 border-amber-800/40 shadow-[0_0_15px_rgba(180,83,9,0.35)] flex items-center justify-center bg-amber-900/10 text-amber-900 font-bold px-1 text-center">
                      <span className={`truncate max-w-full uppercase ${getShortName(leaderboard[2].full_name).length > 2 ? 'text-xs sm:text-sm font-black' : 'text-base sm:text-lg font-black'}`}>
                        {getShortName(leaderboard[2].full_name)}
                      </span>
                    </div>
                    <span className="text-xs font-black text-amber-800/80 uppercase mt-2.5">Hạng 3</span>
                    <p className="text-xs sm:text-sm font-bold text-secondary truncate max-w-[95px] sm:max-w-[140px] text-center mt-0.5">
                      {leaderboard[2].full_name}
                    </p>
                    <p className="text-xs sm:text-sm font-black text-primary mt-0.5 tabular-nums">{leaderboard[2].elo_score} ELO</p>
                    <span className={`text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded mt-1.5 ${getRankBadgeClass(leaderboard[2].rank_name)}`}>
                      {leaderboard[2].rank_name}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SEARCH BOX & FULL TABLE */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-purple-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <h3 className="font-bold text-lg text-secondary">
                  Danh sách xếp hạng đầy đủ
                </h3>
                
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    id="search-player-input"
                    type="text"
                    placeholder="Tìm tên tay vợt..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full min-h-[44px] pl-10 pr-4 py-2 text-xs md:text-sm border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-slate-800"
                  />
                </div>
              </div>

              {/* Table Rows */}
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {leaderboard
                  .filter(u => u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((user, index) => {
                    const overallIndex = leaderboard.findIndex(u => u.id === user.id);
                    return (
                      <div 
                        key={user.id} 
                        className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl hover:bg-purple-50/40 border border-slate-100 hover:border-primary/20 transition-all group"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-xs shrink-0 tabular-nums ${
                            overallIndex === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-sm' :
                            overallIndex === 1 ? 'bg-slate-200 text-slate-700 border border-slate-300' :
                            overallIndex === 2 ? 'bg-amber-900/15 text-amber-900 border border-amber-800/30' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {overallIndex + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-secondary group-hover:text-primary transition-colors text-sm sm:text-base">
                                {user.full_name}
                              </p>
                              <span className={`text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded ${getRankBadgeClass(user.rank_name)}`}>
                                {user.rank_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                              <span>Tỉ lệ thắng: <strong className="text-slate-600 tabular-nums">{user.win_rate.toFixed(1)}%</strong></span>
                              <span>•</span>
                              <span className="tabular-nums">{user.total_matches} trận</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-black text-base sm:text-lg text-secondary group-hover:text-primary transition-colors tabular-nums">{user.elo_score}</p>
                          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Điểm ELO</p>
                        </div>
                      </div>
                    );
                  })}

                {leaderboard.filter(u => u.full_name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <div className="text-center py-10 space-y-2">
                    <Search className="w-8 h-8 text-slate-300 mx-auto" aria-hidden="true" />
                    <p className="text-xs text-slate-500 font-medium">
                      Không tìm thấy tay vợt nào phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* RANK TIERS LEGEND */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-purple-100 text-xs text-slate-600 space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-secondary">
                <Info className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span>Quy chuẩn phân cấp điểm ELO tại SmashTeam:</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-0.5">
                <span className="px-2.5 py-1 rounded-md bg-gradient-to-r from-red-500 to-purple-600 text-white font-extrabold shadow-xs">Challenger: 1800+</span>
                <span className="px-2.5 py-1 rounded-md bg-blue-500 text-white font-bold shadow-xs">Diamond: 1600+</span>
                <span className="px-2.5 py-1 rounded-md bg-teal-500 text-white font-bold shadow-xs">Platinum: 1400+</span>
                <span className="px-2.5 py-1 rounded-md bg-amber-500 text-white font-bold shadow-xs">Gold: 1200+</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-300 text-slate-800 font-bold shadow-xs">Silver: 1100+</span>
                <span className="px-2.5 py-1 rounded-md bg-amber-800/20 text-amber-900 font-bold shadow-xs">Bronze: &lt; 1100</span>
              </div>
            </div>
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
              <div className="bg-gradient-to-br from-secondary via-[#190e38] to-secondary rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl border border-primary/30">
                {/* Purple decorative spotlight */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1 rounded-full bg-primary/30 text-purple-200 border border-primary/40">
                      <Sparkles className="w-3 h-3 text-purple-300" aria-hidden="true" />
                      <span>Buổi tập gần nhất</span>
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight">{upcomingSessionHighlight.title}</h3>
                    
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-smash-violet" aria-hidden="true" /> 
                        <span className="tabular-nums">{formatDateTime(upcomingSessionHighlight.date_time)}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-smash-violet" aria-hidden="true" /> 
                        <span>{upcomingSessionHighlight.location}</span>
                      </span>
                    </div>
                  </div>

                  {/* Hành động RSVP & QR Check-in */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                    {isLoggedIn ? (
                      <>
                        <button
                          id="btn-rsvp-join"
                          onClick={() => handleRsvp(upcomingSessionHighlight.id, "going")}
                          disabled={updatingRsvp}
                          className={`min-h-[44px] px-6 py-2.5 rounded-full font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer focus-ring ${
                            upcomingSessionHighlight.rsvp_status === "going"
                              ? "bg-primary text-white shadow-[0_0_20px_rgba(122,34,224,0.7)] border border-purple-400/60"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                          }`}
                        >
                          <Check className="w-4 h-4" aria-hidden="true" /> 
                          <span>{upcomingSessionHighlight.rsvp_status === "going" ? "Đã xác nhận Tham gia" : "Tham gia"}</span>
                        </button>

                        <button
                          id="btn-rsvp-busy"
                          onClick={() => handleRsvp(upcomingSessionHighlight.id, "absent")}
                          disabled={updatingRsvp}
                          className={`min-h-[44px] px-5 py-2.5 rounded-full font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer focus-ring ${
                            upcomingSessionHighlight.rsvp_status === "absent"
                              ? "bg-slate-700 text-white border border-slate-600"
                              : "bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-slate-700"
                          }`}
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                          <span>Bận</span>
                        </button>

                        <Link href="/check-in">
                          <button 
                            id="btn-rsvp-qr"
                            className="min-h-[44px] px-5 py-2.5 rounded-full font-bold text-xs bg-white text-slate-900 hover:bg-slate-100 flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer focus-ring"
                          >
                            <QrCode className="w-4 h-4 text-primary" aria-hidden="true" />
                            <span>Quét QR sân</span>
                          </button>
                        </Link>
                      </>
                    ) : (
                      <Link href="/login?redirect=/">
                        <button 
                          id="btn-rsvp-login"
                          className="min-h-[44px] px-7 py-3 rounded-full font-bold text-xs bg-primary hover:bg-primary-hover text-white flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all cursor-pointer focus-ring"
                        >
                          Đăng nhập để RSVP
                        </button>
                      </Link>
                    )}
                  </div>
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
                        className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm hover:shadow-md hover:border-primary/30 transition-all space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-purple-50 text-primary border border-primary/20">
                              Lịch sắp tới
                            </span>
                            <span className="text-xs font-semibold text-slate-400 tabular-nums">#BUOITAP-{session.id}</span>
                          </div>
                          <h4 className="font-bold text-base text-secondary">{session.title}</h4>
                          
                          <div className="space-y-1.5 text-xs text-slate-500 pt-1">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                              <span className="tabular-nums">{formatDateTime(session.date_time)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                              <span>{session.location}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-400">Điểm danh trực tiếp</span>
                          <Link href="/check-in">
                            <button className="min-h-[36px] text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer focus-ring p-1">
                              <span>Mở QR Check-in</span>
                              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </Link>
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
                        className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-3 opacity-80 hover:opacity-100 transition-opacity"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            Đã hoàn thành
                          </span>
                          <span className="text-xs text-slate-400 tabular-nums">#BUOITAP-{session.id}</span>
                        </div>
                        <h4 className="font-bold text-base text-secondary">{session.title}</h4>
                        <div className="space-y-1.5 text-xs text-slate-500">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                            <span className="tabular-nums">{formatDateTime(session.date_time)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                            <span>{session.location}</span>
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
                <li>Quét mã QR tại bàn tiếp tân sân hoặc bấm <strong>Điểm danh QR</strong> để nhận thưởng <strong>+25 XP</strong> và <strong>+10 Smash Coins</strong>.</li>
              </ul>
            </div>
          </motion.div>
        )}

      </div>

      {/* ABOUT US (động từ site_settings, admin chỉnh ở Quản lý nội dung) */}
      {aboutBlocks.length > 0 && (
        <section aria-label="Về chúng tôi" className="max-w-4xl mx-auto px-4 sm:px-6 mt-16">
          <div className="rounded-3xl bg-white border border-purple-100 shadow-sm p-6 sm:p-8 space-y-4">
            <h2 className="text-center text-xl sm:text-2xl font-black text-secondary tracking-tight">
              Về <span className="text-primary">SmashTeam</span>
            </h2>
            {aboutBlocks.map((b, i) => (
              <p key={i} className="text-sm leading-relaxed text-slate-600 text-center">
                {b.lead && <strong className="text-secondary">{b.lead} </strong>}
                {b.tail}
              </p>
            ))}
          </div>
        </section>
      )}

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
            <p className="text-sm font-semibold text-slate-300">© 2026 SmashTeam Badminton Club. All rights reserved.</p>
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
