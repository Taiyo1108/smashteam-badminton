"use client";

import { useState, useEffect } from "react";
import { Search, CheckCircle2, XCircle, Loader2, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";

export default function PersonnelPage() {
  const [activeTab, setActiveTab] = useState<'candidates' | 'members'>('candidates');
  
  // States cho Candidates
  const [candidates, setCandidates] = useState<any[]>([]);
  const [cSearch, setCSearch] = useState("");
  const [cLevel, setCLevel] = useState("all");
  const [cSlot, setCSlot] = useState("all");
  const [isLoadingC, setIsLoadingC] = useState(false);
  const [slots, setSlots] = useState<any[]>([]);

  // States cho Members (có thể dùng chung state nhưng tách ra cho dễ quản lý)
  const [members, setMembers] = useState<any[]>([]);
  const [isLoadingM, setIsLoadingM] = useState(false);

  useEffect(() => {
    // Fetch Slots for filter dropdown
    fetch("http://localhost:5000/api/campaigns/active")
      .then(res => res.json())
      .then(data => {
        if (data && data.slots) setSlots(data.slots);
      });
  }, []);

  useEffect(() => {
    if (activeTab === 'candidates') {
      fetchCandidates();
    } else {
      fetchMembers();
    }
  }, [activeTab, cSearch, cLevel, cSlot]);

  const fetchCandidates = async () => {
    setIsLoadingC(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`http://localhost:5000/api/users/candidates?search=${cSearch}&level=${cLevel}&slot_id=${cSlot}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.map((c: any) => ({
          ...c,
          skills: typeof c.soft_skills === 'string' ? JSON.parse(c.soft_skills) : (c.soft_skills || [])
        })));
      }
    } catch (e) {} finally { setIsLoadingC(false); }
  };

  const fetchMembers = async () => {
    setIsLoadingM(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("http://localhost:5000/api/users/members", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setMembers(await res.json());
    } catch (e) {} finally { setIsLoadingM(false); }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Xác nhận duyệt ứng viên này thành viên chính thức?")) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`http://localhost:5000/api/users/${id}/approve`, {
        method: 'PUT',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setCandidates(candidates.filter(c => c.id !== id));
      }
    } catch (e) {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">Quản lý Nhân sự</h1>
          <p className="text-slate-500">Duyệt ứng viên mới và quản lý danh sách thành viên CLB.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('candidates')}
          className={`pb-3 px-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'candidates' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Ứng viên Casting
        </button>
        <button 
          onClick={() => setActiveTab('members')}
          className={`pb-3 px-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Thành viên chính thức
        </button>
      </div>

      {activeTab === 'candidates' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" placeholder="Tên hoặc SĐT..." 
                value={cSearch} onChange={e => setCSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <select value={cLevel} onChange={e => setCLevel(e.target.value)} className="p-2 text-sm border rounded-lg focus:ring-1 focus:ring-primary outline-none min-w-[150px]">
              <option value="all">Tất cả trình độ</option>
              <option value="Mới chơi">Mới chơi</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Khá/Giỏi">Khá/Giỏi</option>
            </select>
            <select value={cSlot} onChange={e => setCSlot(e.target.value)} className="p-2 text-sm border rounded-lg focus:ring-1 focus:ring-primary outline-none min-w-[180px]">
              <option value="all">Tất cả ca Casting</option>
              {slots.map(s => (
                <option key={s.id} value={s.id}>{format(new Date(s.casting_time), "HH:mm dd/MM")} - {s.location}</option>
              ))}
            </select>
          </div>

          {/* Table Candidates */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[300px] relative">
            {isLoadingC ? (
              <div className="absolute inset-0 flex items-center justify-center text-primary"><Loader2 className="animate-spin" /></div>
            ) : candidates.length === 0 ? (
              <div className="p-10 text-center text-slate-500">Không tìm thấy ứng viên nào phù hợp.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Họ tên & Liên hệ</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Khung giờ Casting</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Trình độ</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Duyệt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-bold text-secondary">{c.full_name}</p>
                        <p className="text-xs text-slate-500">{c.phone_zalo} • {c.academic_info}</p>
                      </td>
                      <td className="p-4">
                        {c.casting_time ? (
                          <span className="text-sm font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">
                            {format(new Date(c.casting_time), "HH:mm dd/MM")} ({c.location})
                          </span>
                        ) : <span className="text-xs text-slate-400">Chưa chọn</span>}
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded-full">{c.badminton_level}</span>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleApprove(c.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[300px]">
           <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Thành viên</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Elo Score</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Số trận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map(m => (
                <tr key={m.id}>
                  <td className="p-4 font-bold text-secondary">{m.full_name} <span className="text-xs text-slate-400 font-normal">({m.badminton_level})</span></td>
                  <td className="p-4 font-bold text-primary">{m.elo_score}</td>
                  <td className="p-4 text-sm">{m.total_matches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
