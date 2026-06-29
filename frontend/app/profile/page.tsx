"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  Trophy, Flame, Calendar, Check, X, Sparkles, 
  Camera, Paintbrush, Shield, CalendarDays, Activity, 
  MapPin, Clock, LogOut, Edit2, Home, Loader2, Settings
} from "lucide-react";
import { API_URL } from "@/app/config";
import AvatarWithFrame from "@/app/components/AvatarWithFrame";

export default function ProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [playerData, setPlayerData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingRsvp, setUpdatingRsvp] = useState(false);

  // Gamification states
  const [gamProfile, setGamProfile] = useState<any>(null);
  const [quests, setQuests] = useState<any[]>([]);
  const [passRewards, setPassRewards] = useState<any[]>([]);
  const [claimedPassLevels, setClaimedPassLevels] = useState<number[]>([]);
  const [isPremiumPass, setIsPremiumPass] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [activeGamTab, setActiveGamTab] = useState<"quests" | "smashpass" | "inventory" | "matches">("quests");
  const [matchFilter, setMatchFilter] = useState<"all" | "month" | "week">("all");
  
  const [claimingQuestId, setClaimingQuestId] = useState<number | null>(null);
  const [claimingPassLevel, setClaimingPassLevel] = useState<number | null>(null);
  const [equippingItemId, setEquippingItemId] = useState<number | null>(null);
  const [unlockingPremium, setUnlockingPremium] = useState(false);

  // Settings Modal states
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"avatar" | "profile" | "password">("avatar");
  
  // Profile Form states
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [academicInfo, setAcademicInfo] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Avatar Upload states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Change states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Toast Notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Trigger Toast helper
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

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
      
      // Khởi tạo form fields
      setFullName(data.player.full_name || "");
      setNickname(data.player.nickname || "");
      setAcademicInfo(data.player.academic_info || "");
      
      // Parse soft skills
      let skills: string[] = [];
      if (data.player.soft_skills) {
        try {
          skills = typeof data.player.soft_skills === "string"
            ? JSON.parse(data.player.soft_skills)
            : data.player.soft_skills;
        } catch (e) {
          skills = Array.isArray(data.player.soft_skills) ? data.player.soft_skills : [];
        }
      }
      setSelectedSkills(skills);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGamificationData = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch Profile
      const profileRes = await fetch(`${API_URL}/api/gamification/profile`, { headers });
      if (profileRes.ok) {
        const data = await profileRes.json();
        setGamProfile(data);
        if (data.streak_notification) {
          showToast(data.streak_notification, "success");
        }
      }

      // 2. Fetch Quests
      const questsRes = await fetch(`${API_URL}/api/gamification/quests`, { headers });
      if (questsRes.ok) setQuests(await questsRes.json());

      // 3. Fetch SmashPass
      const passRes = await fetch(`${API_URL}/api/gamification/smash-pass`, { headers });
      if (passRes.ok) {
        const data = await passRes.json();
        setPassRewards(data.rewards || []);
        setClaimedPassLevels(data.claimed_levels || []);
        setIsPremiumPass(data.is_premium_unlocked || false);
      }

      // 4. Fetch Inventory
      const invRes = await fetch(`${API_URL}/api/gamification/inventory`, { headers });
      if (invRes.ok) setInventory(await invRes.json());

    } catch (e) {
      console.error("Error fetching gamification data:", e);
    }
  };

  // Gamification Claim Handlers
  const handleClaimQuest = async (questId: number) => {
    setClaimingQuestId(questId);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/gamification/quests/${questId}/claim`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Nhận thưởng thành công!");
        if (data.level_up?.leveledUp) {
          showToast(`LÊN CẤP! Bạn đạt Cấp độ ${data.level_up.currentLevel}!`, "success");
        }
        await fetchGamificationData();
        await fetchProfileData();
      } else {
        showToast(data.error || "Lỗi khi nhận thưởng.", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối.", "error");
    } finally {
      setClaimingQuestId(null);
    }
  };

  const handleClaimPass = async (level: number) => {
    setClaimingPassLevel(level);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/gamification/smash-pass/claim/${level}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Nhận quà SmashPass thành công!");
        await fetchGamificationData();
        await fetchProfileData();
      } else {
        showToast(data.error || "Lỗi khi nhận quà.", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối.", "error");
    } finally {
      setClaimingPassLevel(null);
    }
  };

  const handleUnlockPremium = async () => {
    if (!confirm("Kích hoạt Premium Pass với giá 200 Smash Coins?")) return;
    setUnlockingPremium(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/gamification/smash-pass/unlock-premium`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Mở khóa Premium thành công!");
        await fetchGamificationData();
      } else {
        showToast(data.error || "Lỗi mở khóa Premium.", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối.", "error");
    } finally {
      setUnlockingPremium(false);
    }
  };

  const handleEquipItem = async (itemId: number, isEquipped: boolean) => {
    setEquippingItemId(itemId);
    try {
      const token = localStorage.getItem("admin_token");
      const url = `${API_URL}/api/gamification/inventory/${itemId}/${isEquipped ? 'unequip' : 'equip'}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Thao tác thành công!");
        await fetchGamificationData();
        await fetchProfileData();
      } else {
        showToast(data.error || "Lỗi khi trang bị.", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối.", "error");
    } finally {
      setEquippingItemId(null);
    }
  };

  useEffect(() => {
    fetchProfileData();
    fetchGamificationData();
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

      showToast("Cập nhật lịch tập RSVP thành công!");
      await fetchProfileData();
      await fetchGamificationData();
    } catch (err: any) {
      showToast(err.message || "Lỗi RSVP.", "error");
    } finally {
      setUpdatingRsvp(false);
    }
  };

  // Sửa Hồ sơ (Tab 2)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProfile) return;
    setIsSavingProfile(true);

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/profile/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: fullName,
          nickname: nickname,
          academic_info: academicInfo,
          soft_skills: selectedSkills
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi khi cập nhật thông tin.");
      }

      showToast("Cập nhật thông tin hồ sơ thành công!");
      await fetchProfileData();
      
      // Đóng modal sau 1.5s
      setTimeout(() => {
        setIsSettingsModalOpen(false);
      }, 1500);
    } catch (err: any) {
      showToast(err.message || "Lỗi cập nhật hồ sơ.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Đổi Avatar (Tab 1)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      
      // Tạo preview url
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || isUploadingAvatar) return;
    setIsUploadingAvatar(true);

    try {
      const token = localStorage.getItem("admin_token");
      const formData = new FormData();
      formData.append("avatar", avatarFile);

      const res = await fetch(`${API_URL}/api/profile/upload-avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi khi upload ảnh.");
      }

      showToast("Cập nhật ảnh đại diện thành công!");
      setAvatarFile(null);
      setAvatarPreview(null);
      await fetchProfileData();

      setTimeout(() => {
        setIsSettingsModalOpen(false);
      }, 1500);
    } catch (err: any) {
      showToast(err.message || "Lỗi tải ảnh lên.", "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Đổi mật khẩu (Tab 3)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChangingPassword) return;

    // Check validation trước khi submit
    if (newPassword.length < 6 || newPassword !== confirmPassword) {
      return;
    }

    setIsChangingPassword(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/profile/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi khi đổi mật khẩu.");
      }

      showToast("Đổi mật khẩu tài khoản thành công!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await fetchProfileData();

      setTimeout(() => {
        setIsSettingsModalOpen(false);
      }, 1500);
    } catch (err: any) {
      showToast(err.message || "Lỗi đổi mật khẩu.", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Checkbox kỹ năng đóng góp
  const handleSkillCheckboxChange = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
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

  // Loading Screen (FOUC Prevention)
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
    if (s.includes("code") || s.includes("lập trình") || s.includes("dev") || s.includes("web") || s.includes("phát triển")) {
      return { icon: <Shield className="w-5 h-5" />, label: "Lập trình viên", color: "from-emerald-500 to-teal-500" };
    }
    return { icon: <Activity className="w-5 h-5" />, label: skill, color: "from-purple-500 to-smash-violet" };
  };

  // Real-time password validations
  const isPasswordLengthValid = newPassword.length >= 6;
  const isPasswordMatchValid = newPassword === confirmPassword;

  return (
    <main className="min-h-screen bg-smash-dark text-slate-100 flex flex-col relative">
      
      {/* Toast Notification Popup */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg border backdrop-blur-md transition-all duration-300 ${
          toast.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
            : "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
        }`}>
          {toast.type === "success" ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />}
          <span className="text-xs font-bold tracking-wide uppercase">{toast.message}</span>
        </div>
      )}

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
            
            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/60 border border-purple-950/30 text-slate-400 hover:text-smash-violet hover:border-smash-violet/50 hover:scale-115 active:scale-95 transition-all z-20 cursor-pointer shadow-sm"
              title="Thiết lập tài khoản"
            >
              <Settings className="w-4 h-4" />
            </button>

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
              <AvatarWithFrame 
                avatarUrl={player.avatar_url} 
                frameStyle={gamProfile?.selected_avatar_frame || player.selected_avatar_frame} 
                sizeClass="w-24 h-24 mb-4" 
                alt={player.full_name}
              />
              
              <h2 className="text-2xl font-black text-white tracking-wide">{player.full_name}</h2>
              {(player.selected_title || gamProfile?.selected_title) && (
                <div className="text-[10px] font-black text-amber-400 mt-1 uppercase tracking-widest bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/20">
                  👑 {player.selected_title || gamProfile?.selected_title}
                </div>
              )}
              
              <div className="flex items-center gap-1.5 mt-2 text-slate-400">
                <span className="text-sm font-medium italic">
                  {player.nickname ? `"${player.nickname}"` : "Chưa đặt biệt danh"}
                </span>
              </div>

              {/* Stats badges inside card */}
              <div className="flex items-center gap-3.5 mt-3.5 bg-slate-900/60 px-4 py-2 rounded-full border border-purple-950/30 text-xs">
                <div className="flex items-center gap-1 font-bold text-amber-500">
                  <span className="text-base select-none">🪙</span> {gamProfile?.smash_coins ?? 0} xu
                </div>
                <div className="w-px h-3.5 bg-slate-800" />
                <div className="flex items-center gap-1 font-bold text-orange-500">
                  <Flame className="w-4 h-4 text-orange-500 animate-pulse" /> {gamProfile?.current_streak ?? 0} ngày
                </div>
                <div className="w-px h-3.5 bg-slate-800" />
                <div className="flex items-center gap-1 font-bold text-indigo-400">
                  🛡️ {gamProfile?.streak_shields ?? 0} khiên
                </div>
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

            {/* Level & Rank Progress */}
            <div className="relative z-10 space-y-4">
              {/* Level XP Bar */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1.5 uppercase">
                  <span>Cấp độ {gamProfile?.level ?? 1}</span>
                  <span>{gamProfile?.xp ?? 0} / {gamProfile?.xp_needed ?? 80} XP</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-purple-950/40 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${gamProfile ? Math.min(100, (gamProfile.xp / gamProfile.xp_needed) * 100) : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Rank ELO Bar */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1.5 uppercase">
                  <span>Rank ELO {maxElo}</span>
                  <span>Mục tiêu {rank.nextElo}</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-purple-950/40 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-smash-purple to-smash-violet rounded-full shadow-[0_0_10px_rgba(157,78,221,0.5)] transition-all duration-1000"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1.5 text-[9px] text-slate-500">
                  <span>Học vấn: {player.academic_info || "Chưa đặt"}</span>
                  <span>Cần thêm {Math.max(0, rank.nextElo - maxElo)} ELO</span>
                </div>
              </div>
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
                <p className="text-[9px] text-slate-500 mt-1 max-w-[150px]">Hãy tích cực tham gia CLB để nhận các huy hiệu đóng góp nhé!</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: RSVP & Match History */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* RSVP WIDGET */}
          {false && (
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
                    className={`px-5 py-2.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
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
                    className={`px-5 py-2.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ${
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
          )}

          {/* SMASHPASS GAMIFICATION PORTAL */}
          <div className="rounded-3xl bg-slate-950/80 backdrop-blur-md border border-purple-950/40 p-6 shadow-sm">
            {/* Tab selection */}
            <div className="flex flex-wrap gap-2 border-b border-purple-950/30 pb-3 mb-6">
              {[
                { id: "quests", label: "Nhiệm vụ", icon: Sparkles },
                { id: "smashpass", label: "SmashPass", icon: Trophy },
                { id: "inventory", label: "Kho đồ", icon: Shield },
                { id: "matches", label: "Lịch sử đấu", icon: Activity }
              ].map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveGamTab(t.id as any)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                      activeGamTab === t.id
                        ? "bg-smash-purple border-smash-violet text-white shadow-[0_0_10px_rgba(122,34,224,0.4)]"
                        : "bg-slate-900/60 border-purple-950/40 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT: QUESTS */}
            {activeGamTab === "quests" && (() => {
              const sortedQuests = [...quests].sort((a: any, b: any) => {
                // 1. Đã nhận quà cho xuống cuối cùng
                if (a.is_claimed && !b.is_claimed) return 1;
                if (!a.is_claimed && b.is_claimed) return -1;

                // Nếu cả hai đều chưa nhận quà (hoặc cả hai đã nhận, nhưng quan trọng nhất là chưa nhận)
                if (!a.is_claimed && !b.is_claimed) {
                  const aDone = a.current_count >= a.target_count;
                  const bDone = b.current_count >= b.target_count;
                  // Đã hoàn thành (chưa nhận quà) cho lên đầu
                  if (aDone && !bDone) return -1;
                  if (!aDone && bDone) return 1;
                }

                // 2. Sắp xếp theo chu kỳ ngắn hạn lên trên (daily > weekly > monthly > seasonal)
                const typeWeight: Record<string, number> = {
                  daily: 1,
                  weekly: 2,
                  monthly: 3,
                  seasonal: 4
                };
                const wA = typeWeight[a.quest_type] || 5;
                const wB = typeWeight[b.quest_type] || 5;
                return wA - wB;
              });

              return (
                <div className="space-y-4">
                  {sortedQuests.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">Không có nhiệm vụ khả dụng.</div>
                  ) : (
                    sortedQuests.map((q: any) => {
                      const isDone = q.current_count >= q.target_count;
                      const pct = Math.min(100, (q.current_count / q.target_count) * 100);
                      
                      return (
                        <div key={q.id} className="p-4 rounded-2xl bg-slate-900/40 border border-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-purple-900/30 transition-all">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                                q.quest_type === 'daily'
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : q.quest_type === 'weekly'
                                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                  : q.quest_type === 'monthly'
                                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}>
                                {q.quest_type === 'daily' ? 'Hàng ngày' : q.quest_type === 'weekly' ? 'Hàng tuần' : q.quest_type === 'monthly' ? 'Hàng tháng' : 'Mùa giải'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Phần thưởng: <span className="text-emerald-400">+{q.xp_reward} XP</span> • <span className="text-amber-400">+{q.coin_reward} Xu</span>
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white tracking-wide">{q.title}</h4>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-purple-950/30">
                                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-mono font-bold text-slate-400 shrink-0">{q.current_count}/{q.target_count}</span>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center justify-end">
                            {q.is_claimed ? (
                              <span className="text-xs font-bold text-slate-500 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">Đã nhận</span>
                            ) : isDone ? (
                              <button
                                onClick={() => handleClaimQuest(q.id)}
                                disabled={claimingQuestId === q.id}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg shadow-lg shadow-emerald-600/30 cursor-pointer animate-pulse active:scale-95 transition-transform"
                              >
                                {claimingQuestId === q.id ? "Đang nhận..." : "Nhận Quà"}
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-purple-950/30">Đang làm</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}

            {/* TAB CONTENT: SMASHPASS */}
            {activeGamTab === "smashpass" && (
              <div className="space-y-6">
                {/* Premium activation banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="font-extrabold text-sm text-white tracking-wide flex items-center gap-1.5">
                      🏆 SmashPass Mùa 1: Khởi Đầu Hoàng Gia
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">Mở khóa quà Premium với khung viền lấp lánh và danh hiệu độc quyền.</p>
                  </div>
                  <div>
                    {isPremiumPass ? (
                      <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-3.5 py-1.5 rounded-full border border-amber-400/20">
                        💎 ĐÃ KÍCH HOẠT PREMIUM
                      </span>
                    ) : (
                      <button
                        onClick={handleUnlockPremium}
                        disabled={unlockingPremium}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 disabled:opacity-50 text-slate-950 font-black text-xs rounded-full shadow-lg shadow-amber-500/20 active:scale-95 transition-transform cursor-pointer flex items-center gap-1"
                      >
                        🪙 200 Xu: Lên Premium
                      </button>
                    )}
                  </div>
                </div>

                {/* Rewards List */}
                <div className="space-y-3">
                  {passRewards.map((item: any) => {
                    const isClaimed = claimedPassLevels.includes(item.level_required);
                    const isLevelReached = (gamProfile?.level ?? 1) >= item.level_required;
                    const isLocked = item.is_premium && !isPremiumPass;
                    const canClaim = isLevelReached && !isClaimed && !isLocked;

                    return (
                      <div key={item.id} className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                        isClaimed 
                          ? "bg-slate-900/20 border-purple-950/10 opacity-60" 
                          : isLevelReached 
                          ? "bg-purple-950/10 border-smash-purple/30" 
                          : "bg-slate-900/40 border-purple-950/20"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 border-2 ${
                            isLevelReached
                              ? "bg-smash-purple border-smash-violet text-white shadow-[0_0_8px_rgba(157,78,221,0.5)]"
                              : "bg-slate-950 border-purple-950/40 text-slate-500"
                          }`}>
                            Lvl {item.level_required}
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-white flex items-center gap-1.5">
                              {item.reward_name}
                              {item.is_premium && (
                                <span className="text-[9px] bg-amber-400/10 text-amber-400 border border-amber-400/20 px-1.5 py-0.5 rounded font-black uppercase">Premium</span>
                              )}
                            </h5>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Loại: <span className="text-slate-300 font-medium">{item.reward_type === 'avatar_frame' ? 'Khung viền' : item.reward_type === 'title' ? 'Danh hiệu' : item.reward_type === 'coins' ? 'Xu' : 'Vật phẩm'}</span>
                            </p>
                          </div>
                        </div>

                        <div>
                          {isClaimed ? (
                            <span className="text-xs font-bold text-slate-500 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">Đã nhận</span>
                          ) : canClaim ? (
                            <button
                              onClick={() => handleClaimPass(item.level_required)}
                              disabled={claimingPassLevel === item.level_required}
                              className="px-4 py-1.5 bg-gradient-to-r from-smash-purple to-smash-violet hover:from-smash-violet hover:to-smash-purple text-white text-xs font-black rounded-lg shadow-lg active:scale-95 transition-transform cursor-pointer"
                            >
                              {claimingPassLevel === item.level_required ? "Đang nhận..." : "Nhận quà"}
                            </button>
                          ) : isLocked ? (
                            <span className="text-xs font-bold text-amber-500/70 bg-amber-950/20 px-3 py-1.5 rounded-lg border border-amber-500/10">Khóa Premium</span>
                          ) : (
                            <span className="text-xs font-bold text-slate-500 bg-slate-900 px-3 py-1.5 rounded-lg border border-purple-950/10">Lvl {item.level_required}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT: INVENTORY */}
            {activeGamTab === "inventory" && (
              <div className="space-y-4">
                {inventory.length === 0 ? (
                  <div className="text-center py-10 rounded-2xl bg-slate-900/20 border border-dashed border-purple-950/20">
                    <div className="w-12 h-12 rounded-full bg-purple-950/40 text-smash-violet flex items-center justify-center mx-auto mb-3">
                      <Shield className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-400">Kho đồ trống</span>
                    <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">Tích cực thăng cấp và làm nhiệm vụ SmashPass để mở khóa nhiều vật phẩm độc quyền nhé!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {inventory.map((item: any) => {
                      const isEquipped = item.is_equipped;
                      const canEquip = ['avatar_frame', 'title'].includes(item.item_type);
                      
                      return (
                        <div key={item.id} className={`p-4 rounded-2xl bg-slate-900/40 border transition-all flex flex-col justify-between gap-3 ${
                          isEquipped ? "border-smash-purple shadow-[0_0_10px_rgba(157,78,221,0.2)]" : "border-purple-950/20 hover:border-purple-900/30"
                        }`}>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                                item.item_type === 'avatar_frame'
                                  ? "bg-purple-500/10 text-smash-violet border border-smash-purple/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}>
                                {item.item_type === 'avatar_frame' ? 'Khung Viền' : 'Danh hiệu'}
                              </span>
                              {isEquipped && (
                                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                  ● Đang trang bị
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-white tracking-wide">{item.item_name}</h4>
                            <p className="text-[10px] text-slate-400 mt-1">Sở hữu lúc: {new Date(item.acquired_at).toLocaleDateString("vi-VN")}</p>
                          </div>
                          
                          {canEquip && (
                            <button
                              onClick={() => handleEquipItem(item.id, isEquipped)}
                              disabled={equippingItemId === item.id}
                              className={`w-full py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                isEquipped
                                  ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                                  : "bg-smash-purple hover:bg-smash-violet text-white shadow-md shadow-smash-purple/20 active:scale-95"
                              }`}
                            >
                              {equippingItemId === item.id 
                                ? "Đang xử lý..." 
                                : isEquipped 
                                ? "Tháo trang bị" 
                                : "Trang bị"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: MATCHES */}
            {activeGamTab === "matches" && (() => {
              const filteredMatches = matches.filter((m: any) => {
                if (matchFilter === "all") return true;
                const matchDate = new Date(m.created_at);
                const now = new Date();
                if (matchFilter === "month") {
                  return matchDate.getMonth() === now.getMonth() && matchDate.getFullYear() === now.getFullYear();
                }
                if (matchFilter === "week") {
                  // Check if within the last 7 days
                  const diffTime = Math.abs(now.getTime() - matchDate.getTime());
                  const diffDays = diffTime / (1000 * 60 * 60 * 24);
                  return diffDays <= 7;
                }
                return true;
              });

              const totalMatchesCount = filteredMatches.length;
              const wonMatchesCount = filteredMatches.filter((m: any) => m.won).length;
              const winRate = totalMatchesCount > 0 ? Math.round((wonMatchesCount / totalMatchesCount) * 100) : 0;

              return (
                <div className="space-y-6">
                  {/* Title & Dropdown Filter Row */}
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-xs uppercase font-black tracking-widest text-slate-400 flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-smash-violet" /> Hiệu số thi đấu
                    </h4>
                    
                    <select
                      value={matchFilter}
                      onChange={(e) => setMatchFilter(e.target.value as any)}
                      className="text-xs font-bold bg-slate-900 border border-purple-950/40 text-slate-300 rounded-xl px-3 py-1.5 focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                    >
                      <option value="all">Tất cả thời gian</option>
                      <option value="month">Trong tháng này</option>
                      <option value="week">Trong tuần này</option>
                    </select>
                  </div>

                  {/* 3 Prominent Stats Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Card 1: Total matches */}
                    <div className="bg-slate-900/40 border border-purple-950/20 rounded-2xl p-3 text-center flex flex-col justify-center items-center gap-1">
                      <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-widest text-slate-500">Tổng Trận</span>
                      <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">{totalMatchesCount}</span>
                    </div>

                    {/* Card 2: Winrate */}
                    <div className="bg-slate-900/40 border border-purple-950/20 rounded-2xl p-3 text-center flex flex-col justify-center items-center gap-1">
                      <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-widest text-slate-500">Tỷ Lệ Thắng</span>
                      <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {winRate}%
                      </span>
                    </div>

                    {/* Card 3: Wins / Losses */}
                    <div className="bg-slate-900/40 border border-purple-950/20 rounded-2xl p-3 text-center flex flex-col justify-center items-center gap-1">
                      <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-widest text-slate-500">Thắng / Bại</span>
                      <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-300">
                        <span className="text-emerald-400">{wonMatchesCount}</span>
                        <span className="text-slate-600 px-0.5">/</span>
                        <span className="text-rose-400">{totalMatchesCount - wonMatchesCount}</span>
                      </span>
                    </div>
                  </div>

                  {filteredMatches.length > 0 ? (
                    <div className="space-y-4">
                      {filteredMatches.map((m: any) => (
                        <div key={m.id} className="p-4 rounded-2xl bg-slate-900/40 border border-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-smash-purple/20 transition-all">
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

                          <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-10">
                            <span className="font-extrabold text-base text-slate-300 tracking-wider font-mono">
                              {m.score}
                            </span>
                            
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-center min-w-[70px] ${
                              m.won
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]"
                            }`}>
                              {m.won ? "Thắng" : "Thua"}
                            </span>

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
                    <div className="flex flex-col items-center justify-center p-10 rounded-2xl bg-slate-900/30 border border-dashed border-purple-950/20 text-center">
                      <div className="w-12 h-12 rounded-full bg-purple-950/50 text-smash-violet flex items-center justify-center mb-4 border border-purple-950/50 shadow-inner animate-pulse">
                        <Trophy className="w-6 h-6" />
                      </div>
                      <h4 className="text-white font-bold text-base mb-1.5">Không tìm thấy trận đấu nào</h4>
                      <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                        Không có trận đấu nào được ghi nhận trong khoảng thời gian đã chọn.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* SETTINGS / CONFIGURATION MODAL (Glassmorphism & Dark Theme) */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-950/95 border border-purple-900/50 rounded-3xl p-6 shadow-[0_0_40px_rgba(122,34,224,0.4)] relative flex flex-col max-h-[90vh] overflow-y-auto">
            
            {/* Close button */}
            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <h3 className="text-xl font-black text-white mb-6 tracking-wide flex items-center gap-2">
              <Settings className="w-5 h-5 text-smash-violet animate-spin-hover" /> Thiết lập Tài khoản
            </h3>

            {/* Tabs Selector */}
            <div className="flex border-b border-purple-950/60 mb-6 bg-slate-900/40 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("avatar")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "avatar"
                    ? "bg-smash-purple text-white shadow-md shadow-smash-purple/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Đổi Avatar
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "profile"
                    ? "bg-smash-purple text-white shadow-md shadow-smash-purple/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Hồ sơ cá nhân
              </button>
              <button
                onClick={() => setActiveTab("password")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "password"
                    ? "bg-smash-purple text-white shadow-md shadow-smash-purple/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Đổi mật khẩu
              </button>
            </div>

            {/* TAB CONTENTS */}
            {/* 1. Tab Avatar */}
            {activeTab === "avatar" && (
              <div className="space-y-6 flex flex-col items-center py-4">
                {/* Preview Circle */}
                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-smash-violet shadow-[0_0_20px_rgba(157,78,221,0.4)] relative bg-slate-900 flex items-center justify-center">
                  {avatarPreview ? (
                    <Image src={avatarPreview} alt="Avatar Preview" fill className="object-cover" />
                  ) : player.avatar_url ? (
                    <Image src={player.avatar_url} alt="Current Avatar" fill className="object-cover" unoptimized />
                  ) : (
                    <Trophy className="w-12 h-12 text-slate-700" />
                  )}
                </div>

                <div className="w-full text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-purple-950/50 rounded-xl font-bold text-xs transition-all cursor-pointer active:scale-95"
                  >
                    Chọn file ảnh đại diện
                  </button>
                  <p className="text-[10px] text-slate-500 mt-2">Định dạng hỗ trợ: JPG, PNG, WEBP. Tối đa 5MB.</p>
                </div>

                {avatarFile && (
                  <button
                    onClick={handleUploadAvatar}
                    disabled={isUploadingAvatar}
                    className="w-full py-3 bg-smash-purple text-white rounded-xl font-bold text-xs hover:bg-smash-violet transition-all shadow-md shadow-smash-purple/35 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải ảnh lên Cloudinary...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Xác nhận Cập nhật Avatar
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* 2. Tab Profile */}
            {activeTab === "profile" && (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Họ và tên</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-purple-950/60 rounded-xl text-white outline-none focus:border-smash-violet focus:ring-1 focus:ring-smash-violet transition-all text-xs"
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Biệt danh (Nickname)</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-purple-950/60 rounded-xl text-white outline-none focus:border-smash-violet focus:ring-1 focus:ring-smash-violet transition-all text-xs"
                    placeholder="Sấm sét, Vua cọ..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Trường học / Học vấn</label>
                  <input
                    type="text"
                    value={academicInfo}
                    onChange={(e) => setAcademicInfo(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-purple-950/60 rounded-xl text-white outline-none focus:border-smash-violet focus:ring-1 focus:ring-smash-violet transition-all text-xs"
                    placeholder="ĐH Bách Khoa, THPT A..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kỹ năng đóng góp cho CLB</label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { key: "Chụp ảnh/Media", label: "Media/Chụp ảnh" },
                      { key: "Thiết kế/Design", label: "Design/Thiết kế" },
                      { key: "Tổ chức sự kiện/Event", label: "Event/Tổ chức" },
                      { key: "Lập trình viên/Dev", label: "Lập trình viên/Dev" }
                    ].map(item => (
                      <label 
                        key={item.key} 
                        className={`flex items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                          selectedSkills.includes(item.key)
                            ? "bg-smash-purple/20 border-smash-violet text-white"
                            : "bg-slate-900/60 border-purple-950/30 text-slate-400 hover:border-purple-950/60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSkills.includes(item.key)}
                          onChange={() => handleSkillCheckboxChange(item.key)}
                          className="hidden"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full py-3 bg-smash-purple text-white rounded-xl font-bold text-xs hover:bg-smash-violet transition-all shadow-md shadow-smash-purple/35 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 mt-6"
                >
                  {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Lưu thay đổi hồ sơ
                </button>
              </form>
            )}

            {/* 3. Tab Password */}
            {activeTab === "password" && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mật khẩu cũ</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-purple-950/60 rounded-xl text-white outline-none focus:border-smash-violet focus:ring-1 focus:ring-smash-violet transition-all text-xs animate-none"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-900 border rounded-xl text-white outline-none focus:ring-1 focus:ring-smash-violet transition-all text-xs ${
                      newPassword ? (isPasswordLengthValid ? "border-emerald-500/50" : "border-rose-500/50") : "border-purple-950/60"
                    }`}
                    placeholder="••••••••"
                  />
                  {/* Real-time Indicator for new password */}
                  {newPassword && (
                    <p className={`text-[10px] font-bold mt-1.5 flex items-center gap-1 ${
                      isPasswordLengthValid ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {isPasswordLengthValid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      Mật khẩu phải chứa ít nhất 6 ký tự
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-900 border rounded-xl text-white outline-none focus:ring-1 focus:ring-smash-violet transition-all text-xs ${
                      confirmPassword ? (isPasswordMatchValid ? "border-emerald-500/50" : "border-rose-500/50") : "border-purple-950/60"
                    }`}
                    placeholder="••••••••"
                  />
                  {/* Real-time Indicator for matching passwords */}
                  {confirmPassword && (
                    <p className={`text-[10px] font-bold mt-1.5 flex items-center gap-1 ${
                      isPasswordMatchValid ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {isPasswordMatchValid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      Mật khẩu xác nhận không khớp
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword || !oldPassword || !isPasswordLengthValid || !isPasswordMatchValid}
                  className="w-full py-3 bg-smash-purple text-white rounded-xl font-bold text-xs hover:bg-smash-violet transition-all shadow-md shadow-smash-purple/35 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                  {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Đổi mật khẩu tài khoản
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      <footer className="bg-slate-950/60 border-t border-purple-950/20 py-8 text-center text-slate-500 text-xs">
        <p>© 2026 SmashTeam Badminton Club. All rights reserved.</p>
      </footer>
    </main>
  );
}
