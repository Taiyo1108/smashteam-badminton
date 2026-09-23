"use client";

import React from "react";
import { Flame, TrendingUp, Zap, ArrowUpRight, Activity } from "lucide-react";
import AvatarWithFrame from "../AvatarWithFrame";
import { RankingSpotlight, RankedUser } from "./types";

interface PlayerSpotlightBarProps {
  spotlight: RankingSpotlight;
  onSelectUser: (user: RankedUser) => void;
}

export default function PlayerSpotlightBar({
  spotlight,
  onSelectUser
}: PlayerSpotlightBarProps) {
  const cards = [
    {
      id: "onFire",
      badge: "ON FIRE",
      badgeColor: "bg-gradient-to-r from-amber-500 to-red-500 text-white shadow-amber-500/20",
      icon: Flame,
      iconColor: "text-amber-500",
      bgGradient: "from-amber-500/10 via-amber-50/40 to-transparent",
      borderColor: "border-amber-200/80 hover:border-amber-400",
      data: spotlight?.onFire,
      emptyLabel: "Chờ chuỗi thắng mới",
      emptySub: "Thắng 2 trận liên tiếp để kích hoạt"
    },
    {
      id: "climber",
      badge: "CLIMBER",
      badgeColor: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20",
      icon: TrendingUp,
      iconColor: "text-emerald-500",
      bgGradient: "from-emerald-500/10 via-emerald-50/40 to-transparent",
      borderColor: "border-emerald-200/80 hover:border-emerald-400",
      data: spotlight?.climber,
      emptyLabel: "Chưa có bứt phá tuần",
      emptySub: "Tăng hạng so với snapshot tuần trước"
    },
    {
      id: "rising",
      badge: "RISING STAR",
      badgeColor: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/20",
      icon: ArrowUpRight,
      iconColor: "text-blue-500",
      bgGradient: "from-blue-500/10 via-blue-50/40 to-transparent",
      borderColor: "border-blue-200/80 hover:border-blue-400",
      data: spotlight?.rising,
      emptyLabel: "Chưa có đột biến ELO",
      emptySub: "Tích lũy ELO cao nhất trong 7 ngày"
    },
    {
      id: "mostActive",
      badge: "MOST ACTIVE",
      badgeColor: "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-500/20",
      icon: Activity,
      iconColor: "text-purple-500",
      bgGradient: "from-purple-500/10 via-purple-50/40 to-transparent",
      borderColor: "border-purple-200/80 hover:border-purple-400",
      data: spotlight?.mostActive,
      emptyLabel: "Chờ thêm trận đấu",
      emptySub: "Ra sân nhiều nhất trong 14 ngày"
    }
  ];

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">
            Tiêu Điểm Danh Vọng (Spotlight)
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 hidden sm:inline font-medium">
          Dữ liệu trực tiếp 7-14 ngày gần nhất
        </span>
      </div>

      {/* Responsive Grid: 4 columns on desktop, snap scroll on mobile */}
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none snap-x snap-mandatory">
        {cards.map((c) => {
          const Icon = c.icon;
          const user = c.data?.user;

          return (
            <div
              key={c.id}
              onClick={() => user && onSelectUser(user)}
              className={`min-w-[260px] sm:min-w-0 flex-1 rounded-2xl p-4 border bg-gradient-to-b ${c.bgGradient} bg-white shadow-sm transition-all duration-200 snap-center ${
                c.borderColor
              } ${user ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : "opacity-75"}`}
            >
              {/* Badge & Icon */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-xs ${c.badgeColor}`}>
                  {c.badge}
                </span>
                <Icon className={`w-4 h-4 ${c.iconColor}`} />
              </div>

              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <AvatarWithFrame
                      avatarUrl={user.avatar_url || ""}
                      frameStyle={user.selected_avatar_frame}
                      sizeClass="w-11 h-11"
                      alt={user.full_name}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-slate-800 text-sm truncate">
                        {user.full_name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {user.nickname ? `@${user.nickname}` : (user.academic_info || "SmashTeam")}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs font-black text-slate-900 tracking-tight">
                      {c.data?.label}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                      {c.data?.subLabel}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-3 text-center space-y-1">
                  <p className="text-xs font-bold text-slate-600">{c.emptyLabel}</p>
                  <p className="text-[10px] text-slate-400">{c.emptySub}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
