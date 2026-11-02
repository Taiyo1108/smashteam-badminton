"use client";

import React, { useMemo } from "react";
import { Sparkles } from "lucide-react";

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
  title = "Nhà Tài Trợ & Đối Tác Đồng Hành",
  enabled = true,
}: SponsorsMarqueeProps) {
  const displayList = sponsors && sponsors.length > 0 ? sponsors : DEFAULT_SPONSORS;

  if (!enabled || displayList.length === 0) {
    return null;
  }

  // Lặp lại mảng các nhà tài trợ đủ số lần để tạo dải cuộn vô tận không bị hụt trên màn hình lớn
  const marqueeItems = useMemo(() => {
    if (displayList.length === 0) return [];
    const repeatCount = Math.max(3, Math.ceil(12 / displayList.length));
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
    <div className="relative z-20 w-full bg-black/60 backdrop-blur-md border-t border-purple-500/25 py-2.5 sm:py-3 overflow-hidden shadow-[0_-8px_24px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center gap-2 sm:gap-5">
        {/* Nhãn giới thiệu đối tác */}
        {title && (
          <div className="shrink-0 flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-purple-200/90 bg-purple-900/40 border border-purple-400/30 px-3 py-1 rounded-full whitespace-nowrap shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>{title}</span>
          </div>
        )}

        {/* Khung cuộn ngang (Marquee Track) */}
        <div className="relative flex-1 overflow-hidden w-full marquee-group">
          {/* Lớp phủ mờ dần ở hai mép trái/phải để tạo hiệu ứng xuất hiện mềm mại */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-black/80 via-black/40 to-transparent z-10" />

          <div className={`flex items-center gap-8 sm:gap-14 w-max ${speedClass}`}>
            {marqueeItems.map((item, index) => {
              const content = (
                <div className="flex items-center justify-center h-8 sm:h-9 md:h-10 px-2 py-0.5 group/logo transition-transform duration-300 hover:scale-110">
                  <img
                    src={item.logo_url}
                    alt={item.name}
                    className="max-h-full max-w-[110px] sm:max-w-[140px] md:max-w-[160px] object-contain opacity-80 group-hover/logo:opacity-100 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] brightness-95 group-hover/logo:brightness-110 transition-all duration-300"
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
                      className="cursor-pointer"
                    >
                      {content}
                    </a>
                  ) : (
                    <div title={item.name}>{content}</div>
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
