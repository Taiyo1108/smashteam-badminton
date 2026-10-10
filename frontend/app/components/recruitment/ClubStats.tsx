"use client";

import { motion } from "framer-motion";
import { Users, Calendar, Swords, Zap, ArrowUpRight } from "lucide-react";

interface ClubStatsProps {
  memberCount?: number | string;
  sessionsPerWeek?: string;
  totalMatchesCount?: number | string;
  weeklyMatchesCount?: number | string;
  tournamentsCount?: string;
  topElo?: number | string;
  className?: string;
}

export default function ClubStats({
  memberCount = "150+",
  sessionsPerWeek = "2 - 3",
  totalMatchesCount = "165",
  weeklyMatchesCount,
  tournamentsCount,
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
      sublabel: "18h - 20h • Sân Bình Thắng",
      value: sessionsPerWeek,
      icon: Calendar,
      accentColor: "from-cyan-500 to-blue-600",
      textColor: "text-cyan-300",
      badge: "Thứ 4 • Thứ 5 • Thứ 7",
      badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
    },
    {
      id: "total-matches",
      label: "Tổng trận cầu",
      sublabel: "Đấu tập & Giao lưu ELO",
      value: totalMatchesCount ?? weeklyMatchesCount ?? (tournamentsCount || "0"),
      icon: Swords,
      accentColor: "from-amber-400 to-orange-500",
      textColor: "text-amber-400",
      badge: "Đã diễn ra",
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
      <div className="relative rounded-3xl p-[1px] bg-gradient-to-r from-primary/30 via-purple-500/15 to-primary/30 shadow-[0_10px_35px_rgba(122,34,224,0.1)]">
        {/* Inner Card Grid - Translucent Glassmorphism allowing background cover to be seen */}
        <div className="rounded-3xl bg-secondary/20 backdrop-blur-md border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-4 sm:p-6 md:p-8">
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
                  className={`flex flex-col justify-between group p-3 sm:p-4 rounded-2xl hover:bg-white/10 transition-all duration-300 ${
                    index > 0 ? "pt-4 sm:pt-4" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center group-hover:scale-110 group-hover:border-primary/50 transition-all backdrop-blur-sm">
                      <Icon className="w-5 h-5 text-purple-300" aria-hidden="true" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stat.badgeColor} tracking-wide backdrop-blur-sm`}>
                      {stat.badge}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight tabular-nums ${stat.textColor} drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]`}>
                        {stat.value}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" aria-hidden="true" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-white mt-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
                      {stat.label}
                    </h4>
                    <p className="text-[11px] text-slate-300 font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
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
