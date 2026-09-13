"use client";

import { useEffect, useState } from "react";
import {
  Plus, Trash2, Eye, EyeOff, Edit
} from "lucide-react";
import { API_URL } from "@/app/config";
import { PageHeader, Modal, EmptyState, CardSkeleton, PillButton, FormField } from "@/app/components/ui";

export default function AdminQuestsPage() {
  const [quests, setQuests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingQuest, setDeletingQuest] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleSaveQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || targetCount <= 0 || xpReward < 0 || coinReward < 0) return;

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
          title,
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
        setQuestType("daily");
        setActionType("play_matches");
        setTargetCount(1);
        setXpReward(30);
        setCoinReward(15);
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

  const handleDeleteQuest = async () => {
    if (!deletingQuest) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/quests/${deletingQuest.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDeletingQuest(null);
        setNotice(data.message || "Xóa nhiệm vụ thành công!");
        fetchQuests();
      } else {
        setNotice(null);
        setError(data.error || "Không thể xóa nhiệm vụ.");
        setDeletingQuest(null);
      }
    } catch (e) {
      setError("Lỗi kết nối.");
      setDeletingQuest(null);
    } finally {
      setIsDeleting(false);
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

  const handleOpenEditQuest = (q: any) => {
    setEditingQuest(q);
    setTitle(q.title);
    setQuestType(q.quest_type);
    setActionType(q.action_type);
    setTargetCount(q.target_count);
    setXpReward(q.xp_reward);
    setCoinReward(q.coin_reward);
    setIsModalOpen(true);
  };

  const handleOpenCreateQuest = () => {
    setEditingQuest(null);
    setTitle("");
    setQuestType("daily");
    setActionType("play_matches");
    setTargetCount(1);
    setXpReward(30);
    setCoinReward(15);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhiệm vụ Gamification"
        desc="Tạo nhiệm vụ và thiết lập lịch reset lặp lại định kỳ (Hàng ngày, Hàng tuần, Hàng tháng)."
        actions={
          <PillButton onClick={handleOpenCreateQuest}>
            <Plus className="w-4 h-4" /> Tạo Nhiệm Vụ
          </PillButton>
        }
      />

      {notice && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-2xl font-medium">
          {notice}
        </p>
      )}

      {isLoading ? (
        <CardSkeleton rows={5} />
      ) : quests.length === 0 ? (
        <EmptyState
          title="Chưa có nhiệm vụ nào"
          desc="Tạo nhiệm vụ đầu tiên để hội viên bắt đầu tích điểm."
          action={
            <PillButton onClick={handleOpenCreateQuest}>
              <Plus className="w-4 h-4" /> Tạo Nhiệm Vụ
            </PillButton>
          }
        />
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
                    <td className="p-4 tabular-nums font-bold text-slate-700">{q.target_count} lần</td>
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
                      <div className="flex justify-end items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditQuest(q)}
                          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all cursor-pointer active:scale-95"
                          title="Sửa nhiệm vụ"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
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
                        <button
                          onClick={() => setDeletingQuest(q)}
                          className="p-2 rounded-xl border border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all cursor-pointer active:scale-95"
                          title="Xóa nhiệm vụ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT QUEST MODAL */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingQuest ? "Chỉnh sửa nhiệm vụ" : "Thiết lập nhiệm vụ mới"}
      >
        <form onSubmit={handleSaveQuest} className="space-y-4">
          <FormField label="Tiêu đề nhiệm vụ">
            <input
              type="text"
              required
              placeholder="Ví dụ: Chiến thắng 5 trận đấu đôi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-black text-sm bg-slate-50"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Chu kỳ lặp lại">
              <select
                value={questType}
                onChange={(e) => setQuestType(e.target.value as any)}
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-black text-sm bg-slate-50"
              >
                <option value="daily">Hàng ngày</option>
                <option value="weekly">Hàng tuần</option>
                <option value="monthly">Hàng tháng</option>
                <option value="seasonal">Mùa giải</option>
              </select>
            </FormField>

            <FormField label="Hành động">
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value as any)}
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-black text-sm bg-slate-50"
              >
                <option value="play_matches">Chơi trận đấu</option>
                <option value="win_matches">Thắng trận đấu</option>
                <option value="check_in">Điểm danh sân</option>
                <option value="custom">Nghiệp vụ khác</option>
              </select>
            </FormField>
          </div>

          <FormField label="Số lần yêu cầu hoàn thành">
            <input
              type="number"
              required
              min={1}
              value={targetCount}
              onChange={(e) => setTargetCount(Number(e.target.value))}
              className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-black text-sm bg-slate-50 tabular-nums"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Phần thưởng XP">
              <input
                type="number"
                required
                min={0}
                value={xpReward}
                onChange={(e) => setXpReward(Number(e.target.value))}
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-black text-sm bg-slate-50 tabular-nums"
              />
            </FormField>

            <FormField label="Phần thưởng Xu">
              <input
                type="number"
                required
                min={0}
                value={coinReward}
                onChange={(e) => setCoinReward(Number(e.target.value))}
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-black text-sm bg-slate-50 tabular-nums"
              />
            </FormField>
          </div>

          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-500 rounded-xl border border-rose-100 font-medium">
              {error}
            </div>
          )}

          <PillButton type="submit" loading={isSubmitting} className="w-full">
            {editingQuest ? "Lưu Nhiệm Vụ" : "Tạo Nhiệm Vụ"}
          </PillButton>
        </form>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal
        open={!!deletingQuest}
        onClose={() => setDeletingQuest(null)}
        title="Xóa nhiệm vụ?"
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Xác nhận xóa hoàn toàn nhiệm vụ <strong>“{deletingQuest?.title}”</strong>? Hành động này sẽ xóa
          toàn bộ tiến trình liên quan của các hội viên.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <PillButton variant="ghost" onClick={() => setDeletingQuest(null)}>
            Hủy
          </PillButton>
          <PillButton variant="danger" loading={isDeleting} onClick={handleDeleteQuest}>
            Xóa nhiệm vụ
          </PillButton>
        </div>
      </Modal>
    </div>
  );
}
