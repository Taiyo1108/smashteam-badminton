"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  MapPin, Clock, Plus, Loader2, Download, Users,
  CheckCircle, ChevronRight, UserCheck
} from "lucide-react";
import { API_URL } from "@/app/config";
import { QRCodeCanvas } from "qrcode.react";
import { PageHeader, Modal, PillButton, FormField, CardSkeleton } from "@/app/components/ui";

export default function AdminSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
  const [viewMode, setViewMode] = useState<"upcoming" | "history">("upcoming");

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
      }
    } catch (e) {
      console.error("Error fetching attendees:", e);
    } finally {
      setIsLoadingAttendees(false);
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
    ? `${window.location.origin}/check-in?session_id=${selectedSession.id}`
    : "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buổi tập CLB"
        desc="Tạo buổi sinh hoạt tập luyện mới và quản lý danh sách thành viên check-in quét mã QR Code."
        actions={
          <PillButton
            onClick={() => {
              setIsModalOpen(true);
              setTemplate("khac");
            }}
          >
            <Plus className="w-4 h-4" /> Tạo Buổi Tập
          </PillButton>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SESSIONS LIST */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex bg-slate-200/80 p-1 rounded-xl w-full">
            <button
              onClick={() => setViewMode("upcoming")}
              className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all text-center ${
                viewMode === "upcoming"
                  ? "bg-black text-white shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Sắp diễn ra
            </button>
            <button
              onClick={() => setViewMode("history")}
              className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all text-center ${
                viewMode === "history"
                  ? "bg-black text-white shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Lịch sử buổi đánh
            </button>
          </div>

          {isLoading ? (
            <CardSkeleton rows={4} />
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
                        {new Date(s.date_time).toLocaleDateString("vi-VN", {
                          weekday: "short",
                          day: "numeric",
                          month: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? "text-black" : "text-slate-400"}`} />
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
                <span className="text-[10px] bg-black/10 text-secondary font-black px-2 py-0.5 rounded uppercase">Chi tiết buổi tập</span>
                <h2 className="text-xl font-bold text-secondary mt-1">{selectedSession.title}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(selectedSession.date_time).toLocaleString("vi-VN")}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {selectedSession.location}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* QR CODE DISPLAY */}
                <div className="md:col-span-2 flex flex-col items-center justify-center p-4 border border-slate-100 rounded-2xl bg-slate-50 text-center">
                  <span className="text-xs font-bold text-secondary mb-3">MÃ QR CHECK-IN SÂN</span>
                  
                  <div className="bg-white p-4 rounded-xl shadow-inner border border-slate-200/50">
                    <QRCodeCanvas
                      id="session-qr-canvas"
                      value={qrCodeUrl}
                      size={180}
                      level={"H"}
                      includeMargin={true}
                    />
                  </div>

                  <button
                    onClick={downloadQRCode}
                    className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-secondary text-white hover:bg-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer shadow active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" /> Tải mã QR
                  </button>
                  <p className="text-[9px] text-slate-400 mt-2 leading-relaxed">Admin in hoặc hiển thị mã QR này lên máy tính bảng tại sân để thành viên check-in.</p>
                </div>

                {/* ATTENDEES TABLE */}
                <div className="md:col-span-3 space-y-3">
                  <h4 className="font-extrabold text-secondary text-sm flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-black" /> Thành viên đã quét mã ({attendees.length})
                  </h4>

                  {isLoadingAttendees ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-black" />
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
                                <Image src={a.avatar_url} alt={a.full_name} fill sizes="32px" loading="lazy" unoptimized className="object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold bg-purple-900 text-white uppercase text-[10px]">
                                  {a.full_name.charAt(0)}
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
                            {new Date(a.checked_in_at).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
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
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Thiết lập buổi sinh hoạt mới"
      >
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
                        ? "border-black bg-black/5 text-black"
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
                        ? "border-black bg-black/5 text-black"
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
                        ? "border-black bg-black/5 text-black"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Kiểu khác
                  </button>
                </div>
              </div>

              <FormField label="Tên buổi sinh hoạt">
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Buổi tập Thứ Bảy - Giao lưu ELO"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setTemplate("khac");
                  }}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-black text-sm bg-slate-50 font-bold"
                />
              </FormField>

              <FormField label="Thời gian bắt đầu">
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => {
                    setDateTime(e.target.value);
                    setTemplate("khac");
                  }}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-black text-sm bg-slate-50 font-bold"
                />
              </FormField>

              <FormField label="Địa điểm sân đấu">
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Sân cầu lông Kỳ Hòa, Quận 10"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setTemplate("khac");
                  }}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-black text-sm bg-slate-50 font-bold"
                />
              </FormField>

              {error && (
                <div className="p-3 text-xs bg-rose-50 text-rose-500 rounded-xl border border-rose-100 font-medium">
                  {error}
                </div>
              )}

              <PillButton type="submit" loading={isSubmitting} className="w-full">
                Tạo Buổi Tập
              </PillButton>
            </form>
      </Modal>
    </div>
  );
}
