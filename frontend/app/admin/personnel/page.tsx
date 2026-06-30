"use client";

import { useState, useEffect } from "react";
import { Search, CheckCircle2, Loader2, MoreHorizontal, X, ShieldAlert, Award, Ban, Unlock, Phone, Clock, Star, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { API_URL } from "@/app/config";

const softSkillsList = [
  "Chụp ảnh",
  "Quay dựng video",
  "Thiết kế",
  "Hỗ trợ chạy giải"
];

export default function PersonnelPage() {
  const [activeTab, setActiveTab] = useState<'candidates' | 'members'>('candidates');
  
  // States cho Candidates
  const [candidates, setCandidates] = useState<any[]>([]);
  const [cSearch, setCSearch] = useState("");
  const [cLevel, setCLevel] = useState("all");
  const [cSlot, setCSlot] = useState("all");
  const [isLoadingC, setIsLoadingC] = useState(false);
  const [slots, setSlots] = useState<any[]>([]);

  // States cho Members
  const [members, setMembers] = useState<any[]>([]);
  const [isLoadingM, setIsLoadingM] = useState(false);
  const [mSearch, setMSearch] = useState("");
  const [mLevel, setMLevel] = useState("all");
  const [mStatus, setMStatus] = useState("all");
  const [mSkill, setMSkill] = useState("all");

  // Modal Thao tác nhanh (Quick Actions)
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [quickRole, setQuickRole] = useState("member");
  const [quickStatus, setQuickStatus] = useState("active");
  const [eloType, setEloType] = useState<"singles" | "doubles">("singles");
  const [eloAmount, setEloAmount] = useState("");
  const [eloReason, setEloReason] = useState("");
  const [isUpdatingElo, setIsUpdatingElo] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // States cho Casting Assessment (Duyệt ứng viên & Đánh giá)
  const [assessmentCandidate, setAssessmentCandidate] = useState<any>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhoneZalo, setEditPhoneZalo] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAcademicInfo, setEditAcademicInfo] = useState("");
  const [selectedStars, setSelectedStars] = useState<number>(3); // 1-5 stars
  const [castingNotes, setCastingNotes] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);



  // Modal Chuyên Cần (Attendance Stats)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceUser, setAttendanceUser] = useState<any>(null);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  useEffect(() => {
    // Fetch Slots for filter dropdown
    fetch(`${API_URL}/api/campaigns/active`)
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
      const res = await fetch(`${API_URL}/api/users/candidates?search=${cSearch}&level=${cLevel}&slot_id=${cSlot}`, {
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
      const res = await fetch(`${API_URL}/api/users/members`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setMembers(await res.json());
      }
    } catch (e) {} finally { setIsLoadingM(false); }
  };

  const openAssessmentModal = (candidate: any) => {
    setAssessmentCandidate(candidate);
    setEditFullName(candidate.full_name);
    setEditPhoneZalo(candidate.phone_zalo);
    setEditEmail(candidate.email || "");
    setEditAcademicInfo(candidate.academic_info || "");
    
    // Map badminton_level to stars
    let defaultStars = 3;
    if (candidate.badminton_level === 'Mới chơi') {
      defaultStars = 2;
    } else if (candidate.badminton_level === 'Trung bình') {
      defaultStars = 3;
    } else if (candidate.badminton_level === 'Khá/Giỏi') {
      defaultStars = 4;
    }
    setSelectedStars(defaultStars);
    setCastingNotes("");
    setAssessmentError(null);
  };

  const handleRejectCandidate = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn loại bỏ ứng viên này khỏi danh sách tuyển chọn? Hành động này không thể hoàn tác.")) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/users/${id}`, {
        method: 'DELETE',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setCandidates(candidates.filter(c => c.id !== id));
        setAssessmentCandidate(null);
        alert("Đã loại bỏ ứng viên thành công.");
      } else {
        const data = await res.json();
        alert(data.error || "Không thể loại bỏ ứng viên.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    }
  };

  const handleSubmitApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessmentCandidate) return;
    if (!editFullName.trim() || !editPhoneZalo.trim() || !editAcademicInfo.trim() || !editEmail.trim()) {
      setAssessmentError("Vui lòng điền đầy đủ Họ tên, Số điện thoại, Email và Thông tin học vấn.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail.trim())) {
      setAssessmentError("Địa chỉ Email không đúng định dạng (Ví dụ: user@example.com).");
      return;
    }

    setIsApproving(true);
    setAssessmentError(null);

    // Map 1-5 stars to badminton_level database string
    let levelStr = 'Trung bình';
    if (selectedStars <= 2) {
      levelStr = 'Mới chơi';
    } else if (selectedStars === 3) {
      levelStr = 'Trung bình';
    } else {
      levelStr = 'Khá/Giỏi';
    }

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/users/${assessmentCandidate.id}/approve`, {
        method: 'PUT',
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          full_name: editFullName.trim(),
          phone_zalo: editPhoneZalo.trim(),
          email: editEmail.trim(),
          stars: selectedStars,
          academic_info: editAcademicInfo.trim(),
          badminton_level: levelStr,
          casting_notes: castingNotes.trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        // Remove from candidates list
        setCandidates(candidates.filter(c => c.id !== assessmentCandidate.id));
        setAssessmentCandidate(null);
        alert(`Đã duyệt thành viên ${editFullName.trim()} thành công và gửi email chào mừng!`);
      } else {
        setAssessmentError(data.error || "Duyệt ứng viên thất bại.");
      }
    } catch (err) {
      setAssessmentError("Lỗi kết nối đến máy chủ.");
    } finally {
      setIsApproving(false);
    }
  };

  // Quick Action functions
  const handleUpdateStatusBlock = async (memberId: string, status: string, isBlocked: boolean) => {
    setIsUpdatingStatus(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/users/${memberId}/status-block`, {
        method: 'PUT',
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status, is_blocked: isBlocked })
      });
      if (res.ok) {
        alert("Cập nhật trạng thái/khóa tài khoản thành công!");
        fetchMembers();
        if (selectedMember && selectedMember.id === memberId) {
          setSelectedMember((prev: any) => ({ ...prev, status, is_blocked: isBlocked }));
        }
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi khi cập nhật.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAdjustElo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eloAmount || isNaN(Number(eloAmount))) {
      alert("Vui lòng nhập số điểm ELO hợp lệ.");
      return;
    }
    setIsUpdatingElo(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/users/${selectedMember.id}/adjust-elo`, {
        method: 'PUT',
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ type: eloType, amount: Number(eloAmount), reason: eloReason })
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || "Cập nhật Elo thành công!");
        setEloAmount("");
        setEloReason("");
        fetchMembers();
        if (selectedMember) {
          setSelectedMember((prev: any) => ({
            ...prev,
            elo_singles: eloType === 'singles' ? prev.elo_singles + Number(eloAmount) : prev.elo_singles,
            elo_doubles: eloType === 'doubles' ? prev.elo_doubles + Number(eloAmount) : prev.elo_doubles
          }));
        }
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi khi cập nhật ELO.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    } finally {
      setIsUpdatingElo(false);
    }
  };

  const handleUpdateRole = async (memberId: string, role: string) => {
    setIsUpdatingRole(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/users/${memberId}/role`, {
        method: 'PUT',
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        alert("Cập nhật vai trò thành công!");
        fetchMembers();
        if (selectedMember && selectedMember.id === memberId) {
          setSelectedMember((prev: any) => ({ ...prev, role }));
        }
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi khi cập nhật vai trò.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const openAttendanceModal = async (member: any) => {
    setAttendanceUser(member);
    setAttendanceStats(null);
    setAttendanceHistory([]);
    setShowAttendanceModal(true);
    setIsLoadingAttendance(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/users/${member.id}/attendance-stats`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceStats(data.stats);
        setAttendanceHistory(data.history);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  const openActionsModal = (member: any) => {
    setSelectedMember(member);
    setQuickRole(member.role);
    setQuickStatus(member.status || "active");
    setEloType("singles");
    setEloAmount("");
    setEloReason("");
    setShowActionsModal(true);
  };

  // Client-side filtering for Members
  const filteredMembers = members.filter(m => {
    if (mSearch) {
      const s = mSearch.toLowerCase();
      const matchName = m.full_name?.toLowerCase().includes(s);
      const matchPhone = m.phone_zalo?.includes(s);
      if (!matchName && !matchPhone) return false;
    }
    if (mLevel !== "all") {
      if (m.badminton_level !== mLevel) return false;
    }
    if (mStatus !== "all") {
      const currentStatus = m.status || "active";
      if (currentStatus !== mStatus) return false;
    }
    if (mSkill !== "all") {
      let skillsArray = [];
      if (typeof m.soft_skills === 'string') {
        try { skillsArray = JSON.parse(m.soft_skills); } catch(e) {}
      } else if (Array.isArray(m.soft_skills)) {
        skillsArray = m.soft_skills;
      }
      if (!skillsArray.includes(mSkill)) return false;
    }
    return true;
  });

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

      {/* CANDIDATES TAB */}
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
                        <p className="text-xs text-slate-500">{c.phone_zalo} • {c.gender ? `${c.gender} • ` : ""}{c.academic_info}</p>
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
                        <button onClick={() => openAssessmentModal(c)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Duyệt ứng viên">
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

      {/* MEMBERS TAB */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Smart Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" placeholder="Tìm tên, SĐT thành viên..." 
                value={mSearch} onChange={e => setMSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <select value={mLevel} onChange={e => setMLevel(e.target.value)} className="p-2 text-sm border rounded-lg focus:ring-1 focus:ring-primary outline-none min-w-[140px]">
              <option value="all">Mọi trình độ</option>
              <option value="Mới chơi">Mới chơi</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Khá/Giỏi">Khá/Giỏi</option>
            </select>
            <select value={mStatus} onChange={e => setMStatus(e.target.value)} className="p-2 text-sm border rounded-lg focus:ring-1 focus:ring-primary outline-none min-w-[140px]">
              <option value="all">Mọi trạng thái</option>
              <option value="active">Hoạt động (Active)</option>
              <option value="inactive">Tạm nghỉ (Inactive)</option>
              <option value="left">Đã rời CLB (Left)</option>
            </select>
            <select value={mSkill} onChange={e => setMSkill(e.target.value)} className="p-2 text-sm border rounded-lg focus:ring-1 focus:ring-primary outline-none min-w-[180px]">
              <option value="all">Mọi kỹ năng mềm</option>
              {softSkillsList.map(skill => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
          </div>

          {/* Smart Table members */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[300px] relative">
            {isLoadingM ? (
              <div className="absolute inset-0 flex items-center justify-center text-primary"><Loader2 className="animate-spin" /></div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-10 text-center text-slate-500">Không tìm thấy thành viên nào khớp điều kiện.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Thành viên</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Trình độ & Lối chơi</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Elo Score</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Trạng thái</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Thống kê</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.map(m => {
                    const isBlocked = m.is_blocked;
                    const status = m.status || "active";
                    const isCurrentAdmin = m.role === "admin";
                    
                    return (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-bold text-secondary flex items-center gap-1.5">
                                {m.full_name}
                                {isCurrentAdmin && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">Admin</span>}
                              </p>
                              <p className="text-xs text-slate-400 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" /> {m.phone_zalo}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-semibold text-slate-700">{m.badminton_level}</p>
                          <p className="text-xs text-slate-400">
                            {m.hand_preference ? `Tay ${m.hand_preference === 'Right' ? 'Thuận' : 'Trái'}` : "Chưa chọn tay"} • {m.play_style || "Chưa chọn lối chơi"}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <span className="text-xs font-bold px-2 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded">
                              Đơn: {m.elo_singles ?? 1000}
                            </span>
                            <span className="text-xs font-bold px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded">
                              Đôi: {m.elo_doubles ?? 1000}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1 items-start">
                            {status === "active" ? (
                              <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">Hoạt động</span>
                            ) : status === "inactive" ? (
                              <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full">Tạm nghỉ</span>
                            ) : (
                              <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full">Đã rời CLB</span>
                            )}
                            
                            {isBlocked && (
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-600 rounded-full flex items-center gap-1">
                                <Ban className="w-2.5 h-2.5" /> Đã Khóa
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => openAttendanceModal(m)}
                            className="text-xs font-bold px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors"
                          >
                            Chuyên cần
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => openActionsModal(m)} 
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* MODAL THAO TÁC NHANH (QUICK ACTIONS) */}
      {showActionsModal && selectedMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
            {/* Header */}
            <div className="bg-slate-950 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xl">Thao tác nhanh</h3>
                <p className="text-xs text-slate-400 mt-1">Thành viên: {selectedMember.full_name} ({selectedMember.phone_zalo})</p>
              </div>
              <button 
                onClick={() => setShowActionsModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {/* 1. Đổi vai trò (Role) */}
              <div className="pb-6 border-b border-slate-100">
                <h4 className="font-bold text-sm text-secondary mb-3 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-primary" /> Quyền hạn (Role)
                </h4>
                <div className="flex items-center gap-3">
                  <select 
                    value={quickRole} 
                    onChange={e => setQuickRole(e.target.value)} 
                    className="p-2.5 text-sm border rounded-lg focus:ring-1 focus:ring-primary outline-none flex-1"
                  >
                    <option value="member">Thành viên chính thức (Member)</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                    <option value="candidate">Ứng viên Casting (Candidate)</option>
                  </select>
                  <button 
                    onClick={() => handleUpdateRole(selectedMember.id, quickRole)}
                    disabled={isUpdatingRole}
                    className="px-4 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors"
                  >
                    {isUpdatingRole ? "Lưu..." : "Cập nhật"}
                  </button>
                </div>
              </div>

              {/* 2. Điều chỉnh Elo */}
              <div className="pb-6 border-b border-slate-100">
                <h4 className="font-bold text-sm text-secondary mb-3 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-purple-600" /> Điều chỉnh điểm Elo
                </h4>
                <form onSubmit={handleAdjustElo} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Loại ELO</label>
                      <select 
                        value={eloType} 
                        onChange={e => setEloType(e.target.value as any)} 
                        className="w-full p-2.5 text-sm border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                      >
                        <option value="singles">Điểm Đơn (Singles)</option>
                        <option value="doubles">Điểm Đôi (Doubles)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Điểm điều chỉnh (vd: +15, -10)</label>
                      <input 
                        type="text" 
                        placeholder="+/- Điểm"
                        value={eloAmount} 
                        onChange={e => setEloAmount(e.target.value)} 
                        className="w-full p-2.5 text-sm border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Lý do điều chỉnh</label>
                    <input 
                      type="text" 
                      placeholder="Nhập lý do điều chỉnh..."
                      value={eloReason} 
                      onChange={e => setEloReason(e.target.value)} 
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                      required
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isUpdatingElo}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    {isUpdatingElo ? "Đang xử lý..." : "Cập nhật Elo"}
                  </button>
                </form>
              </div>

              {/* 3. Trạng thái & Khóa tài khoản */}
              <div>
                <h4 className="font-bold text-sm text-secondary mb-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" /> Trạng thái hoạt động & Bảo mật
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-sm font-semibold text-slate-600">Trạng thái CLB</span>
                    <select 
                      value={quickStatus} 
                      onChange={e => setQuickStatus(e.target.value)}
                      className="p-2 text-sm border rounded focus:ring-1 focus:ring-primary outline-none bg-white min-w-[120px]"
                    >
                      <option value="active">Hoạt động</option>
                      <option value="inactive">Tạm nghỉ</option>
                      <option value="left">Đã rời CLB</option>
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleUpdateStatusBlock(selectedMember.id, quickStatus, selectedMember.is_blocked)}
                      disabled={isUpdatingStatus}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
                    >
                      Lưu trạng thái CLB
                    </button>

                    {selectedMember.is_blocked ? (
                      <button
                        onClick={() => handleUpdateStatusBlock(selectedMember.id, quickStatus, false)}
                        disabled={isUpdatingStatus}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Unlock className="w-4 h-4" /> Mở khóa tài khoản
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (confirm("Khóa tài khoản sẽ chặn không cho người dùng này đăng nhập vào hệ thống ở các lần sau. Xác nhận khóa?")) {
                            handleUpdateStatusBlock(selectedMember.id, quickStatus, true);
                          }
                        }}
                        disabled={isUpdatingStatus}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Ban className="w-4 h-4" /> Khóa tài khoản
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Xóa vĩnh viễn tài khoản (Dangerous Action) */}
              <div className="pt-6 border-t border-slate-100">
                <h4 className="font-bold text-sm text-red-600 mb-3 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-600" /> Vùng nguy hiểm (Danger Zone)
                </h4>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col gap-3">
                  <p className="text-xs text-red-700 leading-relaxed font-medium">
                    Hành động này sẽ **xóa vĩnh viễn** tài khoản của {selectedMember.full_name} khỏi hệ thống, bao gồm tất cả dữ liệu ELO, lịch sử đấu và thành tích. Hành động này không thể hoàn tác!
                  </p>
                  <button
                    onClick={async () => {
                      if (confirm(`CẢNH BÁO: Bạn có chắc chắn muốn xóa tài khoản của thành viên ${selectedMember.full_name} vĩnh viễn? Tất cả dữ liệu liên quan sẽ bị xóa sạch.`)) {
                        try {
                          const token = localStorage.getItem("admin_token");
                          const res = await fetch(`${API_URL}/api/users/${selectedMember.id}`, {
                            method: 'DELETE',
                            headers: { "Authorization": `Bearer ${token}` }
                          });
                          if (res.ok) {
                            alert("Đã xóa tài khoản thành viên vĩnh viễn.");
                            setShowActionsModal(false);
                            fetchMembers();
                          } else {
                            const data = await res.json();
                            alert(data.error || "Không thể xóa tài khoản.");
                          }
                        } catch (e) {
                          alert("Lỗi kết nối.");
                        }
                      }
                    }}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                  >
                    Xóa tài khoản vĩnh viễn
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL THỐNG KÊ CHUYÊN CẦN */}
      {showAttendanceModal && attendanceUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
            {/* Header */}
            <div className="bg-indigo-950 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xl">Thống kê Chuyên cần</h3>
                <p className="text-xs text-indigo-300 mt-1">Hội viên: {attendanceUser.full_name}</p>
              </div>
              <button 
                onClick={() => setShowAttendanceModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {isLoadingAttendance ? (
                <div className="py-20 flex justify-center text-primary"><Loader2 className="animate-spin w-8 h-8" /></div>
              ) : !attendanceStats ? (
                <div className="py-10 text-center text-slate-500">Không có dữ liệu chuyên cần cho hội viên này.</div>
              ) : (
                <div className="space-y-6">
                  {/* Stats Overview */}
                  <div className="grid grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                    <div className="col-span-2 text-center py-2">
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tỷ lệ Chuyên cần</p>
                      <h4 className="text-4xl font-extrabold text-indigo-700 mt-1">{attendanceStats.attendance_rate}%</h4>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-indigo-50 text-center shadow-sm">
                      <p className="text-xs text-slate-400 font-bold">Tham gia</p>
                      <p className="text-lg font-bold text-emerald-600 mt-0.5">{attendanceStats.attended_sessions} buổi</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-indigo-50 text-center shadow-sm">
                      <p className="text-xs text-slate-400 font-bold">Vắng</p>
                      <p className="text-lg font-bold text-red-600 mt-0.5">{attendanceStats.absent_sessions} buổi</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-indigo-50 text-center shadow-sm col-span-2">
                      <p className="text-xs text-slate-400 font-bold">Chưa RSVP / Không rõ</p>
                      <p className="text-sm font-semibold text-slate-500 mt-0.5">{attendanceStats.no_rsvp_sessions} buổi tập</p>
                    </div>
                  </div>

                  {/* History Details */}
                  <div>
                    <h4 className="font-bold text-sm text-secondary mb-3">Lịch sử điểm danh</h4>
                    {attendanceHistory.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4 bg-slate-50 border rounded-lg">Chưa có lịch sử buổi tập nào trong hệ thống.</p>
                    ) : (
                      <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                        {attendanceHistory.map((item, index) => {
                          const status = item.attendance_status;
                          return (
                            <div key={index} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-200 transition-colors shadow-sm">
                              <div>
                                <p className="text-xs font-bold text-secondary line-clamp-1">{item.title}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {format(new Date(item.date_time), "HH:mm dd/MM/yyyy")}
                                </p>
                              </div>
                              <div>
                                {status === 'going' ? (
                                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded">Tham gia</span>
                                ) : status === 'absent' ? (
                                  <span className="text-[10px] font-bold bg-red-50 text-red-700 border border-red-100 px-2 py-1 rounded">Vắng mặt</span>
                                ) : (
                                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 px-2 py-1 rounded">Chưa RSVP</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ĐÁNH GIÁ CHUYÊN MÔN & PHÂN LOẠI (CASTING ASSESSMENT) */}
      {assessmentCandidate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-purple-950/40 rounded-3xl shadow-2xl overflow-hidden text-white bg-radial-gradient relative animate-fade-in my-8">
            {/* Header */}
            <div className="p-6 border-b border-purple-950/30 flex justify-between items-center bg-slate-950/50">
              <div>
                <h3 className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-smash-violet" /> Xác nhận & Đánh giá Tuyển chọn
                </h3>
                <p className="text-xs text-slate-400 mt-1">Buổi tuyển chọn cho ứng viên: {assessmentCandidate.full_name}</p>
              </div>
              <button 
                onClick={() => setAssessmentCandidate(null)}
                className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitApprove} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cột trái: Chuẩn hóa thông tin cá nhân */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-smash-violet tracking-wider">1. Chuẩn hóa thông tin cá nhân</h4>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Họ và tên</label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full bg-slate-950 border border-purple-950/40 rounded-xl p-3 text-sm focus:outline-none focus:border-smash-violet transition-all text-white font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Số điện thoại Zalo</label>
                    <input
                      type="text"
                      required
                      value={editPhoneZalo}
                      onChange={(e) => setEditPhoneZalo(e.target.value)}
                      className="w-full bg-slate-950 border border-purple-950/40 rounded-xl p-3 text-sm focus:outline-none focus:border-smash-violet transition-all text-white font-semibold font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Địa chỉ Email</label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-purple-950/40 rounded-xl p-3 text-sm focus:outline-none focus:border-smash-violet transition-all text-white font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Trường đại học / Học vấn</label>
                    <input
                      type="text"
                      required
                      value={editAcademicInfo}
                      onChange={(e) => setEditAcademicInfo(e.target.value)}
                      className="w-full bg-slate-950 border border-purple-950/40 rounded-xl p-3 text-sm focus:outline-none focus:border-smash-violet transition-all text-white font-semibold"
                    />
                  </div>
                </div>

                {/* Cột phải: Phân loại trình độ */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-smash-violet tracking-wider">2. Đánh giá trình độ</h4>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Trình độ thực tế (Đánh test)</label>
                    
                    {/* Stars Selector (1-5 sao) */}
                    <div className="flex items-center gap-2 bg-slate-950 p-4 rounded-2xl border border-purple-950/30 justify-center">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = star <= selectedStars;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setSelectedStars(star)}
                            className="p-1 hover:scale-125 transition-all text-amber-400 cursor-pointer"
                          >
                            <Star className={`w-8 h-8 ${active ? "fill-amber-400 text-amber-400" : "text-slate-600"}`} />
                          </button>
                        );
                      })}
                    </div>

                    {/* Star Level Description Text */}
                    <div className="bg-slate-950/50 p-3.5 rounded-xl border border-purple-950/10 text-center text-xs">
                      {selectedStars === 1 && (
                        <p className="text-slate-300">⭐ <span className="font-bold text-amber-400">1 Sao:</span> Mới bắt đầu chơi, chưa nắm vững bộ môn.</p>
                      )}
                      {selectedStars === 2 && (
                        <p className="text-slate-300">⭐⭐ <span className="font-bold text-amber-400">2 Sao:</span> Biết chơi cơ bản, di chuyển còn chậm.</p>
                      )}
                      {selectedStars === 3 && (
                        <p className="text-slate-300">⭐⭐⭐ <span className="font-bold text-amber-400">3 Sao:</span> Trung bình, có thể tham gia giao lưu ELO.</p>
                      )}
                      {selectedStars === 4 && (
                        <p className="text-slate-300">⭐⭐⭐⭐ <span className="font-bold text-amber-400">4 Sao:</span> Trình độ khá, kỹ thuật tốt, di chuyển nhịp nhàng.</p>
                      )}
                      {selectedStars === 5 && (
                        <p className="text-slate-300">⭐⭐⭐⭐⭐ <span className="font-bold text-amber-400">5 Sao:</span> Trình độ giỏi, đẳng cấp tuyển thủ hoặc cận chuyên nghiệp.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nhận xét chuyên môn */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-black uppercase text-smash-violet tracking-wider">3. Nhận xét chuyên môn</h4>
                <textarea
                  placeholder="Ví dụ: Kỹ năng đập lưới nhanh, lực đập tốt. Thể lực di chuyển cuối sân cần rèn luyện thêm..."
                  value={castingNotes}
                  onChange={(e) => setCastingNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-purple-950/40 rounded-2xl p-4 text-sm focus:outline-none focus:border-smash-violet transition-all text-white font-medium h-24 resize-none"
                />
              </div>

              {/* Error messages */}
              {assessmentError && (
                <div className="p-4 bg-rose-950/30 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-bold leading-relaxed">
                  {assessmentError}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleRejectCandidate(assessmentCandidate.id)}
                  className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 hover:text-rose-400 text-slate-300 font-bold text-sm rounded-xl transition-all cursor-pointer text-center"
                >
                  Loại bỏ ứng viên
                </button>
                <button
                  type="submit"
                  disabled={isApproving}
                  className="flex-1 py-3.5 bg-smash-purple hover:bg-smash-violet text-white font-bold text-sm rounded-xl shadow-lg shadow-smash-purple/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang duyệt...
                    </>
                  ) : (
                    "Xác nhận & Gia nhập CLB"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
