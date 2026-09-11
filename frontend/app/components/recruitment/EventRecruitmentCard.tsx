"use client";

import { motion } from "framer-motion";
import { 
  Calendar, MapPin, Clock, Users, ArrowRight, 
  Sparkles, CheckCircle2, ShieldCheck, Flame, ChevronRight 
} from "lucide-react";
import { format } from "date-fns";

export interface CastingSlotInfo {
  id: string | number;
  casting_time: string;
  location: string;
  max_capacity: number;
  registered_count?: number;
  is_active?: boolean;
}

export interface ActiveCampaignInfo {
  id?: string | number;
  name?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  badge_text?: string;
  description?: string;
  location?: string;
  target_audience?: string;
  target_capacity?: number;
  timeline_steps?: any;
  slots?: CastingSlotInfo[];
  total_registered?: number;
}

interface EventRecruitmentCardProps {
  campaign?: ActiveCampaignInfo | null;
  onOpenRegister: () => void;
  className?: string;
}

export default function EventRecruitmentCard({
  campaign,
  onOpenRegister,
  className = ""
}: EventRecruitmentCardProps) {
  // Compute numbers from active campaign or fallback to default recruitment campaign
  const campaignName = campaign?.name || "Chiến Dịch Tuyển Vợt Thủ SmashTeam Mùa Giải 2026";
  const campaignBadge = campaign?.badge_text || "Mùa Tuyển Quân 2026";
  const campaignDesc = campaign?.description || "Chào đón mọi cấp độ vợt thủ đam mê cầu lông gia nhập ngôi nhà chung SmashTeam. Tham gia ngay để tỏa sáng, nâng hạng ELO và rèn luyện thể lực hàng tuần!";
  const campaignLocation = campaign?.location || "Sân Cầu Lông Lan Anh";
  const campaignAudience = campaign?.target_audience || "Mọi cấp độ tay vợt";
  const slots = campaign?.slots || [];
  
  // Calculate total capacity and registered
  let totalCapacity = campaign?.target_capacity ? Number(campaign.target_capacity) : 60;
  let totalRegistered = 0;
  if (slots.length > 0) {
    const slotsCap = slots.reduce((acc, s) => acc + (Number(s.max_capacity) || 0), 0);
    if (slotsCap > 0 && !campaign?.target_capacity) totalCapacity = slotsCap;
    totalRegistered = slots.reduce((acc, s) => acc + (Number(s.registered_count) || 0), 0);
  }
  if (campaign?.total_registered !== undefined) {
    totalRegistered = Number(campaign.total_registered);
  }

  const fillPercent = totalCapacity > 0 ? Math.min(Math.round((totalRegistered / totalCapacity) * 100), 100) : 0;
  const remainingSlots = Math.max(0, totalCapacity - totalRegistered);

  // Format dates
  const startDateStr = campaign?.start_date ? format(new Date(campaign.start_date), "dd/MM/yyyy") : "01/03/2026";
  const endDateStr = campaign?.end_date ? format(new Date(campaign.end_date), "dd/MM/yyyy") : "30/03/2026";

  let parsedTimeline = null;
  if (campaign?.timeline_steps) {
    try {
      parsedTimeline = typeof campaign.timeline_steps === "string" ? JSON.parse(campaign.timeline_steps) : campaign.timeline_steps;
    } catch (e) {
      // fallback
    }
  }

  const timelineSteps = Array.isArray(parsedTimeline) && parsedTimeline.length > 0 ? parsedTimeline : [
    {
      step: "01",
      title: "Nộp Đơn Online",
      desc: "Điền hồ sơ thông tin, chọn ca test kỹ năng phù hợp.",
      status: "Đang diễn ra",
      isCurrent: true
    },
    {
      step: "02",
      title: "Casting & Thử Sân",
      desc: "Test thể lực, kỹ thuật cơ bản và đấu tập giao lưu trên sân.",
      status: "Sắp tới",
      isCurrent: false
    },
    {
      step: "03",
      title: "Onboard & Cấp Thẻ",
      desc: "Nhận áo đấu chính thức, kích hoạt mã định danh ELO.",
      status: "Chung cuộc",
      isCurrent: false
    }
  ];

  const isActive = campaign?.is_active !== false;

  return (
    <section 
      aria-labelledby="recruitment-card-title" 
      className={`w-full max-w-7xl mx-auto px-4 sm:px-6 my-12 ${className}`}
    >
      <div className="relative rounded-3xl bg-[#120e26] border border-primary/40 shadow-[0_15px_50px_rgba(122,34,224,0.25)] overflow-hidden p-6 sm:p-8 md:p-10 text-white">
        
        {/* Subtle Decorative Gradient Aura */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-fuchsia-600/15 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* CỘT TRÁI (7 CỘT): CHI TIẾT SỰ KIỆN */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Status Badges */}
            <div className="flex flex-wrap items-center gap-3">
              {isActive ? (
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black tracking-wider uppercase backdrop-blur-md">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Đang Mở Nhận Đơn</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black tracking-wider uppercase backdrop-blur-md">
                  <span>Tạm Đóng Nhận Đơn</span>
                </span>
              )}

              <span className="text-xs font-bold text-purple-300 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                {campaignBadge}
              </span>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h2 id="recruitment-card-title" className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                {campaignName}
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                {campaignDesc}
              </p>
            </div>

            {/* Quick Info Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10">
                <Calendar className="w-4 h-4 text-purple-300 shrink-0" />
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Thời gian mở</p>
                  <p className="font-bold text-white">{startDateStr} - {endDateStr}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10">
                <MapPin className="w-4 h-4 text-cyan-300 shrink-0" />
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Địa điểm test</p>
                  <p className="font-bold text-white truncate max-w-[140px]" title={campaignLocation}>{campaignLocation}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10">
                <Users className="w-4 h-4 text-amber-300 shrink-0" />
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Đối tượng</p>
                  <p className="font-bold text-white truncate max-w-[140px]" title={campaignAudience}>{campaignAudience}</p>
                </div>
              </div>
            </div>

            {/* Progress Bar (Slot Capacity) */}
            <div className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  Tiến độ nhận hồ sơ:
                </span>
                <span className="font-mono font-bold text-white">
                  Đã nhận <span className="text-primary-hover font-black">{totalRegistered}</span>/{totalCapacity} đơn ({fillPercent}%)
                </span>
              </div>
              
              <div className="w-full h-3 bg-slate-900/80 rounded-full overflow-hidden p-0.5 border border-white/10">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: `${fillPercent}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-primary via-purple-400 to-cyan-400 rounded-full"
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>Chỉ tiêu có hạn: Còn lại <strong className="text-emerald-400">{remainingSlots}</strong> chỗ trống</span>
                <span className="text-purple-300 font-semibold">Ưu tiên hồ sơ nộp sớm</span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-2">
              <button
                id="recruitment-card-register-btn"
                onClick={onOpenRegister}
                className="min-h-[50px] w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-primary-hover text-white font-black text-sm sm:text-base rounded-full shadow-[0_0_25px_rgba(122,34,224,0.55)] hover:shadow-[0_0_35px_rgba(157,78,221,0.75)] transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer focus-ring"
              >
                <span>Ứng tuyển thành viên ngay</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

          </div>

          {/* CỘT PHẢI (5 CỘT): TIMELINE 3 VÒNG TUYỂN DỤNG */}
          <div className="lg:col-span-5 bg-white/5 rounded-3xl p-6 sm:p-7 border border-white/10 backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-300" />
                Quy Trình 3 Vòng Tuyển Chọn
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Minh Bạch & Rõ Ràng</span>
            </div>

            <div className="space-y-6 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-gradient-to-b before:from-primary before:via-purple-500/50 before:to-transparent">
              {timelineSteps.map((step, idx) => (
                <div key={step.step} className="relative flex items-start gap-4 pl-1">
                  {/* Step Marker */}
                  <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 border ${
                    step.isCurrent
                      ? "bg-primary border-white text-white shadow-[0_0_12px_rgba(122,34,224,0.8)]"
                      : "bg-slate-900 border-white/20 text-slate-400"
                  }`}>
                    {step.step}
                  </div>

                  {/* Step Info */}
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-bold ${step.isCurrent ? "text-purple-200 font-black" : "text-slate-200"}`}>
                        {step.title}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        step.isCurrent ? "bg-primary/30 text-purple-300 border border-primary/40" : "bg-white/5 text-slate-400"
                      }`}>
                        {step.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Note Box */}
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200">
              💡 <strong>Lưu ý:</strong> Buổi test sân diễn ra trong không khí giao lưu vui vẻ, giúp phân loại trình độ và ghép kèo đánh đôi công bằng nhất.
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
