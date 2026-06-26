"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  Trophy, Flame, Calendar, Check, X, Sparkles, 
  Camera, Paintbrush, Shield, CalendarDays, Activity, 
  MapPin, Clock, LogOut, Edit2, Home, Loader2
} from "lucide-react";
import { API_URL } from "@/app/config";

export default function ProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [playerData, setPlayerData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingRsvp, setUpdatingRsvp] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [updatingNickname, setUpdatingNickname] = useState(false);

  // Fetch dữ liệu từ API /api/profile/me
  const fetchProfileData = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/profile/me?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("user_role");
        localStorage.removeItem("user");
        router.push("/login");
        return;
      }

      if (!res.ok) {
        throw new Error("Không thể tải thông tin trang cá nhân.");
      }

      const data = await res.json();
      setPlayerData(data);
      setNicknameInput(data.player.nickname || "");
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user");
    router.push("/login");
  };

  // Cập nhật RSVP
  const handleRsvp = async (sessionId: string, status: "going" | "absent") => {
    if (updatingRsvp) return;
    setUpdatingRsvp(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/profile/rsvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ session_id: sessionId, status })
      });

      if (!res.ok) {
        throw new Error("Lỗi khi cập nhật RSVP.");
      }

      // Re-fetch data
      await fetchProfileData();
    } catch (err: any) {
      alert(err.message || "Đã xảy ra lỗi khi RSVP.");
    } finally {
      setUpdatingRsvp(false);
    }
  };

  // Cập nhật Nickname
  const handleSaveNickname = async () => {
    if (updatingNickname) return;
    setUpdatingNickname(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/profile/nickname`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nickname: nicknameInput.trim() })
      });

      if (!res.ok) {
        throw new Error("Lỗi khi cập nhật biệt danh.");
      }

      setIsEditingNickname(false);
      await fetchProfileData();
    } catch (err: any) {
      alert(err.message || "Đã xảy ra lỗi khi cập nhật biệt danh.");
    } finally {
      setUpdatingNickname(false);
    }
  };

  // Cấu hình Rank dựa trên ELO cao nhất
  const getRankConfig = (elo: number) => {
    if (elo >= 1800) return {
      name: "Challenger",
      borderClass: "bg-gradient-to-r from-red-500 via-purple-600 to-red-500 p-[3px]",
      glowClass: "shadow-[0_0_25px_rgba(239,68,68,0.6)]",
      badgeClass: "bg-gradient-to-r from-red-500 to-purple-600 text-white border border-red-400",
      nextElo: 2500,
      prevElo: 1800
    };
    if (elo >= 1600) return {
      name: "Diamond",
      borderClass: "border-4 border-blue-500",
      glowClass: "shadow-[0_0_20px_rgba(59,130,246,0.5)]",
      badgeClass: "bg-blue-600/30 text-blue-400 border border-blue-500/50",
      nextElo: 1800,
      prevElo: 1600
    };
    if (elo >= 1400) return {
      name: "Platinum",
      borderClass: "border-4 border-teal-400",
      glowClass: "shadow-[0_0_15px_rgba(45,212,191,0.4)]",
      badgeClass: "bg-teal-600/30 text-teal-400 border border-teal-500/50",
      nextElo: 1600,
      prevElo: 1400
    };
    if (elo >= 1200) return {
      name: "Gold",
      borderClass: "border-4 border-amber-400",
      glowClass: "shadow-[0_0_15px_rgba(251,191,36,0.4)]",
      badgeClass: "bg-amber-600/30 text-amber-400 border border-amber-500/50",
      nextElo: 1400,
      prevElo: 1200
    };
    if (elo >= 1100) return {
      name: "Silver",
      borderClass: "border-4 border-slate-300",
      glowClass: "shadow-[0_0_10px_rgba(203,213,225,0.3)]",
      badgeClass: "bg-slate-600/30 text-slate-300 border border-slate-400/50",
      nextElo: 1200,
      prevElo: 1100
    };
    return {
      name: "Bronze",
      borderClass: "border-4 border-amber-800",
      glowClass: "shadow-[0_0_10px_rgba(146,64,14,0.2)]",
      badgeClass: "bg-amber-800/30 text-amber-600 border border-amber-800/50",
      nextElo: 1100,
      prevElo: 1000
    };
  };

  // Loading FOUC Prevention Screen (Tím Neon)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-smash-dark flex flex-col items-center justify-center text-white">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-smash-violet/20 border-t-smash-violet animate-spin shadow-[0_0_20px_rgba(157,78,221,0.5)]"></div>
          <div className="absolute font-black text-xs text-smash-violet uppercase tracking-widest animate-pulse">Smash</div>
        </div>
        <p className="mt-6 text-slate-400 text-sm font-bold tracking-widest animate-pulse">ĐANG TẢI THẺ NGƯỜI CHƠI ELO...</p>
      </div>
    );
  }

  if (error || !playerData) {
    return (
      <div className="min-h-screen bg-smash-dark flex flex-col items-center justify-center text-white p-6">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
          <X className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold mb-2">Đã xảy ra lỗi</h2>
        <p className="text-slate-400 text-sm text-center mb-6 max-w-sm">{error || "Không thể lấy thông tin."}</p>
        <button onClick={fetchProfileData} className="px-6 py-2.5 bg-primary text-white rounded-full font-bold hover:bg-primary-hover transition-all">
          Thử lại
        </button>
      </div>
    );
  }

  const { player, matches, upcomingSession, attendanceHistory } = playerData;
  const maxElo = Math.max(player.elo_singles, player.elo_doubles);
  const rank = getRankConfig(maxElo);

  // Tính % tiến trình lên rank
  const progressPercent = Math.min(
    100,
    Math.max(0, ((maxElo - rank.prevElo) / (rank.nextElo - rank.prevElo)) * 100)
  );

  // Phân tích kỹ năng đóng góp
  let softSkills: string[] = [];
  if (player.soft_skills) {
    try {
      softSkills = typeof player.soft_skills === "string" 
        ? JSON.parse(player.soft_skills) 
        : player.soft_skills;
    } catch (e) {
      softSkills = Array.isArray(player.soft_skills) ? player.soft_skills : [];
    }
  }

  // Map huy hiệu đóng góp
  const getBadgeIcon = (skill: string) => {
    const s = skill.toLowerCase();
    if (s.includes("chụp") || s.includes("ảnh") || s.includes("media") || s.includes("quay")) {
      return { icon: <Camera className="w-5 h-5" />, label: "Nhiếp ảnh gia", color: "from-cyan-500 to-blue-500" };
    }
    if (s.includes("thiết kế") || s.includes("design") || s.includes("cọ") || s.includes("vẽ")) {
      return { icon: <Paintbrush className="w-5 h-5" />, label: "Nhà thiết kế", color: "from-pink-500 to-purple-500" };
    }
    if (s.includes("tổ chức") || s.includes("sự kiện") || s.includes("event")) {
      return { icon: <CalendarDays className="w-5 h-5" />, label: "Tổ chức sự kiện", color: "from-amber-500 to-orange-500" };
    }
    if (s.includes("code") || s.includes("lập trình") || s.includes("dev") || s.includes("web")) {
      return { icon: <Shield className="w-5 h-5" />, label: "Lập trình viên", color: "from-emerald-500 to-teal-500" };
    }
    return { icon: <Activity className="w-5 h-5" />, label: skill, color: "from-purple-500 to-smash-violet" };
  };

  return (
    <main className="min-h-screen bg-smash-dark text-slate-100 flex flex-col">
      {/* Navigation Minimalist */}
      <nav className="w-full bg-slate-950/60 backdrop-blur-md border-b border-purple-950/40 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-smash-purple/30">
                <Image src="/logo.png" alt="Logo" fill className="object-cover" />
              </div>
              <span className="font-extrabold text-lg text-white tracking-wider">SMASH TEAM</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold">
                <Home className="w-4 h-4" /> Trang chủ
              </button>
            </Link>
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all text-sm font-bold border border-rose-500/20"
            >
              <LogOut className="w-4 h-4" /> Đăng xuất
            </button>
          </div>
        </div>
      </nav>

      {/* Main Grid Content */}
      <div className="max-w-7xl w-full mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow">
        
        {/* LEFT COLUMN: Player Card & Badges */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* PLAYER CARD */}
          <div className={`relative overflow-hidden rounded-3xl bg-slate-950/80 backdrop-blur-md border border-purple-950/40 p-6 ${rank.glowClass} flex flex-col`}>
            {/* Background glowing gradient overlay */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-smash-purple/10 rounded-bl-full -z-0 pointer-events-none blur-xl"></div>
            
            {/* Rank badge top header */}
            <div className="flex justify-between items-start relative z-10 mb-6">
              <span className={`text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full ${rank.badgeClass}`}>
                RANK {rank.name}
              </span>
              
              {/* Streak Badge if >= 3 */}
              {Math.max(player.streak_singles, player.streak_doubles) >= 3 && (
                <div className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-black animate-pulse">
                  <Flame className="w-4 h-4 fill-amber-400" />
                  <span>+{Math.max(player.streak_singles, player.streak_doubles)} STREAK</span>
                </div>
              )}
            </div>

            {/* Avatar & Player Name */}
            <div className="flex flex-col items-center text-center relative z-10 mb-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center bg-purple-950/40 text-smash-violet font-black text-3xl mb-4 border-2 border-smash-violet shadow-[0_0_15px_rgba(157,78,221,0.3)]`}>
                {player.full_name.substring(0, 2).toUpperCase()}
              </div>
              
              <h2 className="text-2xl font-black text-white tracking-wide">{player.full_name}</h2>
              
              {/* Nickname Editor */}
              <div className="flex items-center gap-2 mt-2 text-slate-400">
                {isEditingNickname ? (
                  <div className="flex items-center gap-1 bg-slate-900 border border-purple-950/60 rounded-lg px-2 py-1">
                    <input
                      type="text"
                      value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)}
                      className="bg-transparent text-xs text-white outline-none border-none max-w-[120px]"
                      placeholder="Biệt danh..."
                      maxLength={15}
                    />
                    <button onClick={handleSaveNickname} disabled={updatingNickname} className="text-emerald-400 hover:text-emerald-300">
                      {updatingNickname ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setIsEditingNickname(false)} className="text-rose-400 hover:text-rose-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 group">
                    <span className="text-sm font-medium italic">
                      {player.nickname ? `"${player.nickname}"` : "Chưa đặt biệt danh"}
                    </span>
                    <button 
                      onClick={() => setIsEditingNickname(true)} 
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-smash-violet transition-opacity"
                      title="Sửa biệt danh"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Elo Scores Table */}
            <div className="grid grid-cols-2 gap-4 relative z-10 border-t border-purple-950/40 pt-6 mb-6">
              <div className="text-center p-3 rounded-2xl bg-slate-900/40 border border-purple-950/20">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Đấu Đơn</span>
                <p className="text-2xl font-black text-smash-violet mt-1">{player.elo_singles}</p>
                <p className="text-[9px] text-slate-500 mt-1">Win rate: {parseFloat(player.win_rate_singles).toFixed(1)}%</p>
                <p className="text-[9px] text-slate-600">Trận: {player.matches_singles} ({player.win_singles}T - {player.loss_singles}B)</p>
              </div>

              <div className="text-center p-3 rounded-2xl bg-slate-900/40 border border-purple-950/20">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Đấu Đôi</span>
                <p className="text-2xl font-black text-smash-violet mt-1">{player.elo_doubles}</p>
                <p className="text-[9px] text-slate-500 mt-1">Win rate: {parseFloat(player.win_rate_doubles).toFixed(1)}%</p>
                <p className="text-[9px] text-slate-600">Trận: {player.matches_doubles} ({player.win_doubles}T - {player.loss_doubles}B)</p>
              </div>
            </div>

            {/* Rank Progress Bar */}
            <div className="relative z-10">
              <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1.5 uppercase">
                <span>Rank ELO {maxElo}</span>
                <span>Mục tiêu {rank.nextElo}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-purple-950/40 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-smash-purple to-smash-violet rounded-full shadow-[0_0_10px_rgba(157,78,221,0.5)] transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <p className="text-[9px] text-slate-500 text-right mt-1.5">
                Cần thêm {rank.nextElo - maxElo} điểm để nâng cấp Rank
              </p>
            </div>
          </div>

          {/* BADGES WIDGET */}
          <div className="rounded-3xl bg-slate-950/80 backdrop-blur-md border border-purple-950/40 p-6 shadow-sm">
            <h3 className="font-extrabold text-white text-lg mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-smash-violet" /> Huy hiệu Đóng góp
            </h3>
            
            {softSkills.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {softSkills.map((skill, index) => {
                  const b = getBadgeIcon(skill);
                  return (
                    <div key={index} className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-900/50 border border-purple-950/20 text-center hover:border-smash-violet/50 transition-colors group">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${b.color} text-white flex items-center justify-center mb-2 shadow-lg group-hover:scale-110 transition-transform`}>
                        {b.icon}
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{b.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-900/30 border border-dashed border-purple-950/30 text-center">
                <div className="w-10 h-10 rounded-full bg-purple-950/50 text-smash-violet flex items-center justify-center mb-2">
                  <Trophy className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Thành viên tích cực</span>
                <p className="text-[9px] text-slate-500 mt-1 max-w-[150px]">Hãy tiếp tục tham gia tích cực để tích lũy huy hiệu đóng góp nhé!</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: RSVP & Match History */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* RSVP WIDGET */}
          <div className="rounded-3xl bg-slate-950/80 backdrop-blur-md border border-purple-950/40 p-6 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-smash-purple/5 rounded-bl-full pointer-events-none"></div>
            
            <h3 className="font-extrabold text-white text-lg mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-smash-violet" /> Đăng ký Lịch tập (RSVP)
            </h3>
            
            {upcomingSession ? (
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-purple-950/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-smash-purple/20 text-smash-violet border border-smash-purple/30">
                    Sắp diễn ra
                  </span>
                  <h4 className="text-lg font-bold text-white tracking-wide">{upcomingSession.title}</h4>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-smash-violet" /> 
                      {new Date(upcomingSession.date_time).toLocaleDateString("vi-VN", {
                        weekday: "long",
                        day: "numeric",
                        month: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-smash-violet" /> 
                      {upcomingSession.location}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleRsvp(upcomingSession.id, "going")}
                    disabled={updatingRsvp}
                    className={`px-5 py-2.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                      upcomingSession.rsvp_status === "going"
                        ? "bg-smash-purple text-white shadow-[0_0_15px_rgba(122,34,224,0.6)] border border-smash-violet/50"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-purple-950/50"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" /> Tham gia
                  </button>
                  <button
                    onClick={() => handleRsvp(upcomingSession.id, "absent")}
                    disabled={updatingRsvp}
                    className={`px-5 py-2.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                      upcomingSession.rsvp_status === "absent"
                        ? "bg-slate-700 text-white"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-400 border border-purple-950/50"
                    }`}
                  >
                    <X className="w-3.5 h-3.5" /> Bận
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-900/30 border border-dashed border-purple-950/20 text-center text-slate-400 text-sm">
                Hiện chưa có lịch tập mới nào được sắp xếp sắp tới.
              </div>
            )}
          </div>

          {/* MATCH HISTORY WIDGET */}
          <div className="rounded-3xl bg-slate-950/80 backdrop-blur-md border border-purple-950/40 p-6 shadow-sm">
            <h3 className="font-extrabold text-white text-lg mb-5 flex items-center gap-2">
              <Activity className="w-5 h-5 text-smash-violet" /> Lịch sử Đấu gần đây (5 trận)
            </h3>
            
            {matches.length > 0 ? (
              <div className="space-y-4">
                {matches.map((m: any) => (
                  <div key={m.id} className="p-4 rounded-2xl bg-slate-900/40 border border-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-smash-purple/20 transition-all">
                    
                    {/* Format & Opponent */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                          m.isDoubles 
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                            : "bg-purple-500/10 text-smash-violet border border-smash-purple/20"
                        }`}>
                          {m.isDoubles ? "Đôi" : "Đơn"}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(m.created_at).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white">
                        đối thủ: <span className="text-slate-300">{m.opponent}</span>
                      </p>
                    </div>

                    {/* Scores & Result */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-10">
                      {/* Score display */}
                      <span className="font-extrabold text-base text-slate-300 tracking-wider font-mono">
                        {m.score}
                      </span>
                      
                      {/* Win/Loss Pill */}
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-center min-w-[70px] ${
                        m.won
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]"
                      }`}>
                        {m.won ? "Thắng" : "Thua"}
                      </span>

                      {/* ELO Exchanged */}
                      <span className={`text-sm font-black tracking-wide min-w-[65px] text-right ${
                        m.eloChange >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {m.eloChange >= 0 ? `+${m.eloChange}` : m.eloChange} ELO
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Beautiful Empty State with encouragement card */
              <div className="flex flex-col items-center justify-center p-10 rounded-2xl bg-slate-900/30 border border-dashed border-purple-950/20 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-950/50 text-smash-violet flex items-center justify-center mb-4 border border-purple-950/50 shadow-inner animate-pulse">
                  <Trophy className="w-6 h-6" />
                </div>
                <h4 className="text-white font-bold text-base mb-1.5">Bạn chưa tham gia trận đấu xếp hạng nào</h4>
                <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                  Hãy đăng ký tham gia giao đấu xếp hạng (Đơn/Đôi) tại câu lạc bộ để kích hoạt thẻ người chơi ELO của bạn và ghi danh trên bảng xếp hạng của SMASH TEAM!
                </p>
                <Link href="/">
                  <button className="flex items-center gap-1.5 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-md active:scale-95 transition-all">
                    Xem Bảng Xếp Hạng CLB <Clock className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
