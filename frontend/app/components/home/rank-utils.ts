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
  if (elo >= 1800) return "Challenger";
  if (elo >= 1600) return "Diamond";
  if (elo >= 1400) return "Platinum";
  if (elo >= 1200) return "Gold";
  if (elo >= 1100) return "Silver";
  return "Bronze";
}

export function getRankBadgeClass(rank: string): string {
  switch (rank) {
    case "Challenger":
      return "bg-gradient-to-r from-red-500 to-purple-600 text-white border border-red-400";
    case "Diamond":
      return "bg-blue-500 text-white";
    case "Platinum":
      return "bg-teal-500 text-white";
    case "Gold":
      return "bg-amber-500 text-white font-bold";
    case "Silver":
      return "bg-slate-300 text-slate-800";
    default:
      return "bg-amber-800/20 text-amber-900";
  }
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
