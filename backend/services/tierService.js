/**
 * Tier System Configuration & Calculation Service
 * Single Source of Truth for Rank Tiers across SmashTeam
 */

const RANK_TIERS = [
  {
    name: 'Challenger',
    label: 'Thách Đấu',
    minElo: 1800,
    maxElo: 3000,
    prevTierMin: 1600,
    badgeClass: 'bg-gradient-to-r from-red-600 via-rose-600 to-purple-600 text-white font-black shadow-md shadow-red-500/30 border border-red-400',
    glowClass: 'shadow-[0_0_25px_rgba(239,68,68,0.5)]',
    borderClass: 'border-red-500'
  },
  {
    name: 'Diamond',
    label: 'Kim Cương',
    minElo: 1600,
    maxElo: 1799,
    prevTierMin: 1400,
    badgeClass: 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white font-black shadow-md shadow-blue-500/30 border border-cyan-300',
    glowClass: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]',
    borderClass: 'border-blue-500'
  },
  {
    name: 'Platinum',
    label: 'Bạch Kim',
    minElo: 1400,
    maxElo: 1599,
    prevTierMin: 1200,
    badgeClass: 'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 text-white font-black shadow-md shadow-emerald-500/30 border border-emerald-300',
    glowClass: 'shadow-[0_0_18px_rgba(16,185,129,0.35)]',
    borderClass: 'border-teal-400'
  },
  {
    name: 'Gold',
    label: 'Vàng',
    minElo: 1200,
    maxElo: 1399,
    prevTierMin: 1100,
    badgeClass: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30 border border-yellow-300',
    glowClass: 'shadow-[0_0_15px_rgba(245,158,11,0.35)]',
    borderClass: 'border-amber-400'
  },
  {
    name: 'Silver',
    label: 'Bạc',
    minElo: 1100,
    maxElo: 1199,
    prevTierMin: 1000,
    badgeClass: 'bg-gradient-to-r from-slate-200 via-white to-slate-300 text-slate-900 font-black shadow-md shadow-slate-300/40 border border-slate-300',
    glowClass: 'shadow-[0_0_12px_rgba(148,163,184,0.25)]',
    borderClass: 'border-slate-300'
  },
  {
    name: 'Bronze',
    label: 'Đồng',
    minElo: 0,
    maxElo: 1099,
    prevTierMin: 0,
    badgeClass: 'bg-gradient-to-r from-amber-700 via-orange-800 to-amber-900 text-amber-50 font-black shadow-md shadow-amber-900/40 border border-amber-600',
    glowClass: 'shadow-[0_0_10px_rgba(180,83,9,0.3)]',
    borderClass: 'border-amber-700'
  }
];

function getTierByElo(elo) {
  const score = Number(elo) || 0;
  for (const tier of RANK_TIERS) {
    if (score >= tier.minElo) {
      return tier;
    }
  }
  return RANK_TIERS[RANK_TIERS.length - 1];
}

function getTierName(elo) {
  return getTierByElo(elo).name;
}

function getNextTierInfo(elo) {
  const currentTier = getTierByElo(elo);
  const currentIndex = RANK_TIERS.findIndex(t => t.name === currentTier.name);

  // Highest tier reached (Challenger)
  if (currentIndex <= 0) {
    return {
      hasNextTier: false,
      nextTierName: null,
      nextTierLabel: null,
      nextTierMinElo: currentTier.maxElo,
      eloNeeded: 0,
      progressPercent: 100
    };
  }

  const nextTier = RANK_TIERS[currentIndex - 1];
  const score = Number(elo) || 0;
  const eloNeeded = Math.max(0, nextTier.minElo - score);
  const tierSpan = nextTier.minElo - currentTier.minElo;
  const currentProgress = Math.max(0, score - currentTier.minElo);
  const progressPercent = tierSpan > 0 ? Math.min(100, Math.round((currentProgress / tierSpan) * 100)) : 100;

  return {
    hasNextTier: true,
    nextTierName: nextTier.name,
    nextTierLabel: nextTier.label,
    nextTierMinElo: nextTier.minElo,
    eloNeeded,
    progressPercent
  };
}

module.exports = {
  RANK_TIERS,
  getTierByElo,
  getTierName,
  getNextTierInfo
};
