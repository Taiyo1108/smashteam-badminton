"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Calendar, MapPin, Clock, Plus, Loader2, X, Download, Users, 
  CheckCircle, ChevronRight, UserCheck, RefreshCw, QrCode, Check
} from "lucide-react";
import { API_URL } from "@/app/config";
import { QRCodeCanvas } from "qrcode.react";
import { format } from "date-fns";
import { getShortName } from "@/app/utils/rank";

export default function AdminSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
  const [viewMode, setViewMode] = useState<"upcoming" | "history">("upcoming");
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrMessage, setQrMessage] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState("");
  const [template, setTemplate] = useState<"dinh_ky" | "offline" | "khac">("khac");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async (historyMode = false) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/sessions?history=${historyMode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (e) {
      console.error("Error fetching sessions:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendees = async (sessionId: string) => {
    setIsLoadingAttendees(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/sessions/${sessionId}/attendees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAttendees(data.attendees || []);
        if (data.session) {
          setSelectedSession((prev: any) => ({ ...prev, ...data.session }));
        }
      }
    } catch (e) {
      console.error("Error fetching attendees:", e);
    } finally {
      setIsLoadingAttendees(false);
    }
  };

  const handleGenerateQr = async (sessionId: string, forceRefresh = false) => {
    setIsGeneratingQr(true);
    setQrMessage(null);
    try {
      const token = localStorage.getItem("admin_token");
      const url = `${API_URL}/api/admin/sessions/${sessionId}/qr${forceRefresh ? '?refresh=true' : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.qr_code) {
        setSelectedSession((prev: any) => prev ? { 
          ...prev, 
          qr_code: data.qr_code, 
          qr_created_at: data.qr_created_at || new Date().toISOString() 
        } : prev);
        setSessions((prev: any[]) => prev.map(s => s.id === sessionId ? { 
          ...s, 
          qr_code: data.qr_code, 
          qr_created_at: data.qr_created_at || new Date().toISOString() 
        } : s));
        setQrMessage(forceRefresh ? "Đã làm mới mã QR và cập nhật DB!" : "Đã tạo mã QR điểm danh và lưu vào DB!");
        setTimeout(() => setQrMessage(null), 4000);
      } else {
        alert(data.error || "Không thể tạo mã QR điểm danh.");
      }
    } catch (err) {
      console.error("Error generating QR code:", err);
      alert("Lỗi kết nối khi gọi API tạo mã QR.");
    } finally {
      setIsGeneratingQr(false);
    }
  };

  useEffect(() => {
    fetchSessions(viewMode === "history");
  }, [viewMode]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dateTime || !location) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          date_time: dateTime,
          location
        })
      });

      const data = await res.json();

      if (res.ok) {
        setIsModalOpen(false);
        setTitle("");
        setDateTime("");
        setLocation("");
        fetchSessions();
      } else {
        setError(data.error || "Không thể tạo buổi tập.");
      }
    } catch (err) {
      setError("Lỗi kết nối.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectSession = (session: any) => {
    setSelectedSession(session);
    fetchAttendees(session.id);
  };

  const downloadQRCode = () => {
    if (!selectedSession) return;
    const canvas = document.getElementById("session-qr-canvas") as HTMLCanvasElement;
    if (!canvas) return;

    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `QR-Code-${selectedSession.title.replace(/\s+/g, "-")}.png`;
    link.click();
  };

  const qrCodeUrl = selectedSession 
    ? (typeof window !== "undefined" ? window.location.origin : "") + 
      `/check-in?session_id=${selectedSession.id}${selectedSession.qr_code ? `&code=${selectedSession.qr_code}` : ""}`
    : "";

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-secondary tracking-tight">Quản lý Buổi tập CLB</h1>
          <p className="text-slate-500 text-sm mt-1">Tạo buổi sinh hoạt tập luyện mới và quản lý danh sách thành viên check-in quét mã QR Code.</p>
        </div>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setTemplate("khac");
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-secondary hover:bg-primary-hover font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" /> Tạo Buổi Tập
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SESSIONS LIST */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex bg-slate-200/80 p-1 rounded-xl w-full">
            <button
              onClick={() => setViewMode("upcoming")}
              className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all text-center ${
                viewMode === "upcoming"
                  ? "bg-primary text-secondary shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Sắp diễn ra
            </button>
            <button
              onClick={() => setViewMode("history")}
              className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all text-center ${
                viewMode === "history"
                  ? "bg-primary text-secondary shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Lịch sử buổi đánh
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-slate-400 text-xs">
              {viewMode === "history" ? "Chưa có lịch sử buổi tập nào." : "Chưa có buổi tập nào được xếp lịch."}
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => {
                const isSelected = selectedSession?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => selectSession(s)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                      isSelected 
                        ? "bg-secondary text-white border-secondary shadow-lg" 
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm line-clamp-1">{s.title}</h4>
                      <p className={`text-xs flex items-center gap-1 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                        <Clock className="w-3.5 h-3.5" />
                        {format(new Date(s.date_time), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary" : "text-slate-400"}`} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DETAILED CHECK-IN SCANNER & ATTENDEES */}
        <div className="lg:col-span-2">
          {selectedSession ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[10px] bg-primary/20 text-secondary font-black px-2 py-0.5 rounded uppercase">Chi tiết buổi tập</span>
                <h2 className="text-xl font-bold text-secondary mt-1">{selectedSession.title}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> 
                    {format(new Date(selectedSession.date_time), "dd/MM/yyyy HH:mm")}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> 
                    {selectedSession.location}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* QR CODE DISPLAY */}
                <div className="md:col-span-2 flex flex-col items-center justify-center p-5 border border-slate-100 rounded-2xl bg-slate-50/80 text-center relative">
                  <div className="flex items-center justify-between w-full mb-3 px-1">
                    <span className="text-xs font-black text-secondary uppercase tracking-wider flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-primary" /> QR Điểm Danh Sân
                    </span>
                    {selectedSession.qr_code && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Đã lưu DB
                      </span>
                    )}
                  </div>

                  {qrMessage && (
                    <div className="w-full mb-3 p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-[11px] font-bold animate-fade-in flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> {qrMessage}
                    </div>
                  )}

                  {selectedSession.qr_code ? (
                    <>
                      <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/70">
                        <QRCodeCanvas
                          id="session-qr-canvas"
                          value={qrCodeUrl}
                          size={170}
                          level={"H"}
                          includeMargin={true}
                        />
                      </div>

                      {/* Code and metadata */}
                      <div className="mt-3 space-y-1 w-full text-center">
                        <p className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 inline-block max-w-full truncate">
                          {selectedSession.qr_code}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Tạo lúc: {selectedSession.qr_created_at ? format(new Date(selectedSession.qr_created_at), "dd/MM/yyyy HH:mm") : format(new Date(), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>

                      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 w-full">
                        <button
                          onClick={downloadQRCode}
                          className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary text-white hover:bg-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer shadow active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5" /> Tải mã QR
                        </button>
                        <button
                          onClick={() => handleGenerateQr(selectedSession.id, true)}
                          disabled={isGeneratingQr}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                          title="Làm mới mã QR và cập nhật vào Database"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingQr ? "animate-spin text-primary" : ""}`} /> 
                          {isGeneratingQr ? "Đang tạo..." : "Làm mới QR"}
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-2 leading-relaxed">
                        Admin in hoặc chiếu QR lên máy tính bảng tại sân. Thành viên quét bằng Camera/Zalo để check-in.
                      </p>
                    </>
                  ) : (
                    <div className="py-6 px-4 flex flex-col items-center justify-center space-y-3 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-purple-100/70 border border-purple-200 flex items-center justify-center text-primary shadow-inner">
                        <QrCode className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-secondary">Buổi tập chưa có mã QR riêng</p>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-[220px]">
                          Gọi API tạo mã QR bảo mật cho buổi tập này và tự động lưu vào cơ sở dữ liệu.
                        </p>
                      </div>
                      <button
                        onClick={() => handleGenerateQr(selectedSession.id, false)}
                        disabled={isGeneratingQr}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-secondary hover:bg-primary-hover font-black text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {isGeneratingQr ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Đang gọi API & Lưu DB...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Tạo Mã QR Điểm Danh (Lưu DB)
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* ATTENDEES TABLE */}
                <div className="md:col-span-3 space-y-3">
                  <h4 className="font-extrabold text-secondary text-sm flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-primary" /> Thành viên đã quét mã ({attendees.length})
                  </h4>

                  {isLoadingAttendees ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : attendees.length === 0 ? (
                    <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                      Chưa có thành viên nào quét mã điểm danh.
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100">
                      {attendees.map((a) => (
                        <div key={a.user_id} className="p-3 flex items-center justify-between bg-white text-xs hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative">
                              {a.avatar_url ? (
                                <img src={a.avatar_url} alt={a.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold bg-purple-900 text-white uppercase text-[10px] px-0.5 truncate">
                                  {getShortName(a.full_name)}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-secondary">{a.full_name}</p>
                              <p className="text-[10px] text-slate-400">{a.phone_zalo} {a.nickname ? `• "${a.nickname}"` : ""}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                            <CheckCircle className="w-3 h-3" />
                            {format(new Date(a.checked_in_at), "dd/MM/yyyy HH:mm")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[300px] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Users className="w-12 h-12 text-slate-300 mb-3" />
              <h4 className="font-bold text-sm text-secondary mb-1">Chọn một buổi tập ở danh sách bên trái</h4>
              <p className="text-xs max-w-sm leading-relaxed">Chọn buổi tập để xem mã QR Code điểm danh tại sân và quản trị danh sách người điểm danh thực tế.</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE SESSION MODAL */}
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
              <Calendar className="w-5 h-5 text-primary" /> Thiết lập buổi sinh hoạt mới
            </h3>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Chọn loại buổi tập nhanh</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTemplate("dinh_ky");
                      setTitle("Sinh hoạt định kì");
                      const now = new Date();
                      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T19:00`;
                      setDateTime(dateStr);
                      setLocation("Sân Bình Thắng");
                    }}
                    className={`p-2 rounded-xl border text-[10px] font-black text-center transition-all cursor-pointer ${
                      template === "dinh_ky"
                        ? "border-primary bg-primary/10 text-secondary"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Sinh hoạt định kì
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTemplate("offline");
                      setTitle("Offline toàn bộ CLB");
                      const now = new Date();
                      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T17:00`;
                      setDateTime(dateStr);
                      setLocation("Sân Bình Thắng");
                    }}
                    className={`p-2 rounded-xl border text-[10px] font-black text-center transition-all cursor-pointer ${
                      template === "offline"
                        ? "border-primary bg-primary/10 text-secondary"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Offline toàn bộ CLB
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTemplate("khac");
                      setTitle("");
                      setDateTime("");
                      setLocation("");
                    }}
                    className={`p-2 rounded-xl border text-[10px] font-black text-center transition-all cursor-pointer ${
                      template === "khac"
                        ? "border-primary bg-primary/10 text-secondary"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Kiểu khác
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tên buổi sinh hoạt</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Buổi tập Thứ Bảy - Giao lưu ELO"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setTemplate("khac");
                  }}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm bg-slate-50 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Thời gian bắt đầu</label>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => {
                    setDateTime(e.target.value);
                    setTemplate("khac");
                  }}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm bg-slate-50 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Địa điểm sân đấu</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Sân cầu lông Kỳ Hòa, Quận 10"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setTemplate("khac");
                  }}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm bg-slate-50 font-bold"
                />
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
                  "Tạo Buổi Tập"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
