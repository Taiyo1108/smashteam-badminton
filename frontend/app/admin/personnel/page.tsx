"use client";

import { useState, useEffect, useDeferredValue, useRef } from "react";
import { 
  Search, CheckCircle2, Loader2, MoreHorizontal, X, ShieldAlert, Award, Ban, Unlock, 
  Phone, Clock, Star, Copy, Check, Plus, Calendar, MapPin, Edit, Trash2, Power,
  PowerOff, Save, Download, QrCode, Upload, ExternalLink, AlertCircle, AlertTriangle,
  Tag, Coins, Flame, UserCheck, Eye, Shield, Activity, Sparkles, Filter
} from "lucide-react";
import { API_URL } from "@/app/config";
import { formatVietnamDate, toVietnamDatetimeInput, vietnamInputToIso } from "@/app/utils/date";
import { getRankName, getRankBadgeClass } from "@/app/utils/rank";
import RecruitmentKPIs from "@/app/components/recruitment/RecruitmentKPIs";
import ApplicantTable from "@/app/components/recruitment/ApplicantTable";
import ApplicantDetailDrawer from "@/app/components/recruitment/ApplicantDetailDrawer";
import CustomQuestionsEditor from "@/app/components/recruitment/CustomQuestionsEditor";
import { parseQuestions, type CustomQuestion } from "@/app/components/recruitment/customQuestions";
import Member360Modal from "@/app/components/admin/Member360Modal";

const softSkillsList = [
  "Chụp ảnh",
  "Quay dựng video",
  "Thiết kế",
  "Hỗ trợ chạy giải"
];

const functionalTagsList = [
  "Vận động viên",
  "Ban truyền thông",
  "Designer",
  "MC & Hoạt náo",
  "Ban tổ chức giải",
  "Thành viên nòng cốt",
  "Thành viên mới"
];

