"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, MapPin, Clock, Users, ShieldCheck, CheckCircle2, 
  AlertCircle, QrCode, ArrowRight, Download, Share2, Sparkles, User 
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { API_URL } from "@/app/config";

export interface EventDetailData {
  id: string | number;
  title: string;
  banner_url?: string;
  start_date: string;
  end_date: string;
  location: string;
  total_slots: number;
  registered_slots: number;
  format_description: string;
  timeline: { time: string; activity: string }[];
  prizes?: string[];
}

export default function EventDetailAndRegistration() {
  // Dữ liệu sự kiện mẫu
  const [eventData, setEventData] = useState<EventDetailData>({
    id: "SMASH-CUP-2026",
    title: "Giải Cầu Lông SmashTeam Mở Rộng - Chinh Phục ELO 2026",
    banner_url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80",
    start_date: "2026-03-22T08:00:00",
    end_date: "2026-03-22T17:30:00",
    location: "Sân Cầu Lông Lan Anh, 291 Cách Mạng Tháng 8, P.12, Quận 10, TP.HCM",
    total_slots: 32,
    registered_slots: 24,
    format_description: "Thi đấu vòng tròn tính điểm vòng bảng, chọn 8 đội xuất sắc nhất vào tứ kết đấu loại trực tiếp. Kết quả được tính trực tiếp vào bảng điểm ELO nội bộ SmashTeam.",
    timeline: [
      { time: "07:30 - 08:00", activity: "Check-in VĐV qua mã QR & Phát áo đấu" },
      { time: "08:00 - 08:30", activity: "Khai mạc & Bốc thăm chia bảng ngẫu nhiên" },
      { time: "08:30 - 12:00", activity: "Thi đấu Vòng bảng (Đơn & Đôi)" },
      { time: "13:30 - 16:30", activity: "Vòng Tứ kết, Bán kết & Tranh cúp Vô địch" },
      { time: "16:45 - 17:30", activity: "Trao huy chương, phần thưởng & Giao lưu kết nối" }
    ],
    prizes: [
      "Giải Nhất: Cúp Vô Địch + 2,000,000đ + Huy hiệu Master",
      "Giải Nhì: Kỷ niệm chương Bạc + 1,000,000đ + +150 ELO",
      "Giải Ba: Kỷ niệm chương Đồng + 500,000đ + +100 ELO"
    ]
  });

  // State Form Đăng Ký
  const [formData, setFormData] = useState({
    fullName: "",
    phoneZalo: "",
    email: "",
    badmintonLevel: "Trung bình",
    playCategory: "doubles", // "singles" | "doubles"
    partnerName: "",
    partnerPhone: "",
    autoMatchPartner: false,
    agreedTerms: false,
    note: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketData, setTicketData] = useState<{
    ticketCode: string;
    status: "pending" | "confirmed" | "waitlist";
    registeredAt: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Tự động điền dữ liệu nếu thành viên đã đăng nhập
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      fetch(`${API_URL}/api/profile/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.player) {
            setFormData((prev) => ({
              ...prev,
              fullName: data.player.full_name || "",
              phoneZalo: data.player.phone_zalo || "",
              email: data.player.email || "",
              badmintonLevel: data.player.badminton_level || "Trung bình"
            }));
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.fullName || !formData.phoneZalo) {
      setFormError("Vui lòng điền họ tên và số điện thoại Zalo để BTC liên hệ.");
      return;
    }

    if (formData.playCategory === "doubles" && !formData.autoMatchPartner && !formData.partnerName) {
      setFormError("Vui lòng nhập tên bạn đánh cùng hoặc chọn 'Nhờ BTC ghép cặp ngẫu nhiên'.");
      return;
    }

    if (!formData.agreedTerms) {
      setFormError("Bạn cần đồng ý với cam kết thi đấu và nội quy của giải.");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      const randomTicketNum = Math.floor(1000 + Math.random() * 9000);
      setTicketData({
        ticketCode: `SMASH-EVT-2026-${randomTicketNum}`,
        status: "confirmed",
        registeredAt: new Date().toISOString()
      });
      setEventData((prev) => ({
        ...prev,
        registered_slots: Math.min(prev.total_slots, prev.registered_slots + 1)
      }));
    }, 800);
  };

  const remainingSlots = eventData.total_slots - eventData.registered_slots;
  const fillRate = Math.round((eventData.registered_slots / eventData.total_slots) * 100);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* EVENT BANNER & TOP HEADLINE */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-purple-900/30 text-white shadow-xl">
        <div className="h-64 sm:h-80 w-full relative">
          <img
            src={eventData.banner_url}
            alt={eventData.title}
            className="w-full h-full object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C0A1A] via-[#0C0A1A]/60 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase">
              ● Đang mở đăng ký
            </span>
            <span className="px-3 py-1 rounded-full bg-primary/25 border border-primary/40 text-purple-200 text-xs font-bold">
              Tính điểm ELO Mùa 2026
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            {eventData.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-400" />
              Chủ Nhật, 22 Tháng 3, 2026 (08:00 - 17:30)
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-cyan-400" />
              Sân Cầu Lông Lan Anh, Q.10, TP.HCM
            </span>
          </div>
        </div>
      </div>

      {/* 2-COLUMN MAIN CONTENT: CHI TIẾT SỰ KIỆN vs DYNAMIC REGISTRATION FORM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* CỘT TRÁI (7 CỘT): NỘI DUNG SỰ KIỆN */}
        <div className="lg:col-span-7 space-y-6">
          {/* Slot Progress Widget */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" /> Tiến độ lấp đầy slot thi đấu:
              </span>
              <span className="font-black text-slate-900">
                {eventData.registered_slots} / {eventData.total_slots} slots ({fillRate}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-purple-400 rounded-full transition-all duration-500"
                style={{ width: `${fillRate}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Còn lại <strong className="text-emerald-600 font-bold">{remainingSlots} slot</strong> trống</span>
              <span className="text-purple-600 font-medium">Ưu tiên VĐV đăng ký sớm</span>
            </div>
          </div>

          {/* Thể thức thi đấu */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Thể Thức & Điều Lệ Thi Đấu
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {eventData.format_description}
            </p>
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Nội dung</p>
                <p className="font-bold text-slate-800 mt-0.5">Đơn Nam & Đôi Tự Do</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Cầu thi đấu</p>
                <p className="font-bold text-slate-800 mt-0.5">VinaStar 77 / Hải Yến</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Cách tính điểm</p>
                <p className="font-bold text-slate-800 mt-0.5">3 set 21 điểm (BWF)</p>
              </div>
            </div>
          </div>

          {/* Timeline giải đấu */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Lịch Trình Chi Tiết Trong Ngày
            </h2>
            <div className="space-y-3">
              {eventData.timeline.map((item, index) => (
                <div key={index} className="flex items-start gap-4 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <span className="w-28 text-xs font-black text-primary shrink-0 pt-0.5">
                    {item.time}
                  </span>
                  <span className="text-xs text-slate-700 font-medium leading-relaxed">
                    {item.activity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (5 CỘT): FORM ĐĂNG KÝ HOẶC VÉ ĐIỆN TỬ */}
        <div className="lg:col-span-5">
          {!ticketData ? (
            /* FORM ĐIỀN ĐĂNG KÝ */
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-purple-200/80 shadow-md space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-900">Đơn Đăng Ký Vận Động Viên</h3>
                <p className="text-xs text-slate-500 mt-0.5">Hồ sơ sẽ được BTC xếp hạt giống và liên hệ xác nhận qua Zalo.</p>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
                {/* Họ tên */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-900"
                  />
                </div>

                {/* SĐT & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">SĐT Zalo *</label>
                    <input
                      type="tel"
                      required
                      placeholder="0912345678"
                      value={formData.phoneZalo}
                      onChange={(e) => setFormData({ ...formData, phoneZalo: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Email</label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                    />
                  </div>
                </div>

                {/* Nội dung thi đấu (Đơn / Đôi) */}
                <div className="space-y-1.5 pt-1">
                  <label className="font-bold text-slate-700">Nội dung đăng ký</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, playCategory: "singles" })}
                      className={`py-2 px-3 rounded-xl font-bold border transition-all text-center cursor-pointer ${
                        formData.playCategory === "singles"
                          ? "bg-purple-50 border-primary text-primary"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      Đơn Nam / Nữ
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, playCategory: "doubles" })}
                      className={`py-2 px-3 rounded-xl font-bold border transition-all text-center cursor-pointer ${
                        formData.playCategory === "doubles"
                          ? "bg-purple-50 border-primary text-primary"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      Đôi Nam / Nữ
                    </button>
                  </div>
                </div>

                {/* Nếu chọn đánh Đôi */}
                {formData.playCategory === "doubles" && (
                  <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Thông tin bạn đánh cùng</span>
                      <label className="flex items-center gap-1.5 text-[11px] text-primary cursor-pointer font-semibold">
                        <input
                          type="checkbox"
                          checked={formData.autoMatchPartner}
                          onChange={(e) => setFormData({ ...formData, autoMatchPartner: e.target.checked })}
                          className="rounded text-primary focus:ring-0"
                        />
                        Nhờ BTC ghép cặp
                      </label>
                    </div>

                    {!formData.autoMatchPartner && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Tên đồng đội"
                          value={formData.partnerName}
                          onChange={(e) => setFormData({ ...formData, partnerName: e.target.value })}
                          className="p-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                        />
                        <input
                          type="tel"
                          placeholder="SĐT Zalo đồng đội"
                          value={formData.partnerPhone}
                          onChange={(e) => setFormData({ ...formData, partnerPhone: e.target.value })}
                          className="p-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary text-slate-900"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Cam kết tham gia */}
                <div className="pt-2">
                  <label className="flex items-start gap-2 cursor-pointer text-slate-600">
                    <input
                      type="checkbox"
                      checked={formData.agreedTerms}
                      onChange={(e) => setFormData({ ...formData, agreedTerms: e.target.checked })}
                      className="mt-0.5 rounded text-primary focus:ring-0 cursor-pointer"
                    />
                    <span>
                      Tôi cam kết có mặt đúng giờ thi đấu và tuân thủ quyết định của tổ trọng tài SmashTeam.
                    </span>
                  </label>
                </div>

                {/* Nút Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[46px] mt-3 py-3 px-6 bg-primary hover:bg-[#9D4EDD] text-white font-black rounded-xl shadow-md shadow-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span>Đang nộp hồ sơ...</span>
                  ) : (
                    <>
                      <span>Xác nhận đăng ký tham gia</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* VÉ ĐIỆN TỬ VÀ QR CHECK-IN SAU KHI ĐĂNG KÝ THÀNH CÔNG */
            <div className="bg-gradient-to-b from-[#141026] to-[#0C0A1A] rounded-3xl p-6 border-2 border-primary/50 text-white shadow-2xl space-y-6 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase">
                <CheckCircle2 className="w-4 h-4" /> Đăng ký thành công
              </div>

              <div>
                <h3 className="text-xl font-black text-white">Thẻ Vận Động Viên Điện Tử</h3>
                <p className="text-xs text-purple-300 mt-1">Xuất trình mã này tại bàn tiếp đón vào ngày thi đấu</p>
              </div>

              {/* Khung QR Code */}
              <div className="p-4 bg-white rounded-2xl inline-block shadow-inner mx-auto">
                <QRCodeCanvas
                  value={`SMASH_CHECKIN:${ticketData.ticketCode}:${formData.phoneZalo}`}
                  size={150}
                  level="H"
                />
              </div>

              {/* Thông tin vé */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-xs space-y-2 text-left">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400">Mã định danh:</span>
                  <span className="font-mono font-black text-amber-300">{ticketData.ticketCode}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400">Vận động viên:</span>
                  <span className="font-bold text-white">{formData.fullName}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400">Nội dung thi đấu:</span>
                  <span className="font-bold text-purple-300">
                    {formData.playCategory === "doubles" ? "Đôi Nam/Nữ" : "Đơn Nam/Nữ"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Trạng thái vé:</span>
                  <span className="text-emerald-400 font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-emerald-500/20">
                    Đã xác nhận
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => alert("Đã lưu hình ảnh vé về thiết bị!")}
                  className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Lưu ảnh thẻ
                </button>
                <button
                  type="button"
                  onClick={() => setTicketData(null)}
                  className="py-2.5 px-4 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Đăng ký thêm
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
