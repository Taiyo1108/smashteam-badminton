"use client";

import { motion } from "framer-motion";
import { Users, Calendar, Trophy, Zap, ArrowUpRight } from "lucide-react";

interface ClubStatsProps {
  memberCount?: number | string;
  sessionsPerWeek?: string;
  tournamentsCount?: string;
  topElo?: number | string;
  className?: string;
}

export default function ClubStats({
  memberCount = "150+",
  sessionsPerWeek = "3 - 4",
  tournamentsCount = "12+",
  topElo = "1850+",
  className = ""
}: ClubStatsProps) {
  const stats = [
    {
      id: "members",
      label: "Vợt thủ năng động",
      sublabel: "Cộng đồng gắn kết",
      value: memberCount,
      icon: Users,
      accentColor: "from-purple-500 to-primary",
      textColor: "text-white",
      badge: "Đang mở tuyển",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30"
    },
    {
      id: "sessions",
      label: "Buổi tập / tuần",
      sublabel: "Lịch cố định sân chuẩn",
      value: sessionsPerWeek,
      icon: Calendar,
      accentColor: "from-cyan-500 to-blue-600",
      textColor: "text-cyan-300",
      badge: "Thứ 3 • 5 • 7 • CN",
      badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
    },
    {
      id: "tournaments",
      label: "Giải đấu & Cúp",
      sublabel: "Nội bộ & Mở rộng",
      value: tournamentsCount,
      icon: Trophy,
      accentColor: "from-amber-400 to-orange-500",
      textColor: "text-amber-400",
      badge: "Mùa giải 2026",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30"
    },
    {
      id: "top-elo",
      label: "Top ELO Challenger",
      sublabel: "Hệ thống Rank chuẩn BWF",
      value: topElo,
      icon: Zap,
      accentColor: "from-fuchsia-500 to-pink-500",
      textColor: "text-pink-300",
      badge: "6 Bậc xếp hạng",
      badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30"
    }
  ];

  return (
    <div className={`w-full ${className}`}>
      {/* Outer Glow Container */}
      <div className="relative rounded-3xl p-[1px] bg-gradient-to-r from-primary/40 via-purple-500/20 to-primary/40 shadow-[0_10px_35px_rgba(122,34,224,0.15)]">
        {/* Inner Card Grid */}
        <div className="rounded-3xl bg-secondary/90 backdrop-blur-xl border border-white/10 p-4 sm:p-6 md:p-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className={`flex flex-col justify-between group p-3 sm:p-4 rounded-2xl hover:bg-white/5 transition-all duration-300 ${
                    index > 0 ? "pt-4 sm:pt-4" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:border-primary/50 transition-all">
                      <Icon className="w-5 h-5 text-purple-300" aria-hidden="true" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stat.badgeColor} tracking-wide`}>
                      {stat.badge}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight tabular-nums ${stat.textColor}`}>
                        {stat.value}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" aria-hidden="true" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-200 mt-1">
                      {stat.label}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {stat.sublabel}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
