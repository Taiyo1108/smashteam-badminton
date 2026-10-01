export type LeaderboardPlayer = {
  id: number | string;
  full_name: string;
  elo_score: number;
  win_rate: number;
  rank_name: string;
  total_matches: number;
};

export type MediaItem = {
  id: number | string;
  title: string;
  type: "image" | "video";
  url: string;
};

export function getRankName(elo: number): string {
  if (elo >= 1800) return "Thách Đấu";
  if (elo >= 1600) return "Kim Cương";
  if (elo >= 1400) return "Bạch Kim";
  if (elo >= 1200) return "Vàng";
  if (elo >= 1100) return "Bạc";
  return "Đồng";
}

export function getRankLabel(rankOrElo: string | number): string {
  if (typeof rankOrElo === "number") return getRankName(rankOrElo);
  const lower = (rankOrElo || "").toLowerCase();
  if (lower.includes("challenger") || lower.includes("thách đấu")) return "Thách Đấu";
  if (lower.includes("diamond") || lower.includes("kim cương")) return "Kim Cương";
  if (lower.includes("platinum") || lower.includes("bạch kim")) return "Bạch Kim";
  if (lower.includes("gold") || lower.includes("vàng")) return "Vàng";
  if (lower.includes("silver") || lower.includes("bạc")) return "Bạc";
  if (lower.includes("bronze") || lower.includes("đồng")) return "Đồng";
  return rankOrElo;
}

export function getRankBadgeClass(rank: string): string {
  const lower = (rank || "").toLowerCase().trim();
  if (lower.includes("challenger") || lower.includes("thách đấu")) {
    return "bg-gradient-to-r from-red-600 via-rose-600 to-purple-600 text-white font-black shadow-md shadow-red-500/30 border border-red-400";
  }
  if (lower.includes("diamond") || lower.includes("kim cương")) {
    return "bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white font-black shadow-md shadow-blue-500/30 border border-cyan-300";
  }
  if (lower.includes("platinum") || lower.includes("bạch kim")) {
    return "bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 text-white font-black shadow-md shadow-emerald-500/30 border border-emerald-300";
  }
  if (lower.includes("gold") || lower.includes("vàng")) {
    return "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30 border border-yellow-300";
  }
  if (lower.includes("silver") || lower.includes("bạc")) {
    return "bg-gradient-to-r from-slate-200 via-white to-slate-300 text-slate-900 font-black shadow-md shadow-slate-300/40 border border-slate-300";
  }
  return "bg-gradient-to-r from-amber-700 via-orange-800 to-amber-900 text-amber-50 font-black shadow-md shadow-amber-900/40 border border-amber-600";
}

export function getYouTubeId(url: string): string | null {
  try {
    if (url.includes("/embed/")) {
      const part = url.split("/embed/")[1]?.split(/[?&#]/)[0];
      return part || null;
    }
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    return null;
  } catch {
    return null;
  }
}

export function isVideoUrl(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be") || url.includes("embed");
}
