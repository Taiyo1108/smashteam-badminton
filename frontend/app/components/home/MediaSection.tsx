"use client";

import Image from "next/image";
import { memo, useState } from "react";
import { ImageIcon, Play } from "lucide-react";
import { getYouTubeId, type MediaItem } from "./rank-utils";

// Facade pattern: chỉ load iframe YouTube khi user bấm play.
// Giảm ~500KB+ JS ban đầu và tránh 3 iframe nặng cùng lúc.
function VideoFacade({ item }: { item: MediaItem }) {
  const [play, setPlay] = useState(false);
  const ytId = getYouTubeId(item.url);

  if (play) {
    const embed = ytId ? `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0` : item.url;
    return (
      <iframe
        src={embed}
        title={item.title}
        className="w-full h-full border-0"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  const thumb = ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : undefined;

  return (
    <button
      onClick={() => setPlay(true)}
      className="relative w-full h-full group cursor-pointer"
      aria-label={`Phát video: ${item.title}`}
    >
      {thumb ? (
        <Image
          src={thumb}
          alt={item.title}
          fill
          sizes="(max-width: 768px) 100vw, 240px"
          loading="lazy"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <span className="absolute inset-0 bg-black flex items-center justify-center">
          <Play className="w-10 h-10 text-white" />
        </span>
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Play className="w-6 h-6 text-black fill-black ml-0.5" />
        </span>
      </span>
    </button>
  );
}

function MediaSection({ items }: { items: MediaItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="grid md:grid-cols-3 gap-4 text-left">
      {items.slice(0, 6).map((m) => (
        <div key={m.id} className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-[4/5] group">
          {m.type === "image" ? (
            <Image
              src={m.url}
              alt={m.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1120px) 33vw, 240px"
              loading="lazy"
              decoding="async"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <VideoFacade item={m} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 p-5 pointer-events-none">
            <div className="flex items-center gap-1.5 text-yellow-400 mb-1.5">
              {m.type === "image" ? (
                <ImageIcon className="w-3.5 h-3.5" aria-hidden />
              ) : (
                <Play className="w-3.5 h-3.5" aria-hidden />
              )}
              <span className="text-[11px] font-bold uppercase tracking-wider">{m.type}</span>
            </div>
            <h3 className="text-white font-bold">{m.title}</h3>
          </div>
        </div>
      ))}
    </div>
  );
}

export default memo(MediaSection);
