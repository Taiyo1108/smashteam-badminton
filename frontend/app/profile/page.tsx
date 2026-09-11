"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  Trophy, Flame, Calendar, Check, X, Sparkles, 
  Camera, Paintbrush, Shield, CalendarDays, Activity, 
  MapPin, Clock, LogOut, Edit2, Home, Loader2, Settings,
  ShoppingBag, Lock, Gift, Coins
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { API_URL } from "@/app/config";
import AvatarWithFrame from "@/app/components/AvatarWithFrame";
import ThemeToggle from "@/app/components/ThemeToggle";
import { format } from "date-fns";

export default function ProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [playerData, setPlayerData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingRsvp, setUpdatingRsvp] = useState(false);

  // Gamification states
  const [gamProfile, setGamProfile] = useState<any>(null);
  const [quests, setQuests] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [activeGamTab, setActiveGamTab] = useState<"quests" | "inventory" | "shop" | "matches">("quests");
  const [matchFilter, setMatchFilter] = useState<"all" | "month" | "week">("all");
  
  const [claimingQuestId, setClaimingQuestId] = useState<number | null>(null);
  const [equippingItemId, setEquippingItemId] = useState<number | null>(null);
  const [buyingItemId, setBuyingItemId] = useState<number | null>(null);
  const [isOpeningBox, setIsOpeningBox] = useState(false);
  const [boxCooldown, setBoxCooldown] = useState<number | null>(null);
  const [mysteryBoxReward, setMysteryBoxReward] = useState<any | null>(null);
  
  // Phân mục kho đồ: "physical" (vật phẩm) | "virtual" (trang bị)
  const [inventorySubTab, setInventorySubTab] = useState<"physical" | "virtual">("physical");
  // Lưu item cần mở modal xem mã QR
  const [qrModalItem, setQrModalItem] = useState<any | null>(null);

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
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger Toast helper
  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Danh sách derived đắt tiền — memo để không sort/filter mỗi render
  const sortedQuests = useMemo(() => {
    const typeWeight: Record<string, number> = { daily: 1, weekly: 2, monthly: 3, seasonal: 4 };
    return [...quests].sort((a: any, b: any) => {
      if (a.is_claimed && !b.is_claimed) return 1;
      if (!a.is_claimed && b.is_claimed) return -1;
      if (!a.is_claimed && !b.is_claimed) {
        const aDone = a.current_count >= a.target_count;
        const bDone = b.current_count >= b.target_count;
        if (aDone && !bDone) return -1;
        if (!aDone && bDone) return 1;
      }
      return (typeWeight[a.quest_type] || 5) - (typeWeight[b.quest_type] || 5);
    });
  }, [quests]);

  const filteredMatches = useMemo(() => {
    const list: any[] = playerData?.matches ?? [];
    if (matchFilter === "all") return list;
    const now = new Date();
    return list.filter((m: any) => {
      const matchDate = new Date(m.created_at);
      if (matchFilter === "month") {
        return matchDate.getMonth() === now.getMonth() && matchDate.getFullYear() === now.getFullYear();
      }
      // week: trong 7 ngày gần nhất
      return Math.abs(now.getTime() - matchDate.getTime()) / (1000 * 60 * 60 * 24) <= 7;
    });
  }, [playerData, matchFilter]);

  const matchStats = useMemo(() => {
    const total = filteredMatches.length;
    const won = filteredMatches.filter((m: any) => m.won).length;
    return { total, won, winRate: total > 0 ? Math.round((won / total) * 100) : 0 };
  }, [filteredMatches]);

  // Fetch dữ liệu từ API /api/profile/me
  const fetchProfileData = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/profile/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 401 || res.status === 403 || res.status === 404) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("user_role");
        localStorage.removeItem("user");
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Không thể tải thông tin trang cá nhân.");
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

      // Chạy song song thay vì nối tiếp để giảm ~5x RTT
      const [profileRes, questsRes, invRes, shopRes] = await Promise.all([
        fetch(`${API_URL}/api/gamification/profile`, { headers }),
        fetch(`${API_URL}/api/gamification/quests`, { headers }),
        fetch(`${API_URL}/api/gamification/inventory`, { headers }),
        fetch(`${API_URL}/api/shop/items`, { headers }),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setGamProfile(data);
        if (data.streak_notification) {
          showToast(data.streak_notification, "success");
        }
      }
      if (questsRes.ok) setQuests(await questsRes.json());
      if (invRes.ok) setInventory(await invRes.json());
      if (shopRes.ok) setShopItems(await shopRes.json());

    } catch (e) {
      console.error("Error fetching gamification data:", e);
    }
  };

  const fetchShopItems = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_URL}/api/shop/items`, { headers });
      if (res.ok) setShopItems(await res.json());
    } catch (e) {
      console.error("Error fetching shop items:", e);
    }
  };

  const handleBuyItem = async (itemId: number, itemName: string, price: number) => {
    if (!confirm(`Xác nhận dùng ${price} xu Smash Coins để đổi "${itemName}"?`)) {
      return;
    }
    
    setBuyingItemId(itemId);
    try {
      const token = localStorage.getItem("admin_token");
      const url = `${API_URL}/api/shop/buy`;
      const res = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ itemId })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Đổi thành công: ${itemName}!`);
        await fetchGamificationData();
        await fetchProfileData();
      } else {
        showToast(data.error || "Lỗi khi đổi quà.", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối.", "error");
    } finally {
      setBuyingItemId(null);
    }
  };

  const handleOpenMysteryBox = async () => {
    setIsOpeningBox(true);
    setMysteryBoxReward(null);
    try {
      const token = localStorage.getItem("admin_token");
      const url = `${API_URL}/api/shop/mystery-box`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMysteryBoxReward(data.reward);
        showToast(data.message || "Mở hộp quà thành công!", "success");
        await fetchGamificationData();
        await fetchProfileData();
      } else {
        showToast(data.error || "Lỗi khi mở hộp quà.", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối.", "error");
    } finally {
      setIsOpeningBox(false);
    }
  };

  // Cooldown timer for mystery box — chỉ tạo 1 interval cho mỗi lượt đếm
  const cooldownActive = boxCooldown !== null && boxCooldown > 0;
  useEffect(() => {
    if (!cooldownActive) return;
    const timer = setInterval(() => {
      setBoxCooldown(prev => (prev === null || prev <= 1 ? null : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownActive]);

  // Tính cooldown từ inventory — chỉ nạp khi chưa có countdown đang chạy
  useEffect(() => {
    if (boxCooldown !== null || inventory.length === 0) return;
    const claims = inventory.filter(i => i.item_type === 'mystery_box_claim');
    if (claims.length === 0) return;
    const diffHours = (Date.now() - new Date(claims[0].acquired_at).getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) {
      setBoxCooldown(Math.ceil((24 - diffHours) * 60 * 60));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory]);

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
      glowClass: "rank-glow-challenger",
      badgeClass: "bg-gradient-to-r from-red-500 to-purple-600 text-white border border-red-400",
      nextElo: 2500,
      prevElo: 1800
    };
    if (elo >= 1600) return {
      name: "Diamond",
      borderClass: "border-4 border-blue-500",
      glowClass: "rank-glow-diamond",
      badgeClass: "bg-blue-600/30 text-blue-400 border border-blue-500/50",
      nextElo: 1800,
      prevElo: 1600
    };
    if (elo >= 1400) return {
      name: "Platinum",
      borderClass: "border-4 border-teal-400",
      glowClass: "rank-glow-platinum",
      badgeClass: "bg-teal-600/30 text-teal-400 border border-teal-500/50",
      nextElo: 1600,
      prevElo: 1400
    };
    if (elo >= 1200) return {
      name: "Gold",
      borderClass: "border-4 border-amber-400",
      glowClass: "rank-glow-gold",
      badgeClass: "bg-amber-600/30 text-amber-400 border border-amber-500/50",
      nextElo: 1400,
      prevElo: 1200
    };
    if (elo >= 1100) return {
      name: "Silver",
      borderClass: "border-4 border-slate-300",
      glowClass: "rank-glow-silver",
      badgeClass: "bg-slate-600/30 text-slate-300 border border-slate-400/50",
      nextElo: 1200,
      prevElo: 1100
    };
    return {
      name: "Bronze",
      borderClass: "border-4 border-amber-800",
      glowClass: "rank-glow-bronze",
      badgeClass: "bg-amber-800/30 text-amber-600 border border-amber-800/50",
      nextElo: 1100,
      prevElo: 800
    };
  };

  // Loading Screen (FOUC Prevention)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-900">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-black/10 border-t-black animate-spin"></div>
          <div className="absolute font-black text-xs text-black uppercase tracking-widest animate-pulse">Smash</div>
        </div>
        <p className="mt-6 text-slate-500 text-sm font-bold tracking-widest animate-pulse">ĐANG TẢI THẺ NGƯỜI CHƠI ELO...</p>
      </div>
    );
  }

  if (error || !playerData) {
    return (
      <div className="min-h-screen bg-secondary flex flex-col items-center justify-center text-white p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[350px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="w-full max-w-md bg-secondary-surface/90 backdrop-blur-xl border border-rose-500/30 rounded-3xl p-8 shadow-2xl text-center z-10 space-y-5">
          <div className="w-16 h-16 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(244,63,94,0.3)]">
            <X className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Đã xảy ra lỗi</h2>
            <p className="text-slate-300 text-sm leading-relaxed">{error || "Không thể tải thông tin trang cá nhân."}</p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <button 
              onClick={fetchProfileData} 
              className="w-full py-3 px-5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              Thử lại
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem("admin_token");
                localStorage.removeItem("user_role");
                localStorage.removeItem("user");
                router.push("/login");
              }} 
              className="w-full py-3 px-5 bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl font-bold text-sm border border-white/15 transition-all active:scale-95 cursor-pointer"
            >
              Đăng nhập lại
            </button>
            <button 
              onClick={() => router.push("/")} 
              className="w-full py-2.5 px-5 text-slate-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Quay lại Trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { player, upcomingSession, attendanceHistory } = playerData;
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
    return { icon: <Activity className="w-5 h-5" />, label: skill, color: "from-slate-900 to-black" };
  };

  // Real-time password validations
  const isPasswordLengthValid = newPassword.length >= 6;
  const isPasswordMatchValid = newPassword === confirmPassword;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative">
      
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
      <nav className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200">
                <Image src="/logo.png" alt="Logo" fill className="object-cover" />
              </div>
              <span className="font-extrabold text-lg text-slate-900 tracking-wider">SMASH TEAM</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <Link href="/">
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all text-sm font-semibold">
                <Home className="w-4 h-4" /> Trang chủ
              </button>
            </Link>
            {playerData?.player?.role === "admin" && (
              <Link href="/admin">
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black/5 text-black hover:bg-black/10 transition-all text-sm font-bold border border-slate-200">
                  <Shield className="w-4 h-4" /> Trang Admin
                </button>
              </Link>
            )}
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
          <div className={`relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 ${rank.glowClass} flex flex-col`}>
            {/* Background glowing gradient overlay */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-slate-100 rounded-bl-full -z-0 pointer-events-none"></div>
            
            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-black hover:border-black/30 hover:scale-115 active:scale-95 transition-all z-20 cursor-pointer shadow-sm"
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
              
              <h2 className="text-2xl font-black text-slate-900 tracking-wide">{player.full_name}</h2>
              {(player.selected_title || gamProfile?.selected_title) && (
                <div className="text-[10px] font-black text-amber-400 mt-1 uppercase tracking-widest bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/20">
                  👑 {player.selected_title || gamProfile?.selected_title}
                </div>
              )}
              
              <div className="flex items-center gap-1.5 mt-2 text-slate-500">
                <span className="text-sm font-medium italic">
                  {player.nickname ? `"${player.nickname}"` : "Chưa đặt biệt danh"}
                </span>
              </div>

              {/* Stats badges inside card */}
              <div className="flex items-center gap-3.5 mt-3.5 bg-slate-50 px-4 py-2 rounded-full border border-slate-200 text-xs">
                <div className="flex items-center gap-1 font-bold text-amber-500">
                  <Coins className="w-4 h-4 text-amber-500" /> {gamProfile?.smash_coins ?? 0} xu
                </div>
                <div className="w-px h-3.5 bg-slate-200" />
                <div className="flex items-center gap-1 font-bold text-orange-500">
                  <Flame className="w-4 h-4 text-orange-500 animate-pulse" /> {gamProfile?.current_streak ?? 0} ngày
                </div>
                <div className="w-px h-3.5 bg-slate-200" />
                <div className="flex items-center gap-1 font-bold text-indigo-400">
                  <Shield className="w-4 h-4 text-indigo-400" /> {gamProfile?.streak_shields ?? 0} khiên
                </div>
              </div>
            </div>

            {/* Elo Scores Table */}
            <div className="grid grid-cols-2 gap-4 relative z-10 border-t border-slate-200 pt-6 mb-6">
              <div className="text-center p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Đấu Đơn</span>
                <p className="text-2xl font-black text-black mt-1">{player.elo_singles}</p>
                <p className="text-[9px] text-slate-500 mt-1">Win rate: {parseFloat(player.win_rate_singles).toFixed(1)}%</p>
                <p className="text-[9px] text-slate-600">Trận: {player.matches_singles} ({player.win_singles}T - {player.loss_singles}B)</p>
              </div>

              <div className="text-center p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Đấu Đôi</span>
                <p className="text-2xl font-black text-black mt-1">{player.elo_doubles}</p>
                <p className="text-[9px] text-slate-500 mt-1">Win rate: {parseFloat(player.win_rate_doubles).toFixed(1)}%</p>
                <p className="text-[9px] text-slate-600">Trận: {player.matches_doubles} ({player.win_doubles}T - {player.loss_doubles}B)</p>
              </div>
            </div>

            {/* Level & Rank Progress */}
            <div className="relative z-10 space-y-4">
              {/* Level XP Bar */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-500 font-bold mb-1.5 uppercase">
                  <span>Cấp độ {gamProfile?.level ?? 1}</span>
                  <span>{gamProfile?.xp ?? 0} / {gamProfile?.xp_needed ?? 80} XP</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${gamProfile ? Math.min(100, (gamProfile.xp / gamProfile.xp_needed) * 100) : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Rank ELO Bar */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-500 font-bold mb-1.5 uppercase">
                  <span>Rank ELO {maxElo}</span>
                  <span>Mục tiêu {rank.nextElo}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                  <div 
                    className="h-full bg-black rounded-full transition-all duration-1000"
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
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-lg mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-black" /> Huy hiệu Đóng góp
            </h3>
            
            {softSkills.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {softSkills.map((skill, index) => {
                  const b = getBadgeIcon(skill);
                  return (
                    <div key={index} className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center hover:border-black/30 transition-colors group">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${b.color} text-white flex items-center justify-center mb-2 shadow-lg group-hover:scale-110 transition-transform`}>
                        {b.icon}
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{b.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                <div className="w-10 h-10 rounded-full bg-black/5 text-black flex items-center justify-center mb-2">
                  <Trophy className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Thành viên tích cực</span>
                <p className="text-[9px] text-slate-500 mt-1 max-w-[150px]">Hãy tích cực tham gia CLB để nhận các huy hiệu đóng góp nhé!</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: RSVP & Match History */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* RSVP WIDGET */}
          {false && (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 rounded-bl-full pointer-events-none"></div>
            
            <h3 className="font-extrabold text-slate-900 text-lg mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-black" /> Đăng ký Lịch tập (RSVP)
            </h3>
            
            {upcomingSession ? (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-black/5 text-black border border-slate-200">
                    Sắp diễn ra
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 tracking-wide">{upcomingSession.title}</h4>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-smash-violet" />
                      {format(new Date(upcomingSession.date_time), "dd/MM/yyyy HH:mm")}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-black" /> 
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
                        ? "bg-black text-white border border-black"
                        : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" /> Tham gia
                  </button>
                  <button
                    onClick={() => handleRsvp(upcomingSession.id, "absent")}
                    disabled={updatingRsvp}
                    className={`px-5 py-2.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ${
                      upcomingSession.rsvp_status === "absent"
                        ? "bg-black text-white"
                        : "bg-white hover:bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    <X className="w-3.5 h-3.5" /> Bận
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-slate-500 text-sm">
                Hiện chưa có lịch tập mới nào được sắp xếp sắp tới.
              </div>
            )}
          </div>
          )}

          {/* GAME PORTAL */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
            {/* Tab selection */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 mb-6">
              {[
                { id: "quests", label: "Nhiệm vụ", icon: Sparkles },
                { id: "inventory", label: "Kho đồ", icon: Shield },
                { id: "shop", label: "Smash Shop", icon: ShoppingBag },
                { id: "matches", label: "Lịch sử đấu", icon: Activity }
              ].map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveGamTab(t.id as any)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                      activeGamTab === t.id
                        ? "bg-black border-black text-white"
                        : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT: QUESTS */}
            {activeGamTab === "quests" && (
              <div className="space-y-4">
                {sortedQuests.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">Không có nhiệm vụ khả dụng.</div>
                  ) : (
                    sortedQuests.map((q: any) => {
                      const isDone = q.current_count >= q.target_count;
                      const pct = Math.min(100, (q.current_count / q.target_count) * 100);
                      
                      return (
                        <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-black/20 transition-all">
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
                            <h4 className="text-sm font-bold text-slate-900 tracking-wide">{q.title}</h4>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div className="h-full bg-black" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs tabular-nums font-bold text-slate-500 shrink-0">{q.current_count}/{q.target_count}</span>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center justify-end">
                            {q.is_claimed ? (
                              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">Đã nhận</span>
                            ) : isDone ? (
                              <button
                                onClick={() => handleClaimQuest(q.id)}
                                disabled={claimingQuestId === q.id}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg shadow-lg shadow-emerald-600/30 cursor-pointer animate-pulse active:scale-95 transition-transform"
                              >
                                {claimingQuestId === q.id ? "Đang nhận..." : "Nhận Quà"}
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">Đang làm</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
            )}

            {/* TAB CONTENT: INVENTORY */}
            {activeGamTab === "inventory" && (() => {
              const filteredAndSortedInventory = inventory
                .filter((item: any) => {
                  if (inventorySubTab === "physical") {
                    return item.item_type === "physical";
                  } else {
                    return item.item_type !== "physical";
                  }
                })
                .sort((a: any, b: any) => {
                  const aRedeemed = a.status === "redeemed" ? 1 : 0;
                  const bRedeemed = b.status === "redeemed" ? 1 : 0;
                  if (aRedeemed !== bRedeemed) {
                    return aRedeemed - bRedeemed; // Đã đổi xuống dưới, chưa đổi lên trên
                  }
                  return new Date(b.acquired_at).getTime() - new Date(a.acquired_at).getTime();
                });

              return (
                <div className="space-y-4">
                  
                  {/* Phân mục Kho đồ */}
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setInventorySubTab("physical")}
                      className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        inventorySubTab === "physical"
                          ? "bg-black text-white shadow-md"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Vật phẩm (Quà vật lý)
                    </button>
                    <button
                      onClick={() => setInventorySubTab("virtual")}
                      className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        inventorySubTab === "virtual"
                          ? "bg-black text-white shadow-md"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Trang bị (Danh hiệu, Khung...)
                    </button>
                  </div>

                  {filteredAndSortedInventory.length === 0 ? (
                    <div className="text-center py-10 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                      <div className="w-12 h-12 rounded-full bg-black/5 text-black flex items-center justify-center mx-auto mb-3">
                        <Shield className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-bold text-slate-500">Kho đồ trống</span>
                      <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">
                        {inventorySubTab === "physical" 
                          ? "Hãy tích cực thi đấu, tích lũy xu để đổi những phần quà vật lý hấp dẫn tại Cửa hàng!"
                          : "Hoàn thành nhiệm vụ và mở hộp quà mỗi ngày để sưu tầm thêm danh hiệu và khung viền độc quyền nhé!"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredAndSortedInventory.map((item: any) => {
                        const isEquipped = item.is_equipped;
                        const isPhysical = item.item_type === 'physical';
                        const isRedeemed = item.status === 'redeemed';
                        const canEquip = ['avatar_frame', 'title'].includes(item.item_type);
                        
                        if (isPhysical) {
                          return (
                            <div key={item.id} className={`p-4 rounded-2xl bg-white border transition-all flex flex-col justify-between gap-3 relative overflow-hidden ${
                              isRedeemed 
                                ? "border-slate-200 opacity-50 grayscale" 
                                : "border-black/20"
                            }`}>
                              {isRedeemed && (
                                <div className="absolute -right-4 -bottom-4 w-24 h-24 border-4 border-dashed border-red-500/20 rounded-full flex items-center justify-center rotate-12 select-none pointer-events-none">
                                  <span className="text-[9px] font-black text-red-500/30 uppercase tracking-widest text-center">ĐÃ NHẬN</span>
                                </div>
                              )}
                              
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                                    isRedeemed
                                      ? "bg-slate-100 text-slate-500"
                                      : "bg-black/5 text-black border border-slate-200"
                                  }`}>
                                    Quà Vật Lý
                                  </span>
                                  <span className={`text-[10px] font-bold ${isRedeemed ? "text-slate-500" : "text-emerald-400"}`}>
                                    {isRedeemed ? "✓ Đã nhận" : "● Chưa sử dụng"}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-white tracking-wide">{item.item_name}</h4>
                                <p className="text-[10px] text-slate-400 mt-1">Đổi lúc: {format(new Date(item.acquired_at), "dd/MM/yyyy HH:mm")}</p>
                              </div>

                              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                                <div className="flex flex-col">
                                  <span className="text-[8px] text-slate-500 font-bold uppercase">Mã Coupon</span>
                                  <span className="tabular-nums text-xs font-black text-black tracking-widest">{item.coupon_code}</span>
                                </div>
                                
                                {!isRedeemed && (
                                  <button
                                    onClick={() => setQrModalItem(item)}
                                    className="px-3 py-1.5 bg-black hover:bg-black/85 text-white text-[10px] font-black rounded-lg cursor-pointer transition-all active:scale-95"
                                  >
                                    Xem mã QR
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={item.id} className={`p-4 rounded-2xl bg-white border transition-all flex flex-col justify-between gap-3 ${
                            isEquipped ? "border-black/30" : "border-slate-200 hover:border-black/20"
                          }`}>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                                  item.item_type === 'avatar_frame'
                                    ? "bg-black/5 text-black border border-slate-200"
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
                              <p className="text-[10px] text-slate-400 mt-1">Sở hữu lúc: {format(new Date(item.acquired_at), "dd/MM/yyyy HH:mm")}</p>
                              {item.expires_at && (
                                <p className="text-[9px] text-red-400 font-medium mt-1">
                                  Hết hạn: {format(new Date(item.expires_at), "dd/MM/yyyy HH:mm")}
                                </p>
                              )}
                            </div>
                            
                            {canEquip && (
                              <button
                                onClick={() => handleEquipItem(item.id, isEquipped)}
                                disabled={equippingItemId === item.id}
                                className={`w-full py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                  isEquipped
                                    ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                    : "bg-black hover:bg-black/85 text-white shadow-md active:scale-95"
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

                  {/* QR Code Pop-up Modal */}
                  {qrModalItem && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-up">
                      <div className="p-6 rounded-2xl bg-white border border-slate-200 max-w-sm w-full text-center relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-black animate-pulse"></div>
                        <h4 className="text-sm font-black text-slate-900 tracking-wide">Mã QR Nhận Quà</h4>
                        <p className="text-xs text-slate-500 mt-1">{qrModalItem.item_name}</p>
                        
                        <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl w-40 h-40 mx-auto my-5 border border-slate-200 shadow-lg">
                          <QRCodeCanvas
                            value={`https://smashteam.id.vn/admin/shop?coupon_code=${qrModalItem.coupon_code}`}
                            size={136}
                            level="M"
                            includeMargin={false}
                          />
                        </div>
                        
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 mb-4">
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Mã Coupon</span>
                          <span className="tabular-nums text-sm font-black text-black tracking-widest">{qrModalItem.coupon_code}</span>
                        </div>
                        
                        <p className="text-[10px] text-slate-500 mb-5 px-3">
                          Đưa mã QR này hoặc đọc mã Coupon cho Ban tổ chức tại sân để xác nhận trao quà.
                        </p>
                        
                        <button
                          onClick={() => setQrModalItem(null)}
                          className="w-full py-2 bg-black hover:bg-black/85 text-white text-xs font-black rounded-full cursor-pointer transition-colors"
                        >
                          Đóng
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })()}

            {/* TAB CONTENT: SHOP */}
            {activeGamTab === "shop" && (
              <div className="space-y-6">
                
                {/* 1. Hộp quà bí ẩn hàng ngày (Daily Mystery Box) */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-full filter blur-2xl pointer-events-none"></div>
                  
                  <div className="flex items-center gap-4 flex-col sm:flex-row text-center sm:text-left">
                    <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center text-white text-3xl shadow-lg shrink-0 animate-bounce">
                      🎁
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900 tracking-wide flex items-center justify-center sm:justify-start gap-1.5">
                        Hộp Quà Bí Ẩn Hàng Ngày <span className="text-[10px] bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-400/20 font-black uppercase">Free</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">Mỗi ngày mở 1 lần để có cơ hội nhận Xu, Khiên hoặc Khung avatar hiếm!</p>
                      
                      {/* Tỉ lệ mở hộp quà */}
                      <div className="flex gap-4 mt-2 text-[10px] text-slate-500 font-bold justify-center sm:justify-start">
                        <span>💰 70% Xu (10-30)</span>
                        <span>🛡️ 20% Khiên</span>
                        <span>👑 10% Khung VIP</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 w-full sm:w-auto text-center">
                    {boxCooldown !== null ? (() => {
                      const h = Math.floor(boxCooldown / 3600);
                      const m = Math.floor((boxCooldown % 3600) / 60);
                      const s = boxCooldown % 60;
                      const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
                      return (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl">
                            Chờ: {timeStr}
                          </span>
                        </div>
                      );
                    })() : (
                      <button
                        onClick={handleOpenMysteryBox}
                        disabled={isOpeningBox}
                        className="w-full sm:w-auto px-6 py-2.5 bg-black hover:bg-black/85 text-white font-black text-xs rounded-full shadow-lg active:scale-95 transition-transform cursor-pointer"
                      >
                        {isOpeningBox ? "Đang mở..." : "Mở ngay hộp quà"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Modal thông báo nhận quà Mystery Box */}
                {mysteryBoxReward && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 max-w-sm w-full text-center relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-black animate-pulse"></div>
                      <div className="text-5xl my-4">🎉</div>
                      <h4 className="text-lg font-black text-slate-900">Bạn Đã Nhận Được Quà!</h4>
                      <p className="text-base font-black text-amber-400 mt-2">{mysteryBoxReward.name}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {mysteryBoxReward.type === 'avatar_frame' 
                          ? 'Vật phẩm đã được thêm vào Kho đồ của bạn với thời hạn sử dụng 7 ngày.' 
                          : 'Phần thưởng đã được cộng trực tiếp vào tài khoản.'}
                      </p>
                      <button
                        onClick={() => setMysteryBoxReward(null)}
                        className="mt-6 w-full py-2 bg-black hover:bg-black/85 text-white text-xs font-black rounded-full cursor-pointer transition-colors"
                      >
                        Đồng ý
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Cửa hàng chính */}
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase font-black tracking-widest text-slate-500 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-black" /> Cửa hàng đổi quà
                  </h4>
                  <div className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Số dư:</span>
                    <span className="text-xs font-black text-amber-400 flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-amber-400" />{gamProfile?.smash_coins || 0}</span>
                  </div>
                </div>

                {shopItems.length === 0 ? (
                  <div className="text-center py-10 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                    <span className="text-sm font-bold text-slate-500">Cửa hàng trống</span>
                    <p className="text-xs text-slate-500 mt-1">Cửa hàng đang được nhập thêm quà mới, vui lòng quay lại sau.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {shopItems.map((item: any) => {
                      const isPhysical = item.item_type === 'physical';
                      const isOutOfStock = isPhysical && item.stock <= 0;
                      const userCoins = gamProfile?.smash_coins || 0;
                      const isAffordable = userCoins >= item.coin_price;
                      
                      // Check Level lock
                      const isLevelLocked = (gamProfile?.level || 1) < item.level_required;

                      // Rarity styling
                      let rarityBorder = "border-slate-200";
                      let rarityBadge = "bg-slate-100 text-slate-500";
                      if (item.rarity === 'rare') {
                        rarityBorder = "border-blue-500/40 hover:border-blue-500";
                        rarityBadge = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
                      } else if (item.rarity === 'epic') {
                        rarityBorder = "border-slate-900 hover:border-black";
                        rarityBadge = "bg-black/5 text-black border border-slate-200";
                      } else if (item.rarity === 'legendary') {
                        rarityBorder = "border-amber-400 hover:border-amber-400";
                        rarityBadge = "bg-amber-400/10 text-amber-400 border border-amber-400/20";
                      }

                      // Check hot alerts or low stock alerts
                      const showLowStock = isPhysical && item.stock > 0 && item.stock < 5;
                      const isHotItem = item.is_hot;

                      return (
                        <div key={item.id} className={`p-4 rounded-2xl bg-white border transition-all flex flex-col justify-between gap-4 relative overflow-hidden ${
                          isOutOfStock ? "opacity-60 grayscale border-slate-200" : rarityBorder
                        }`}>
                          
                          {/* Alert Badges */}
                          <div className="absolute top-2 right-2 flex gap-1 z-10">
                            {showLowStock && (
                              <span className="text-[8px] font-black uppercase tracking-wider bg-red-600 text-white px-1.5 py-0.5 rounded animate-pulse">Sắp hết!</span>
                            )}
                            {!isOutOfStock && isHotItem && (
                              <span className="text-[8px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded">Hot</span>
                            )}
                          </div>

                          <div className="flex gap-3">
                            {isPhysical && item.image_url ? (
                              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-50 relative">
                                <Image
                                  src={item.image_url}
                                  alt={item.name}
                                  fill
                                  sizes="80px"
                                  loading="lazy"
                                  unoptimized
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-20 h-20 rounded-xl bg-black/5 border border-slate-200 flex items-center justify-center shrink-0 text-black">
                                <Trophy className="w-8 h-8" />
                              </div>
                            )}

                            <div className="flex flex-col justify-between py-0.5 flex-1 min-w-0">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded ${rarityBadge}`}>
                                    {item.rarity || 'common'}
                                  </span>
                                  <span className="text-[8px] text-slate-500 font-bold">{item.category || 'Đồ dùng'}</span>
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 tracking-wide mt-1.5 line-clamp-1">{item.name}</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1">
                                {isPhysical ? (
                                  isOutOfStock ? (
                                    <span className="text-red-400 font-bold">Hết hàng</span>
                                  ) : (
                                    <span>Còn lại: <strong className="text-slate-900">{item.stock} cái</strong></span>
                                  )
                                ) : (
                                  <span className="text-slate-500">Kích hoạt trực tuyến</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-slate-200">
                            <div className="flex items-center gap-1 font-bold text-amber-400 text-sm">
                              {item.coin_price} <span className="text-xs text-amber-500/80">Xu</span>
                            </div>

                            {isLevelLocked ? (
                              <span className="text-[10px] font-black text-red-500 bg-red-950/20 border border-red-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1 select-none">
                                <Lock className="w-3 h-3 shrink-0" /> Level {item.level_required}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleBuyItem(item.id, item.name, item.coin_price)}
                                disabled={isOutOfStock || !isAffordable || buyingItemId === item.id}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                  isOutOfStock
                                    ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                                    : !isAffordable
                                    ? "bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200"
                                    : "bg-black hover:bg-black/85 text-white shadow-md active:scale-95"
                                }`}
                              >
                                {buyingItemId === item.id
                                  ? "Đang xử lý..."
                                  : isOutOfStock
                                  ? "Hết hàng"
                                  : !isAffordable
                                  ? "Chưa đủ xu"
                                  : "Đổi quà"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: MATCHES */}
            {activeGamTab === "matches" && (
              <div className="space-y-6">
                  {/* Title & Dropdown Filter Row */}
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-xs uppercase font-black tracking-widest text-slate-500 flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-black" /> Hiệu số thi đấu
                    </h4>
                    
                    <select
                      value={matchFilter}
                      onChange={(e) => setMatchFilter(e.target.value as any)}
                      className="text-xs font-bold bg-white border border-slate-200 text-slate-600 rounded-xl px-3 py-1.5 focus:ring-1 focus:ring-black/10 focus:border-black outline-none cursor-pointer"
                    >
                      <option value="all">Tất cả thời gian</option>
                      <option value="month">Trong tháng này</option>
                      <option value="week">Trong tuần này</option>
                    </select>
                  </div>

                  {/* 3 Prominent Stats Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Card 1: Total matches */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center flex flex-col justify-center items-center gap-1">
                      <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-widest text-slate-500">Tổng Trận</span>
                      <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums tracking-tight">{matchStats.total}</span>
                    </div>

                    {/* Card 2: Winrate */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center flex flex-col justify-center items-center gap-1">
                      <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-widest text-slate-500">Tỷ Lệ Thắng</span>
                      <span className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight ${matchStats.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {matchStats.winRate}%
                      </span>
                    </div>

                    {/* Card 3: Wins / Losses */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center flex flex-col justify-center items-center gap-1">
                      <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-widest text-slate-500">Thắng / Bại</span>
                      <span className="text-xl sm:text-2xl font-black tabular-nums tracking-tight text-slate-600">
                        <span className="text-emerald-400">{matchStats.won}</span>
                        <span className="text-slate-400 px-0.5">/</span>
                        <span className="text-rose-400">{matchStats.total - matchStats.won}</span>
                      </span>
                    </div>
                  </div>

                  {filteredMatches.length > 0 ? (
                    <div className="space-y-4">
                      {filteredMatches.map((m: any) => (
                        <div key={m.id} className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-black/20 transition-all">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                                m.isDoubles 
                                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                                  : "bg-black/5 text-black border border-slate-200"
                              }`}>
                                {m.isDoubles ? "Đôi" : "Đơn"}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {format(new Date(m.created_at), "dd/MM/yyyy HH:mm")}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-slate-900">
                              đối thủ: <span className="text-slate-600">{m.opponent}</span>
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-10">
                            <span className="font-extrabold text-base text-slate-600 tracking-wider tabular-nums">
                              {m.score}
                            </span>
                            
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-center min-w-[70px] ${
                              m.won
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
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
                    <div className="flex flex-col items-center justify-center p-10 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                      <div className="w-12 h-12 rounded-full bg-black/5 text-black flex items-center justify-center mb-4 border border-slate-200 shadow-inner animate-pulse">
                        <Trophy className="w-6 h-6" />
                      </div>
                      <h4 className="text-slate-900 font-bold text-base mb-1.5">Không tìm thấy trận đấu nào</h4>
                      <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
                        Không có trận đấu nào được ghi nhận trong khoảng thời gian đã chọn.
                      </p>
                    </div>
                  )}
                </div>
            )}
          </div>
        </div>
      </div>

      {/* SETTINGS / CONFIGURATION MODAL (Light Theme) */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-up">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
            
            {/* Close button */}
            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <h3 className="text-xl font-black text-slate-900 mb-6 tracking-wide flex items-center gap-2">
              <Settings className="w-5 h-5 text-black animate-spin-hover" /> Thiết lập Tài khoản
            </h3>

            {/* Tabs Selector */}
            <div className="flex border-b border-slate-200 mb-6 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("avatar")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "avatar"
                    ? "bg-black text-white shadow-md"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Đổi Avatar
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "profile"
                    ? "bg-black text-white shadow-md"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Hồ sơ cá nhân
              </button>
              <button
                onClick={() => setActiveTab("password")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "password"
                    ? "bg-black text-white shadow-md"
                    : "text-slate-500 hover:text-slate-900"
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
                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-black relative bg-slate-100 flex items-center justify-center">
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
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl font-bold text-xs transition-all cursor-pointer active:scale-95"
                  >
                    Chọn file ảnh đại diện
                  </button>
                  <p className="text-[10px] text-slate-500 mt-2">Định dạng hỗ trợ: JPG, PNG, WEBP. Tối đa 5MB.</p>
                </div>

                {avatarFile && (
                  <button
                    onClick={handleUploadAvatar}
                    disabled={isUploadingAvatar}
                    className="w-full py-3 bg-black text-white rounded-full font-bold text-xs hover:bg-black/85 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Họ và tên</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all text-xs"
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Biệt danh (Nickname)</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all text-xs"
                    placeholder="Sấm sét, Vua cọ..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Trường học / Học vấn</label>
                  <input
                    type="text"
                    value={academicInfo}
                    onChange={(e) => setAcademicInfo(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all text-xs"
                    placeholder="ĐH Bách Khoa, THPT A..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kỹ năng đóng góp cho CLB</label>
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
                            ? "bg-black/5 border-black text-slate-900"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:border-black/20"
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
                  className="w-full py-3 bg-black text-white rounded-full font-bold text-xs hover:bg-black/85 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 mt-6"
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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mật khẩu cũ</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all text-xs animate-none"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full px-4 py-3 bg-white border rounded-xl text-slate-900 outline-none focus:ring-1 focus:ring-black/10 transition-all text-xs ${
                      newPassword ? (isPasswordLengthValid ? "border-emerald-500/50" : "border-rose-500/50") : "border-slate-200"
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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 bg-white border rounded-xl text-slate-900 outline-none focus:ring-1 focus:ring-black/10 transition-all text-xs ${
                      confirmPassword ? (isPasswordMatchValid ? "border-emerald-500/50" : "border-rose-500/50") : "border-slate-200"
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
                  className="w-full py-3 bg-black text-white rounded-full font-bold text-xs hover:bg-black/85 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                  {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Đổi mật khẩu tài khoản
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      <footer className="bg-white border-t border-slate-200 py-8 text-center text-slate-500 text-xs">
        <p>© 2026 SmashTeam Badminton Club. All rights reserved.</p>
      </footer>
    </main>
  );
}
