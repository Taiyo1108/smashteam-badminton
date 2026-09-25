"use client";

import React, { useState, useEffect } from "react";
import { 
  Mail, Send, Sparkles, Check, AlertCircle, Loader2, RefreshCw, 
  Eye, CheckCircle2, Users, History, ArrowRight, RotateCcw, ExternalLink,
  ShieldCheck, HelpCircle, X, UserCheck, Search, Filter, CheckSquare, Square,
  Info
} from "lucide-react";
import { API_URL } from "@/app/config";
import { formatVietnamDate } from "@/app/utils/date";

export default function AdminEmailsPage() {
  const [activeTab, setActiveTab] = useState<"welcome_template" | "broadcast" | "history">("welcome_template");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ==========================================
  // STATE HẠN MỨC GỬI EMAIL (RESEND QUOTA)
  // ==========================================
  const [quota, setQuota] = useState<{
    daily: { limit: number; sent: number; remaining: number; percent: number };
    monthly: { limit: number; sent: number; remaining: number; percent: number };
  }>({
    daily: { limit: 100, sent: 0, remaining: 100, percent: 0 },
    monthly: { limit: 3000, sent: 0, remaining: 3000, percent: 0 }
  });
  const [isLoadingQuota, setIsLoadingQuota] = useState(false);

  // ==========================================
  // STATE TAB 1: MẪU EMAIL TRÚNG TUYỂN
  // ==========================================
  const [isLoadingWelcome, setIsLoadingWelcome] = useState(false);
  const [isSavingWelcome, setIsSavingWelcome] = useState(false);
  const [welcomeForm, setWelcomeForm] = useState({
    subject: "🏸 Chúc mừng bạn đã gia nhập gia đình SMASH TEAM!",
    heading: "SMASH TEAM ACADEMY 🏸",
    subheading: "Chúc mừng bạn đã chính thức vượt qua kỳ Casting chuyên môn!",
    body: "Chào mừng bạn đã trở thành một phần của đại gia đình SmashTeam. Dưới đây là thông số đánh giá chuyên môn ban đầu của bạn được Ban Tuyển Trạch ghi nhận:",
    show_stats: true,
    call_to_action_text: "KÍCH HOẠT TÀI KHOẢN",
    footer_text: "Đây là email tự động từ Ban Quản Trị SMASH TEAM. Vui lòng không trả lời thư này."
  });
  const [welcomePreviewHtml, setWelcomePreviewHtml] = useState("");

  // ==========================================
  // STATE TAB 2: GỬI MAIL HÀNG LOẠT (BROADCAST)
  // ==========================================
  const [campaignsList, setCampaignsList] = useState<any[]>([]);
  const [broadcastTarget, setBroadcastTarget] = useState<"all_members" | "all_candidates" | "all_users" | "by_campaign" | "specific_users">("all_members");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [recipientsCount, setRecipientsCount] = useState<number>(0);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  // Chế độ chọn người nhận cụ thể (Specific Users)
  const [selectableUsers, setSelectableUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLoadingSelectable, setIsLoadingSelectable] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "member" | "candidate" | "admin">("all");

  const [broadcastForm, setBroadcastForm] = useState({
    subject: "🏸 [SmashTeam] Thông báo giải đấu & lịch sinh hoạt mới nhất",
    heading: "THÔNG BÁO TỔ CHỨC GIẢI ĐẤU MÙA THU 2026",
    body: "Thân gửi toàn thể các thành viên SmashTeam,\n\nCâu lạc bộ xin trân trọng thông báo về kế hoạch tổ chức giải đấu nội bộ sắp tới. Mời bạn xem chi tiết các mốc thời gian và danh sách cặp đấu được cập nhật trên website.",
    showCta: true,
    ctaText: "XEM CHI TIẾT TRÊN WEBSITE",
    ctaLink: "https://smashteam.id.vn",
    footerText: "Thông báo chính thức từ Ban Quản Trị Câu Lạc Bộ Cầu Lông SmashTeam."
  });
  const [broadcastPreviewHtml, setBroadcastPreviewHtml] = useState("");
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // ==========================================
  // MODAL GỬI THỬ NGHIỆM (SEND TEST)
  // ==========================================
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testType, setTestType] = useState<"welcome" | "broadcast">("welcome");
  const [isSendingTest, setIsSendingTest] = useState(false);

  // ==========================================
  // STATE TAB 3: LỊCH SỬ CHIẾN DỊCH
  // ==========================================
  const [broadcastLogs, setBroadcastLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Tải thông tin hạn mức email (Resend Quota: 100/ngày, 3000/tháng)
  const fetchQuota = async () => {
    setIsLoadingQuota(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/emails/quota`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuota(data);
      }
    } catch (err) {
      console.error("Lỗi khi tải quota:", err);
    } finally {
      setIsLoadingQuota(false);
    }
  };

  // Tải danh sách người nhận hợp lệ để chọn cụ thể
  const fetchSelectableUsers = async () => {
    setIsLoadingSelectable(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/emails/selectable-recipients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectableUsers(data.users || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách người nhận:", err);
    } finally {
      setIsLoadingSelectable(false);
    }
  };

  // Load welcome template
  const fetchWelcomeTemplate = async () => {
    setIsLoadingWelcome(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/emails/template/welcome`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWelcomeForm(data.template);
        setWelcomePreviewHtml(data.previewHtml);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingWelcome(false);
    }
  };

  // Load campaigns list & initial counts
  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/campaigns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const list = await res.json();
        setCampaignsList(list);
        if (list.length > 0 && !selectedCampaignId) {
          setSelectedCampaignId(list[0].id);
        }
      }
    } catch (err) {}
  };

  // Load recipients count
  const fetchRecipientsCount = async () => {
    if (broadcastTarget === "specific_users") {
      setRecipientsCount(selectedUserIds.length);
      return;
    }

    setIsLoadingCount(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(
        `${API_URL}/api/admin/emails/recipients-count?target_audience=${broadcastTarget}&campaign_id=${selectedCampaignId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setRecipientsCount(data.count || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingCount(false);
    }
  };

  // Load broadcast logs
  const fetchBroadcastLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/emails/broadcast-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBroadcastLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchQuota();
    fetchWelcomeTemplate();
    fetchCampaigns();
    fetchSelectableUsers();
  }, []);

  useEffect(() => {
    if (broadcastTarget === "specific_users") {
      setRecipientsCount(selectedUserIds.length);
    } else {
      fetchRecipientsCount();
    }
  }, [broadcastTarget, selectedCampaignId, selectedUserIds]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchBroadcastLogs();
      fetchQuota();
    }
  }, [activeTab]);

  // Tự động làm mới nhật ký định kỳ 3 giây nếu có chiến dịch đang xử lý ngầm
  useEffect(() => {
    const hasProcessing = broadcastLogs.some((l) => l.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchBroadcastLogs();
    }, 3000);

    return () => clearInterval(interval);
  }, [broadcastLogs]);

  // Live render preview for Welcome
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem("admin_token");
        const res = await fetch(`${API_URL}/api/admin/emails/render-preview`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            type: "welcome",
            template: welcomeForm
          })
        });
        if (res.ok) {
          const data = await res.json();
          setWelcomePreviewHtml(data.html);
        }
      } catch (err) {}
    }, 400);

    return () => clearTimeout(timer);
  }, [welcomeForm]);

  // Live render preview for Broadcast
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem("admin_token");
        const res = await fetch(`${API_URL}/api/admin/emails/render-preview`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            type: "broadcast",
            broadcastData: {
              ...broadcastForm,
              ctaText: broadcastForm.showCta ? broadcastForm.ctaText : ""
            }
          })
        });
        if (res.ok) {
          const data = await res.json();
          setBroadcastPreviewHtml(data.html);
        }
      } catch (err) {}
    }, 400);

    return () => clearTimeout(timer);
  }, [broadcastForm]);

  // Chèn placeholder vào vị trí con trỏ
  const insertVariable = (varName: string) => {
    setWelcomeForm(prev => ({
      ...prev,
      body: prev.body + " " + varName
    }));
  };

  // Lưu Mẫu Email Trúng Tuyển
  const handleSaveWelcome = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWelcome(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/emails/template/welcome`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(welcomeForm)
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Đã lưu cấu hình mẫu email trúng tuyển thành công!");
      } else {
        showToast(data.error || "Không thể lưu mẫu email.", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối đến máy chủ.", "error");
    } finally {
      setIsSavingWelcome(false);
    }
  };

  // Khôi phục mẫu mặc định
  const handleResetDefaultWelcome = () => {
    if (!confirm("Bạn có chắc chắn muốn khôi phục lại mẫu thư trúng tuyển ban đầu của SmashTeam?")) return;
    setWelcomeForm({
      subject: "🏸 Chúc mừng bạn đã gia nhập gia đình SMASH TEAM!",
      heading: "SMASH TEAM ACADEMY 🏸",
      subheading: "Chúc mừng bạn đã chính thức vượt qua kỳ Casting chuyên môn!",
      body: "Chào mừng bạn đã trở thành một phần của đại gia đình SmashTeam. Dưới đây là thông số đánh giá chuyên môn ban đầu của bạn được Ban Tuyển Trạch ghi nhận:",
      show_stats: true,
      call_to_action_text: "KÍCH HOẠT TÀI KHOẢN",
      footer_text: "Đây là email tự động từ Ban Quản Trị SMASH TEAM. Vui lòng không trả lời thư này."
    });
    showToast("Đã đưa về nội dung mẫu chuẩn. Vui lòng bấm 'Lưu Mẫu Email' để hoàn tất.");
  };

  // Gửi email thử nghiệm
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes("@")) {
      alert("Vui lòng nhập một địa chỉ email hợp lệ.");
      return;
    }

    setIsSendingTest(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/emails/send-test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          toEmail: testEmail,
          type: testType,
          template: welcomeForm,
          broadcastData: {
            ...broadcastForm,
            ctaText: broadcastForm.showCta ? broadcastForm.ctaText : ""
          }
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowTestModal(false);
        showToast(`Đã gửi thư thử nghiệm thành công tới ${testEmail}!`);
        fetchQuota();
      } else {
        alert(data.error || "Gửi thư thử nghiệm thất bại.");
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ.");
    } finally {
      setIsSendingTest(false);
    }
  };

  // Kích hoạt gửi Broadcast Hàng Loạt
  const handleExecuteBroadcast = async () => {
    setShowConfirmModal(false);
    setIsSendingBroadcast(true);

    let targetLabel = "Tất cả thành viên chính thức";
    if (broadcastTarget === "all_candidates") targetLabel = "Toàn bộ ứng viên Casting";
    else if (broadcastTarget === "all_users") targetLabel = "Toàn bộ người dùng";
    else if (broadcastTarget === "specific_users") targetLabel = `Tự chọn (${selectedUserIds.length} người)`;
    else if (broadcastTarget === "by_campaign") {
      const c = campaignsList.find(item => item.id === selectedCampaignId);
      targetLabel = c ? `Đợt: ${c.name}` : "Đợt tuyển chọn";
    }

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/emails/broadcast`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          target_audience: broadcastTarget,
          target_label: targetLabel,
          campaign_id: selectedCampaignId,
          selected_user_ids: broadcastTarget === "specific_users" ? selectedUserIds : undefined,
          subject: broadcastForm.subject,
          heading: broadcastForm.heading,
          body: broadcastForm.body,
          ctaText: broadcastForm.showCta ? broadcastForm.ctaText : "",
          ctaLink: broadcastForm.showCta ? broadcastForm.ctaLink : "",
          footerText: broadcastForm.footerText
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Đã gửi thông báo hàng loạt thành công!");
        fetchBroadcastLogs();
        fetchQuota();
        setActiveTab("history");
      } else {
        showToast(data.error || "Gửi email hàng loạt thất bại.", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối khi gửi email hàng loạt.", "error");
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-3 duration-200 ${
          toast.type === "success" 
            ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/30" 
            : "bg-rose-950/90 text-rose-200 border-rose-500/30"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER SECTION & GÓC HIỂN THỊ HẠN MỨC GỬI EMAIL (RESEND QUOTA) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-secondary tracking-tight flex items-center gap-2.5">
            <Mail className="w-6 h-6 text-primary" />
            Hộp Thư & Gửi Email Hệ Thống
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Quản lý mẫu thư trúng tuyển tự động và phát sóng email thông báo giải đấu, sinh hoạt hàng loạt qua Resend API.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* GÓC NHỎ HIỂN THỊ HẠN MỨC GỬI EMAIL CHÍNH XÁC */}
          <div className="bg-white border border-slate-200/90 rounded-2xl px-3.5 py-2 shadow-xs flex items-center gap-3 text-xs">
            {/* Hạn mức ngày: 100 mail/ngày */}
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                quota.daily.remaining <= 10 
                  ? "bg-rose-500 animate-ping" 
                  : quota.daily.remaining <= 30 
                  ? "bg-amber-500" 
                  : "bg-emerald-500"
              }`} />
              <div className="leading-tight">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <span>Hôm nay</span>
                  <span className="text-[9px] text-slate-400 font-normal">({quota.daily.sent}/100)</span>
                </div>
                <div className="font-extrabold text-secondary flex items-baseline gap-1">
                  <span className={`text-xs ${
                    quota.daily.remaining <= 10 
                      ? "text-rose-600 font-black" 
                      : quota.daily.remaining <= 30 
                      ? "text-amber-600" 
                      : "text-emerald-600"
                  }`}>
                    {quota.daily.remaining}
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">mail có thể gửi</span>
                </div>
              </div>
            </div>

            <div className="h-7 w-px bg-slate-200" />

            {/* Hạn mức tháng: 3.000 mail/tháng */}
            <div className="flex items-center gap-2">
              <div className="leading-tight">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <span>Tháng này</span>
                  <span className="text-[9px] text-slate-400 font-normal">({quota.monthly.sent}/3.000)</span>
                </div>
                <div className="font-extrabold text-secondary flex items-baseline gap-1">
                  <span className="text-xs text-primary font-black">
                    {quota.monthly.remaining.toLocaleString("vi-VN")}
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">mail có thể gửi</span>
                </div>
              </div>
            </div>

            {/* Nút làm mới Quota */}
            <button
              type="button"
              onClick={fetchQuota}
              title="Làm mới số liệu hạn mức"
              className="p-1 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQuota ? "animate-spin text-primary" : ""}`} />
            </button>
          </div>

          <button
            onClick={() => {
              setTestType(activeTab === "broadcast" ? "broadcast" : "welcome");
              setShowTestModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-primary border border-purple-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gửi Thử Nghiệm</span>
          </button>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div className="flex bg-slate-200/80 p-1.5 rounded-2xl w-full sm:w-fit gap-1">
        <button
          onClick={() => setActiveTab("welcome_template")}
          className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === "welcome_template"
              ? "bg-secondary text-white shadow-md font-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Mẫu Email Trúng Tuyển</span>
        </button>

        <button
          onClick={() => setActiveTab("broadcast")}
          className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === "broadcast"
              ? "bg-secondary text-white shadow-md font-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-4 h-4 text-cyan-400" />
          <span>Gửi Mail Hàng Loạt (Broadcast)</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === "history"
              ? "bg-secondary text-white shadow-md font-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <History className="w-4 h-4 text-purple-400" />
          <span>Lịch Sử Gửi Thư ({broadcastLogs.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MẪU EMAIL TRÚNG TUYỂN (ADMISSION TEMPLATE)                         */}
      {/* ========================================================================= */}
      {activeTab === "welcome_template" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI: BỘ SOẠN THẢO CẤU HÌNH (7 CỘT) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-secondary">Thiết Lập Nội Dung Thư Trúng Tuyển</h2>
                <p className="text-xs text-slate-500">Mẫu này sẽ tự động được gửi ngay khi bạn bấm Duyệt ứng viên trong tab Nhân sự.</p>
              </div>
              <button
                type="button"
                onClick={handleResetDefaultWelcome}
                className="text-xs text-slate-400 hover:text-slate-700 font-bold flex items-center gap-1 cursor-pointer transition-colors p-1"
                title="Khôi phục mẫu mặc định"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mặc định</span>
              </button>
            </div>

            <form onSubmit={handleSaveWelcome} className="space-y-4 text-xs">
              {/* Tiêu đề thư (Subject) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Tiêu Đề Email (Subject) *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Xuất hiện đầu tiên trong hòm thư</span>
                </label>
                <input
                  type="text"
                  required
                  value={welcomeForm.subject}
                  onChange={(e) => setWelcomeForm({ ...welcomeForm, subject: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900 font-medium"
                  placeholder="🏸 Chúc mừng bạn đã trúng tuyển..."
                />
              </div>

              {/* Tiêu đề chính trong email (Heading) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Lời Mở Đầu / Tiêu Đề Banner *</label>
                <input
                  type="text"
                  required
                  value={welcomeForm.heading}
                  onChange={(e) => setWelcomeForm({ ...welcomeForm, heading: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                />
              </div>

              {/* Phụ đề (Subheading) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Lời Chúc Mừng Phụ Đề</label>
                <input
                  type="text"
                  value={welcomeForm.subheading}
                  onChange={(e) => setWelcomeForm({ ...welcomeForm, subheading: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                />
              </div>

              {/* Biến thay thế tự động (Placeholders) */}
              <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-2xl space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Chèn biến tự động (Bấm để thêm vào nội dung):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "Họ và tên", val: "{ho_ten}" },
                    { label: "Đánh giá sao", val: "{so_sao}" },
                    { label: "Điểm ELO", val: "{diem_elo}" },
                    { label: "Tên CLB", val: "{ten_clb}" },
                    { label: "Link kích hoạt", val: "{link_kich_hoat}" }
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => insertVariable(item.val)}
                      className="px-2.5 py-1 bg-white hover:bg-primary hover:text-white text-slate-700 border border-purple-200 rounded-lg text-[10px] font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                    >
                      + {item.label} <code className="text-primary font-mono ml-0.5 group-hover:text-white">{item.val}</code>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nội dung thư (Body) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nội Dung Thư Chính *</label>
                <textarea
                  rows={4}
                  required
                  value={welcomeForm.body}
                  onChange={(e) => setWelcomeForm({ ...welcomeForm, body: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900 leading-relaxed font-sans"
                />
              </div>

              {/* Bật/Tắt khối thông số */}
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <input
                  type="checkbox"
                  id="show_stats_cb"
                  checked={welcomeForm.show_stats}
                  onChange={(e) => setWelcomeForm({ ...welcomeForm, show_stats: e.target.checked })}
                  className="rounded text-primary focus:ring-0 cursor-pointer w-4 h-4"
                />
                <label htmlFor="show_stats_cb" className="font-bold text-slate-700 cursor-pointer select-none">
                  Hiển thị thẻ đánh giá chuyên môn (Họ tên, Sao Casting, Điểm ELO khởi điểm)
                </label>
              </div>

              {/* Nút bấm CTA & Chân trang */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Chữ Trên Nút Kích Hoạt</label>
                  <input
                    type="text"
                    value={welcomeForm.call_to_action_text}
                    onChange={(e) => setWelcomeForm({ ...welcomeForm, call_to_action_text: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Chân Trang / Lời Dặn (Footer)</label>
                  <input
                    type="text"
                    value={welcomeForm.footer_text}
                    onChange={(e) => setWelcomeForm({ ...welcomeForm, footer_text: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setTestType("welcome");
                    setShowTestModal(true);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-xs"
                >
                  Gửi Thử Nghiệm
                </button>
                <button
                  type="submit"
                  disabled={isSavingWelcome}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-primary/30 flex items-center gap-2 cursor-pointer text-xs disabled:opacity-50"
                >
                  {isSavingWelcome ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Lưu Mẫu Email</span>
                </button>
              </div>
            </form>
          </div>

          {/* CỘT PHẢI: KHUNG XEM TRƯỚC TRỰC QUAN (LIVE PREVIEW) (5 CỘT) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-primary" />
                Xem Trước Thực Tế (Live Preview)
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                Tự động cập nhật
              </span>
            </div>

            {/* Khung mô phỏng ứng dụng Email */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
              <div className="bg-slate-800/80 px-4 py-2.5 border-b border-slate-700/50 flex items-center justify-between text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-slate-400">Đến:</span>
                  <span className="font-mono text-purple-300 truncate">ungvien@example.com</span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">Bản xem trước</span>
              </div>
              <div className="p-2 bg-[#06050c] overflow-y-auto max-h-[640px]">
                {welcomePreviewHtml ? (
                  <div 
                    className="preview-email-container select-none pointer-events-none"
                    dangerouslySetInnerHTML={{ __html: welcomePreviewHtml }}
                  />
                ) : (
                  <div className="py-20 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span>Đang nạp bản xem trước...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GỬI MAIL HÀNG LOẠT (BULK EMAIL BROADCAST)                           */}
      {/* ========================================================================= */}
      {activeTab === "broadcast" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI: CẤU HÌNH CHIẾN DỊCH & SOẠN NỘI DUNG (7 CỘT) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-6">
            <div>
              <h2 className="text-base font-black text-secondary">Soạn Thảo Thông Báo Hàng Loạt</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Gửi email thông báo giải đấu, điều chỉnh lịch sinh hoạt hoặc tin tức quan trọng tới nhóm người nhận.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Bộ chọn nhóm người nhận (Audience Selector) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
                  1. Chọn Nhóm Người Nhận (Target Audience) *
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {[
                    { id: "all_members", label: "Tất cả Thành viên", desc: "Người đã được duyệt vào CLB" },
                    { id: "all_candidates", label: "Toàn bộ Ứng viên", desc: "Tất cả hồ sơ ứng tuyển" },
                    { id: "by_campaign", label: "Theo Đợt Tuyển Quân", desc: "Lọc theo từng chiến dịch" },
                    { id: "all_users", label: "Tất cả người dùng", desc: "Mọi tài khoản có email" },
                    { id: "specific_users", label: "🎯 Chọn người nhận cụ thể", desc: "Tùy chọn đích danh từng người" }
                  ].map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => {
                        setBroadcastTarget(opt.id as any);
                        if (opt.id === "specific_users" && selectableUsers.length === 0) {
                          fetchSelectableUsers();
                        }
                      }}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        broadcastTarget === opt.id
                          ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="font-bold text-secondary text-xs">{opt.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Dropdown đợt tuyển khi chọn by_campaign */}
                {broadcastTarget === "by_campaign" && (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="font-bold text-slate-700 block mb-1">Chọn Đợt Tuyển Quân:</label>
                    <select
                      value={selectedCampaignId}
                      onChange={(e) => setSelectedCampaignId(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-secondary"
                    >
                      {campaignsList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.is_active ? "🟢 Đang mở" : "Lịch sử"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* GIAO DIỆN CHỌN NGƯỜI NHẬN CỤ THỂ (SPECIFIC USERS SELECTOR) */}
                {broadcastTarget === "specific_users" && (
                  <div className="pt-3 border-t border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                        <UserCheck className="w-4 h-4 text-primary" />
                        <span>Danh Sách Người Nhận Đã Chọn ({selectedUserIds.length})</span>
                      </label>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            const idsToAdd = selectableUsers
                              .filter(u => userRoleFilter === "all" || u.role === userRoleFilter)
                              .filter(u => {
                                if (!userSearchQuery.trim()) return true;
                                const q = userSearchQuery.toLowerCase();
                                return (u.full_name || "").toLowerCase().includes(q) || 
                                       (u.email || "").toLowerCase().includes(q) || 
                                       (u.phone_zalo || "").toLowerCase().includes(q);
                              })
                              .map(u => u.id);
                            setSelectedUserIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
                          }}
                          className="text-primary hover:underline font-bold cursor-pointer"
                        >
                          + Chọn tất cả đang lọc
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedUserIds([])}
                          className="text-slate-500 hover:text-rose-600 font-medium cursor-pointer"
                        >
                          Bỏ chọn tất cả
                        </button>
                      </div>
                    </div>

                    {/* Chips hiển thị những người đã chọn */}
                    {selectedUserIds.length > 0 && (
                      <div className="p-2.5 bg-purple-50/60 border border-purple-100 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-primary">
                          <span>Đã chọn ({selectedUserIds.length} người nhận):</span>
                          {selectedUserIds.length > 15 && (
                            <span className="text-slate-400 font-normal">Hiển thị 15 người đầu tiên</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                          {selectableUsers
                            .filter(u => selectedUserIds.includes(u.id))
                            .slice(0, 15)
                            .map(u => (
                              <span
                                key={u.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-purple-200 rounded-lg text-[10px] font-bold text-secondary shadow-2xs"
                              >
                                <span>{u.full_name}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                                  }}
                                  className="text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                          {selectedUserIds.length > 15 && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-purple-100/80 rounded-lg text-[10px] font-bold text-primary">
                              +{selectedUserIds.length - 15} người khác
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Khung tìm kiếm & bộ lọc vai trò */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="Tìm theo tên, email hoặc số điện thoại..."
                          className="w-full pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary text-xs"
                        />
                        {userSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setUserSearchQuery("")}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Bộ lọc vai trò */}
                      <div className="flex bg-slate-200/70 p-1 rounded-xl gap-1 shrink-0">
                        {[
                          { id: "all", label: "Tất cả" },
                          { id: "member", label: "Thành viên" },
                          { id: "candidate", label: "Ứng viên" },
                          { id: "admin", label: "Admin" }
                        ].map((rf) => (
                          <button
                            key={rf.id}
                            type="button"
                            onClick={() => setUserRoleFilter(rf.id as any)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              userRoleFilter === rf.id
                                ? "bg-white text-secondary shadow-xs font-black"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {rf.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Danh sách người nhận cuộn */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {isLoadingSelectable ? (
                        <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          <span>Đang nạp danh sách người nhận...</span>
                        </div>
                      ) : selectableUsers.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs">
                          Không tìm thấy người dùng nào có địa chỉ email hợp lệ.
                        </div>
                      ) : (
                        (() => {
                          const filtered = selectableUsers
                            .filter(u => userRoleFilter === "all" || u.role === userRoleFilter)
                            .filter(u => {
                              if (!userSearchQuery.trim()) return true;
                              const q = userSearchQuery.toLowerCase();
                              return (u.full_name || "").toLowerCase().includes(q) || 
                                     (u.email || "").toLowerCase().includes(q) ||
                                     (u.phone_zalo || "").toLowerCase().includes(q);
                            });

                          if (filtered.length === 0) {
                            return (
                              <div className="py-6 text-center text-slate-400 text-xs">
                                Không có kết quả nào khớp với "{userSearchQuery}".
                              </div>
                            );
                          }

                          return filtered.map((u) => {
                            const isSelected = selectedUserIds.includes(u.id);
                            return (
                              <div
                                key={u.id}
                                onClick={() => {
                                  setSelectedUserIds(prev => 
                                    prev.includes(u.id) ? prev.filter(x => x !== u.id) : [...prev, u.id]
                                  );
                                }}
                                className={`p-2.5 px-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                                  isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                                    isSelected 
                                      ? "bg-primary border-primary text-white" 
                                      : "border-slate-300 bg-white"
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span className="font-bold text-secondary text-xs truncate">{u.full_name}</span>
                                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase shrink-0 ${
                                        u.role === 'admin' 
                                          ? 'bg-amber-100 text-amber-800' 
                                          : u.role === 'candidate' 
                                          ? 'bg-purple-100 text-purple-800' 
                                          : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {u.role === 'admin' ? 'Admin' : u.role === 'candidate' ? 'Ứng viên' : 'Thành viên'}
                                      </span>
                                    </div>
                                    <span className="text-[11px] font-mono text-purple-600 block truncate">
                                      {u.email}
                                    </span>
                                  </div>
                                </div>

                                {u.badminton_level && (
                                  <span className="text-[10px] text-slate-400 shrink-0 hidden sm:inline">
                                    {u.badminton_level}
                                  </span>
                                )}
                              </div>
                            );
                          });
                        })()
                      )}
                    </div>
                  </div>
                )}

                {/* Badge đếm số lượng người nhận */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-[11px]">
                  <span className="text-slate-500 font-medium">Số lượng hòm thư sẽ nhận thư:</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    {isLoadingCount ? (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tính toán...
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-black text-xs">
                        ✓ {recipientsCount} người nhận {broadcastTarget === "specific_users" ? "(Đã chọn)" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cảnh báo vượt quá hạn mức Resend trong ngày */}
                {recipientsCount > quota.daily.remaining && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800 mt-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Cảnh báo: Vượt quá hạn mức gửi hôm nay!</p>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        Số lượng người nhận (<strong>{recipientsCount}</strong>) vượt quá hạn mức Resend còn lại hôm nay (<strong>{quota.daily.remaining}</strong> mail). Vui lòng giảm bớt người nhận hoặc chờ reset hạn mức vào 00:00 UTC (07:00 sáng VN).
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tiêu đề thư (Subject) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">2. Tiêu Đề Thư Gửi Đi (Subject) *</label>
                <input
                  type="text"
                  required
                  value={broadcastForm.subject}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, subject: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900 font-medium"
                />
              </div>

              {/* Tiêu đề chính trong email */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">3. Tiêu Đề Bài Viết / Thông Báo *</label>
                <input
                  type="text"
                  required
                  value={broadcastForm.heading}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, heading: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                />
              </div>

              {/* Nội dung thông báo (Body) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">4. Nội Dung Thông Báo Chi Tiết *</label>
                <textarea
                  rows={5}
                  required
                  value={broadcastForm.body}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, body: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900 leading-relaxed font-sans"
                />
              </div>

              {/* Nút hành động CTA */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={broadcastForm.showCta}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, showCta: e.target.checked })}
                      className="rounded text-primary focus:ring-0 cursor-pointer w-4 h-4"
                    />
                    <span>Kèm nút bấm hành động (Call To Action Button)</span>
                  </label>
                </div>

                {broadcastForm.showCta && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Chữ trên nút</label>
                      <input
                        type="text"
                        value={broadcastForm.ctaText}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, ctaText: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Đường dẫn liên kết (URL)</label>
                      <input
                        type="text"
                        value={broadcastForm.ctaLink}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, ctaLink: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none text-slate-900 font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setTestType("broadcast");
                    setShowTestModal(true);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-xs"
                >
                  Gửi Thử Nghiệm
                </button>
                <button
                  type="button"
                  disabled={isSendingBroadcast || recipientsCount === 0 || recipientsCount > quota.daily.remaining}
                  onClick={() => setShowConfirmModal(true)}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-primary/30 flex items-center gap-2 cursor-pointer text-xs disabled:opacity-50"
                >
                  {isSendingBroadcast ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>🚀 Phát Sóng ({recipientsCount} Người Nhận)</span>
                </button>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: KHUNG XEM TRƯỚC BROADCAST (5 CỘT) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-primary" />
                Bản Xem Trước Thông Báo
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                Live Preview
              </span>
            </div>

            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
              <div className="bg-slate-800/80 px-4 py-2.5 border-b border-slate-700/50 flex items-center justify-between text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-slate-400">Gửi đến:</span>
                  <span className="font-bold text-cyan-300 truncate">{recipientsCount} người nhận</span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">HTML Broadcast</span>
              </div>
              <div className="p-2 bg-[#06050c] overflow-y-auto max-h-[640px]">
                {broadcastPreviewHtml ? (
                  <div 
                    className="preview-email-container select-none pointer-events-none"
                    dangerouslySetInnerHTML={{ __html: broadcastPreviewHtml }}
                  />
                ) : (
                  <div className="py-20 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span>Đang nạp bản xem trước...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LỊCH SỬ CÁC ĐỢT GỬI THƯ (BROADCAST LOGS)                           */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-secondary">Lịch Sử Các Đợt Gửi Email Hàng Loạt</h2>
              <p className="text-xs text-slate-500">Ghi lại đầy đủ số lượng thư gửi thành công và thất bại qua hệ thống.</p>
            </div>
            <button
              onClick={fetchBroadcastLogs}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {isLoadingLogs ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span>Đang tải lịch sử gửi thư...</span>
            </div>
          ) : broadcastLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              Chưa có chiến dịch gửi email hàng loạt nào trong hệ thống.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-3">Tiêu Đề Thông Báo</th>
                    <th className="p-3">Nhóm Đối Tượng</th>
                    <th className="p-3">Số Lượng Gửi</th>
                    <th className="p-3">Thời Gian</th>
                    <th className="p-3 text-right">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {broadcastLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-secondary max-w-xs truncate">
                        <div>{log.title}</div>
                        <span className="text-[10px] text-slate-400 font-normal truncate block">{log.subject}</span>
                      </td>
                      <td className="p-3 font-medium text-slate-600">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px] font-bold">
                          {log.target_label || log.target_audience}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-extrabold text-emerald-600">{log.success_count} thành công</span>
                        {log.failed_count > 0 && (
                          <span className="text-rose-500 font-bold ml-1.5">({log.failed_count} lỗi)</span>
                        )}
                        <span className="text-slate-400 block text-[10px]">/ {log.total_recipients} tổng số</span>
                      </td>
                      <td className="p-3 text-slate-500 font-medium">
                        {formatVietnamDate(log.created_at)}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1 ${
                          log.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.status === 'processing'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200 animate-pulse'
                            : log.status === 'failed'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {log.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin text-sky-600" />}
                          {log.status === 'completed' ? 'Hoàn tất' : log.status === 'processing' ? 'Đang xử lý ngầm' : log.status === 'failed' ? 'Thất bại' : 'Một phần'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL GỬI EMAIL THỬ NGHIỆM (SEND TEST MODAL)                              */}
      {/* ========================================================================= */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-secondary text-base flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                Gửi Thư Thử Nghiệm
              </h3>
              <button
                onClick={() => setShowTestModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Hệ thống sẽ gửi 1 bản email mẫu hoàn chỉnh với nội dung hiện tại tới địa chỉ email của bạn để kiểm tra hiển thị trước khi lưu hoặc gửi hàng loạt.
            </p>

            <form onSubmit={handleSendTest} className="space-y-3">
              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-700">Email Người Nhận Thử Nghiệm *</label>
                <input
                  type="email"
                  required
                  placeholder="nhap-email-cua-ban@gmail.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900 font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Bắn Email Test Ngay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL XÁC NHẬN BẮN EMAIL HÀNG LOẠT                                         */}
      {/* ========================================================================= */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-secondary">Xác Nhận Phát Sóng Email Hàng Loạt?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Bạn sắp gửi thông báo này tới <strong className="text-primary font-black text-sm">{recipientsCount}</strong> hòm thư điện tử {
                  broadcastTarget === "specific_users" ? "(chọn đích danh theo danh sách)" :
                  broadcastTarget === "all_members" ? "(tất cả thành viên chính thức)" :
                  broadcastTarget === "all_candidates" ? "(toàn bộ ứng viên)" :
                  broadcastTarget === "all_users" ? "(toàn bộ người dùng)" : "(theo đợt tuyển quân)"
                }. Sau khi bấm xác nhận, hệ thống sẽ tiến hành gửi tự động và không thể thu hồi.
              </p>
            </div>

            {/* Chi tiết danh sách người nhận nếu chọn specific_users */}
            {broadcastTarget === "specific_users" && selectedUserIds.length > 0 && (
              <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-bold text-primary text-[11px]">
                  <span>Danh sách người nhận ({selectedUserIds.length}):</span>
                  {selectedUserIds.length > 8 && <span className="text-slate-400 font-normal">Cuộn để xem hết</span>}
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {selectableUsers
                    .filter(u => selectedUserIds.includes(u.id))
                    .map(u => (
                      <div key={u.id} className="flex items-center justify-between py-0.5 border-b border-purple-100/50 text-[11px]">
                        <span className="font-semibold text-secondary">{u.full_name}</span>
                        <span className="font-mono text-purple-600 text-[10px]">{u.email}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1 text-slate-700">
              <p><strong>Tiêu đề:</strong> {broadcastForm.subject}</p>
              <p><strong>Chủ đề:</strong> {broadcastForm.heading}</p>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteBroadcast}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-primary/40 flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Tôi hiểu, bắt đầu gửi ngay!</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
