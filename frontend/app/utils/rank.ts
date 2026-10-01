/**
 * Bảng quy chuẩn phân cấp ELO của SmashTeam:
 * - Challenger (Thách Đấu): 1800+ ELO
 * - Diamond (Kim Cương): 1600 - 1799 ELO
 * - Platinum (Bạch Kim): 1400 - 1599 ELO
 * - Gold (Vàng): 1200 - 1399 ELO
 * - Silver (Bạc): 1100 - 1199 ELO
 * - Bronze (Đồng): < 1100 ELO
 */

export interface RankTier {
  name: string;
  label: string;
  minElo: number;
  badgeClass: string;
  glowClass: string;
  borderClass: string;
  nextElo: number;
  prevElo: number;
}

export const RANK_TIERS: RankTier[] = [
  {
    name: "Challenger",
    label: "Thách Đấu",
    minElo: 1800,
    badgeClass: "bg-gradient-to-r from-red-600 via-rose-600 to-purple-600 text-white shadow-md shadow-red-500/30 border border-red-400 font-black",
    glowClass: "rank-glow-challenger",
    borderClass: "bg-gradient-to-r from-red-500 via-purple-600 to-red-500 p-[3px]",
    nextElo: 2500,
    prevElo: 1800
  },
  {
    name: "Diamond",
    label: "Kim Cương",
    minElo: 1600,
    badgeClass: "bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30 border border-cyan-300 font-black",
    glowClass: "rank-glow-diamond",
    borderClass: "border-4 border-blue-500",
    nextElo: 1800,
    prevElo: 1600
  },
  {
    name: "Platinum",
    label: "Bạch Kim",
    minElo: 1400,
    badgeClass: "bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 text-white shadow-md shadow-emerald-500/30 border border-emerald-300 font-black",
    glowClass: "rank-glow-platinum",
    borderClass: "border-4 border-teal-400",
    nextElo: 1600,
    prevElo: 1400
  },
  {
    name: "Gold",
    label: "Vàng",
    minElo: 1200,
    badgeClass: "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/30 border border-yellow-300 font-black",
    glowClass: "rank-glow-gold",
    borderClass: "border-4 border-amber-400",
    nextElo: 1400,
    prevElo: 1200
  },
  {
    name: "Silver",
    label: "Bạc",
    minElo: 1100,
    badgeClass: "bg-gradient-to-r from-slate-200 via-white to-slate-300 text-slate-900 shadow-md shadow-slate-300/40 border border-slate-300 font-black",
    glowClass: "rank-glow-silver",
    borderClass: "border-4 border-slate-300",
    nextElo: 1200,
    prevElo: 1100
  },
  {
    name: "Bronze",
    label: "Đồng",
    minElo: 0,
    badgeClass: "bg-gradient-to-r from-amber-700 via-orange-800 to-amber-900 text-amber-50 shadow-md shadow-amber-900/40 border border-amber-600 font-black",
    glowClass: "rank-glow-bronze",
    borderClass: "border-4 border-amber-800",
    nextElo: 1100,
    prevElo: 800
  }
];

export const getRankName = (elo: number | null | undefined): string => {
  const score = Number(elo) || 0;
  if (score >= 1800) return "Challenger";
  if (score >= 1600) return "Diamond";
  if (score >= 1400) return "Platinum";
  if (score >= 1200) return "Gold";
  if (score >= 1100) return "Silver";
  return "Bronze";
};

export const getRankLabel = (rankOrElo: string | number | null | undefined): string => {
  if (typeof rankOrElo === "number") {
    if (rankOrElo >= 1800) return "Thách Đấu";
    if (rankOrElo >= 1600) return "Kim Cương";
    if (rankOrElo >= 1400) return "Bạch Kim";
    if (rankOrElo >= 1200) return "Vàng";
    if (rankOrElo >= 1100) return "Bạc";
    return "Đồng";
  }
  if (!rankOrElo) return "Đồng";
  const lower = rankOrElo.toLowerCase().trim();
  if (lower.includes("challenger") || lower.includes("thách đấu")) return "Thách Đấu";
  if (lower.includes("diamond") || lower.includes("kim cương")) return "Kim Cương";
  if (lower.includes("platinum") || lower.includes("bạch kim")) return "Bạch Kim";
  if (lower.includes("gold") || lower.includes("vàng")) return "Vàng";
  if (lower.includes("silver") || lower.includes("bạc")) return "Bạc";
  if (lower.includes("bronze") || lower.includes("đồng")) return "Đồng";
  return rankOrElo;
};

export const getRankBadgeClass = (rank: string): string => {
  const lower = (rank || "").toLowerCase().trim();
  if (lower.includes("challenger") || lower.includes("thách đấu")) {
    return "bg-gradient-to-r from-red-600 via-rose-600 to-purple-600 text-white shadow-md shadow-red-500/30 border border-red-400 font-black";
  }
  if (lower.includes("diamond") || lower.includes("kim cương")) {
    return "bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30 border border-cyan-300 font-black";
  }
  if (lower.includes("platinum") || lower.includes("bạch kim")) {
    return "bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 text-white shadow-md shadow-emerald-500/30 border border-emerald-300 font-black";
  }
  if (lower.includes("gold") || lower.includes("vàng")) {
    return "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/30 border border-yellow-300 font-black";
  }
  if (lower.includes("silver") || lower.includes("bạc")) {
    return "bg-gradient-to-r from-slate-200 via-white to-slate-300 text-slate-900 shadow-md shadow-slate-300/40 border border-slate-300 font-black";
  }
  return "bg-gradient-to-r from-amber-700 via-orange-800 to-amber-900 text-amber-50 shadow-md shadow-amber-900/40 border border-amber-600 font-black";
};

export const getRankConfig = (elo: number | null | undefined): RankTier => {
  const score = Number(elo) || 0;
  for (const tier of RANK_TIERS) {
    if (score >= tier.minElo) {
      return tier;
    }
  }
  return RANK_TIERS[RANK_TIERS.length - 1];
};

/**
 * Lấy phần tên rút gọn ở cuối câu (từ cuối cùng của họ tên)
 * Quy chuẩn: "Nguyễn Văn Thương" -> "Thương", "Lê Thị C" -> "C", "Nguyễn Văn A" -> "A"
 */
export const getShortName = (fullName: string | null | undefined): string => {
  if (!fullName) return "";
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/);
  return parts[parts.length - 1];
};

