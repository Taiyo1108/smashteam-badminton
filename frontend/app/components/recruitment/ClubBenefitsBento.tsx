"use client";

import { motion } from "framer-motion";
import { 
  ShieldCheck, Trophy, Users, Flame,
  Sparkles, Dumbbell, Compass, HeartHandshake, Check
} from "lucide-react";

export default function ClubBenefitsBento() {
  return (
    <section aria-labelledby="why-join-title" className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
          <span>Đặc Quyền & Văn Hóa SmashTeam</span>
        </motion.div>

        <motion.h2
          id="why-join-title"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl md:text-5xl font-black text-secondary tracking-tight leading-[1.15] text-balance"
        >
          Tại Sao Bạn Nên <span className="bg-gradient-to-r from-primary via-smash-violet to-purple-800 bg-clip-text text-transparent">Gia Nhập Ngay?</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-slate-500 text-sm sm:text-base leading-relaxed"
        >
          Không chỉ là một câu lạc bộ đánh cầu đơn thuần, SmashTeam là bệ phóng rèn luyện thể lực, nâng tầm đẳng cấp thi đấu và xây dựng những tình bạn đẹp bền chặt.
        </motion.p>
      </div>

      {/* Modern Asymmetrical Bento Grid
          Mobile: xếp chồng 1 cột | Tablet (md): 2 cột đều | Desktop (lg): bento 7/5 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 sm:gap-6">
        
        {/* CARD 1 (Large - full tablet, 7 cols desktop): Môi trường rèn luyện chuẩn thi đấu */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="md:col-span-2 lg:col-span-7 min-w-0 bg-gradient-to-br from-secondary via-[#150f2b] to-secondary rounded-3xl p-6 sm:p-9 text-white border border-primary/30 shadow-xl relative overflow-hidden flex flex-col justify-between group"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/30 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/40 transition-all duration-500" />
          
          <div className="relative z-10 space-y-4 min-w-0">
            <div className="flex items-center justify-start gap-3">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform">
                <Dumbbell className="w-6 h-6" aria-hidden="true" />
              </div>
            </div>

            <h3 className="text-xl sm:text-3xl font-black tracking-tight leading-[1.2] text-balance break-words text-white">
              Lịch Sinh Hoạt Chuyên Nghiệp
            </h3>
            
            <ul className="text-slate-300 text-sm sm:text-base leading-relaxed space-y-2.5">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Lịch sinh hoạt cố định <strong className="text-white font-bold">Thứ 2 – 4 – 6, từ 19h đến 21h</strong> hàng tuần</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Sân sinh hoạt tại <strong className="text-white font-bold">Bình Thắng</strong></span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Ban chuyên môn hướng dẫn khởi động, <strong className="text-white font-bold">giáo án nâng sức bền</strong>, cầu Vinastar chuẩn thi đấu</span>
              </li>
            </ul>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-white/10 grid grid-cols-2 gap-3 text-center">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 min-w-0">
              <p className="font-black text-base sm:text-lg text-emerald-400">T2 • T4 • T6</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Lịch cố định hàng tuần</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 min-w-0">
              <p className="font-black text-base sm:text-lg text-amber-400">19h – 21h</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Giờ sinh hoạt mỗi buổi</p>
            </div>
          </div>
        </motion.div>

        {/* CARD 2 (5 cols desktop): Hệ thống ELO & Rank minh bạch */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-5 min-w-0 bg-white rounded-3xl p-6 sm:p-9 border border-purple-100 shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col justify-between group"
        >
          <div className="space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6" aria-hidden="true" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-center leading-snug">
                Thuật Toán Độc Quyền
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-secondary tracking-tight leading-[1.2] text-balance break-words">
              Đua Rank ELO Minh Bạch & Ghép Kèo Cân Não
            </h3>

            <ul className="text-slate-500 text-sm leading-relaxed space-y-2">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Mọi set đấu được <strong className="text-secondary font-bold">ghi nhận trực tiếp</strong> vào hệ thống</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Thuật toán ELO tự xếp hạng, <strong className="text-secondary font-bold">ghép kèo cân tài cân sức</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Thăng cấp từng nấc từ <strong className="text-secondary font-bold">Bronze lên Challenger</strong></span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600">
              <span className="truncate">Challenger (1800+)</span>
              <span className="text-fuchsia-600 shrink-0">Đỉnh cao</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 via-primary to-fuchsia-600 w-full rounded-full" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Bảng xếp hạng cập nhật tự động sau mỗi buổi đấu</p>
          </div>
        </motion.div>

        {/* CARD 3 (5 cols desktop): Đấu trường giải đấu nội bộ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="lg:col-span-5 min-w-0 bg-white rounded-3xl p-6 sm:p-9 border border-purple-100 shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col justify-between group"
        >
          <div className="space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Flame className="w-6 h-6" aria-hidden="true" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary px-3 py-1 rounded-full bg-purple-50 border border-primary/20 text-center leading-snug">
                SmashTeam League
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-secondary tracking-tight leading-[1.2] text-balance break-words">
              Giải Đấu Định Kỳ & Cúp Mùa Giải Vinh Danh
            </h3>

            <ul className="text-slate-500 text-sm leading-relaxed space-y-2">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <span>Đã tổ chức thành công <strong className="text-secondary font-bold">3 giải đấu</strong> nội bộ</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <span>Sân chơi cho mọi trình độ, từ <strong className="text-secondary font-bold">newbie đến nâng cao</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <span><strong className="text-secondary font-bold">Huy chương, bảng vinh danh</strong> và quà tặng cho nhà vô địch</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Trophy className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-secondary truncate">Cúp Vàng SmashTeam Championship</p>
              <p className="text-[11px] text-slate-400 truncate">Tranh cúp Đơn & Đôi Nam - Nữ hàng quý</p>
            </div>
          </div>
        </motion.div>

        {/* CARD 4 (full tablet, 7 cols desktop): Gắn kết Teambuilding & Văn hóa cởi mở */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="md:col-span-2 lg:col-span-7 min-w-0 bg-white rounded-3xl p-6 sm:p-9 border border-emerald-100 shadow-sm hover:shadow-xl hover:border-emerald-400/50 transition-all duration-300 flex flex-col justify-between group"
        >
          <div className="space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <HeartHandshake className="w-6 h-6" aria-hidden="true" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-center leading-snug">
                Gắn Kết & Đồng Đội
              </span>
            </div>

            <h3 className="text-xl sm:text-3xl font-black text-secondary tracking-tight leading-[1.2] text-balance break-words">
              Cộng Đồng Văn Minh, Thân Thiện & Teambuilding Tràn Đầy Năng Lượng
            </h3>

            <ul className="text-slate-500 text-sm sm:text-base leading-relaxed space-y-2.5">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                <span><strong className="text-secondary font-bold">Không khoảng cách</strong> giữa người mới và thành viên lâu năm</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Cafe kết nối, <strong className="text-secondary font-bold">ăn uống cuối tuần</strong></span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Thường xuyên <strong className="text-secondary font-bold">giao lưu với các CLB</strong> cầu lông khác</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Chào đón người mới</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Dã ngoại hàng quý</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Tôn trọng thượng võ</span>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
