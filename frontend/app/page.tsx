"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  ChevronRight, Trophy, Play, Image as ImageIcon, Users, Flame, Calendar, Award, 
  CheckCircle, Heart, Star, LogIn, ArrowRight, Zap, Target, Sparkles 
} from "lucide-react";
import { useState, useEffect } from "react";
import { API_URL } from "@/app/config";

// Animated Counter component
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1500;
    const stepTime = 30;
    const steps = duration / stepTime;
    const increment = target / steps;
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [target]);
  
  return <span>{count.toLocaleString()}{suffix}</span>;
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [activeHofTab, setActiveHofTab] = useState<"elo" | "attendance" | "rookie" | "community">("elo");

  // State for aggregate live statistics
  const [liveData, setLiveData] = useState<any>({
    session: null,
    isUpcoming: false,
    rsvpList: [],
    todayStats: { checkinsCount: 0, matchesCount: 0 },
    activities: [],
    hallOfFame: {
      topElo: [],
      topAttendance: [],
      topRookies: [],
      topCommunity: []
    }
  });

  const [countdownText, setCountdownText] = useState("Đang tính toán...");
  const [isTodaySession, setIsTodaySession] = useState(false);

  // Heart likes simulation on feed
  const [likedActivities, setLikedActivities] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  const handleLike = (id: string) => {
    setLikedActivities(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      setLikeCounts(counts => ({
        ...counts,
        [id]: (counts[id] || 0) + (updated[id] ? 1 : -1)
      }));
      return updated;
    });
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

  const getRankGlowClass = (rank: string) => {
    switch (rank) {
      case 'Challenger': return 'rank-glow-challenger';
      case 'Diamond': return 'rank-glow-diamond';
      case 'Platinum': return 'rank-glow-platinum';
      case 'Gold': return 'rank-glow-gold';
      case 'Silver': return 'rank-glow-silver';
      case 'Bronze': return 'rank-glow-bronze';
      default: return 'border-slate-800';
    }
  };

  useEffect(() => {
    // Check login state
    const token = localStorage.getItem("admin_token");
    const role = localStorage.getItem("user_role");
    if (token) {
      setIsLoggedIn(true);
      if (role) setUserRole(role);
    }

    // Load cached cover to avoid flash
    const cachedCover = localStorage.getItem("homepage_cover_url");
    if (cachedCover) {
      setCoverUrl(cachedCover);
    }

    // Fetch Cover Settings
    fetch(`${API_URL}/api/settings?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.homepage_cover_url) {
          setCoverUrl(data.homepage_cover_url);
          localStorage.setItem("homepage_cover_url", data.homepage_cover_url);
        }
      })
      .catch(e => console.error("Error loading settings:", e));

    // Fetch Aggregated Homepage Data
    fetch(`${API_URL}/api/homepage/live-stats?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          setLiveData(data);
          
          // Generate initial random likes for activities
          const initialLikes: Record<string, number> = {};
          data.activities.forEach((act: any) => {
            initialLikes[act.id] = Math.floor(Math.random() * 8) + 2;
          });
          setLikeCounts(initialLikes);
        }
      })
      .catch(e => console.error("Error loading homepage live stats:", e));
  }, []);

  // Timer logic for Countdown
  useEffect(() => {
    if (!liveData.session) return;

    const timer = setInterval(() => {
      const sessionDate = new Date(liveData.session.date_time_str);
      const now = new Date();

      // Check if session is today
      const isToday = sessionDate.toDateString() === now.toDateString();
      setIsTodaySession(isToday);

      if (isToday) {
        setCountdownText("Hôm nay có buổi tập!");
        clearInterval(timer);
        return;
      }

      const diffMs = sessionDate.getTime() - now.getTime();
      if (diffMs <= 0) {
        setCountdownText("Đang diễn ra!");
        clearInterval(timer);
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      let text = "";
      if (days > 0) text += `${days} ngày `;
      text += `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      setCountdownText(text);
    }, 1000);

    return () => clearInterval(timer);
  }, [liveData.session]);

  const scrollToCTA = () => {
    const element = document.getElementById("cta-join-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Mock Battle Pass Season data
  const battlePass = {
    season: "Season 6: Summer Smash",
    level: 18,
    progress: 72, // percentage
    nextReward: "Áo Đấu CLB Limited 2026",
    daysLeft: 12
  };

  // Mock Gallery data
  const galleryPhotos = [
    { url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800", caption: "Ăn lẩu đêm giao lưu sau buổi sinh hoạt 🍲" },
    { url: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800", caption: "Teambuilding hè nảy lửa tại Vũng Tàu 🌊" },
    { url: "https://images.unsplash.com/photo-1521537634581-175855047d44?w=800", caption: "Tiệc chúc mừng sinh nhật các thành viên tháng 7 🎂" },
    { url: "https://images.unsplash.com/photo-1516880711640-ef7db81be3e1?w=800", caption: "Giao lưu thi đấu cọ xát với CLB bạn 🏸" }
  ];

  // Tab configurations for Hall of Fame
  const hofTabs = [
    { key: "elo", label: "Thách đấu ELO" },
    { key: "attendance", label: "Chiến thần chuyên cần" },
    { key: "rookie", label: "Tân binh nổi bật" },
    { key: "community", label: "Quest Masters" }
  ];

  const getActiveHofData = () => {
    switch (activeHofTab) {
      case "elo": return liveData.hallOfFame.topElo;
      case "attendance": return liveData.hallOfFame.topAttendance;
      case "rookie": return liveData.hallOfFame.topRookies;
      case "community": return liveData.hallOfFame.topCommunity;
      default: return [];
    }
  };

  const getHofScoreUnit = (score: number) => {
    switch (activeHofTab) {
      case "elo": return `${score} Elo`;
      case "attendance": return `${score} Buổi tập`;
      case "rookie": return `${score} Buổi tập`;
      case "community": return `${score} Nhiệm vụ`;
      default: return score;
    }
  };

  return (
    <main className="flex-1 w-full bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* Navbar Minimalist */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shadow-[0_0_10px_rgba(122,34,224,0.3)] border border-smash-purple/20">
              <Image
                src="/logo.png"
                alt="Smash Team Logo"
                fill
                className="object-cover"
              />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">SmashTeam</span>
          </div>
          <div className="flex gap-4 items-center">
            {isLoggedIn ? (
              <Link href={userRole === "admin" ? "/admin" : "/profile"}>
                <button className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-full font-bold transition-all transform hover:scale-105 shadow-md text-sm cursor-pointer">
                  {userRole === "admin" ? "Trang quản trị" : "Trang cá nhân"}
                </button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <button className="px-4 py-2 text-slate-300 hover:text-white transition-all font-semibold text-sm cursor-pointer">
                    Đăng nhập
                  </button>
                </Link>
                <Link href="/register">
                  <button className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-full font-bold transition-all transform hover:scale-105 shadow-md text-sm cursor-pointer">
                    Gia nhập ngay
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* TẦNG 1: HERO SECTION & SOCIAL PROOF */}
      <section className="relative h-screen flex flex-col justify-center overflow-hidden bg-slate-950">
        {/* Background Cover image with overlay */}
        <div className="absolute inset-0 z-0">
          {coverUrl && (
            <motion.div
              key={coverUrl}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.25 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              <Image
                src={coverUrl}
                alt="Badminton Hero"
                fill
                className="object-cover"
                priority
              />
            </motion.div>
          )}
          {/* Neon purple blur balls */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full filter blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full filter blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-16 flex-grow flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6 mx-auto"
          >
            <Sparkles className="w-3.5 h-3.5" /> Nơi chắp cánh đam mê & kết nối
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-7xl font-black text-white tracking-tight mb-6 uppercase leading-tight"
          >
            Không chỉ là cầu lông.<br />
            Đây là nơi bạn tìm thấy <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-pink-500">đồng đội</span>.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto"
          >
            300+ sinh viên từ khắp các trường Đại học đã tìm thấy cộng đồng của mình tại SmashTeam. Cùng tập luyện, leo hạng và chia sẻ niềm vui ngoài sân đấu.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button
              onClick={scrollToCTA}
              className="group px-8 py-4 bg-gradient-to-r from-primary to-pink-600 hover:from-primary-hover hover:to-pink-500 text-white text-base font-bold rounded-full overflow-hidden shadow-[0_0_30px_rgba(122,34,224,0.35)] transition-all cursor-pointer transform active:scale-95 flex items-center gap-2"
            >
              Gia Nhập CLB Ngay <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <Link href="/login">
              <button className="px-6 py-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-full font-bold text-sm transition-all cursor-pointer flex items-center gap-2">
                Hội viên Đăng nhập <LogIn className="w-4 h-4" />
              </button>
            </Link>
          </motion.div>
        </div>

        {/* Social Proof Counter bar */}
        <div className="relative z-10 border-t border-slate-900 bg-slate-950/60 backdrop-blur-md py-8">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
                <AnimatedCounter target={150} suffix="+" />
              </p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Thành viên năng động</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
                <AnimatedCounter target={5000} suffix="+" />
              </p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Trận đấu đã ghi nhận</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
                <AnimatedCounter target={42} suffix="+" />
              </p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Sự kiện & Giải đấu</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
                <AnimatedCounter target={3} suffix=" năm" />
              </p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Hoạt động & Phát triển</p>
            </div>
          </div>
        </div>
      </section>

      {/* TẦNG 2: LIVE DASHBOARD & FOMO WIDGET */}
      <section className="max-w-7xl mx-auto px-4 py-20 relative z-10">
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full filter blur-3xl -z-10 pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Status dashboard */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2">
                {isTodaySession ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-[10px] uppercase tracking-widest animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> LIVE HÔM NAY
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold text-[10px] uppercase tracking-widest">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" /> Buổi tập kế tiếp
                  </span>
                )}
                <span className="text-xs font-black text-slate-400 tracking-wider">
                  {liveData.session ? liveData.session.title : "Chưa lập lịch tập mới"}
                </span>
              </div>

              {liveData.session ? (
                <>
                  <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                    {isTodaySession ? (
                      <span>Chào mừng đến với buổi tập ngày hôm nay! 👋</span>
                    ) : (
                      <span>Đếm ngược buổi sinh hoạt sắp diễn ra:</span>
                    )}
                  </h3>
                  
                  <div className="flex flex-wrap gap-4 items-center text-slate-300">
                    <span className="text-sm font-bold bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-850">
                      📍 {liveData.session.location}
                    </span>
                    <span className="text-sm font-bold bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-850">
                      ⏰ {new Date(liveData.session.date_time_str).toLocaleString("vi-VN", {
                        weekday: "long", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>

                  {!isTodaySession && (
                    <div className="pt-2">
                      <p className="text-4xl md:text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-primary to-pink-500 tracking-wider">
                        {countdownText}
                      </p>
                    </div>
                  )}

                  {isTodaySession && (
                    <div className="grid grid-cols-2 gap-4 max-w-sm pt-2">
                      <div className="p-3 bg-slate-950/80 border border-slate-850 rounded-2xl text-center">
                        <p className="text-2xl font-black text-white">{liveData.todayStats.checkinsCount}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Đã Check-in</p>
                      </div>
                      <div className="p-3 bg-slate-950/80 border border-slate-850 rounded-2xl text-center">
                        <p className="text-2xl font-black text-white">{liveData.todayStats.matchesCount}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Trận đấu hôm nay</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-slate-400 text-sm italic">Ban quản trị đang cập nhật lịch tập luyện mới...</p>
              )}
            </div>

            {/* FOMO Stack Widget */}
            <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-800 pt-6 lg:pt-0 lg:pl-8 space-y-4">
              <h4 className="text-sm font-black text-slate-400 tracking-wider uppercase">
                {isTodaySession ? "Đang có mặt trên sân:" : "Ai sẽ tham gia buổi này?"}
              </h4>

              {liveData.rsvpList.length > 0 ? (
                <div className="space-y-4">
                  {/* Stack design */}
                  <div className="flex items-center">
                    <div className="flex -space-x-3 overflow-hidden">
                      {liveData.rsvpList.slice(0, 8).map((user: any) => (
                        <div 
                          key={user.id} 
                          className="relative w-10 h-10 rounded-full border-2 border-slate-900 overflow-hidden bg-slate-850 group cursor-pointer"
                        >
                          {user.avatar_url ? (
                            <Image 
                              src={user.avatar_url} 
                              alt={user.full_name} 
                              fill 
                              className="object-cover" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary text-white text-xs font-bold">
                              {user.full_name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] p-2 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-black pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 text-white text-center shadow-xl">
                            <p className="text-slate-200">{user.full_name}</p>
                            <p className="text-slate-400 font-medium">{user.academic_info || "Hội viên CLB"}</p>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold bg-primary/20 text-primary border border-primary/20 mt-1">
                              {user.rank_name} {user.elo_score} ELO
                            </span>
                          </div>
                        </div>
                      ))}

                      {liveData.rsvpList.length > 8 && (
                        <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-300">
                          +{liveData.rsvpList.length - 8}
                        </div>
                      )}
                    </div>

                    <span className="text-xs text-slate-400 font-bold ml-3">
                      {liveData.rsvpList.length} người đã RSVP
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 italic">
                    * Rê chuột vào từng avatar để xem trường Đại học & thứ hạng Rank Elo của họ!
                  </p>
                </div>
              ) : (
                <p className="text-slate-400 text-xs italic">Chưa có ai RSVP. Đăng ký ngay để ghi danh!</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* TẦNG 3: BATTLE PASS TEASER */}
      <section className="max-w-7xl mx-auto px-4 py-10 relative z-10">
        <div className="p-8 rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-950 border border-purple-500/20 shadow-[0_0_40px_rgba(122,34,224,0.15)] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          {/* Left info */}
          <div className="space-y-4 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-black uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 fill-purple-400" /> Smash Pass độc quyền
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Tích lũy Điểm Danh, Mở khóa <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Smash Pass</span>
            </h3>
            <p className="text-sm text-slate-400">
              Độc nhất vô nhị chỉ có tại SmashTeam: Hoàn thành các buổi sinh hoạt định kỳ và nhiệm vụ thử thách để thăng cấp, tích lũy Smash Coins và đổi lấy các quà tặng phiên bản giới hạn.
            </p>
            <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start pt-2">
              <span className="text-xs text-slate-400 font-bold bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                🎫 Cấp BP: {battlePass.level}
              </span>
              <span className="text-xs text-slate-400 font-bold bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                ⏳ Còn lại: {battlePass.daysLeft} ngày
              </span>
            </div>
          </div>

          {/* Progress visual and teaser reward */}
          <div className="w-full md:w-80 p-5 rounded-2xl bg-slate-950 border border-slate-850 space-y-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">{battlePass.season}</p>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-purple-400">Tiến độ cấp {battlePass.level}</span>
                <span className="text-slate-400">{battlePass.progress}%</span>
              </div>
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-850 p-[2px]">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-pink-500 rounded-full" 
                  style={{ width: `${battlePass.progress}%` }} 
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-xl border border-purple-500/20">
              <div className="text-2xl animate-pulse">🎁</div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phần thưởng cấp tiếp theo</p>
                <p className="text-xs font-black text-purple-300">{battlePass.nextReward}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TẦNG 4: COMMUNITY ACTIVITY FEED (Facebook mini) */}
      <section className="max-w-7xl mx-auto px-4 py-20 grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-8 bg-primary rounded-full"></div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">Hoạt động Câu Lạc Bộ</h2>
              <p className="text-slate-500 text-sm mt-1">Dòng tin tức tự động ghi nhận trực tiếp mọi khoảnh khắc tranh tài, thăng hạng ELO.</p>
            </div>
          </div>

          <div className="space-y-4">
            {liveData.activities.length > 0 ? (
              liveData.activities.map((act: any) => (
                <div 
                  key={act.id} 
                  className="p-5 rounded-2xl bg-slate-900/40 border border-slate-850/50 flex gap-4 items-start hover:border-slate-800 transition-colors group relative overflow-hidden"
                >
                  {/* Left Icon indicator */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 text-xl group-hover:scale-105 transition-transform duration-300">
                    {act.type === 'match' ? '🏸' : act.type === 'promotion' ? '👑' : '🔥'}
                  </div>

                  {/* Text Details */}
                  <div className="flex-grow space-y-1">
                    <p className="text-sm md:text-base font-bold text-slate-200 group-hover:text-white transition-colors">
                      {act.text}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold">
                      {new Date(act.timestamp).toLocaleTimeString("vi-VN", {
                        hour: "2-digit", minute: "2-digit"
                      })} - {new Date(act.timestamp).toLocaleDateString("vi-VN")}
                    </p>
                  </div>

                  {/* Like Button */}
                  <button 
                    onClick={() => handleLike(act.id)}
                    className={`p-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer ${
                      likedActivities[act.id]
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                        : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-400"
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${likedActivities[act.id] ? "fill-rose-500" : ""}`} />
                    <span>{likeCounts[act.id] || 0}</span>
                  </button>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm italic">Hôm nay chưa có bản tin hoạt động mới...</p>
            )}
          </div>
        </div>

        {/* TẦNG 5: HALL OF FAME TABBED 3D CARDS (Leaderboards Widget Overhaul) */}
        <div className="space-y-8 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-primary rounded-full"></div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">Hall of Fame</h2>
              <p className="text-slate-500 text-sm mt-1">Nơi vinh danh các cá nhân xuất sắc nhất trong CLB.</p>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-850 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -z-0 pointer-events-none"></div>

            {/* Grid Tabs Switcher */}
            <div className="relative z-10 grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl mb-6 border border-slate-850">
              {hofTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveHofTab(tab.key as any)}
                  className={`py-2 text-[10px] font-black rounded-lg transition-all duration-300 cursor-pointer ${
                    activeHofTab === tab.key
                      ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Podium details */}
            <div className="space-y-4 relative z-10">
              {getActiveHofData().length > 0 ? (
                getActiveHofData().map((user: any, index: number) => (
                  <div 
                    key={user.id} 
                    className={`p-4 rounded-2xl bg-slate-950 border flex items-center justify-between transition-all group ${getRankGlowClass(user.rank_name)}`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Trophy indicator */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 border
                        ${index === 0 ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' : 
                          index === 1 ? 'bg-slate-300/10 border-slate-300/30 text-slate-300' : 
                          'bg-amber-800/10 border-amber-800/30 text-amber-600'}`}
                      >
                        {index + 1}
                      </div>

                      {/* Avatar with rank border */}
                      <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-slate-800 shrink-0">
                        {user.avatar_url ? (
                          <Image src={user.avatar_url} alt={user.full_name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white font-bold text-xs">
                            {user.full_name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-extrabold text-white group-hover:text-primary transition-colors text-sm">{user.full_name}</p>
                          <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${getRankBadgeClass(user.rank_name)}`}>
                            {user.rank_name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">Tân binh tháng này</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-black text-sm text-white">{getHofScoreUnit(user.score)}</p>
                      <p className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Thành tích</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-xs italic text-center py-6">Hiện chưa có thống kê cho hạng mục này.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* TẦNG 6: SMASHTEAM IN NUMBERS & GALLERY */}
      <section className="border-t border-slate-900 bg-slate-950 py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 space-y-12">
          {/* Numbers section */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">SMASHTEAM TRONG NHỮNG CON SỐ</h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Không phải là một nhóm đấu cầu lông tự phát. Chúng tôi vận hành như một sản phẩm công nghệ với các chỉ số ấn tượng.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-850/60 text-center">
              <div className="text-2xl mb-1">🏸</div>
              <p className="text-xl md:text-2xl font-black text-white">8,452</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1">Trận đấu</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-850/60 text-center">
              <div className="text-2xl mb-1">👥</div>
              <p className="text-xl md:text-2xl font-black text-white">157</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1">Thành viên</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-850/60 text-center">
              <div className="text-2xl mb-1">🎁</div>
              <p className="text-xl md:text-2xl font-black text-white">21,000</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1">Smash Coins đổi</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-850/60 text-center">
              <div className="text-2xl mb-1">🔥</div>
              <p className="text-xl md:text-2xl font-black text-white">38 ngày</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1">Check-in dài nhất</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-850/60 text-center">
              <div className="text-2xl mb-1">🏆</div>
              <p className="text-xl md:text-2xl font-black text-white">14</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1">Giải đấu tổ chức</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-850/60 text-center">
              <div className="text-2xl mb-1">❤️</div>
              <p className="text-xl md:text-2xl font-black text-white">92%</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1">Quay lại sau buổi đầu</p>
            </div>
          </div>

          {/* Gallery carousel section */}
          <div className="space-y-6 pt-10">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-primary rounded-full"></div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Khoảnh Khắc Đời Thường</h2>
                <p className="text-slate-500 text-sm mt-1">Chúng mình cùng cười, cùng ăn và cùng lưu giữ những kỷ niệm đẹp.</p>
              </div>
            </div>

            {/* Spotify style horizontal scroll */}
            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin snap-x pr-4">
              {galleryPhotos.map((photo, i) => (
                <div 
                  key={i} 
                  className="min-w-[280px] md:min-w-[320px] aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900 border border-slate-850/80 snap-start group relative"
                >
                  <Image 
                    src={photo.url} 
                    alt={photo.caption} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-full p-4 pointer-events-none">
                    <p className="text-white text-sm font-extrabold tracking-wide">{photo.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TẦNG 7: TESTIMONIALS & CALL TO ACTION */}
      <section className="bg-slate-950 py-20 relative z-10 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Airbnb-style Testimonials */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-primary rounded-full"></div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Thành Viên Nói Gì?</h2>
                <p className="text-slate-500 text-sm mt-1">Airbnb-style reviews chân thực từ những người đã trải nghiệm thực tế.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-850/60 backdrop-blur-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-slate-850 flex items-center justify-center text-xs font-bold">
                      M
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-200">Minh</p>
                      <p className="text-[10px] text-slate-500 font-bold">Cựu sinh viên UIT</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 text-amber-400">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />)}
                  </div>
                </div>
                <p className="text-xs md:text-sm text-slate-400 italic">
                  "Mình tìm được bạn đánh cặp ăn ý và cải thiện được 300 điểm ELO chỉ sau 3 tháng sinh hoạt. CLB chuyên nghiệp nhất mình từng tham gia!"
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-850/60 backdrop-blur-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-slate-850 flex items-center justify-center text-xs font-bold">
                      H
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-200">Hải</p>
                      <p className="text-[10px] text-slate-500 font-bold">Sinh viên VGU</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 text-amber-400">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />)}
                  </div>
                </div>
                <p className="text-xs md:text-sm text-slate-400 italic">
                  "Cảm giác như được tham gia giải chuyên nghiệp, mỗi trận đấu đều có ghi ELO và thống kê tự động. Rất khuyến khích các bạn tham gia!"
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-850/60 backdrop-blur-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-slate-850 flex items-center justify-center text-xs font-bold">
                      L
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-200">Lan</p>
                      <p className="text-[10px] text-slate-500 font-bold">Sinh viên HUFLIT</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 text-amber-400">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />)}
                  </div>
                </div>
                <p className="text-xs md:text-sm text-slate-400 italic">
                  "Trình độ nào cũng có sân phù hợp. Mọi người hướng dẫn cực kỳ thân thiện và hay rủ nhau đi ăn khuya vui hết sẩy!"
                </p>
              </div>
            </div>
          </div>

          {/* CTA overhaul section */}
          <div 
            id="cta-join-section" 
            className="p-8 rounded-3xl bg-gradient-to-br from-primary/10 via-slate-900 to-pink-500/5 border border-primary/20 shadow-2xl relative overflow-hidden space-y-6 text-center lg:text-left"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/15 rounded-full filter blur-3xl -z-10 pointer-events-none" />
            
            <h3 className="text-3xl font-black text-white tracking-tight">
              Bạn đã sẵn sàng cho trận cầu đầu tiên?
            </h3>
            
            <p className="text-slate-400 text-sm">
              Chúng tôi luôn mở rộng vòng tay đón chào thế hệ thành viên tiếp theo. Bất kể trình độ của bạn ra sao, bạn luôn có vị trí tại đây.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-black text-slate-300">
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Sinh viên mọi trình độ</span>
              </div>
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Môi trường thân thiện, văn minh</span>
              </div>
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Có người hướng dẫn chi tiết</span>
              </div>
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Hoạt động giao lưu ngoài lề hàng tuần</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/register" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all cursor-pointer text-sm">
                  ĐĂNG KÝ THÀNH VIÊN
                </button>
              </Link>
              
              <Link href="/register" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-6 py-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-bold rounded-xl active:scale-95 transition-all cursor-pointer text-sm">
                  THAM GIA BUỔI TẬP THỬ
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-slate-950 text-slate-500 py-12 text-center border-t border-slate-900 text-xs font-bold">
        <p>© 2026 SmashTeam Badminton Club. All rights reserved.</p>
      </footer>
    </main>
  );
}
