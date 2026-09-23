export interface RankedUser {
  id: string;
  full_name: string;
  nickname: string | null;
  avatar_url: string | null;
  selected_avatar_frame: string | null;
  selected_title: string | null;
  badminton_level: string | null;
  role: string;
  academic_info: string | null;
}

export interface RankedPlayer {
  rank: number;
  movement: 'UP' | 'DOWN' | 'SAME' | 'NEW';
  rankChange: number;
  previousRank: number | null;
  user: RankedUser;
  elo: number;
  peakElo: number;
  tier: string;
  tierLabel: string;
  badgeClass: string;
  glowClass: string;
  borderClass: string;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  streak: number;
  maxStreak: number;
  isProvisional: boolean;
  provisionalThreshold: number;
  isTopOne: boolean;
  gapToNext: number;
  targetPlayer: {
    id: string;
    name: string;
    rank: number;
    elo: number;
  } | null;
  gapCopy: string;
}

export interface SpotlightItem {
  user: RankedUser;
  label: string;
  subLabel: string;
  streak?: number;
  ranksGained?: number;
  currentRank?: number;
  eloGain?: number;
  matchCount?: number;
}

export interface RankingSpotlight {
  onFire: SpotlightItem | null;
  climber: SpotlightItem | null;
  rising: SpotlightItem | null;
  mostActive: SpotlightItem | null;
}

export interface RankingHubResponse {
  season: {
    id: number;
    name: string;
    isActive: boolean;
    startDate: string;
  };
  mode: 'singles' | 'doubles';
  filter: 'all' | 'official' | 'provisional';
  snapshotWeek: string | null;
  currentWeek: string;
  podium: RankedPlayer[];
  rankings: RankedPlayer[];
  totalPlayers: number;
  establishedCount: number;
  provisionalCount: number;
  minMatchesThreshold: number;
  spotlight: RankingSpotlight;
  myPosition: RankedPlayer | null;
}
