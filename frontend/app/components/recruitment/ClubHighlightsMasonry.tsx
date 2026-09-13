"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, Image as ImageIcon, X, Sparkles, Trophy, 
  Dumbbell, Heart, ChevronRight, ExternalLink 
} from "lucide-react";

export interface HighlightItem {
  id: string | number;
  title: string;
  category: "all" | "tournaments" | "training" | "social";
  categoryLabel: string;
  type: "image" | "video";
  url: string;
  date?: string;
  description?: string;
}

interface ClubHighlightsMasonryProps {
  mediaFeed?: Array<{
    id: number | string;
    title: string;
    type: string;
    url: string;
  }>;
}

const defaultHighlights: HighlightItem[] = [
  {
    id: "h1",
    title: "Chung kết Đơn Nam - SmashTeam Mùa Hè 2025",
    category: "tournaments",
    categoryLabel: "Giải đấu",
    type: "image",
    url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    date: "Tháng 08/2025",
    description: "Trận chung kết nghẹt thở kéo dài 3 set giữa hai tay vợt cấp bậc Challenger."
  },
  {
    id: "h2",
    title: "Buổi tập chuyên sâu: Kỹ thuật đập cầu & Di chuyển lưới",
    category: "training",
    categoryLabel: "Luyện tập",
    type: "image",
    url: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    date: "Tháng 10/2025",
    description: "Rèn luyện thể lực và bộ chân di chuyển 6 góc sân cùng ban chuyên môn CLB."
  },
  {
    id: "h3",
    title: "Giao lưu dã ngoại & Teambuilding mừng sinh nhật CLB",
    category: "social",
    categoryLabel: "Gắn kết",
    type: "image",
    url: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    date: "Tháng 11/2025",
    description: "Hơn 60 thành viên cùng tham gia dã ngoại cuối tuần, nạp năng lượng sau các giải đấu."
  },
  {
    id: "h4",
    title: "Highlight: Pha smash chéo sân đạt tốc độ 320km/h",
    category: "tournaments",
    categoryLabel: "Giải đấu",
    type: "video",
    url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    date: "Tháng 12/2025",
    description: "Khoảnh khắc bùng nổ điểm số quyết định mang về chức vô địch đôi nam nữ."
  },
  {
    id: "h5",
    title: "Buổi thử sân & Phân loại trình độ tân binh K24",
    category: "training",
    categoryLabel: "Luyện tập",
    type: "image",
    url: "https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    date: "Tháng 01/2026",
    description: "Chào đón hơn 40 bạn ứng viên tham gia buổi tuyển chọn đầu năm."
  },
  {
    id: "h6",
    title: "Trao cúp ELO Vàng & Áo đấu vinh danh Quý 4",
    category: "tournaments",
    categoryLabel: "Giải đấu",
    type: "image",
    url: "https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    date: "Tháng 01/2026",
    description: "Vinh danh các tay vợt xuất sắc có tỷ lệ thắng trên 75% trong năm vừa qua."
  }
];

