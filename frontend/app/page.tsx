"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, Trophy, Play, Image as ImageIcon, Calendar, 
  MapPin, Clock, Check, X, User, Sparkles, Shield, 
  QrCode, Search, History, Users, Activity, CheckCircle2, Info
} from "lucide-react";
import { useState, useEffect } from "react";
import { API_URL } from "@/app/config";
import AvatarWithFrame from "@/app/components/AvatarWithFrame";

export default function Home() {
  const router = useRouter();

  // Active section tab: "intro" | "leaderboard" | "schedule"
  const [activeTab, setActiveTab] = useState<"intro" | "leaderboard" | "schedule">("intro");

  // User auth and profile state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Home cover image
  const [coverUrl, setCoverUrl] = useState("");

  // Media Feed
  const [mediaFeed, setMediaFeed] = useState<any[]>([
    { id: 1, title: "Giải đấu Mùa Xuân 2026", type: "image", url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" },
    { id: 2, title: "Tập luyện hằng ngày", type: "image", url: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" },
    { id: 3, title: "Highlight Smash", type: "video", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }
  ]);

  // Leaderboard data
  const [leaderboard, setLeaderboard] = useState<any[]>([
    { id: 1, full_name: "Nguyễn Văn A", elo_score: 1540, win_rate: 68.5, rank_name: "Gold", total_matches: 12 },
    { id: 2, full_name: "Trần Thị B", elo_score: 1480, win_rate: 62.0, rank_name: "Gold", total_matches: 10 },
    { id: 3, full_name: "Lê Hoàng C", elo_score: 1420, win_rate: 55.5, rank_name: "Gold", total_matches: 8 },
    { id: 4, full_name: "Phạm D", elo_score: 1350, win_rate: 51.0, rank_name: "Gold", total_matches: 6 },
    { id: 5, full_name: "Đặng E", elo_score: 1290, win_rate: 49.2, rank_name: "Gold", total_matches: 4 },
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

  const getRankName = (elo: number) => {
    if (elo >= 1800) return 'Challenger';
    if (elo >= 1600) return 'Diamond';
    if (elo >= 1400) return 'Platinum';
    if (elo >= 1200) return 'Gold';
    if (elo >= 1100) return 'Silver';
    return 'Bronze';
  };

  const getRankBadgeClass = (rank: string) => {
    switch (rank) {
      case 'Challenger':
        return 'bg-gradient-to-r from-red-500 to-purple-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] border border-red-400';
      case 'Diamond':
        return 'bg-blue-500 text-white shadow-[0_0_8px_rgba(59,130,246,0.3)]';
      case 'Platinum':
        return 'bg-teal-500 text-white';
      case 'Gold':
        return 'bg-amber-500 text-white font-bold';
      case 'Silver':
        return 'bg-slate-300 text-slate-800';
      default:
        return 'bg-amber-800/20 text-amber-900'; // Bronze
    }
  };

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

      // Fetch user profile info for avatar on left corner
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

    // Check cached cover
    const cachedCover = localStorage.getItem("homepage_cover_url");
    if (cachedCover) setCoverUrl(cachedCover);

    // Fetch Cover URL
    fetch(`${API_URL}/api/settings?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.homepage_cover_url) {
          setCoverUrl(data.homepage_cover_url);
          localStorage.setItem("homepage_cover_url", data.homepage_cover_url);
        }
      })
      .catch(e => console.error("Error loading settings:", e));

    // Fetch Media Feed
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

    // Fetch Sessions (Schedule)
    fetchSessions();
  }, []);

  const fetchSessions = () => {
    // Fetch upcoming sessions
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

    // Fetch past sessions
    fetch(`${API_URL}/api/sessions?history=true&t=${Date.now()}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setPastSessions(data);
        }
      })
      .catch(e => console.error("Error loading past sessions:", e));
  };

  // Fetch Leaderboard
  useEffect(() => {
    fetch(`${API_URL}/api/users/leaderboard?type=${leaderboardType}&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const formatted = data.map((item: any) => ({
            id: item.id,
            full_name: item.full_name,
            elo_score: item.elo_score,
            win_rate: item.win_rate ? parseFloat(item.win_rate) : 0,
            rank_name: item.rank_name || getRankName(item.elo_score),
            total_matches: item.total_matches || 0
          }));
          setLeaderboard(formatted);
        }
      })
      .catch(e => console.error("Error loading leaderboard:", e));
  }, [leaderboardType]);

  // Handle RSVP
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
        showToast(status === "going" ? "Đã đăng ký tham gia buổi tập!" : "Đã cập nhật trạng thái bận.");
        // Update highlight session status
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

  // Format date helper
  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
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
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-slate-900 text-white font-medium text-xs md:text-sm shadow-xl border border-purple-500/30 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{rsvpToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP NAVBAR */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          
          {/* GÓC BÊN TRÁI: CHỈ ĐỂ IMG LOGO LINK VỚI HOME PAGE */}
          <Link 
            href="/"
            onClick={() => {
              setActiveTab("intro");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
            title="SmashTeam - Trang chủ"
          >
            <div className="relative w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-[0_0_10px_rgba(122,34,224,0.3)] border border-primary/25 group-hover:border-primary/60 transition-all group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="SmashTeam Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <span className="font-black text-xl tracking-tight text-secondary group-hover:text-primary transition-colors">
              Smash<span className="text-primary">Team</span>
            </span>
          </Link>

          {/* CÁC MỤC ĐIỀU HƯỚNG TRUNG TÂM (Desktop & Tablet) */}
          <div className="hidden md:flex items-center bg-slate-100/90 p-1 rounded-full border border-slate-200/60 shadow-inner">
            <button
              onClick={() => setActiveTab("intro")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === "intro"
                  ? "bg-primary text-white shadow-md shadow-primary/30 scale-[1.02]"
                  : "text-slate-600 hover:text-secondary hover:bg-white/60"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Giới thiệu
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === "leaderboard"
                  ? "bg-primary text-white shadow-md shadow-primary/30 scale-[1.02]"
                  : "text-slate-600 hover:text-secondary hover:bg-white/60"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Bảng xếp hạng
            </button>
            <button
              onClick={() => setActiveTab("schedule")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === "schedule"
                  ? "bg-primary text-white shadow-md shadow-primary/30 scale-[1.02]"
                  : "text-slate-600 hover:text-secondary hover:bg-white/60"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Lịch đánh
            </button>
          </div>

          {/* GÓC PHẢI: HIỂN THỊ PROFILE SAU KHI ĐÃ ĐĂNG NHẬP / AUTH BUTTONS KHI CHƯA ĐĂNG NHẬP */}
          <div className="flex gap-2.5 sm:gap-3 items-center">
            {isLoggedIn ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Lối tắt Điểm danh QR */}
                <Link href="/check-in" className="hidden sm:inline-flex">
                  <button className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-primary border border-primary/30 rounded-full font-bold text-xs flex items-center gap-1 transition-all cursor-pointer">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Điểm danh</span>
                  </button>
                </Link>

                {/* Nút Quản trị nếu là admin */}
                {userRole === "admin" && (
                  <Link href="/admin">
                    <button className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold text-xs shadow-sm transition-all cursor-pointer">
                      Quản trị
                    </button>
                  </Link>
                )}

                {/* PROFILE AVATAR GÓC PHẢI (OnClick chuyển hướng đến /profile) */}
                <button
                  onClick={() => router.push("/profile")}
                  className="group relative flex items-center gap-2 p-1 rounded-full hover:bg-purple-50 transition-all focus:outline-none cursor-pointer"
                  title={`Trang cá nhân: ${currentUser?.full_name || "Hội viên"}`}
                >
                  {currentUser?.selected_avatar_frame ? (
                    <div className="relative transition-transform group-hover:scale-105">
                      <AvatarWithFrame
                        avatarUrl={currentUser.avatar_url || ""}
                        frameStyle={currentUser.selected_avatar_frame}
                        sizeClass="w-9 h-9 sm:w-10 sm:h-10"
                        alt={currentUser.full_name || "Profile"}
                      />
                      <span className="absolute bottom-0 right-0 z-30 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                    </div>
                  ) : (
                    <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0.5 bg-gradient-to-tr from-primary to-smash-violet shadow-sm transition-transform group-hover:scale-105 group-hover:shadow-[0_0_12px_rgba(122,34,224,0.4)]">
                      <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center relative">
                        {currentUser?.avatar_url ? (
                          <Image
                            src={currentUser.avatar_url}
                            alt={currentUser.full_name || "Profile"}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/80 to-purple-800 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                            {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : <User className="w-4 h-4 text-white/90" />}
                          </div>
                        )}
                      </div>
                      {/* Online Indicator Badge */}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                    </div>
                  )}

                  {/* Tên thành viên rút gọn trên màn hình lớn */}
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
                  <button className="px-3.5 py-1.5 text-secondary hover:text-primary transition-all font-semibold text-xs cursor-pointer">
                    Đăng nhập
                  </button>
                </Link>
                <Link href="/register">
                  <button className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-full font-bold transition-all transform hover:scale-105 shadow-md shadow-primary/25 text-xs cursor-pointer">
                    Gia nhập
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* SUB-NAVBAR TABS CHO MOBILE */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-100 bg-white/95 px-2 py-1.5">
          <button
            onClick={() => setActiveTab("intro")}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[11px] font-bold transition-all ${
              activeTab === "intro" ? "text-primary" : "text-slate-500"
            }`}
          >
            <Sparkles className="w-4 h-4 mb-0.5" />
            Giới thiệu
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[11px] font-bold transition-all ${
              activeTab === "leaderboard" ? "text-primary" : "text-slate-500"
            }`}
          >
            <Trophy className="w-4 h-4 mb-0.5" />
            BXH
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[11px] font-bold transition-all ${
              activeTab === "schedule" ? "text-primary" : "text-slate-500"
            }`}
          >
            <Calendar className="w-4 h-4 mb-0.5" />
            Lịch đánh
          </button>
        </div>
      </nav>

      {/* BODY CONTENT AREA */}
      <div className="pt-24 md:pt-20 flex-1 flex flex-col">

        {/* ========================================================================= */}
        {/* MỤC 1: GIỚI THIỆU (INTRO)                                                */}
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
            {/* Hero Section */}
            <section className="relative min-h-[560px] md:h-[620px] flex items-center justify-center overflow-hidden bg-slate-950">
              <div className="absolute inset-0 z-0">
                {coverUrl ? (
                  <motion.div
                    key={coverUrl}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.45 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={coverUrl}
                      alt="SmashTeam Hero"
                      fill
                      className="object-cover"
                      priority
                    />
                  </motion.div>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
              </div>

              <div className="relative z-10 text-center px-4 max-w-4xl mx-auto py-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-smash-violet text-xs font-bold uppercase tracking-wider mb-6">
                  <Sparkles className="w-3.5 h-3.5" /> Câu lạc bộ Cầu lông SmashTeam
                </div>

                <motion.h1 
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight mb-6"
                >
                  ĐAM MÊ <span className="text-primary bg-gradient-to-r from-primary to-smash-violet bg-clip-text text-transparent">HỘI TỤ</span>
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="text-base md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed"
                >
                  Nơi tập hợp những tay vợt tài năng, một môi trường năng động để bạn tỏa sáng, nâng hạng ELO và giao lưu kết nối đồng đội.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="flex flex-wrap items-center justify-center gap-4"
                >
                  <button 
                    onClick={() => setActiveTab("schedule")}
                    className="px-7 py-3.5 bg-primary hover:bg-primary-hover text-white text-sm md:text-base font-bold rounded-full shadow-[0_0_30px_rgba(122,34,224,0.5)] hover:shadow-[0_0_45px_rgba(157,78,221,0.7)] transition-all transform hover:scale-105 flex items-center gap-2 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" /> Xem lịch đánh sắp tới
                  </button>
                  <button 
                    onClick={() => setActiveTab("leaderboard")}
                    className="px-7 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-sm md:text-base font-bold rounded-full border border-white/20 hover:border-white/40 transition-all transform hover:scale-105 flex items-center gap-2 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 text-amber-400" /> Bảng xếp hạng ELO
                  </button>
                </motion.div>
              </div>
            </section>

            {/* Về SmashTeam (Core Values & Highlights) */}
            <section className="max-w-7xl mx-auto px-4 py-16 w-full space-y-12">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-primary bg-purple-50 px-3 py-1 rounded-full border border-primary/20">
                  Về Câu Lạc Bộ
                </span>
                <h2 className="text-3xl font-black text-secondary">
                  Môi trường thể thao chuyên nghiệp & gắn kết
                </h2>
                <p className="text-sm text-slate-500">
                  SmashTeam hướng đến một sân chơi rèn luyện sức khỏe, thi đấu thăng hạng văn minh và tạo nên những kỷ niệm đáng nhớ.
                </p>
              </div>

              {/* 3 Value Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-secondary mb-2">Luyện tập đều đặn</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Tổ chức lịch sinh hoạt cố định hàng tuần với sân đấu chất lượng cao, giúp các thành viên duy trì thể lực và cảm giác cầu.
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-secondary mb-2">Hệ thống ELO & Rank</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Tính điểm xếp hạng minh bạch cho từng trận đấu đơn và đôi, vinh danh tay vợt xuất sắc với các cấp bậc từ Bronze tới Challenger.
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-secondary mb-2">Cộng đồng cởi mở</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Chào đón các thành viên ở mọi cấp độ kỹ năng. Giao lưu, chia sẻ kinh nghiệm chiến thuật và mở rộng mạng lưới quan hệ bạn bè.
                  </p>
                </div>
              </div>

              {/* Media Feed (Hoạt động nổi bật) */}
              <div className="space-y-6 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-7 bg-primary rounded-full"></div>
                    <h2 className="text-2xl md:text-3xl font-bold text-secondary">Hoạt động nổi bật</h2>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">Hình ảnh & Video highlight</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {mediaFeed.map((media, index) => (
                    <motion.div 
                      key={media.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="group relative rounded-3xl overflow-hidden bg-slate-100 aspect-[4/3] md:aspect-square shadow-sm hover:shadow-xl transition-all duration-300"
                    >
                      {media.type === 'image' ? (
                        <Image 
                          src={media.url} 
                          alt={media.title} 
                          fill 
                          className="object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <iframe
                          src={media.url}
                          title={media.title}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-full p-5 pointer-events-none">
                        <div className="flex items-center gap-2 text-smash-violet mb-1.5">
                          {media.type === 'image' ? <ImageIcon className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          <span className="text-[10px] font-bold uppercase tracking-wider">{media.type}</span>
                        </div>
                        <h3 className="text-white font-bold text-base md:text-lg line-clamp-2">{media.title}</h3>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* MỤC 2: BẢNG XẾP HẠNG (LEADERBOARD)                                       */}
        {/* ========================================================================= */}
        {activeTab === "leaderboard" && (
          <motion.div
            key="tab-leaderboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="max-w-5xl mx-auto px-4 py-8 w-full space-y-8"
          >
            {/* Header Mục BXH */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/60 text-amber-700 text-xs font-bold uppercase tracking-wider mb-2">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" /> Hệ thống ELO SmashTeam
                </div>
                <h1 className="text-3xl font-black text-secondary">Bảng Xếp Hạng Câu Lạc Bộ</h1>
                <p className="text-sm text-slate-500 mt-1">Cập nhật theo kết quả các trận đấu chính thức</p>
              </div>

              {/* Segmented Control / Tab Switcher: Đơn & Đôi */}
              <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/60 self-start sm:self-auto">
                <button
                  onClick={() => setLeaderboardType("singles")}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    leaderboardType === "singles"
                      ? "bg-white text-primary shadow-sm border border-slate-200/30 scale-[1.02]"
                      : "text-slate-500 hover:text-secondary"
                  }`}
                >
                  Xếp Hạng Đơn
                </button>
                <button
                  onClick={() => setLeaderboardType("doubles")}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    leaderboardType === "doubles"
                      ? "bg-white text-primary shadow-sm border border-slate-200/30 scale-[1.02]"
                      : "text-slate-500 hover:text-secondary"
                  }`}
                >
                  Xếp Hạng Đôi
                </button>
              </div>
            </div>

            {/* Podium Top 3 */}
            {leaderboard.length >= 3 && (
              <div className="bg-gradient-to-b from-purple-50/80 via-white to-white rounded-3xl p-6 sm:p-8 border border-purple-100 shadow-sm relative overflow-hidden">
                <div className="text-center mb-6">
                  <span className="text-xs font-black text-primary uppercase tracking-widest">
                    Vinh danh Top 3 Tay Vợt Dẫn Đầu
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-6 items-end max-w-2xl mx-auto pt-4 pb-2">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-slate-300 shadow-[0_0_15px_rgba(203,213,225,0.7)] flex items-center justify-center bg-slate-100 text-slate-700 font-bold text-sm sm:text-base">
                      {leaderboard[1].full_name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-black text-slate-500 uppercase mt-2">2nd Place</span>
                    <p className="text-xs sm:text-sm font-bold text-secondary truncate max-w-[90px] sm:max-w-[130px] text-center mt-0.5">
                      {leaderboard[1].full_name}
                    </p>
                    <p className="text-xs sm:text-sm font-black text-primary mt-0.5">{leaderboard[1].elo_score} ELO</p>
                    <span className={`text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded mt-1.5 ${getRankBadgeClass(leaderboard[1].rank_name)}`}>
                      {leaderboard[1].rank_name}
                    </span>
                  </div>

                  {/* 1st Place */}
                  <div className="flex flex-col items-center transform -translate-y-3 sm:-translate-y-4">
                    <div className="relative">
                      {/* Bouncing Crown */}
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-500 fill-amber-500 animate-bounce">
                        <Trophy className="w-6 h-6 fill-amber-500 drop-shadow-md" />
                      </div>
                      <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-full overflow-hidden border-4 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] flex items-center justify-center bg-amber-50 text-amber-700 font-black text-lg sm:text-xl">
                        {leaderboard[0].full_name.substring(0, 2).toUpperCase()}
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm font-black text-amber-600 uppercase mt-2">1st Champion</span>
                    <p className="text-sm sm:text-base font-black text-secondary truncate max-w-[100px] sm:max-w-[150px] text-center mt-0.5">
                      {leaderboard[0].full_name}
                    </p>
                    <p className="text-sm sm:text-base font-black text-primary mt-0.5">{leaderboard[0].elo_score} ELO</p>
                    <span className={`text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded mt-1.5 ${getRankBadgeClass(leaderboard[0].rank_name)}`}>
                      {leaderboard[0].rank_name}
                    </span>
                  </div>

                  {/* 3rd Place */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-amber-700/40 shadow-[0_0_12px_rgba(180,83,9,0.3)] flex items-center justify-center bg-amber-900/10 text-amber-900 font-bold text-sm sm:text-base">
                      {leaderboard[2].full_name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-black text-amber-800/80 uppercase mt-2">3rd Place</span>
                    <p className="text-xs sm:text-sm font-bold text-secondary truncate max-w-[90px] sm:max-w-[130px] text-center mt-0.5">
                      {leaderboard[2].full_name}
                    </p>
                    <p className="text-xs sm:text-sm font-black text-primary mt-0.5">{leaderboard[2].elo_score} ELO</p>
                    <span className={`text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded mt-1.5 ${getRankBadgeClass(leaderboard[2].rank_name)}`}>
                      {leaderboard[2].rank_name}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Search Box & Full Table */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <h3 className="font-bold text-base text-secondary self-start">
                  Danh sách thứ hạng đầy đủ
                </h3>
                
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm tên tay vợt..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs md:text-sm border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-slate-800"
                  />
                </div>
              </div>

              {/* Leaderboard Table / Cards */}
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {leaderboard
                  .filter(u => u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((user, index) => {
                    const overallIndex = leaderboard.findIndex(u => u.id === user.id);
                    return (
                      <div 
                        key={user.id} 
                        className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl hover:bg-slate-50 border border-slate-100 transition-colors group"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            overallIndex === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            overallIndex === 1 ? 'bg-slate-200 text-slate-700' :
                            overallIndex === 2 ? 'bg-amber-900/15 text-amber-900' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {overallIndex + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-secondary group-hover:text-primary transition-colors text-sm sm:text-base">
                                {user.full_name}
                              </p>
                              <span className={`text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${getRankBadgeClass(user.rank_name)}`}>
                                {user.rank_name}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Tỉ lệ thắng: <span className="font-semibold text-slate-600">{user.win_rate.toFixed(1)}%</span> • {user.total_matches} trận đã đấu
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-black text-base sm:text-lg text-secondary group-hover:text-primary transition-colors">{user.elo_score}</p>
                          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Điểm ELO</p>
                        </div>
                      </div>
                    );
                  })}

                {leaderboard.filter(u => u.full_name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-8">
                    Không tìm thấy tay vợt nào phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.
                  </p>
                )}
              </div>
            </div>

            {/* Rank Tiers Legend */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 text-xs text-slate-500 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-secondary">
                <Info className="w-4 h-4 text-primary" /> Quy chuẩn phân cấp ELO:
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="px-2 py-0.5 rounded bg-gradient-to-r from-red-500 to-purple-600 text-white font-bold">Challenger: 1800+</span>
                <span className="px-2 py-0.5 rounded bg-blue-500 text-white font-bold">Diamond: 1600+</span>
                <span className="px-2 py-0.5 rounded bg-teal-500 text-white font-bold">Platinum: 1400+</span>
                <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-bold">Gold: 1200+</span>
                <span className="px-2 py-0.5 rounded bg-slate-300 text-slate-800 font-bold">Silver: 1100+</span>
                <span className="px-2 py-0.5 rounded bg-amber-800/20 text-amber-900 font-bold">Bronze: &lt; 1100</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* MỤC 3: LỊCH ĐÁNH (SCHEDULE)                                              */}
        {/* ========================================================================= */}
        {activeTab === "schedule" && (
          <motion.div
            key="tab-schedule"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="max-w-5xl mx-auto px-4 py-8 w-full space-y-8"
          >
            {/* Header Mục Lịch Đánh */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/60 text-primary text-xs font-bold uppercase tracking-wider mb-2">
                  <Calendar className="w-3.5 h-3.5" /> Lịch Sinh Hoạt SmashTeam
                </div>
                <h1 className="text-3xl font-black text-secondary">Lịch Đánh & Buổi Tập</h1>
                <p className="text-sm text-slate-500 mt-1">Đăng ký tham gia sinh hoạt định kỳ và giao lưu nội bộ</p>
              </div>

              {/* Mode Switcher: Sắp tới vs Lịch sử */}
              <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/60 self-start sm:self-auto">
                <button
                  onClick={() => setScheduleViewMode("upcoming")}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    scheduleViewMode === "upcoming"
                      ? "bg-white text-primary shadow-sm border border-slate-200/30 scale-[1.02]"
                      : "text-slate-500 hover:text-secondary"
                  }`}
                >
                  Sắp Diễn Ra
                </button>
                <button
                  onClick={() => setScheduleViewMode("history")}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    scheduleViewMode === "history"
                      ? "bg-white text-primary shadow-sm border border-slate-200/30 scale-[1.02]"
                      : "text-slate-500 hover:text-secondary"
                  }`}
                >
                  Lịch Sử Buổi Tập
                </button>
              </div>
            </div>

            {/* Buổi tập sắp tới gần nhất (Featured Card) */}
            {scheduleViewMode === "upcoming" && upcomingSessionHighlight && (
              <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-purple-900/50">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/15 rounded-bl-full pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-primary/30 text-smash-violet border border-purple-400/30">
                      <Sparkles className="w-3 h-3" /> Buổi tập gần nhất
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{upcomingSessionHighlight.title}</h2>
                    
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-smash-violet" /> 
                        {formatDateTime(upcomingSessionHighlight.date_time)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-smash-violet" /> 
                        {upcomingSessionHighlight.location}
                      </span>
                    </div>
                  </div>

                  {/* Hành động RSVP & QR Check-in */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                    {isLoggedIn ? (
                      <>
                        <button
                          onClick={() => handleRsvp(upcomingSessionHighlight.id, "going")}
                          disabled={updatingRsvp}
                          className={`px-5 py-3 rounded-full font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${
                            upcomingSessionHighlight.rsvp_status === "going"
                              ? "bg-primary text-white shadow-[0_0_20px_rgba(122,34,224,0.7)] border border-purple-400/60"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                          }`}
                        >
                          <Check className="w-4 h-4" /> 
                          {upcomingSessionHighlight.rsvp_status === "going" ? "Đã xác nhận Tham gia" : "Tham gia"}
                        </button>
                        <button
                          onClick={() => handleRsvp(upcomingSessionHighlight.id, "absent")}
                          disabled={updatingRsvp}
                          className={`px-5 py-3 rounded-full font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                            upcomingSessionHighlight.rsvp_status === "absent"
                              ? "bg-slate-700 text-white"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700"
                          }`}
                        >
                          <X className="w-4 h-4" /> Bận
                        </button>
                        <Link href="/check-in">
                          <button className="px-5 py-3 rounded-full font-bold text-xs bg-white text-slate-900 hover:bg-slate-100 flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer">
                            <QrCode className="w-4 h-4" /> Quét QR sân
                          </button>
                        </Link>
                      </>
                    ) : (
                      <Link href="/login?redirect=/">
                        <button className="px-6 py-3 rounded-full font-bold text-xs bg-primary hover:bg-primary-hover text-white flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all cursor-pointer">
                          Đăng nhập để RSVP
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Danh sách các buổi tập dạng Grid */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-secondary">
                {scheduleViewMode === "upcoming" ? "Tất cả buổi tập sắp tới" : "Lịch sử các buổi tập đã hoàn thành"}
              </h3>

              {scheduleViewMode === "upcoming" ? (
                upcomingSessions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {upcomingSessions.map((session) => (
                      <div 
                        key={session.id}
                        className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 text-primary border border-primary/20">
                              Lịch sắp tới
                            </span>
                            <span className="text-xs font-semibold text-slate-400">#BUOITAP-{session.id}</span>
                          </div>
                          <h4 className="font-bold text-base text-secondary">{session.title}</h4>
                          
                          <div className="space-y-1.5 text-xs text-slate-500 pt-1">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>{formatDateTime(session.date_time)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>{session.location}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-400">Điểm danh tại sân</span>
                          <Link href="/check-in">
                            <button className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1">
                              Mở QR Check-in <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-10 border border-dashed border-slate-200 text-center space-y-2">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-600 text-sm">Chưa có buổi tập mới nào được xếp lịch</p>
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
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            Đã diễn ra
                          </span>
                          <span className="text-xs text-slate-400">#BUOITAP-{session.id}</span>
                        </div>
                        <h4 className="font-bold text-base text-secondary">{session.title}</h4>
                        <div className="space-y-1.5 text-xs text-slate-500">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDateTime(session.date_time)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{session.location}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-10 border border-dashed border-slate-200 text-center space-y-2">
                    <History className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-600 text-sm">Chưa có dữ liệu lịch sử buổi tập</p>
                  </div>
                )
              )}
            </div>

            {/* Nội quy & Lưu ý sân cầu */}
            <div className="bg-purple-50/60 rounded-3xl p-6 border border-purple-100 space-y-3">
              <h4 className="font-bold text-sm text-secondary flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Lưu ý khi tham gia sinh hoạt:
              </h4>
              <ul className="text-xs text-slate-600 space-y-2 pl-4 list-disc">
                <li>Vui lòng mang theo <strong>giày cầu lông chuyên dụng</strong> (đế cao su gum) để bảo vệ mặt thảm sân và tránh chấn thương.</li>
                <li>Có mặt trước giờ tập <strong>10 - 15 phút</strong> để khởi động kỹ các khớp và nhận sân.</li>
                <li>Quét mã QR tại bàn tiếp tân sân hoặc bấm <strong>Điểm danh QR</strong> để nhận thưởng <strong>+25 XP</strong> và <strong>+10 Smash Coins</strong>.</li>
              </ul>
            </div>
          </motion.div>
        )}

      </div>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-10 text-center border-t border-slate-800/80 mt-16">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="text-sm font-semibold text-slate-300">© 2026 SmashTeam Badminton Club. All rights reserved.</p>
          <p className="text-xs text-slate-500">Nơi đam mê hội tụ • Tinh thần thể thao trung thực • Nâng tầm bản lĩnh</p>
        </div>
      </footer>
    </main>
  );
}
