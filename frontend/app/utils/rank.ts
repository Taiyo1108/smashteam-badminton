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
    minElo: 1800,
    badgeClass: "bg-gradient-to-r from-red-500 to-purple-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] border border-red-400 font-extrabold",
    glowClass: "rank-glow-challenger",
    borderClass: "bg-gradient-to-r from-red-500 via-purple-600 to-red-500 p-[3px]",
    nextElo: 2500,
    prevElo: 1800
  },
  {
    name: "Diamond",
    minElo: 1600,
    badgeClass: "bg-blue-500 text-white shadow-[0_0_8px_rgba(59,130,246,0.3)] font-bold",
    glowClass: "rank-glow-diamond",
    borderClass: "border-4 border-blue-500",
    nextElo: 1800,
    prevElo: 1600
  },
  {
    name: "Platinum",
    minElo: 1400,
    badgeClass: "bg-teal-500 text-white font-bold",
    glowClass: "rank-glow-platinum",
    borderClass: "border-4 border-teal-400",
    nextElo: 1600,
    prevElo: 1400
  },
  {
    name: "Gold",
    minElo: 1200,
    badgeClass: "bg-amber-500 text-white font-bold",
    glowClass: "rank-glow-gold",
    borderClass: "border-4 border-amber-400",
    nextElo: 1400,
    prevElo: 1200
  },
  {
    name: "Silver",
    minElo: 1100,
    badgeClass: "bg-slate-300 text-slate-800 font-bold",
    glowClass: "rank-glow-silver",
    borderClass: "border-4 border-slate-300",
    nextElo: 1200,
    prevElo: 1100
  },
  {
    name: "Bronze",
    minElo: 0,
    badgeClass: "bg-amber-800/20 text-amber-900 font-bold",
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

export const getRankBadgeClass = (rank: string): string => {
  switch (rank) {
    case "Challenger":
      return "bg-gradient-to-r from-red-500 to-purple-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] border border-red-400 font-extrabold";
    case "Diamond":
      return "bg-blue-500 text-white shadow-[0_0_8px_rgba(59,130,246,0.3)] font-bold";
    case "Platinum":
      return "bg-teal-500 text-white font-bold";
    case "Gold":
      return "bg-amber-500 text-white font-bold";
    case "Silver":
      return "bg-slate-300 text-slate-800 font-bold";
    case "Bronze":
    default:
      return "bg-amber-800/20 text-amber-900 font-bold";
  }
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

