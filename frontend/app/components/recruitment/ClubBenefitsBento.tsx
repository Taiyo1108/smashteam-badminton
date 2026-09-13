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
          className="text-3xl sm:text-4xl md:text-5xl font-black text-secondary tracking-tight"
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

      {/* Modern Asymmetrical Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
        
        {/* CARD 1 (Large - 7 cols): Môi trường rèn luyện chuẩn thi đấu */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="md:col-span-7 bg-gradient-to-br from-secondary via-[#150f2b] to-secondary rounded-3xl p-7 sm:p-9 text-white border border-primary/30 shadow-xl relative overflow-hidden flex flex-col justify-between group"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/30 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/40 transition-all duration-500" />
          
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform">
                <Dumbbell className="w-6 h-6" aria-hidden="true" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                Sân Bãi Tiêu Chuẩn
              </span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Cụm Sân Thảm Đạt Chuẩn & Lịch Sinh Hoạt Chuyên Nghiệp
            </h3>
            
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Tập luyện đều đặn 2 - 3 buổi mỗi tuần trên hệ thống sân thảm BWF chất lượng cao, ánh sáng chuẩn chống lóa. Có ban chuyên môn hỗ trợ khởi động đúng cách, phòng tránh chấn thương và giáo án nâng cao sức bền.
            </p>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-white/10 grid grid-cols-2 gap-3 text-center">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <p className="font-black text-lg text-emerald-400">2 - 3 Buổi</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase">Cố định mỗi tuần</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <p className="font-black text-lg text-amber-400">Vinastar</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase">Cầu thi đấu chuẩn</p>
            </div>
          </div>
        </motion.div>

        {/* CARD 2 (5 cols): Hệ thống ELO & Rank minh bạch */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="md:col-span-5 bg-white rounded-3xl p-7 sm:p-9 border border-purple-100 shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col justify-between group"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6" aria-hidden="true" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
                Thuật Toán Độc Quyền
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-secondary tracking-tight">
              Đua Rank ELO Minh Bạch & Ghép Kèo Cân Não
            </h3>

            <p className="text-slate-500 text-sm leading-relaxed">
              Mỗi set cầu đều được ghi nhận trực tiếp vào hệ thống. Thuật toán ELO xếp hạng tự động giúp bạn luôn có những trận cầu cân tài cân sức, từng bước thăng cấp từ Bronze lên Challenger.
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span>Challenger (1800+)</span>
              <span className="text-fuchsia-600 font-mono">Đỉnh cao</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 via-primary to-fuchsia-600 w-full rounded-full" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Bảng xếp hạng cập nhật tự động sau mỗi buổi đấu</p>
          </div>
        </motion.div>

        {/* CARD 3 (5 cols): Đấu trường giải đấu nội bộ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="md:col-span-5 bg-white rounded-3xl p-7 sm:p-9 border border-purple-100 shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col justify-between group"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Flame className="w-6 h-6" aria-hidden="true" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary px-3 py-1 rounded-full bg-purple-50 border border-primary/20">
                SmashTeam League
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-secondary tracking-tight">
              Giải Đấu Định Kỳ & Cúp Mùa Giải Vinh Danh
            </h3>

            <p className="text-slate-500 text-sm leading-relaxed">
              Cơ hội tỏa sáng thực thụ qua giải đấu Mùa Hè, Mùa Đông và cúp giao lưu liên CLB. Huy chương đúc riêng, bảng vinh danh và các phần quà tài trợ độc quyền giá trị.
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-black text-sm">
              🏆
            </div>
            <div>
              <p className="text-xs font-bold text-secondary">Cúp Vàng SmashTeam Championship</p>
              <p className="text-[11px] text-slate-400">Tranh cúp Đơn & Đôi Nam - Nữ hàng quý</p>
            </div>
          </div>
        </motion.div>

        {/* CARD 4 (7 cols): Gắn kết Teambuilding & Văn hóa cởi mở */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="md:col-span-7 bg-white rounded-3xl p-7 sm:p-9 border border-emerald-100 shadow-sm hover:shadow-xl hover:border-emerald-400/50 transition-all duration-300 flex flex-col justify-between group"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <HeartHandshake className="w-6 h-6" aria-hidden="true" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                Gắn Kết & Đồng Đội
              </span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-secondary tracking-tight">
              Cộng Đồng Văn Minh, Thân Thiện & Teambuilding Tràn Đầy Năng Lượng
            </h3>

            <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
              Ở SmashTeam, không có khoảng cách giữa người mới và người chơi lâu năm. Sau những giờ đập cầu rực lửa là những buổi cafe kết nối, dã ngoại cuối tuần, sinh nhật thành viên và chia sẻ kinh nghiệm học tập, công việc.
            </p>
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
