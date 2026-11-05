"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Sparkles, Plus, Loader2, X, Trash2, Eye, EyeOff, 
  Coins, Trophy, ChevronRight, CheckCircle2, Edit,
  Gift, Users, Search, Check, RotateCcw, Calendar, 
  Zap, AlertCircle, Filter, ArrowRight, ShieldCheck, CheckSquare, Square
} from "lucide-react";
import { API_URL } from "@/app/config";

interface Quest {
  id: number;
  title: string;
  description?: string | null;
  quest_type: "daily" | "weekly" | "monthly" | "seasonal" | "one_time";
  action_type: "custom" | "play_matches" | "win_matches" | "check_in" | string;
  target_count: number;
  xp_reward: number;
  coin_reward: number;
  is_active: boolean;
}

interface QuestMember {
  id: string;
  full_name: string;
  nickname?: string | null;
  phone_zalo?: string | null;
  avatar_url?: string | null;
  role: string;
  level: number;
  xp: number;
  smash_coins: number;
  is_completed: boolean;
  is_claimed: boolean;
  current_count: number;
  updated_at?: string | null;
}

export default function AdminQuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questType, setQuestType] = useState<"daily" | "weekly" | "monthly" | "seasonal" | "one_time">("daily");
  const [actionType, setActionType] = useState<"custom" | "play_matches" | "win_matches" | "check_in">("custom");
  const [targetCount, setTargetCount] = useState(1);
  const [xpReward, setXpReward] = useState(50);
  const [coinReward, setCoinReward] = useState(25);

  // Filter & Search on main list
  const [questSearch, setQuestSearch] = useState("");
  const [questFilterTab, setQuestFilterTab] = useState<"all" | "manual" | "auto">("all");

  // Award Modal states
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [selectedQuestForAward, setSelectedQuestForAward] = useState<Quest | null>(null);
  const [awardMembers, setAwardMembers] = useState<QuestMember[]>([]);
  const [isLoadingAwardMembers, setIsLoadingAwardMembers] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [awardSearch, setAwardSearch] = useState("");
  const [awardStatusFilter, setAwardStatusFilter] = useState<"all" | "unclaimed" | "claimed">("all");
  const [awardMode, setAwardMode] = useState<"direct" | "unlock">("direct");
  const [isAwarding, setIsAwarding] = useState(false);
  const [awardFeedback, setAwardFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null);

  const fetchQuests = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/quests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setQuests(await res.json());
      }
    } catch (e) {
      console.error("Error fetching quests:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, []);

  const handleSaveQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || targetCount <= 0 || xpReward < 0 || coinReward < 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("admin_token");
      const url = editingQuest 
        ? `${API_URL}/api/admin/quests/${editingQuest.id}` 
        : `${API_URL}/api/admin/quests`;
      const method = editingQuest ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          quest_type: questType,
          action_type: actionType,
          target_count: Number(targetCount),
          xp_reward: Number(xpReward),
          coin_reward: Number(coinReward),
          is_active: editingQuest ? editingQuest.is_active : true
        })
      });

      const data = await res.json();

      if (res.ok) {
        setIsModalOpen(false);
        setEditingQuest(null);
        setTitle("");
        setDescription("");
        setQuestType("daily");
        setActionType("custom");
        setTargetCount(1);
        setXpReward(50);
        setCoinReward(25);
        fetchQuests();
      } else {
        setError(data.error || "Không thể lưu nhiệm vụ.");
      }
    } catch (err) {
      setError("Lỗi kết nối.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuest = async (id: number) => {
    if (!confirm("Xác nhận xóa hoàn toàn nhiệm vụ này? Hành động này sẽ xóa toàn bộ tiến trình liên quan của các hội viên.")) return;

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/quests/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        fetchQuests();
      } else {
        alert(data.error || "Không thể xóa nhiệm vụ.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    }
  };

  const toggleQuest = async (questId: number, currentActive: boolean) => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/quests/${questId}/toggle`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentActive })
      });

      if (res.ok) {
        setQuests(quests.map(q => q.id === questId ? { ...q, is_active: !currentActive } : q));
      }
    } catch (e) {
      console.error("Error toggling quest:", e);
    }
  };

  const handleOpenEditQuest = (q: Quest) => {
    setEditingQuest(q);
    setTitle(q.title);
    setDescription(q.description || "");
    setQuestType(q.quest_type);
    setActionType(q.action_type as any);
    setTargetCount(q.target_count);
    setXpReward(q.xp_reward);
    setCoinReward(q.coin_reward);
    setIsModalOpen(true);
  };

  const handleOpenCreateQuest = () => {
    setEditingQuest(null);
    setTitle("");
    setDescription("");
    setQuestType("one_time");
    setActionType("custom");
    setTargetCount(1);
    setXpReward(50);
    setCoinReward(25);
    setIsModalOpen(true);
  };

  // ==========================================
  // AWARD MODAL HANDLERS
  // ==========================================
  const fetchQuestMembers = async (questId: number) => {
    setIsLoadingAwardMembers(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/quests/${questId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAwardMembers(data.members || []);
      }
    } catch (e) {
      console.error("Error fetching quest members:", e);
    } finally {
      setIsLoadingAwardMembers(false);
    }
  };

  const handleOpenAwardModal = (quest: Quest) => {
    setSelectedQuestForAward(quest);
    setSelectedMemberIds([]);
    setAwardSearch("");
    setAwardStatusFilter("all");
    setAwardMode("direct");
    setAwardFeedback(null);
    setIsAwardModalOpen(true);
    fetchQuestMembers(quest.id);
  };

  const handleToggleSelectMember = (userId: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleConfirmAward = async () => {
    if (!selectedQuestForAward || selectedMemberIds.length === 0) return;

    setIsAwarding(true);
    setAwardFeedback(null);

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/quests/${selectedQuestForAward.id}/award`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          user_ids: selectedMemberIds,
          mode: awardMode
        })
      });

      const data = await res.json();

      if (res.ok) {
        setAwardFeedback({
          type: "success",
          message: data.message || `Đã trao thưởng thành công cho ${data.awarded_count} thành viên!`
        });
        setSelectedMemberIds([]);
        fetchQuestMembers(selectedQuestForAward.id);
      } else {
        setAwardFeedback({
          type: "error",
          message: data.error || "Không thể trao quà cho thành viên."
        });
      }
    } catch (e) {
      setAwardFeedback({
        type: "error",
        message: "Lỗi kết nối khi trao quà."
      });
    } finally {
      setIsAwarding(false);
    }
  };

  const handleRevokeQuest = async (userId: string, memberName: string) => {
    if (!selectedQuestForAward) return;
    if (!confirm(`Xác nhận đặt lại / thu hồi trạng thái hoàn thành nhiệm vụ của thành viên "${memberName}"?`)) return;

    setRevokingUserId(userId);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/quests/${selectedQuestForAward.id}/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId })
      });

      const data = await res.json();
      if (res.ok) {
        setAwardFeedback({
          type: "success",
          message: data.message || `Đã thu hồi tiến trình của thành viên ${memberName}.`
        });
        fetchQuestMembers(selectedQuestForAward.id);
      } else {
        alert(data.error || "Không thể thu hồi.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    } finally {
      setRevokingUserId(null);
    }
  };

  // Filtered members for Award Modal
  const filteredAwardMembers = useMemo(() => {
    return awardMembers.filter(m => {
      // Status filter
      if (awardStatusFilter === "claimed" && !m.is_claimed) return false;
      if (awardStatusFilter === "unclaimed" && m.is_claimed) return false;

      // Search filter
      if (awardSearch.trim()) {
        const q = awardSearch.toLowerCase().trim();
        const nameMatch = m.full_name?.toLowerCase().includes(q);
        const nickMatch = m.nickname?.toLowerCase().includes(q);
        const phoneMatch = m.phone_zalo?.toLowerCase().includes(q);
        return nameMatch || nickMatch || phoneMatch;
      }
      return true;
    });
  }, [awardMembers, awardStatusFilter, awardSearch]);

  const handleSelectAllVisible = () => {
    const visibleIds = filteredAwardMembers.map(m => m.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedMemberIds.includes(id));
    if (allSelected) {
      // Bỏ chọn tất cả đang hiển thị
      setSelectedMemberIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      // Chọn tất cả đang hiển thị
      setSelectedMemberIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Filtered Quests on Main Page
  const filteredQuests = useMemo(() => {
    return quests.filter(q => {
      const isManual = q.action_type === "custom" || q.action_type === "manual";
      if (questFilterTab === "manual" && !isManual) return false;
      if (questFilterTab === "auto" && isManual) return false;

      if (questSearch.trim()) {
        const query = questSearch.toLowerCase().trim();
        const titleMatch = q.title?.toLowerCase().includes(query);
        const descMatch = q.description?.toLowerCase().includes(query);
        return titleMatch || descMatch;
      }
      return true;
    });
  }, [quests, questFilterTab, questSearch]);

  const stats = useMemo(() => {
    const total = quests.length;
    const manual = quests.filter(q => q.action_type === "custom" || q.action_type === "manual").length;
    const auto = total - manual;
    const active = quests.filter(q => q.is_active).length;
    return { total, manual, auto, active };
  }, [quests]);

  return (
    <div className="space-y-6 text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-secondary tracking-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" /> Cấu hình & Quản lý Nhiệm vụ Gamification
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Thiết lập nhiệm vụ tự động (Điểm danh, Thi đấu) và nhiệm vụ ngoài lề thủ công (Admin duyệt & trao quà trực tiếp).
          </p>
        </div>
        <button
          onClick={handleOpenCreateQuest}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-secondary hover:bg-primary-hover font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" /> Thêm Nhiệm Vụ Mới
        </button>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng nhiệm vụ</div>
            <div className="text-xl font-black text-secondary">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">🎯 Nhiệm vụ ngoài lề</div>
            <div className="text-xl font-black text-amber-600">{stats.manual}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">⚡ Tự động tính</div>
            <div className="text-xl font-black text-blue-600">{stats.auto}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đang hoạt động</div>
            <div className="text-xl font-black text-emerald-600">{stats.active}</div>
          </div>
        </div>
      </div>

      {/* Search & Tabs Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setQuestFilterTab("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              questFilterTab === "all" ? "bg-white text-secondary shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Tất cả ({stats.total})
          </button>
          <button
            onClick={() => setQuestFilterTab("manual")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              questFilterTab === "manual" ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🎯 Ngoài lề / Thủ công ({stats.manual})
          </button>
          <button
            onClick={() => setQuestFilterTab("auto")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              questFilterTab === "auto" ? "bg-white text-secondary shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            ⚡ Tự động ({stats.auto})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, mô tả..."
            value={questSearch}
            onChange={(e) => setQuestSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs bg-slate-50"
          />
        </div>
      </div>

      {/* Main Quests Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : filteredQuests.length === 0 ? (
        <div className="p-16 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400 bg-white">
          Không tìm thấy nhiệm vụ nào phù hợp với bộ lọc.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 pl-6">Nhiệm vụ</th>
                  <th className="p-4">Phân loại</th>
                  <th className="p-4">Chu kỳ</th>
                  <th className="p-4">Yêu cầu</th>
                  <th className="p-4">Phần thưởng</th>
                  <th className="p-4 text-center">Trạng thái</th>
                  <th className="p-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredQuests.map((q) => {
                  const isManual = q.action_type === "custom" || q.action_type === "manual";

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6 max-w-[280px]">
                        <div className="font-bold text-secondary flex items-start gap-1.5">
                          {isManual ? (
                            <Gift className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          ) : (
                            <Zap className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="line-clamp-2">{q.title}</span>
                            {q.description && (
                              <p className="text-xs text-slate-500 font-normal line-clamp-2 mt-0.5">
                                {q.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        {isManual ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-max">
                            🎯 Ngoài lề
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1 w-max">
                            ⚡ {q.action_type === "check_in" ? "Điểm danh" : q.action_type === "win_matches" ? "Thắng trận" : "Chơi trận"}
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          q.quest_type === "daily" 
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                            : q.quest_type === "weekly"
                            ? "bg-blue-50 text-blue-600 border border-blue-100"
                            : q.quest_type === "monthly"
                            ? "bg-purple-50 text-purple-600 border border-purple-100"
                            : q.quest_type === "one_time"
                            ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}>
                          {q.quest_type === "daily" ? "Hàng ngày" : q.quest_type === "weekly" ? "Hàng tuần" : q.quest_type === "monthly" ? "Hàng tháng" : q.quest_type === "one_time" ? "Một lần (Sự kiện)" : "Mùa giải"}
                        </span>
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                        {q.target_count} lần
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="text-emerald-500 font-bold">+{q.xp_reward} XP</span>
                          <span className="text-amber-500 font-bold">+{q.coin_reward} Xu</span>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          q.is_active 
                            ? "bg-emerald-500/10 text-emerald-500" 
                            : "bg-slate-200 text-slate-500"
                        }`}>
                          {q.is_active ? "Hoạt động" : "Tạm khóa"}
                        </span>
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          {/* Nút Trao Quà / Chọn thành viên nhận quà */}
                          <button
                            onClick={() => handleOpenAwardModal(q)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer active:scale-95 shadow-sm ${
                              isManual
                                ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/20"
                                : "bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-100"
                            }`}
                            title="Chọn cụ thể thành viên hoàn thành để trao quà"
                          >
                            <Gift className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Trao Quà</span>
                          </button>

                          {/* Sửa */}
                          <button
                            onClick={() => handleOpenEditQuest(q)}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all cursor-pointer active:scale-95"
                            title="Sửa nhiệm vụ"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Toggle active */}
                          <button
                            onClick={() => toggleQuest(q.id, q.is_active)}
                            className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                              q.is_active 
                                ? "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600" 
                                : "bg-emerald-50 border-emerald-100 hover:bg-emerald-100 text-emerald-600"
                            }`}
                            title={q.is_active ? "Khóa nhiệm vụ" : "Kích hoạt nhiệm vụ"}
                          >
                            {q.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>

                          {/* Xóa */}
                          <button
                            onClick={() => handleDeleteQuest(q.id)}
                            className="p-2 rounded-xl border border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all cursor-pointer active:scale-95"
                            title="Xóa nhiệm vụ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TRAO QUÀ CHO THÀNH VIÊN (CHỌN CỤ THỂ TỪNG THÀNH VIÊN)           */}
      {/* ========================================================================= */}
      {isAwardModalOpen && selectedQuestForAward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
            <button
              onClick={() => setIsAwardModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="border-b border-slate-100 pb-4 pr-10">
              <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider mb-1">
                <Gift className="w-4 h-4" /> Trao Thưởng Nhiệm Vụ Cho Thành Viên
              </div>
              <h3 className="text-xl font-black text-secondary tracking-tight">
                {selectedQuestForAward.title}
              </h3>
              {selectedQuestForAward.description && (
                <p className="text-xs text-slate-500 mt-1">
                  {selectedQuestForAward.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  +{selectedQuestForAward.xp_reward} XP
                </span>
                <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                  +{selectedQuestForAward.coin_reward} Xu
                </span>
                <span className="text-slate-400">
                  Yêu cầu: {selectedQuestForAward.target_count} lần
                </span>
              </div>
            </div>

            {/* Award Mode Selector */}
            <div className="pt-3 pb-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Chế độ trao quà
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div
                  onClick={() => setAwardMode("direct")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    awardMode === "direct"
                      ? "bg-purple-50/80 border-purple-400 text-purple-900 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Gift className={`w-4 h-4 mt-0.5 shrink-0 ${awardMode === "direct" ? "text-purple-600" : "text-slate-400"}`} />
                  <div>
                    <div className="text-xs font-bold">Trao quà trực tiếp ngay</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Tự động cộng ngay XP và Xu vào tài khoản thành viên, đánh dấu đã hoàn thành & nhận quà.
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setAwardMode("unlock")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    awardMode === "unlock"
                      ? "bg-purple-50/80 border-purple-400 text-purple-900 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Sparkles className={`w-4 h-4 mt-0.5 shrink-0 ${awardMode === "unlock" ? "text-purple-600" : "text-slate-400"}`} />
                  <div>
                    <div className="text-xs font-bold">Mở khóa hoàn thành</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Ghi nhận hoàn thành để thành viên tự vào Profile bấm nút &quot;Nhận Quà&quot; & xem pháo hoa.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search & Status Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 py-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm thành viên theo tên, biệt danh, SĐT..."
                  value={awardSearch}
                  onChange={(e) => setAwardSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-xs bg-slate-50"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setAwardStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    awardStatusFilter === "all" ? "bg-white text-secondary shadow-sm" : "text-slate-500"
                  }`}
                >
                  Tất cả ({awardMembers.length})
                </button>
                <button
                  onClick={() => setAwardStatusFilter("unclaimed")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    awardStatusFilter === "unclaimed" ? "bg-white text-secondary shadow-sm" : "text-slate-500"
                  }`}
                >
                  Chưa nhận ({awardMembers.filter(m => !m.is_claimed).length})
                </button>
                <button
                  onClick={() => setAwardStatusFilter("claimed")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    awardStatusFilter === "claimed" ? "bg-white text-secondary shadow-sm" : "text-slate-500"
                  }`}
                >
                  Đã nhận ({awardMembers.filter(m => m.is_claimed).length})
                </button>
              </div>
            </div>

            {/* Selection Bar */}
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={handleSelectAllVisible}
                className="flex items-center gap-1.5 font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
              >
                {filteredAwardMembers.length > 0 && filteredAwardMembers.every(m => selectedMemberIds.includes(m.id)) ? (
                  <>
                    <CheckSquare className="w-4 h-4 text-purple-600" /> Bỏ chọn tất cả ({filteredAwardMembers.length})
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 text-slate-400" /> Chọn tất cả đang hiển thị ({filteredAwardMembers.length})
                  </>
                )}
              </button>

              <div className="font-bold text-secondary">
                Đã chọn: <span className="text-purple-600 font-black">{selectedMemberIds.length}</span> thành viên
                {selectedMemberIds.length > 0 && (
                  <span className="text-slate-500 font-normal ml-2 hidden sm:inline">
                    (Tổng trao: +{selectedMemberIds.length * selectedQuestForAward.xp_reward} XP, +{selectedMemberIds.length * selectedQuestForAward.coin_reward} Xu)
                  </span>
                )}
              </div>
            </div>

            {/* Feedback notification */}
            {awardFeedback && (
              <div className={`mt-2 p-3 text-xs rounded-xl border flex items-center justify-between ${
                awardFeedback.type === "success" 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-rose-50 text-rose-600 border-rose-200"
              }`}>
                <div className="flex items-center gap-2">
                  {awardFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{awardFeedback.message}</span>
                </div>
                <button onClick={() => setAwardFeedback(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Members List (Scrollable) */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl my-2 max-h-[300px]">
              {isLoadingAwardMembers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                </div>
              ) : filteredAwardMembers.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  Không tìm thấy thành viên nào phù hợp.
                </div>
              ) : (
                filteredAwardMembers.map(m => {
                  const isSelected = selectedMemberIds.includes(m.id);

                  return (
                    <div
                      key={m.id}
                      onClick={() => handleToggleSelectMember(m.id)}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        isSelected 
                          ? "bg-purple-50/60" 
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Controlled by parent div click
                          className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                        />
                        
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-slate-600">
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt={m.full_name} className="w-full h-full object-cover" />
                          ) : (
                            m.full_name.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div>
                          <div className="font-bold text-xs text-secondary flex items-center gap-1.5">
                            <span>{m.full_name}</span>
                            {m.nickname && (
                              <span className="text-[10px] text-slate-400 font-normal">({m.nickname})</span>
                            )}
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                              Lv.{m.level || 1}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {m.phone_zalo || "Chưa có SĐT"} • {m.smash_coins || 0} Xu
                          </div>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {m.is_claimed ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              ✓ Đã nhận quà
                            </span>
                            <button
                              onClick={() => handleRevokeQuest(m.id, m.full_name)}
                              disabled={revokingUserId === m.id}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 transition-colors"
                              title="Thu hồi / Đặt lại trạng thái nhiệm vụ cho thành viên này"
                            >
                              {revokingUserId === m.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : m.is_completed ? (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            ⏳ Đã mở khóa
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Chưa nhận
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsAwardModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handleConfirmAward}
                disabled={isAwarding || selectedMemberIds.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 cursor-pointer active:scale-95 transition-all"
              >
                {isAwarding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang trao quà...
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4" />
                    Xác nhận trao quà ({selectedMemberIds.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TẠO / SỬA CẤU HÌNH NHIỆM VỤ                                    */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-secondary mb-5 tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-primary" /> {editingQuest ? "Chỉnh sửa cấu hình nhiệm vụ" : "Thiết lập nhiệm vụ mới"}
            </h3>

            <form onSubmit={handleSaveQuest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tiêu đề nhiệm vụ *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hỗ trợ dọn dẹp vệ sinh và thu gom cầu sau buổi tập"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mô tả / Hướng dẫn hoàn thành (Tùy chọn)</label>
                <textarea
                  rows={2}
                  placeholder="Ghi rõ yêu cầu cụ thể để thành viên nắm được cách thức hoàn thành nhiệm vụ..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm bg-slate-50 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Loại hành động kích hoạt *</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as any)}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm bg-slate-50 font-medium"
                  >
                    <option value="custom">🎯 Nhiệm vụ ngoài lề / Thủ công (Admin duyệt & trao quà)</option>
                    <option value="check_in">⚡ Điểm danh sân (Hệ thống tự quét QR)</option>
                    <option value="play_matches">⚡ Chơi trận đấu (Hệ thống tự tính)</option>
                    <option value="win_matches">⚡ Thắng trận đấu (Hệ thống tự tính)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Chu kỳ lặp lại *</label>
                  <select
                    value={questType}
                    onChange={(e) => setQuestType(e.target.value as any)}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm bg-slate-50 font-medium"
                  >
                    <option value="one_time">Một lần (Nhiệm vụ đặc biệt / Sự kiện)</option>
                    <option value="daily">Hàng ngày</option>
                    <option value="weekly">Hàng tuần</option>
                    <option value="monthly">Hàng tháng</option>
                    <option value="seasonal">Mùa giải</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Số lần yêu cầu hoàn thành</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={targetCount}
                  onChange={(e) => setTargetCount(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm bg-slate-50 font-mono"
                />
                <span className="text-[11px] text-slate-400">Với nhiệm vụ ngoài lề, thông thường đặt là 1 lần hoàn thành.</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Phần thưởng XP</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={xpReward}
                    onChange={(e) => setXpReward(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm bg-slate-50 font-mono font-bold text-emerald-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Phần thưởng Xu</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={coinReward}
                    onChange={(e) => setCoinReward(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm bg-slate-50 font-mono font-bold text-amber-600"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 text-xs bg-rose-50 text-rose-500 rounded-xl border border-rose-100 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-secondary font-bold text-sm rounded-xl shadow-md cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  editingQuest ? "Lưu Cập Nhật Nhiệm Vụ" : "Tạo Nhiệm Vụ Mới"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
