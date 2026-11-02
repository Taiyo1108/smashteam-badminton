"use client";

import React, { useMemo } from "react";
import { Sparkles, ArrowRight } from "lucide-react";

export interface SponsorItem {
  id: string;
  name: string;
  logo_url: string;
  website_url?: string;
}

// Bộ logo nhà tài trợ mặc định chuẩn thể thao cầu lông
export const DEFAULT_SPONSORS: SponsorItem[] = [
  {
    id: "sp-yonex",
    name: "Yonex Badminton",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Yonex_logo.svg/320px-Yonex_logo.svg.png",
    website_url: "https://www.yonex.com"
  },
  {
    id: "sp-victor",
    name: "Victor Badminton",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Victor_logo.svg/320px-Victor_logo.svg.png",
    website_url: "https://victorsport.com"
  },
  {
    id: "sp-lining",
    name: "Li-Ning",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Li-Ning_logo.svg/320px-Li-Ning_logo.svg.png",
    website_url: "https://lining.com"
  },
  {
    id: "sp-kamito",
    name: "Kamito Sports",
    logo_url: "https://kamito.vn/images/logo.png",
    website_url: "https://kamito.vn"
  },
  {
    id: "sp-redbull",
    name: "Red Bull Energy",
    logo_url: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/RedBullEnergyDrink.svg/320px-RedBullEnergyDrink.svg.png",
    website_url: "https://www.redbull.com"
  }
];

interface SponsorsMarqueeProps {
  sponsors?: SponsorItem[];
  speed?: "fast" | "normal" | "slow" | "paused";
  title?: string;
  enabled?: boolean;
}

export default function SponsorsMarquee({
  sponsors = DEFAULT_SPONSORS,
  speed = "normal",
  title = "Liên Hệ tài trợ tại đây:",
  enabled = true,
}: SponsorsMarqueeProps) {
  const displayList = sponsors && sponsors.length > 0 ? sponsors : DEFAULT_SPONSORS;

  if (!enabled || displayList.length === 0) {
    return null;
  }

  // Lặp lại mảng các nhà tài trợ đủ số lần để tạo dải cuộn vô tận không bị hụt trên màn hình lớn
  const marqueeItems = useMemo(() => {
    if (displayList.length === 0) return [];
    // Khi san sát nhau, cần nhiều items hơn để lấp đầy màn hình 100% trước khi lặp (-50%)
    const repeatCount = Math.max(4, Math.ceil(24 / displayList.length));
    const list: SponsorItem[] = [];
    for (let i = 0; i < repeatCount; i++) {
      list.push(...displayList);
    }
    return list;
  }, [displayList]);

  const speedClass = useMemo(() => {
    switch (speed) {
      case "fast":
        return "animate-marquee-fast";
      case "slow":
        return "animate-marquee-slow";
      case "paused":
        return "animate-marquee-paused";
      case "normal":
      default:
        return "animate-marquee-normal";
    }
  }, [speed]);

  return (
    <div className="relative z-20 w-full bg-black/60 backdrop-blur-md border-t border-purple-500/30 py-1 sm:py-1.5 overflow-hidden shadow-[0_-8px_24px_rgba(0,0,0,0.5)]">
      {/* Container full màn hình: căn sát lề trái & đối xứng lề phải trên Desktop */}
      <div className="w-full px-2.5 sm:px-5 md:px-6 lg:px-8 flex items-center gap-2.5 sm:gap-4 md:gap-6">
        {/* Nhãn liên hệ tài trợ - lùi sát góc trái khung hình */}
        {title && (
          <a
            href="https://www.facebook.com/profile.php?id=61566768825091"
            target="_blank"
            rel="noopener noreferrer"
            title="Bấm để liên hệ hợp tác / tài trợ với SmashTeam"
            className="shrink-0 flex items-center gap-1.5 text-[9px] sm:text-xs md:text-sm font-black uppercase tracking-wider text-amber-300 hover:text-white bg-gradient-to-r from-purple-950/90 via-purple-900/80 to-purple-950/90 hover:from-purple-900 hover:to-indigo-900 border border-amber-400/50 hover:border-amber-300 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl whitespace-nowrap shadow-[0_0_15px_rgba(251,191,36,0.2)] hover:shadow-[0_0_20px_rgba(251,191,36,0.4)] transition-all cursor-pointer group"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0 group-hover:rotate-12 transition-transform" />
            <span>{title}</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-300/70 group-hover:translate-x-0.5 transition-transform shrink-0 hidden sm:inline-block" />
          </a>
        )}

        {/* Khung cuộn ngang (Marquee Track) - Mở rộng tối đa toàn bộ diện tích còn lại */}
        <div className="relative flex-1 overflow-hidden w-full marquee-group">
          {/* Lớp phủ mờ đối xứng hai mép trái & phải mỏng nhẹ */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 sm:w-8 bg-gradient-to-r from-black/80 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 sm:w-8 bg-gradient-to-l from-black/80 to-transparent z-10" />

          {/* Dải logo to gần full viền, san sát nhau */}
          <div className={`flex items-center gap-2 sm:gap-3 md:gap-4 w-max ${speedClass}`}>
            {marqueeItems.map((item, index) => {
              const content = (
                <div className="flex items-center justify-center h-12 sm:h-14 md:h-16 lg:h-20 px-1 sm:px-1.5 group/logo transition-transform duration-200 hover:scale-105">
                  <img
                    src={item.logo_url}
                    alt={item.name}
                    className="h-full w-auto max-w-[140px] sm:max-w-[180px] md:max-w-[240px] lg:max-w-[280px] object-contain rounded-md opacity-95 group-hover/logo:opacity-100 filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] brightness-100 group-hover/logo:brightness-110 transition-all duration-200"
                    loading="lazy"
                  />
                </div>
              );

              return (
                <div key={`${item.id}-${index}`} className="shrink-0 flex items-center">
                  {item.website_url ? (
                    <a
                      href={item.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${item.name} (Bấm để xem website/fanpage đối tác)`}
                      className="cursor-pointer flex items-center"
                    >
                      {content}
                    </a>
                  ) : (
                    <div title={item.name} className="flex items-center">{content}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