export default function ClubHighlightsMasonry({ mediaFeed }: ClubHighlightsMasonryProps) {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "tournaments" | "training" | "social">("all");
  const [activeMedia, setActiveMedia] = useState<HighlightItem | null>(null);

  // Combine default highlights with real API media feed if present
  const items: HighlightItem[] = (mediaFeed && mediaFeed.length > 0)
    ? mediaFeed.map((m, index) => {
        const isVideo = m.type === "video" || m.url.includes("youtube.com") || m.url.includes("youtu.be");
        return {
          id: m.id || index,
          title: m.title,
          category: index % 3 === 0 ? "tournaments" : index % 3 === 1 ? "training" : "social",
          categoryLabel: index % 3 === 0 ? "Giải đấu" : index % 3 === 1 ? "Luyện tập" : "Gắn kết",
          type: isVideo ? "video" : "image",
          url: m.url,
          date: "Gần đây",
          description: "Khoảnh khắc đáng nhớ trong hoạt động sinh hoạt và thi đấu của SmashTeam."
        };
      })
    : defaultHighlights;

  const filteredItems = selectedCategory === "all"
    ? items
    : items.filter(item => item.category === selectedCategory);

  const categories = [
    { id: "all", label: "Tất cả khoảnh khắc", icon: Sparkles },
    { id: "tournaments", label: "Giải đấu & Cúp", icon: Trophy },
    { id: "training", label: "Luyện tập sân cầu", icon: Dumbbell },
    { id: "social", label: "Teambuilding & Gắn kết", icon: Heart },
  ] as const;

  return (
    <section aria-labelledby="highlights-title" className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-12">
        <div className="space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Thư Viện Khoảnh Khắc</span>
          </div>
          <h2 id="highlights-title" className="text-3xl sm:text-4xl font-black text-secondary tracking-tight">
            Những Giây Phút <span className="text-primary">Bùng Nổ</span> Cùng SmashTeam
          </h2>
          <p className="text-slate-500 text-sm sm:text-base">
            Hình ảnh thực tế từ các buổi sinh hoạt, giải đấu nội bộ và những kỷ niệm đồng đội khó quên.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-h-[40px] px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer focus-ring ${
                  isActive
                    ? "bg-secondary text-white shadow-md scale-[1.02]"
                    : "bg-white text-slate-600 hover:text-secondary hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-purple-400" : "text-slate-400"}`} aria-hidden="true" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Masonry-Style Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {filteredItems.map((item, index) => {
          const isVideo = item.type === "video";
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              onClick={() => setActiveMedia(item)}
              className="group relative rounded-3xl overflow-hidden bg-slate-900 border border-purple-100 shadow-sm hover:shadow-2xl hover:border-primary/50 transition-all duration-300 cursor-pointer aspect-[4/3] flex flex-col justify-end"
            >
              {/* Background Media */}
              {isVideo ? (
                <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
                  <iframe
                    src={item.url}
                    title={item.title}
                    className="w-full h-full border-0 pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              ) : (
                <Image
                  src={item.url}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              )}

              {/* Gradient Overlay for Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/40 to-transparent pointer-events-none group-hover:via-secondary/50 transition-all" />

              {/* Top Category Badge */}
              <div className="absolute top-4 left-4 z-10">
                <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-secondary/80 backdrop-blur-md text-purple-300 border border-white/10 shadow-sm flex items-center gap-1.5">
                  {isVideo ? <Play className="w-3 h-3 text-purple-400 fill-purple-400" /> : <ImageIcon className="w-3 h-3 text-purple-400" />}
                  <span>{item.categoryLabel}</span>
                </span>
              </div>

              {/* Bottom Caption */}
              <div className="relative z-10 p-5 sm:p-6 space-y-1.5 text-white">
                {item.date && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">
                    {item.date}
                  </span>
                )}
                <h3 className="font-bold text-base sm:text-lg leading-snug group-hover:text-purple-200 transition-colors line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-slate-300 text-xs line-clamp-1 opacity-90">
                  {item.description}
                </p>
              </div>

              {/* Hover Indicator Icon */}
              <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all">
                <ChevronRight className="w-4 h-4" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Lightbox / Video Modal */}
      <AnimatePresence>
        {activeMedia && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-secondary/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-4xl bg-slate-950 rounded-3xl overflow-hidden border border-purple-500/30 shadow-2xl text-white flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 flex items-center justify-between border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/30 text-purple-200 border border-primary/40">
                    {activeMedia.categoryLabel}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{activeMedia.date}</span>
                </div>
                <button
                  onClick={() => setActiveMedia(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Đóng cửa sổ xem ảnh"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Media Body */}
              <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
                {activeMedia.type === "video" ? (
                  <iframe
                    src={activeMedia.url}
                    title={activeMedia.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <Image
                    src={activeMedia.url}
                    alt={activeMedia.title}
                    fill
                    className="object-contain"
                  />
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 sm:p-6 bg-slate-900/90 border-t border-white/10 space-y-1">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {activeMedia.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {activeMedia.description}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
