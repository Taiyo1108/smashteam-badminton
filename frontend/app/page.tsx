"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronRight, Trophy, Play, Image as ImageIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { API_URL } from "@/app/config";

export default function Home() {
  // Mock data for display before backend is connected
  const [leaderboard, setLeaderboard] = useState<any[]>([
    { id: 1, full_name: "Nguyễn Văn A", elo_score: 1540, win_rate: 68.5, rank_name: "Gold", total_matches: 12 },
    { id: 2, full_name: "Trần Thị B", elo_score: 1480, win_rate: 62.0, rank_name: "Gold", total_matches: 10 },
    { id: 3, full_name: "Lê Hoàng C", elo_score: 1420, win_rate: 55.5, rank_name: "Gold", total_matches: 8 },
    { id: 4, full_name: "Phạm D", elo_score: 1350, win_rate: 51.0, rank_name: "Gold", total_matches: 6 },
    { id: 5, full_name: "Đặng E", elo_score: 1290, win_rate: 49.2, rank_name: "Gold", total_matches: 4 },
  ]);

  const [mediaFeed, setMediaFeed] = useState<any[]>([
    { id: 1, title: "Giải đấu Mùa Xuân 2026", type: "image", url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" },
    { id: 2, title: "Tập luyện hằng ngày", type: "image", url: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" },
    { id: 3, title: "Highlight Smash", type: "video", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }
  ]);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState("");

  const [coverUrl, setCoverUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [leaderboardType, setLeaderboardType] = useState<"singles" | "doubles">("singles");

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

  useEffect(() => {
    // Check login state
    const token = localStorage.getItem("admin_token");
    const role = localStorage.getItem("user_role");
    if (token) {
      setIsLoggedIn(true);
      if (role) setUserRole(role);
    }

    // Check local storage immediately on client mount to prevent flash of empty screen
    const cachedCover = localStorage.getItem("homepage_cover_url");
    if (cachedCover) {
      setCoverUrl(cachedCover);
    }

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
  }, []);

  useEffect(() => {
    // Fetch Leaderboard based on Singles or Doubles type
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

  return (
    <main className="flex-1 w-full bg-background">
      {/* Navbar Minimalist */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
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
            <span className="font-bold text-xl tracking-tight text-secondary">SmashTeam</span>
          </div>
          <div className="flex gap-4 items-center">
            {isLoggedIn ? (
              <Link href={userRole === "admin" ? "/admin" : "/profile"}>
                <button className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-full font-medium transition-all transform hover:scale-105 shadow-md text-sm">
                  {userRole === "admin" ? "Trang quản trị" : "Trang cá nhân"}
                </button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <button className="px-4 py-2 text-secondary hover:text-primary transition-all font-semibold text-sm">
                    Đăng nhập
                  </button>
                </Link>
                <Link href="/register">
                  <button className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-full font-medium transition-all transform hover:scale-105 shadow-md text-sm">
                    Gia nhập ngay
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-0">
          {coverUrl && (
            <motion.div
              key={coverUrl}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
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
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-16">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6"
          >
            ĐAM MÊ <span className="text-primary">HỘI TỤ</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-2xl text-slate-300 mb-10 max-w-2xl mx-auto"
          >
            Nơi tập hợp những tay vợt tài năng, một môi trường năng động để bạn tỏa sáng và giao lưu.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link href="/register">
              <button className="group relative px-8 py-4 bg-primary text-white text-lg font-bold rounded-full overflow-hidden shadow-[0_0_40px_rgba(122,34,224,0.4)] hover:shadow-[0_0_60px_rgba(157,78,221,0.6)] transition-all">
                <span className="relative z-10 flex items-center gap-2">
                  Trở thành Thành viên <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="max-w-7xl mx-auto px-4 py-20 grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Media Feed (Left Side - 2 columns) */}
        <div className="lg:col-span-2 space-y-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-2 h-8 bg-primary rounded-full"></div>
            <h2 className="text-3xl font-bold text-secondary">Hoạt động nổi bật</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mediaFeed.map((media, index) => (
              <motion.div 
                key={media.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative rounded-2xl overflow-hidden bg-slate-100 aspect-square md:aspect-[4/5] shadow-sm hover:shadow-xl transition-all"
              >
                {media.type === 'image' ? (
                  <Image src={media.url} alt={media.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <iframe
                    src={media.url}
                    title={media.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full p-6 pointer-events-none">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    {media.type === 'image' ? <ImageIcon className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span className="text-xs font-bold uppercase tracking-wider">{media.type}</span>
                  </div>
                  <h3 className="text-white font-bold text-xl">{media.title}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Leaderboard Widget (Right Side - 1 column) */}
        <div className="space-y-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-2 h-8 bg-primary rounded-full"></div>
            <h2 className="text-3xl font-bold text-secondary">Bảng Xếp Hạng</h2>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -z-0 pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2 text-primary">
                <Trophy className="w-6 h-6" />
                <span className="font-bold">Hạng Elo Câu Lạc Bộ</span>
              </div>
            </div>

            {/* Segmented Control / Tab Switcher */}
            <div className="relative z-10 flex p-1 bg-slate-100/80 backdrop-blur-sm rounded-xl mb-6 border border-slate-200/50 shadow-inner">
              <button
                onClick={() => setLeaderboardType("singles")}
                className={`flex-grow py-2.5 text-xs font-bold rounded-lg transition-all duration-300 transform active:scale-95 ${
                  leaderboardType === "singles"
                    ? "bg-white text-primary shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/20 scale-[1.02]"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                }`}
              >
                Bảng Xếp Hạng Đơn
              </button>
              <button
                onClick={() => setLeaderboardType("doubles")}
                className={`flex-grow py-2.5 text-xs font-bold rounded-lg transition-all duration-300 transform active:scale-95 ${
                  leaderboardType === "doubles"
                    ? "bg-white text-primary shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/20 scale-[1.02]"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                }`}
              >
                Bảng Xếp Hạng Đôi
              </button>
            </div>

            {/* Podium for Top 3 */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-2 items-end mb-6 pt-4 pb-4 border-b border-slate-100 relative z-10">
                {/* 2nd Place */}
                <div className="flex flex-col items-center">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-smash-purple/60 shadow-[0_0_15px_rgba(122,34,224,0.4)] flex items-center justify-center bg-purple-50 text-smash-purple/80 font-bold text-sm">
                    {leaderboard[1].full_name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[10px] font-black text-smash-purple/80 uppercase mt-1">2nd</span>
                  <p className="text-xs font-bold text-secondary truncate max-w-[80px] text-center">{leaderboard[1].full_name}</p>
                  <p className="text-xs font-black text-smash-purple/95">{leaderboard[1].elo_score}</p>
                  <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded mt-1 scale-90 ${getRankBadgeClass(leaderboard[1].rank_name)}`}>
                    {leaderboard[1].rank_name}
                  </span>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center transform -translate-y-2 scale-105">
                  <div className="relative">
                    {/* Trophy/Crown icon */}
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-smash-violet fill-smash-violet animate-bounce">
                      <Trophy className="w-5 h-5 fill-smash-violet" />
                    </div>
                    {/* Glowing effect */}
                    <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-smash-violet shadow-[0_0_25px_rgba(157,78,221,0.7)] flex items-center justify-center bg-purple-50 text-smash-purple font-black text-lg">
                      {leaderboard[0].full_name.substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-smash-violet uppercase mt-1">1st</span>
                  <p className="text-xs font-black text-secondary truncate max-w-[90px] text-center">{leaderboard[0].full_name}</p>
                  <p className="text-sm font-black text-smash-purple">{leaderboard[0].elo_score}</p>
                  <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded mt-1 ${getRankBadgeClass(leaderboard[0].rank_name)}`}>
                    {leaderboard[0].rank_name}
                  </span>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-smash-purple/30 shadow-[0_0_10px_rgba(122,34,224,0.2)] flex items-center justify-center bg-purple-50/50 text-smash-purple/70 font-bold text-sm">
                    {leaderboard[2].full_name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[10px] font-black text-smash-purple/60 uppercase mt-1">3rd</span>
                  <p className="text-xs font-bold text-secondary truncate max-w-[80px] text-center">{leaderboard[2].full_name}</p>
                  <p className="text-xs font-black text-smash-purple/70">{leaderboard[2].elo_score}</p>
                  <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded mt-1 scale-90 ${getRankBadgeClass(leaderboard[2].rank_name)}`}>
                    {leaderboard[2].rank_name}
                  </span>
                </div>
              </div>
            )}

            {/* Search Input */}
            <div className="mb-4 relative z-10">
              <input
                type="text"
                placeholder="Tìm tay vợt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-slate-800"
              />
            </div>

            {/* Scrollable list of players */}
            <div className="space-y-3 relative z-10 max-h-[350px] overflow-y-auto pr-1">
              {leaderboard.filter(u => u.full_name.toLowerCase().includes(searchQuery.toLowerCase())).map((user, index) => {
                // Find overall index from full leaderboard
                const overallIndex = leaderboard.findIndex(u => u.id === user.id);
                return (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-slate-100/30 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0
                        ${overallIndex === 0 ? 'bg-purple-100 text-smash-purple' : 
                          overallIndex === 1 ? 'bg-purple-50 text-smash-purple/80' : 
                          overallIndex === 2 ? 'bg-purple-50/50 text-smash-purple/60' : 'bg-slate-100 text-slate-400'}`}
                      >
                        {overallIndex + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-secondary group-hover:text-primary transition-colors text-sm">{user.full_name}</p>
                          <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${getRankBadgeClass(user.rank_name)}`}>
                            {user.rank_name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">Tỷ lệ thắng: {user.win_rate.toFixed(1)}% ({user.total_matches} trận)</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-base text-secondary">{user.elo_score}</p>
                      <p className="text-[9px] uppercase tracking-wider text-slate-400">Elo</p>
                    </div>
                  </div>
                );
              })}

              {leaderboard.filter(u => u.full_name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-4">Không tìm thấy thành viên nào phù hợp.</p>
              )}
            </div>
          </div>
        </div>

      </section>
      
      <footer className="bg-slate-900 text-slate-400 py-12 text-center">
        <p>© 2026 SmashTeam Badminton Club. All rights reserved.</p>
      </footer>
    </main>
  );
}
