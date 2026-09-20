export type CourtStatus = 'EMPTY' | 'DRAFT' | 'READY' | 'COMMITTING' | 'SAVED' | 'ERROR';

export interface Player {
  id: string;
  full_name: string;
  nickname?: string | null;
  avatar_url?: string | null;
  phone_zalo?: string | null;
  badminton_level?: string | null;
  role?: string;
  elo_singles: number;
  elo_doubles: number;
  matches_singles: number;
  matches_doubles: number;
  win_rate_singles: number;
  win_rate_doubles: number;
  streak_singles: number;
  streak_doubles: number;
  checked_in_at?: string | null;
}

export interface EloPreviewData {
  team1Elo: number;
  team2Elo: number;
  winProb1: number;
  winProb2: number;
  p1Diff: number;
  p1pDiff: number;
  p2Diff: number;
  p2pDiff: number;
  p1New: number;
  p1pNew: number;
  p2New: number;
  p2pNew: number;
  eloExchanged: number;
}

export interface CourtSlot {
  courtId: string;
  courtName: string;
  status: CourtStatus;
  player1Id: string;
  player1PartnerId: string;
  player2Id: string;
  player2PartnerId: string;
  scoreP1: string;
  scoreP2: string;
  winnerId: string;
  errorMessage?: string;
  eloPreview?: EloPreviewData | null;
  lastSavedMatch?: any;
}

export interface SessionItem {
  id: string;
  title: string;
  date_time: string;
  location: string;
  checkin_code?: string;
  qr_code?: string;
}

export interface MatchSuggestion {
  // For Doubles:
  team2?: [Player, Player];
  player2?: Player;
  player2Partner?: Player;
  team2Elo?: number;
  teamGap?: number;
  matchQuality?: number;
  
  // For Singles:
  player?: Player;
  elo?: number;
  eloGap?: number;
  matches?: number;
  winRate?: number;
  streak?: number;

  // For partner suggestion:
  partner?: Player;
  partnerElo?: number;
  combinedTeamElo?: number;
}
