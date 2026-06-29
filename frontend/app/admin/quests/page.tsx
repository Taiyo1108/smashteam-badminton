"use client";

import { useEffect, useState } from "react";
import { 
  Sparkles, Plus, Loader2, X, Trash2, Eye, EyeOff, 
  Coins, Trophy, ChevronRight, CheckCircle2 
} from "lucide-react";
import { API_URL } from "@/app/config";

export default function AdminQuestsPage() {
  const [quests, setQuests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [questType, setQuestType] = useState<"daily" | "weekly" | "monthly" | "seasonal">("daily");
  const [actionType, setActionType] = useState<"check_in" | "play_matches" | "win_matches" | "custom">("play_matches");
  const [targetCount, setTargetCount] = useState(1);
  const [xpReward, setXpReward] = useState(30);
  const [coinReward, setCoinReward] = useState(15);

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

  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || targetCount <= 0 || xpReward < 0 || coinReward < 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/quests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          quest_type: questType,
          action_type: actionType,
          target_count: Number(targetCount),
          xp_reward: Number(xpReward),
          coin_reward: Number(coinReward)
        })
      });

      const data = await res.json();

      if (res.ok) {
        setIsModalOpen(false);
        setTitle("");
        setQuestType("daily");
        setActionType("play_matches");
        setTargetCount(1);
        setXpReward(30);
        setCoinReward(15);
        fetchQuests();
      } else {
        setError(data.error || "Không thể tạo nhiệm vụ.");
      }
    } catch (err) {
      setError("Lỗi kết nối.");
    } finally {
      setIsSubmitting(false);
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
        // Cập nhật state trực tiếp
        setQuests(quests.map(q => q.id === questId ? { ...q, is_active: !currentActive } : q));
      }
    } catch (e) {
      console.error("Error toggling quest:", e);
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-secondary tracking-tight">Cấu hình Nhiệm vụ Gamification</h1>
          <p className="text-slate-500 text-sm mt-1">Tạo nhiệm vụ và thiết lập lịch reset lặp lại định kỳ (Hàng ngày, Hàng tuần, Hàng tháng).</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-secondary hover:bg-primary-hover font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" /> Tạo Nhiệm Vụ
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : quests.length === 0 ? (
        <div className="p-16 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400">
          Chưa có nhiệm vụ nào được cấu hình trong hệ thống.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 pl-6">Nhiệm vụ</th>
                  <th className="p-4">Chu kỳ</th>
                  <th className="p-4">Hành động kích hoạt</th>
                  <th className="p-4">Yêu cầu</th>
                  <th className="p-4">Phần thưởng</th>
                  <th className="p-4 text-center">Trạng thái</th>
                  <th className="p-4 pr-6 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {quests.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6 font-bold text-secondary max-w-[200px] truncate">{q.title}</td>
                    <td className="p-4">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        q.quest_type === "daily" 
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                          : q.quest_type === "weekly"
                          ? "bg-blue-50 text-blue-600 border border-blue-100"
                          : q.quest_type === "monthly"
                          ? "bg-purple-50 text-purple-600 border border-purple-100"
                          : "bg-amber-50 text-amber-600 border border-amber-100"
                      }`}>
                        {q.quest_type === "daily" ? "Hàng ngày" : q.quest_type === "weekly" ? "Hàng tuần" : q.quest_type === "monthly" ? "Hàng tháng" : "Mùa giải"}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-600">{q.action_type}</td>
                    <td className="p-4 font-mono font-bold text-slate-700">{q.target_count} lần</td>
                    <td className="p-4">
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
                      <button
                        onClick={() => toggleQuest(q.id, q.is_active)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                          q.is_active 
                            ? "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600" 
                            : "bg-emerald-550/10 border-emerald-100 hover:bg-emerald-100 text-emerald-600"
                        }`}
                        title={q.is_active ? "Khóa nhiệm vụ" : "Kích hoạt nhiệm vụ"}
                      >
                        {q.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE QUEST MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-secondary mb-5 tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-primary" /> Thiết lập nhiệm vụ mới
            </h3>

            <form onSubmit={handleCreateQuest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tiêu đề nhiệm vụ</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chiến thắng 5 trận đấu đôi"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Chu kỳ lặp lại</label>
                  <select
                    value={questType}
                    onChange={(e) => setQuestType(e.target.value as any)}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm bg-slate-50"
                  >
                    <option value="daily">Hàng ngày</option>
                    <option value="weekly">Hàng tuần</option>
                    <option value="monthly">Hàng tháng</option>
                    <option value="seasonal">Mùa giải</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Hành động</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as any)}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm bg-slate-50"
                  >
                    <option value="play_matches">Chơi trận đấu</option>
                    <option value="win_matches">Thắng trận đấu</option>
                    <option value="check_in">Điểm danh sân</option>
                    <option value="custom">Nghiệp vụ khác</option>
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
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm bg-slate-50 font-mono"
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
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm bg-slate-50 font-mono"
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
                  "Tạo Nhiệm Vụ"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