export default function PersonnelPage() {
  const [activeTab, setActiveTab] = useState<'candidates' | 'members' | 'campaigns'>('candidates');
  
  // States cho Candidates
  const [candidates, setCandidates] = useState<any[]>([]);
  const [cSearch, setCSearch] = useState("");
  // Debounce tìm kiếm server-side: chỉ gọi API khi user ngừng gõ
  const deferredCSearch = useDeferredValue(cSearch);
  const abortRef = useRef<AbortController | null>(null);
  const [cLevel, setCLevel] = useState("all");
  const [cSlot, setCSlot] = useState("all");
  // Đợt casting đang xem — dashboard độc lập theo từng đợt, không gộp chung.
  // "" = chưa chọn (đang tải), luôn auto-chọn đợt đang active sau khi load campaigns.
  const [cCampaign, setCCampaign] = useState(""); // Lọc ứng viên theo đợt casting
  const [isLoadingC, setIsLoadingC] = useState(false);
  const [slots, setSlots] = useState<any[]>([]);
  const [drawerCandidate, setDrawerCandidate] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // States cho Members
  const [members, setMembers] = useState<any[]>([]);
  const [isLoadingM, setIsLoadingM] = useState(false);
  const [mSearch, setMSearch] = useState("");
  const [mLevel, setMLevel] = useState("all");
  const [mRank, setMRank] = useState("all");
  const [mStatus, setMStatus] = useState("all");
  const [mSkill, setMSkill] = useState("all");
  const [mActivated, setMActivated] = useState<"all" | "activated" | "pending">("all");
  const [mAttentionFilter, setMAttentionFilter] = useState<string>("all");
  const [mTagFilter, setMTagFilter] = useState<string>("all");

  // States cho Member 360 Hub Modal
  const [member360Id, setMember360Id] = useState<string | null>(null);
  const [isMember360Open, setIsMember360Open] = useState(false);

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

  // States cho Campaigns
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [campaignStats, setCampaignStats] = useState<any>(null);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [cForm, setCForm] = useState({
    name: "",
    start: "",
    end: "",
    active: true,
    zalo_qr_url: "",
    zalo_group_link: ""
  });
  const [isUploadingZaloQr, setIsUploadingZaloQr] = useState(false);
  const zaloQrFileInputRef = useRef<HTMLInputElement>(null);
  const [sForm, setSForm] = useState({ time: "", location: "", max: "20" });
  // Bộ câu hỏi tùy chỉnh của đợt tuyển (hiển thị sau bước 2 ở form ứng tuyển)
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);

  const handleUploadZaloQr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingZaloQr(true);
      const token = localStorage.getItem("admin_token");
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${API_URL}/api/campaigns/upload-zalo-qr`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setCForm(prev => ({ ...prev, zalo_qr_url: data.url }));
      } else {
        alert(data.error || "Không thể tải ảnh QR lên.");
      }
    } catch (err) {
      alert("Lỗi kết nối khi tải ảnh lên.");
    } finally {
      setIsUploadingZaloQr(false);
      if (zaloQrFileInputRef.current) zaloQrFileInputRef.current.value = "";
    }
  };

  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/campaigns`, { headers: { "Authorization": `Bearer ${token}` } });
      if (res.ok) setCampaigns(await res.json());
    } catch (e) {}
  };

  const fetchCampaignStats = async (id: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/campaigns/${id}/stats`, { headers: { "Authorization": `Bearer ${token}` } });
      if (res.ok) setCampaignStats(await res.json());
    } catch (e) {}
  };

  useEffect(() => {
    if (selectedCampaign) {
      fetchCampaignStats(selectedCampaign.id);
      setCForm({
        name: selectedCampaign.name,
        start: toVietnamDatetimeInput(selectedCampaign.start_date),
        end: toVietnamDatetimeInput(selectedCampaign.end_date),
        active: selectedCampaign.is_active,
        zalo_qr_url: selectedCampaign.zalo_qr_url || "",
        zalo_group_link: selectedCampaign.zalo_group_link || ""
      });
      setCustomQuestions(parseQuestions(selectedCampaign.custom_questions));
      setIsCreatingCampaign(false);
    }
  }, [selectedCampaign]);

  const handleCreateOrUpdateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("admin_token");
      const url = selectedCampaign && !isCreatingCampaign
        ? `${API_URL}/api/campaigns/${selectedCampaign.id}`
        : `${API_URL}/api/campaigns`;
      const method = selectedCampaign && !isCreatingCampaign ? "PUT" : "POST";

      const cleanedQuestions = customQuestions
        .filter((q) => q.label.trim())
        .map((q) => ({
          ...q,
          label: q.label.trim(),
          options: (q.options || []).map((o) => o.trim()).filter(Boolean),
        }));

      const res = await fetch(url, {
        method,
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cForm.name,
          start_date: vietnamInputToIso(cForm.start),
          end_date: vietnamInputToIso(cForm.end),
          is_active: cForm.active,
          custom_questions: cleanedQuestions,
          zalo_qr_url: cForm.zalo_qr_url || null,
          zalo_group_link: cForm.zalo_group_link || null
        })
      });
      if (res.ok) {
        const saved = await res.json();
        alert("Lưu Đợt tuyển thành công!");
        setIsCreatingCampaign(false);
        setCustomQuestions(parseQuestions(saved.custom_questions));
        if (saved && saved.id) setSelectedCampaign(saved);
        fetchCampaigns();
        if (selectedCampaign) fetchCampaignStats(selectedCampaign.id);
        else if (saved && saved.id) fetchCampaignStats(saved.id);
      }
    } catch (e) {}
  };

  // Kích hoạt 1 đợt tuyển ngay trên thẻ (đợt đang chạy khác sẽ tự chuyển vào lịch sử)
  const handleActivateCampaign = async (c: any) => {
    if (c.is_active) return;
    if (!confirm(`Kích hoạt đợt tuyển "${c.name}"?\nĐợt đang chạy hiện tại sẽ tự chuyển vào lịch sử.`)) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/campaigns/${c.id}/toggle-active`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || `Đã kích hoạt đợt tuyển "${c.name}"!`);
        await fetchCampaigns();
        if (data.campaign) {
          setSelectedCampaign(data.campaign);
          fetchCampaignStats(data.campaign.id);
        }
      } else {
        alert(data.error || "Không thể kích hoạt đợt tuyển.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/campaigns/${selectedCampaign.id}/slots`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          casting_time: vietnamInputToIso(sForm.time),
          location: sForm.location,
          max_capacity: parseInt(sForm.max)
        })
      });
      if (res.ok) {
        setSForm({ time: "", location: "", max: "20" });
        fetchCampaignStats(selectedCampaign.id);
      }
    } catch (e) {}
  };

  const handleToggleSlot = async (slot: any) => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/campaigns/slots/${slot.id}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          casting_time: slot.casting_time,
          location: slot.location,
          max_capacity: slot.max_capacity,
          is_active: !slot.is_active
        })
      });
      if (res.ok) fetchCampaignStats(selectedCampaign.id);
    } catch (e) {}
  };

  const handleDeleteCampaign = async () => {
    if (!selectedCampaign) return;
    const count = campaignStats?.total_registered ?? 0;
    if (!confirm(`Xóa đợt tuyển "${selectedCampaign.name}"?\nCác ca casting trong đợt sẽ bị xóa theo${count > 0 ? `, ${count} ứng viên đã đăng ký sẽ bị gỡ khỏi ca` : ""}. Không thể hoàn tác!`)) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/campaigns/${selectedCampaign.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(data.message || "Đã xóa đợt tuyển.");
        setSelectedCampaign(null);
        setCampaignStats(null);
        fetchCampaigns();
      } else {
        alert(data.error || "Không thể xóa đợt tuyển.");
      }
    } catch (e) {
      alert("Lỗi kết nối mạng.");
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa ca casting này không?")) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/campaigns/slots/${slotId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCampaignStats(selectedCampaign.id);
      } else {
        const err = await res.json();
        alert(err.error || "Không thể xóa ca này.");
      }
    } catch (e) {
      alert("Lỗi kết nối mạng.");
    }
  };

  const [exportingSlotId, setExportingSlotId] = useState<string | null>(null);

  // Xuất danh sách ứng viên của 1 ca casting ra file CSV (tải trực tiếp)
  const handleExportSlotCsv = async (slot: any) => {
    try {
      setExportingSlotId(String(slot.id));
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/campaigns/slots/${slot.id}/export-csv`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Không thể xuất file CSV.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disp = res.headers.get("Content-Disposition") || "";
      const m = disp.match(/filename="?([^"]+)"?/);
      a.href = url;
      a.download = m?.[1] || `ung-vien-ca-casting.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Lỗi kết nối mạng.");
    } finally {
      setExportingSlotId(null);
    }
  };

  // Slots theo đợt casting đang chọn (để lọc ca + tính chỉ tiêu KPI)
  // Mỗi đợt độc lập: chỉ lấy slots của đúng campaignId đang chọn.
  const fetchSlotsForCampaign = async (campaignId: string) => {
    try {
      if (!campaignId) {
        setSlots([]);
        return;
      }
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/campaigns/${campaignId}/stats`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      } else {
        setSlots([]);
      }
    } catch (e) {
      setSlots([]);
    }
  };

  // Auto-chọn đợt đang active (hoặc đợt mới nhất) ngay khi load xong campaigns
  // để dashboard luôn hiển thị độc lập theo 1 đợt cụ thể, không gộp "Tất cả".
  useEffect(() => {
    if (!cCampaign && campaigns.length > 0) {
      const active = campaigns.find((c: any) => c.is_active) || campaigns[0];
      if (active) setCCampaign(String(active.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns]);

  // Đổi đợt casting -> nạp lại slots của đợt + reset lọc ca
  useEffect(() => {
    fetchSlotsForCampaign(cCampaign);
    setCSlot("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cCampaign]);

  useEffect(() => {
    if (activeTab === 'candidates') {
      // Chưa chọn đợt -> chỉ nạp danh sách đợt để auto-chọn, không nạp hồ sơ gộp.
      if (!cCampaign) {
        fetchCampaigns();
        return;
      }
      fetchCandidates();
      fetchMembers(cCampaign);
      fetchCampaigns();
    } else if (activeTab === 'members') {
      fetchMembers();
    } else if (activeTab === 'campaigns') {
      fetchCampaigns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, deferredCSearch, cLevel, cSlot, cCampaign]);

  const fetchCandidates = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setIsLoadingC(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/users/candidates?search=${encodeURIComponent(deferredCSearch)}&level=${cLevel}&slot_id=${cSlot}&campaign_id=${cCampaign}`, {
        headers: { "Authorization": `Bearer ${token}` },
        signal: ctrl.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.map((c: any) => ({
          ...c,
          skills: typeof c.soft_skills === 'string' ? JSON.parse(c.soft_skills) : (c.soft_skills || [])
        })));
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error(e);
    } finally {
      if (!ctrl.signal.aborted) setIsLoadingC(false);
    }
  };

  const fetchMembers = async (campaignId?: string) => {
    setIsLoadingM(true);
    try {
      const token = localStorage.getItem("admin_token");
      const q = campaignId ? `?campaign_id=${campaignId}` : "";
      const res = await fetch(`${API_URL}/api/users/members${q}`, {
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

  const handleCopyClaimLink = (member: any) => {
    const host = typeof window !== 'undefined' ? window.location.origin : '';
    const text = `🏸 Chào ${member.full_name}, bạn đã được duyệt trở thành thành viên chính thức của CLB Cầu Lông SmashTeam!\nVui lòng truy cập đường dẫn sau để kích hoạt thẻ vận động viên và đặt mật khẩu đăng nhập:\n👉 ${host}/claim-account\n📱 SĐT Zalo: ${member.phone_zalo}\n🔑 Mã PIN xác thực CLB: 123456\n\nHẹn gặp bạn trên sân nhé!`;
    navigator.clipboard.writeText(text);
    alert(`Đã sao chép tin nhắn kích hoạt cho ${member.full_name}!\nBạn có thể dán gửi trực tiếp qua Zalo cho thành viên.`);
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

  // Dữ liệu dashboard độc lập theo từng đợt:
  // Backend đã lọc sẵn theo ?campaign_id= (candidates + members),
  // client chỉ lọc dự phòng khi slots của đợt đã load xong để chống lẫn đợt.
  const slotIdsOfCampaign = new Set(slots.map((s: any) => String(s.id)));
  const inSelectedCampaign = (slotId: unknown) => {
    if (!cCampaign) return true; // đang tải đợt -> giữ nguyên để tránh nháy rỗng
    if (slotIdsOfCampaign.size === 0) return false; // đợt chưa có ca -> không tính hồ sơ vãng lai
    return slotIdsOfCampaign.has(String(slotId));
  };

  const campaignCandidates = candidates.filter((c: any) => inSelectedCampaign(c.casting_slot_id));
  const campaignMembers = members.filter((m: any) => inSelectedCampaign(m.casting_slot_id));
  const approvedMembersCount = campaignMembers.filter(
    (m: any) => m.full_name !== "Super Admin" && m.phone_zalo !== "0999999999"
  ).length;

  // Đợt đang chọn + chỉ tiêu riêng của đợt (độc lập tuyệt đối)
  const selectedCampaignObj =
    campaigns.find((c: any) => String(c.id) === String(cCampaign)) ?? null;
  const selectedCampaignName = selectedCampaignObj?.name ?? null;
  const campaignCapacity =
    slots.reduce((acc, s) => acc + (Number(s.max_capacity) || 0), 0) ||
    Number(selectedCampaignObj?.total_capacity) ||
    Number(selectedCampaignObj?.target_capacity) ||
    20;

  // Derived Attention Center counts
  const redCardMembers = members.filter(m => (m.active_red_cards || 0) > 0);
  const yellowCardMembers = members.filter(m => (m.active_yellow_cards || 0) > 0);
  const lowAttendanceMembers = members.filter(m => (m.total_reservations || 0) > 0 && (m.attendance_rate || 0) < 50);
  const noShowMembers = members.filter(m => (m.no_show_count || 0) >= 1);
  const inactive30dMembers = members.filter(m => {
    if (!m.last_active) return true;
    const diffDays = (Date.now() - new Date(m.last_active).getTime()) / (1000 * 3600 * 24);
    return diffDays > 30;
  });
  const pendingActivationMembers = members.filter(m => !m.is_activated);

  // Client-side filtering for Members
  const filteredMembers = members.filter(m => {
    if (mSearch) {
      const s = mSearch.toLowerCase();
      const matchName = m.full_name?.toLowerCase().includes(s);
      const matchPhone = m.phone_zalo?.includes(s);
      const matchNick = m.nickname?.toLowerCase().includes(s);
      if (!matchName && !matchPhone && !matchNick) return false;
    }

    // Attention Center Filters
    if (mAttentionFilter === "red_cards") {
      if ((m.active_red_cards || 0) <= 0) return false;
    } else if (mAttentionFilter === "yellow_cards") {
      if ((m.active_yellow_cards || 0) <= 0) return false;
    } else if (mAttentionFilter === "low_attendance") {
      if ((m.total_reservations || 0) === 0 || (m.attendance_rate || 0) >= 50) return false;
    } else if (mAttentionFilter === "no_show") {
      if ((m.no_show_count || 0) < 1) return false;
    } else if (mAttentionFilter === "inactive_30d") {
      if (m.last_active) {
        const diffDays = (Date.now() - new Date(m.last_active).getTime()) / (1000 * 3600 * 24);
        if (diffDays <= 30) return false;
      }
    } else if (mAttentionFilter === "pending_activation") {
      if (m.is_activated) return false;
    }

    // Functional Tag Filter
    if (mTagFilter !== "all") {
      const tags = Array.isArray(m.tags) ? m.tags : [];
      if (!tags.includes(mTagFilter)) return false;
    }

    if (mLevel !== "all") {
      if (m.badminton_level !== mLevel) return false;
    }
    if (mRank !== "all") {
      const highestElo = Math.max(m.elo_singles ?? 1000, m.elo_doubles ?? 1000);
      const userRank = getRankName(highestElo);
      if (userRank !== mRank) return false;
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
    if (mActivated !== "all") {
      const isAct = Boolean(m.is_activated);
      if (mActivated === "activated" && !isAct) return false;
      if (mActivated === "pending" && isAct) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">Quản lý Nhân sự</h1>
          <p className="text-slate-500">Duyệt ứng viên mới, quản lý danh sách thành viên CLB và các đợt tuyển thành viên.</p>
        </div>
        {activeTab === 'campaigns' && (
          <button 
            onClick={() => { setIsCreatingCampaign(true); setSelectedCampaign(null); setCForm({ name: "", start: "", end: "", active: true, zalo_qr_url: "", zalo_group_link: "" }); setCustomQuestions([]); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-black/85 text-white rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Đợt mới
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('candidates')}
          className={`pb-3 px-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'candidates' ? 'border-black text-black' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Ứng viên Casting
        </button>
        <button 
          onClick={() => setActiveTab('members')}
          className={`pb-3 px-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'members' ? 'border-black text-black' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Thành viên chính thức
        </button>
        <button 
          onClick={() => setActiveTab('campaigns')}
          className={`pb-3 px-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'campaigns' ? 'border-black text-black' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Đợt tuyển thành viên
        </button>
      </div>

      {/* CANDIDATES TAB (MODULE 2B - ADMIN RECRUITMENT DASHBOARD) */}
      {activeTab === 'candidates' && (
        <div className="space-y-6">
          {/* Bộ lọc Đợt casting — mỗi đợt độc lập tuyệt đối */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-primary" /> Đợt casting:
            </span>
            <select
              value={cCampaign}
              onChange={e => setCCampaign(e.target.value)}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-primary cursor-pointer min-w-[220px] max-w-full"
            >
              {campaigns.length === 0 && (
                <option value="">Đang tải đợt tuyển...</option>
              )}
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>
                  {c.is_active ? "● " : ""}{c.name}
                </option>
              ))}
            </select>
            {cCampaign && (
              <span className="text-[11px] text-slate-400 font-semibold">
                {slots.length} ca • {campaignCandidates.length} hồ sơ • {approvedMembersCount} đã duyệt — số liệu riêng đợt này
              </span>
            )}
          </div>

          {/* Mini KPI Cards & Distributions */}
          <RecruitmentKPIs
            candidates={campaignCandidates}
            approvedCount={approvedMembersCount}
            campaignName={selectedCampaignName}
            totalSlotsCapacity={campaignCapacity}
          />

          {/* Modern Applicant Data Table */}
          <ApplicantTable
            key={cCampaign}
            candidates={campaignCandidates}
            isLoading={isLoadingC}
            slots={slots}
            questionLabels={parseQuestions(selectedCampaignObj?.custom_questions).map((q) => q.label)}
            onOpenDetail={(c) => {
              setDrawerCandidate(c);
              setIsDrawerOpen(true);
            }}
            onApprove={(c) => {
              openAssessmentModal(c);
            }}
            onReject={(id) => {
              handleRejectCandidate(String(id));
            }}
          />

          {/* Applicant Detail Drawer */}
          <ApplicantDetailDrawer
            candidate={drawerCandidate}
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            onApprove={(c) => {
              setIsDrawerOpen(false);
              openAssessmentModal(c);
            }}
            onReject={(id) => {
              setIsDrawerOpen(false);
              handleRejectCandidate(String(id));
            }}
          />
        </div>
      )}

      {/* MEMBERS TAB */}
      {activeTab === 'members' && (
        <div className="space-y-5">
          {/* ========================================================= */}
          {/* ATTENTION CENTER (TRUNG TÂM CẢNH BÁO NHÂN SỰ) */}
          {/* ========================================================= */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Trung tâm Cảnh báo Nhân sự (Attention Center)
                </h3>
              </div>
              {mAttentionFilter !== "all" && (
                <button
                  onClick={() => setMAttentionFilter("all")}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Xóa bộ lọc cảnh báo
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {/* 1. Tất cả thành viên */}
              <button
                type="button"
                onClick={() => setMAttentionFilter("all")}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                  mAttentionFilter === "all"
                    ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/30"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${mAttentionFilter === "all" ? "text-slate-400" : "text-slate-500"}`}>
                    Tất cả CLB
                  </span>
                  <Award className={`w-3.5 h-3.5 ${mAttentionFilter === "all" ? "text-purple-300" : "text-slate-400"}`} />
                </div>
                <p className="text-xl font-black mt-1 font-mono">{members.length}</p>
                <span className={`text-[10px] mt-0.5 block ${mAttentionFilter === "all" ? "text-slate-300" : "text-slate-400"}`}>
                  Thành viên
                </span>
              </button>

              {/* 2. Thẻ đỏ đang phạt */}
              <button
                type="button"
                onClick={() => setMAttentionFilter(mAttentionFilter === "red_cards" ? "all" : "red_cards")}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                  mAttentionFilter === "red_cards"
                    ? "bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-600/30"
                    : redCardMembers.length > 0
                    ? "bg-rose-50/80 text-rose-900 border-rose-200 hover:bg-rose-100 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs opacity-80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${mAttentionFilter === "red_cards" ? "text-rose-100" : "text-rose-600"}`}>
                    Thẻ đỏ
                  </span>
                  <ShieldAlert className={`w-3.5 h-3.5 ${mAttentionFilter === "red_cards" ? "text-white" : "text-rose-600"}`} />
                </div>
                <p className="text-xl font-black mt-1 font-mono">{redCardMembers.length}</p>
                <span className={`text-[10px] mt-0.5 block ${mAttentionFilter === "red_cards" ? "text-rose-100" : "text-slate-500"}`}>
                  Đang đình chỉ
                </span>
              </button>

              {/* 3. Thẻ vàng còn hiệu lực */}
              <button
                type="button"
                onClick={() => setMAttentionFilter(mAttentionFilter === "yellow_cards" ? "all" : "yellow_cards")}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                  mAttentionFilter === "yellow_cards"
                    ? "bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-500/30"
                    : yellowCardMembers.length > 0
                    ? "bg-amber-50/80 text-amber-900 border-amber-200 hover:bg-amber-100 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs opacity-80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${mAttentionFilter === "yellow_cards" ? "text-amber-100" : "text-amber-700"}`}>
                    Thẻ vàng
                  </span>
                  <AlertTriangle className={`w-3.5 h-3.5 ${mAttentionFilter === "yellow_cards" ? "text-white" : "text-amber-600"}`} />
                </div>
                <p className="text-xl font-black mt-1 font-mono">{yellowCardMembers.length}</p>
                <span className={`text-[10px] mt-0.5 block ${mAttentionFilter === "yellow_cards" ? "text-amber-100" : "text-slate-500"}`}>
                  Còn hiệu lực
                </span>
              </button>

              {/* 4. Chuyên cần <50% */}
              <button
                type="button"
                onClick={() => setMAttentionFilter(mAttentionFilter === "low_attendance" ? "all" : "low_attendance")}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                  mAttentionFilter === "low_attendance"
                    ? "bg-orange-600 text-white border-orange-600 shadow-md ring-2 ring-orange-600/30"
                    : lowAttendanceMembers.length > 0
                    ? "bg-orange-50/80 text-orange-900 border-orange-200 hover:bg-orange-100 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs opacity-80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${mAttentionFilter === "low_attendance" ? "text-orange-100" : "text-orange-700"}`}>
                    Chuyên cần &lt;50%
                  </span>
                  <Clock className={`w-3.5 h-3.5 ${mAttentionFilter === "low_attendance" ? "text-white" : "text-orange-600"}`} />
                </div>
                <p className="text-xl font-black mt-1 font-mono">{lowAttendanceMembers.length}</p>
                <span className={`text-[10px] mt-0.5 block ${mAttentionFilter === "low_attendance" ? "text-orange-100" : "text-slate-500"}`}>
                  Cần theo dõi
                </span>
              </button>

              {/* 5. Từng No-show */}
              <button
                type="button"
                onClick={() => setMAttentionFilter(mAttentionFilter === "no_show" ? "all" : "no_show")}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                  mAttentionFilter === "no_show"
                    ? "bg-purple-700 text-white border-purple-700 shadow-md ring-2 ring-purple-700/30"
                    : noShowMembers.length > 0
                    ? "bg-purple-50/80 text-purple-900 border-purple-200 hover:bg-purple-100 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs opacity-80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${mAttentionFilter === "no_show" ? "text-purple-100" : "text-purple-700"}`}>
                    Từng No-Show
                  </span>
                  <Ban className={`w-3.5 h-3.5 ${mAttentionFilter === "no_show" ? "text-white" : "text-purple-600"}`} />
                </div>
                <p className="text-xl font-black mt-1 font-mono">{noShowMembers.length}</p>
                <span className={`text-[10px] mt-0.5 block ${mAttentionFilter === "no_show" ? "text-purple-100" : "text-slate-500"}`}>
                  Bỏ buổi không báo
                </span>
              </button>

              {/* 6. Vắng >30 ngày */}
              <button
                type="button"
                onClick={() => setMAttentionFilter(mAttentionFilter === "inactive_30d" ? "all" : "inactive_30d")}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                  mAttentionFilter === "inactive_30d"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/30"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${mAttentionFilter === "inactive_30d" ? "text-blue-100" : "text-blue-700"}`}>
                    Vắng &gt;30 ngày
                  </span>
                  <Calendar className={`w-3.5 h-3.5 ${mAttentionFilter === "inactive_30d" ? "text-white" : "text-blue-600"}`} />
                </div>
                <p className="text-xl font-black mt-1 font-mono">{inactive30dMembers.length}</p>
                <span className={`text-[10px] mt-0.5 block ${mAttentionFilter === "inactive_30d" ? "text-blue-100" : "text-slate-500"}`}>
                  Chưa đi tập lại
                </span>
              </button>

              {/* 7. Chờ kích hoạt */}
              <button
                type="button"
                onClick={() => setMAttentionFilter(mAttentionFilter === "pending_activation" ? "all" : "pending_activation")}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                  mAttentionFilter === "pending_activation"
                    ? "bg-slate-800 text-white border-slate-800 shadow-md ring-2 ring-slate-800/30"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${mAttentionFilter === "pending_activation" ? "text-slate-300" : "text-slate-600"}`}>
                    Chờ kích hoạt
                  </span>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${mAttentionFilter === "pending_activation" ? "text-white" : "text-slate-500"}`} />
                </div>
                <p className="text-xl font-black mt-1 font-mono">{pendingActivationMembers.length}</p>
                <span className={`text-[10px] mt-0.5 block ${mAttentionFilter === "pending_activation" ? "text-slate-300" : "text-slate-500"}`}>
                  Chưa đặt mật khẩu
                </span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SMART FILTER BAR */}
          {/* ========================================================= */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap gap-3 items-center shadow-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm theo tên, nickname, SĐT..." 
                value={mSearch} 
                onChange={e => setMSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-purple-600 outline-none"
              />
            </div>

            {/* Filter by Functional Tag */}
            <select 
              value={mTagFilter} 
              onChange={e => setMTagFilter(e.target.value)} 
              className="p-2 text-xs border rounded-xl focus:ring-2 focus:ring-purple-600 outline-none bg-white font-medium min-w-[150px]"
            >
              <option value="all">Mọi Functional Tag</option>
              {functionalTagsList.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>

            {/* Filter by Activation Status */}
            <select 
              value={mActivated} 
              onChange={e => setMActivated(e.target.value as any)} 
              className="p-2 text-xs border rounded-xl focus:ring-2 focus:ring-purple-600 outline-none bg-white font-medium min-w-[150px]"
            >
              <option value="all">Mọi trạng thái thẻ</option>
              <option value="activated">🟢 Đã kích hoạt ({members.filter(m => m.is_activated).length})</option>
              <option value="pending">🟡 Chờ kích hoạt ({members.filter(m => !m.is_activated).length})</option>
            </select>

            <select 
              value={mLevel} 
              onChange={e => setMLevel(e.target.value)} 
              className="p-2 text-xs border rounded-xl focus:ring-2 focus:ring-purple-600 outline-none bg-white min-w-[130px]"
            >
              <option value="all">Mọi trình độ</option>
              <option value="Mới chơi">Mới chơi</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Khá/Giỏi">Khá/Giỏi</option>
            </select>

            <select 
              value={mRank} 
              onChange={e => setMRank(e.target.value)} 
              className="p-2 text-xs border rounded-xl focus:ring-2 focus:ring-purple-600 outline-none bg-white min-w-[140px]"
            >
              <option value="all">Mọi phân cấp Rank</option>
              <option value="Challenger">Challenger (1800+)</option>
              <option value="Diamond">Diamond (1600+)</option>
              <option value="Platinum">Platinum (1400+)</option>
              <option value="Gold">Gold (1200+)</option>
              <option value="Silver">Silver (1100+)</option>
              <option value="Bronze">Bronze (&lt; 1100)</option>
            </select>

            <select 
              value={mStatus} 
              onChange={e => setMStatus(e.target.value)} 
              className="p-2 text-xs border rounded-xl focus:ring-2 focus:ring-purple-600 outline-none bg-white min-w-[130px]"
            >
              <option value="all">Mọi trạng thái CLB</option>
              <option value="active">Hoạt động (Active)</option>
              <option value="inactive">Tạm nghỉ (Inactive)</option>
              <option value="left">Đã rời CLB (Left)</option>
            </select>

            <select 
              value={mSkill} 
              onChange={e => setMSkill(e.target.value)} 
              className="p-2 text-xs border rounded-xl focus:ring-2 focus:ring-purple-600 outline-none bg-white min-w-[150px]"
            >
              <option value="all">Mọi kỹ năng mềm</option>
              {softSkillsList.map(skill => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
          </div>

          {/* ========================================================= */}
          {/* MEMBERS TABLE */}
          {/* ========================================================= */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden min-h-[300px] relative">
            {isLoadingM ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-2xs z-10 text-slate-600 gap-2">
                <Loader2 className="animate-spin w-6 h-6 text-purple-600" />
                <span className="text-sm font-semibold">Đang cập nhật danh sách thành viên...</span>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-16 text-center text-slate-500">
                <p className="font-bold text-base">Không tìm thấy thành viên nào khớp điều kiện lọc.</p>
                <p className="text-xs text-slate-400 mt-1">Hãy thử xóa bộ lọc hoặc tìm kiếm bằng từ khóa khác.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Thành viên & Vai trò</th>
                      <th className="p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Trình độ & Lối chơi</th>
                      <th className="p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Phân cấp & ELO</th>
                      <th className="p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Uy tín & Kỷ luật</th>
                      <th className="p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Cấp độ & Xu</th>
                      <th className="p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Kích hoạt & Trạng thái</th>
                      <th className="p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMembers.map(m => {
                      const isBlocked = m.is_blocked;
                      const status = m.status || "active";
                      const isCurrentAdmin = m.role === "admin";
                      const rankSingles = getRankName(m.elo_singles ?? 1000);
                      const rankDoubles = getRankName(m.elo_doubles ?? 1000);

                      // Reliability score color pill
                      const relLevel = m.reliability_level || "fair";
                      const relBadgeClass = 
                        relLevel === "excellent" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        relLevel === "good" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        relLevel === "fair" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-rose-50 text-rose-700 border-rose-200";

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* 1. Member Profile & Tags */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-2xs overflow-hidden shrink-0">
                                {m.avatar_url ? (
                                  <img src={m.avatar_url} alt={m.full_name} className="w-full h-full object-cover" />
                                ) : (
                                  m.full_name?.charAt(0) || "U"
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                  {m.full_name}
                                  {m.nickname && (
                                    <span className="text-slate-400 font-normal text-[11px]">({m.nickname})</span>
                                  )}
                                  {isCurrentAdmin && (
                                    <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">
                                      Admin
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono mt-0.5">
                                  <Phone className="w-3 h-3 text-slate-400" /> {m.phone_zalo}
                                </p>

                                {/* Tags Badges */}
                                {m.tags && m.tags.length > 0 && (
                                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                    {m.tags.slice(0, 3).map((tag: string) => (
                                      <span
                                        key={tag}
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                    {m.tags.length > 3 && (
                                      <span className="text-[9px] text-slate-400 font-bold">
                                        +{m.tags.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Badminton Level & Playstyle */}
                          <td className="p-3.5">
                            <p className="font-bold text-slate-800">{m.badminton_level}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {m.play_style || "Công thủ toàn diện"}
                            </p>
                            {m.hand_preference && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                ({m.hand_preference === "left" ? "Tay trái" : "Tay phải"})
                              </span>
                            )}
                          </td>

                          {/* 3. Rank & ELO */}
                          <td className="p-3.5">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${getRankBadgeClass(rankSingles)}`}>
                                  {rankSingles}
                                </span>
                                <span className="font-bold text-slate-700 font-mono text-[11px]">
                                  Đơn: {m.elo_singles ?? 1000}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${getRankBadgeClass(rankDoubles)}`}>
                                  {rankDoubles}
                                </span>
                                <span className="font-bold text-slate-700 font-mono text-[11px]">
                                  Đôi: {m.elo_doubles ?? 1000}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 4. Reliability Score & Discipline */}
                          <td className="p-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${relBadgeClass}`}>
                                  {m.reliability_score ?? 100}đ &bull; {m.reliability_label || "Xuất sắc"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Chuyên cần: <strong className="text-slate-800">{m.attendance_rate ?? 100}%</strong>{" "}
                                <span className="text-slate-400">({m.attended_count || 0}b)</span>
                              </p>

                              {/* Discipline Cards Badges */}
                              {((m.active_yellow_cards || 0) > 0 || (m.active_red_cards || 0) > 0) && (
                                <div className="flex items-center gap-1 pt-0.5">
                                  {(m.active_red_cards || 0) > 0 && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-0.5">
                                      🔴 {m.active_red_cards} Thẻ đỏ
                                    </span>
                                  )}
                                  {(m.active_yellow_cards || 0) > 0 && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-0.5">
                                      🟡 {m.active_yellow_cards} Thẻ vàng
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 5. Level & Smash Coins */}
                          <td className="p-3.5">
                            <p className="font-bold text-slate-800">Level {m.level || 1}</p>
                            <p className="text-[11px] text-slate-400 font-medium">{m.xp || 0} XP</p>
                            <div className="flex items-center gap-1 font-mono font-bold text-amber-600 text-xs mt-1">
                              <Coins className="w-3.5 h-3.5" />
                              {(m.smash_coins || 0).toLocaleString()}
                            </div>
                          </td>

                          {/* 6. Activation & Status */}
                          <td className="p-3.5">
                            <div className="flex flex-col gap-1 items-start">
                              {m.is_activated ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã kích hoạt
                                </span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-amber-600" /> Chờ kích hoạt
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyClaimLink(m)}
                                    title="Sao chép link kích hoạt"
                                    className="p-1 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded transition-all"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              )}

                              <div className="flex items-center gap-1 mt-0.5">
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    status === "active"
                                      ? "bg-slate-100 text-slate-600"
                                      : status === "inactive"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {status === "active" ? "Hoạt động" : status === "inactive" ? "Tạm nghỉ" : "Đã rời"}
                                </span>
                                {isBlocked && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-100 text-red-600 rounded flex items-center gap-0.5">
                                    <Ban className="w-2.5 h-2.5" /> Khóa
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 7. Action Buttons */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setMember360Id(m.id);
                                  setIsMember360Open(true);
                                }}
                                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl border border-purple-200 transition-colors flex items-center gap-1"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                Hồ sơ 360°
                              </button>

                              <button 
                                onClick={() => openActionsModal(m)} 
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                                title="Thao tác nhanh"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                  <ShieldAlert className="w-4 h-4 text-black" /> Quyền hạn (Role)
                </h4>
                <div className="flex items-center gap-3">
                  <select 
                    value={quickRole} 
                    onChange={e => setQuickRole(e.target.value)} 
                    className="p-2.5 text-sm border rounded-lg focus:ring-1 focus:ring-black outline-none flex-1"
                  >
                    <option value="member">Thành viên chính thức (Member)</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                    <option value="candidate">Ứng viên Casting (Candidate)</option>
                  </select>
                  <button 
                    onClick={() => handleUpdateRole(selectedMember.id, quickRole)}
                    disabled={isUpdatingRole}
                    className="px-4 py-2.5 bg-black hover:bg-black/85 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors"
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
                        className="w-full p-2.5 text-sm border rounded-lg focus:ring-1 focus:ring-black outline-none"
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
                        className="w-full p-2.5 text-sm border rounded-lg focus:ring-1 focus:ring-black outline-none"
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
                      className="w-full p-2.5 text-sm border rounded-lg focus:ring-1 focus:ring-black outline-none"
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
                      className="p-2 text-sm border rounded focus:ring-1 focus:ring-black outline-none bg-white min-w-[120px]"
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
                      const reason = prompt(
                        `Vui lòng nhập lý do xóa hoặc lưu trữ tài khoản của thành viên ${selectedMember.full_name}:`,
                        "Quản trị viên yêu cầu xóa/lưu trữ"
                      );
                      if (reason === null) return;
                      if (!reason.trim()) {
                        alert("Bắt buộc phải nhập lý do khi xóa hoặc lưu trữ tài khoản!");
                        return;
                      }

                      try {
                        const token = localStorage.getItem("admin_token");
                        const res = await fetch(`${API_URL}/api/users/${selectedMember.id}`, {
                          method: 'DELETE',
                          headers: { 
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                          },
                          body: JSON.stringify({ reason: reason.trim() })
                        });
                        const data = await res.json();
                        if (res.ok) {
                          alert(data.message || "Thao tác thành công.");
                          setShowActionsModal(false);
                          fetchMembers();
                        } else {
                          alert(data.error || "Không thể thực hiện.");
                        }
                      } catch (e) {
                        alert("Lỗi kết nối.");
                      }
                    }}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                  >
                    Xóa hoặc Lưu trữ tài khoản an toàn
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
                <div className="py-20 flex justify-center text-black"><Loader2 className="animate-spin w-8 h-8" /></div>
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
                                  {formatVietnamDate(item.date_time)}
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
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 backdrop-blur-xs overflow-hidden">
          <div className="w-full sm:max-w-2xl bg-white border border-slate-200 rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-fade-up">
            {/* Sticky Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <div>
                <h3 className="font-bold text-base sm:text-lg tracking-tight flex items-center gap-2 text-secondary">
                  <Award className="w-5 h-5 text-emerald-600" /> Duyệt Ứng Viên & Đánh Giá
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ứng viên: <strong className="text-slate-800 font-bold">{assessmentCandidate.full_name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssessmentCandidate(null)}
                aria-label="Đóng"
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitApprove} className="flex flex-col flex-1 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Cột trái: Chuẩn hóa thông tin cá nhân */}
                  <div className="space-y-3.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
                      Thông tin cá nhân
                    </h4>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Họ và tên *</label>
                      <input
                        type="text"
                        required
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary transition-all font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Số điện thoại Zalo *</label>
                      <input
                        type="text"
                        required
                        value={editPhoneZalo}
                        onChange={(e) => setEditPhoneZalo(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary transition-all font-semibold tabular-nums"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Địa chỉ Email</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="email-ung-vien@gmail.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary transition-all font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Trường đại học / Học vấn *</label>
                      <input
                        type="text"
                        required
                        value={editAcademicInfo}
                        onChange={(e) => setEditAcademicInfo(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary transition-all font-semibold"
                      />
                    </div>
                  </div>

                  {/* Cột phải: Phân loại trình độ */}
                  <div className="space-y-3.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
                      Đánh giá trình độ
                    </h4>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Trình độ thực tế (Đánh test)</label>

                      {/* Stars Selector (1-5 sao) */}
                      <div className="flex items-center gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 justify-center">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const active = star <= selectedStars;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setSelectedStars(star)}
                              className="p-1 hover:scale-125 transition-all text-amber-400 cursor-pointer"
                            >
                              <Star className={`w-8 h-8 ${active ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                            </button>
                          );
                        })}
                      </div>

                      {/* Star Level Description Text */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center text-xs">
                        {selectedStars === 1 && (
                          <p className="text-slate-600">⭐ <span className="font-bold text-amber-500">1 Sao:</span> Mới bắt đầu chơi, chưa nắm vững bộ môn.</p>
                        )}
                        {selectedStars === 2 && (
                          <p className="text-slate-600">⭐⭐ <span className="font-bold text-amber-500">2 Sao:</span> Biết chơi cơ bản, di chuyển còn chậm.</p>
                        )}
                        {selectedStars === 3 && (
                          <p className="text-slate-600">⭐⭐⭐ <span className="font-bold text-amber-500">3 Sao:</span> Trung bình, có thể tham gia giao lưu ELO.</p>
                        )}
                        {selectedStars === 4 && (
                          <p className="text-slate-600">⭐⭐⭐⭐ <span className="font-bold text-amber-500">4 Sao:</span> Trình độ khá, kỹ thuật tốt, di chuyển nhịp nhàng.</p>
                        )}
                        {selectedStars === 5 && (
                          <p className="text-slate-600">⭐⭐⭐⭐⭐ <span className="font-bold text-amber-500">5 Sao:</span> Trình độ giỏi, đẳng cấp tuyển thủ hoặc cận chuyên nghiệp.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nhận xét chuyên môn */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-primary flex items-center justify-center text-[10px] font-bold">3</span>
                    Nhận xét chuyên môn
                  </h4>
                  <textarea
                    placeholder="Ví dụ: Kỹ năng đập lưới nhanh, lực đập tốt. Thể lực di chuyển cuối sân cần rèn luyện thêm..."
                    value={castingNotes}
                    onChange={(e) => setCastingNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary transition-all font-medium h-24 resize-none"
                  />
                </div>

                {/* Error messages */}
                {assessmentError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-xs font-bold leading-relaxed flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{assessmentError}</span>
                  </div>
                )}
              </div>

              {/* Sticky Footer Actions - Designed specifically for Mobile Touch targets */}
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 shrink-0 space-y-2.5">
                {/* NÚT DUYỆT CHÍNH (TO, NỔI BẬT, DỄ BẤM 100%) */}
                <button
                  type="submit"
                  disabled={isApproving}
                  className="w-full h-14 bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>ĐANG DUYỆT ỨNG VIÊN...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>DUYỆT ỨNG VIÊN & GIA NHẬP CLB</span>
                    </>
                  )}
                </button>

                {/* HÀNG NÚT PHỤ: TÁCH BIỆT RÕ RÀNG KHỎI NÚT DUYỆT */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAssessmentCandidate(null)}
                    className="flex-1 h-11 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                    <span>Hủy bỏ / Đóng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectCandidate(assessmentCandidate.id)}
                    className="flex-1 h-11 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    <span>Loại bỏ ứng viên</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CAMPAIGNS TAB (Đợt tuyển thành viên) */}
      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Danh sách Campaign */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 h-[calc(100vh-240px)] overflow-y-auto">
              <h2 className="text-base font-black text-secondary mb-4 sticky top-0 bg-white z-10 pb-2">Danh sách Đợt tuyển</h2>
              <div className="space-y-3">
                {campaigns.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">Chưa có đợt tuyển nào.</div>
                ) : (
                  campaigns.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => setSelectedCampaign(c)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedCampaign?.id === c.id ? 'border-black bg-black/5' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-secondary text-sm truncate pr-2">{c.name}</h3>
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${c.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-300'}`}></div>
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-col gap-1 font-medium">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400"/> Mở: {formatVietnamDate(c.start_date)}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400"/> Đóng: {formatVietnamDate(c.end_date)}</span>
                      </div>
                      {c.is_active ? (
                        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đang kích hoạt tuyển quân
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleActivateCampaign(c); }}
                          className="mt-3 w-full py-2 px-3 bg-secondary hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                          title="Kích hoạt đợt tuyển này (đợt đang chạy sẽ vào lịch sử)"
                        >
                          <Power className="w-3.5 h-3.5 text-emerald-400" /> Kích hoạt đợt tuyển
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Cột phải: Detail Dashboard */}
          <div className="lg:col-span-8">
            {(isCreatingCampaign || selectedCampaign) ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-8">
                {/* Form Sửa / Tạo Đợt Tuyển */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-black text-secondary">{isCreatingCampaign ? "Tạo đợt tuyển mới" : "Chỉnh sửa đợt tuyển"}</h2>
                    <div className="flex items-center gap-2">
                      {selectedCampaign && !isCreatingCampaign && <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold tabular-nums">ID: {selectedCampaign.id.split('-')[0]}</span>}
                      {selectedCampaign && !isCreatingCampaign && (
                        <button
                          type="button"
                          onClick={handleDeleteCampaign}
                          className="p-2 border border-slate-200 hover:bg-rose-50 hover:border-rose-100 rounded-xl cursor-pointer text-slate-500 hover:text-rose-500 transition-colors"
                          title="Xóa đợt tuyển này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <form onSubmit={handleCreateOrUpdateCampaign} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Tên chiến dịch</label>
                      <input type="text" required value={cForm.name} onChange={e => setCForm({...cForm, name: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-black" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Thời gian mở</label>
                      <input type="datetime-local" required value={cForm.start} onChange={e => setCForm({...cForm, start: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-black" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Thời gian đóng</label>
                      <input type="datetime-local" required value={cForm.end} onChange={e => setCForm({...cForm, end: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-black" />
                    </div>
                    {/* Thiết lập Mã QR & Link Nhóm Zalo Tuyển Quân */}
                    <div className="md:col-span-2 pt-4 mt-2 border-t border-slate-200/70 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-purple-600" />
                          Mã QR Nhóm Zalo Tuyển Quân / Casting
                        </label>
                        {cForm.zalo_qr_url && (
                          <button
                            type="button"
                            onClick={() => setCForm(prev => ({ ...prev, zalo_qr_url: "" }))}
                            className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                          >
                            Gỡ ảnh QR
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Sau khi ứng viên hoàn tất nộp đơn, mã QR này sẽ hiển thị kèm nút tham gia nhóm để ứng viên vào nhóm Zalo casting tức thì.
                      </p>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl">
                        {cForm.zalo_qr_url ? (
                          <div className="relative group shrink-0">
                            <img
                              src={cForm.zalo_qr_url}
                              alt="Mã QR Zalo Casting"
                              className="w-24 h-24 object-contain rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-sm"
                            />
                            <button
                              type="button"
                              onClick={() => zaloQrFileInputRef.current?.click()}
                              className="absolute inset-0 bg-black/60 rounded-xl text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              Đổi ảnh
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => zaloQrFileInputRef.current?.click()}
                            className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 hover:border-primary flex flex-col items-center justify-center text-slate-400 hover:text-primary transition-colors cursor-pointer shrink-0 bg-slate-50"
                          >
                            <QrCode className="w-7 h-7 mb-1" />
                            <span className="text-[10px] font-bold">Upload QR</span>
                          </div>
                        )}

                        <div className="flex-1 space-y-2 w-full">
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              ref={zaloQrFileInputRef}
                              accept="image/*"
                              onChange={handleUploadZaloQr}
                              className="hidden"
                            />
                            <button
                              type="button"
                              disabled={isUploadingZaloQr}
                              onClick={() => zaloQrFileInputRef.current?.click()}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {isUploadingZaloQr ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Đang tải lên...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>{cForm.zalo_qr_url ? "Thay đổi ảnh QR" : "Tải ảnh QR nhóm Zalo lên"}</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">
                              Đường link mời tham gia nhóm Zalo (Tùy chọn)
                            </label>
                            <div className="relative">
                              <input
                                type="url"
                                value={cForm.zalo_group_link}
                                onChange={e => setCForm(prev => ({ ...prev, zalo_group_link: e.target.value }))}
                                placeholder="Ví dụ: https://zalo.me/g/abcxyz (để ứng viên bấm mở app Zalo trực tiếp)"
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-secondary focus:outline-none focus:border-black placeholder:text-slate-400 placeholder:opacity-90"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bộ câu hỏi tùy chỉnh (hiển thị sau bước 2 ở form ứng tuyển) */}
                    <div className="md:col-span-2 pt-4 mt-2 border-t border-slate-200/70">
                      <CustomQuestionsEditor value={customQuestions} onChange={setCustomQuestions} />
                      <p className="text-[11px] text-slate-400 mt-3">
                        * Nhấn “Lưu đợt tuyển” ở dưới để lưu bộ câu hỏi cùng đợt tuyển.
                      </p>
                    </div>
                    <div className="md:col-span-2 flex justify-between items-center mt-2 pt-2 border-t border-slate-200/50">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={cForm.active} onChange={e => setCForm({...cForm, active: e.target.checked})} className="w-4 h-4 text-black rounded border-slate-200 focus:ring-1 focus:ring-black" />
                        <span className="text-sm font-bold text-slate-700">Kích hoạt (Hiển thị Form tuyển quân)</span>
                      </label>
                      <button type="submit" className="px-5 py-2.5 bg-secondary hover:bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer">
                        <Save className="w-4 h-4" /> Lưu đợt tuyển
                      </button>
                    </div>
                  </form>
                </div>

                {/* Thống kê & Quản lý Ca Casting (Chỉ hiện khi ĐANG CHỌN 1 đợt) */}
                {!isCreatingCampaign && campaignStats && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-black/5 border border-black/20 rounded-2xl">
                        <p className="text-xs text-black font-bold uppercase tracking-wider mb-1">Tổng đăng ký ứng viên</p>
                        <p className="text-3xl font-black text-secondary">{campaignStats.total_registered} ứng viên</p>
                      </div>
                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Số lượng Ca Casting</p>
                        <p className="text-3xl font-black text-secondary">{campaignStats.slots.length} ca</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-black text-secondary mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-black" /> Thiết lập Ca Casting</h3>
                      
                      {/* Form Thêm Ca */}
                      <form onSubmit={handleAddSlot} className="flex flex-wrap gap-2.5 mb-6">
                        <input type="datetime-local" required value={sForm.time} onChange={e => setSForm({...sForm, time: e.target.value})} className="flex-1 min-w-[150px] p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-black" />
                        <input type="text" placeholder="Sân tập..." required value={sForm.location} onChange={e => setSForm({...sForm, location: e.target.value})} className="flex-1 min-w-[150px] p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-black" />
                        <input type="number" placeholder="Số người tối đa..." min="1" required value={sForm.max} onChange={e => setSForm({...sForm, max: e.target.value})} className="w-28 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-black" />
                        <button type="submit" className="px-4 py-2.5 bg-black hover:bg-black/85 text-white font-bold text-sm rounded-xl cursor-pointer shadow-sm"><Plus className="w-5 h-5" /></button>
                      </form>

                      {/* Danh sách Ca */}
                      <div className="space-y-3">
                        {campaignStats.slots.length === 0 ? (
                          <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">Chưa có ca casting nào được thêm.</div>
                        ) : (
                          campaignStats.slots.map((slot: any) => {
                            const fillPercent = Math.min((parseInt(slot.registered_count) / slot.max_capacity) * 100, 100);
                            return (
                              <div key={slot.id} className={`p-4 border rounded-2xl flex items-center justify-between transition-colors ${!slot.is_active ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <div className="flex-1 pr-4">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <h4 className="font-bold text-secondary text-sm">{formatVietnamDate(slot.casting_time)}</h4>
                                    <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-600">{slot.location}</span>
                                    {!slot.is_active && <span className="text-[9px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-black uppercase">Đã đóng</span>}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                                      <div className="bg-black h-full transition-all" style={{ width: `${fillPercent}%` }}></div>
                                    </div>
                                    <span className="text-xs tabular-nums font-bold text-slate-600">{slot.registered_count}/{slot.max_capacity}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button onClick={() => handleExportSlotCsv(slot)} disabled={exportingSlotId === String(slot.id)} className="p-2 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 rounded-xl cursor-pointer text-slate-500 hover:text-emerald-600 disabled:opacity-50" title="Xuất danh sách ca này ra file CSV">
                                    {exportingSlotId === String(slot.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                  </button>
                                  <button onClick={() => handleToggleSlot(slot)} className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer text-slate-500 hover:text-slate-800" title={slot.is_active ? "Đóng nhận đăng ký" : "Mở nhận đăng ký"}>
                                    {slot.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4 text-emerald-500" />}
                                  </button>
                                  <button onClick={() => handleDeleteSlot(slot.id)} className="p-2 border border-slate-200 hover:bg-rose-50 hover:border-rose-100 rounded-xl cursor-pointer text-slate-500 hover:text-rose-500" title="Xóa ca">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="h-full border border-dashed border-slate-200 rounded-3xl p-16 text-center text-slate-400 flex flex-col items-center justify-center">
                <Calendar className="w-12 h-12 text-slate-200 mb-3" />
                <p className="font-bold text-slate-500">Chưa chọn đợt tuyển quân</p>
                <p className="text-xs text-slate-400 mt-1">Chọn một chiến dịch ở danh sách bên trái hoặc nhấn nút "Đợt mới" để thiết lập.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL MEMBER 360° HUB */}
      <Member360Modal
        memberId={member360Id}
        isOpen={isMember360Open}
        onClose={() => {
          setIsMember360Open(false);
          setMember360Id(null);
        }}
        onMemberUpdated={() => {
          fetchMembers();
        }}
      />

    </div>
  );
}
