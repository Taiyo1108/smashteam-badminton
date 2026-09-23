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

export interface MatchHistoryItem {
  id: string;
  created_at: string;
  status: 'approved' | 'voided' | 'pending';
  score_p1: number;
  score_p2: number;
  elo_exchanged: number;
  player1_id: string;
  player2_id: string;
  player1_partner_id: string | null;
  player2_partner_id: string | null;
  winner_id: string;
  player1_name: string;
  player1_nickname?: string | null;
  player1_avatar?: string | null;
  player2_name: string;
  player2_nickname?: string | null;
  player2_avatar?: string | null;
  player1_partner_name?: string | null;
  player1_partner_nickname?: string | null;
  player1_partner_avatar?: string | null;
  player2_partner_name?: string | null;
  player2_partner_nickname?: string | null;
  player2_partner_avatar?: string | null;
  winner_name: string;
  p1_elo_before?: number;
  p1_elo_after?: number;
  p2_elo_before?: number;
  p2_elo_after?: number;
  p1_partner_elo_before?: number;
  p1_partner_elo_after?: number;
  p2_partner_elo_before?: number;
  p2_partner_elo_after?: number;
}

export interface PlayerImpact {
  id: string;
  full_name: string;
  currentElo: number;
  newElo: number;
  eloDiff: number;
  currentMatches: number;
  newMatches: number;
  currentWins: number;
  newWins: number;
  currentLosses: number;
  newLosses: number;
  currentWinRate: string | number;
  newWinRate: string | number;
  currentStreak: number;
  newStreak: number;
  currentPeak: number;
  newPeak: number;
}

export interface AffectedMatch {
  id: string;
  created_at: string;
  player1_name: string;
  player2_name: string;
  player1_partner_name?: string;
  player2_partner_name?: string;
  score_p1: number;
  score_p2: number;
  p1_elo_after_old: number;
  p1_elo_after_new: number;
  p2_elo_after_old: number;
  p2_elo_after_new: number;
  elo_exchanged: number;
}

export interface MatchEditPreview {
  mode: 'singles' | 'doubles';
  before: any;
  after: any;
  isVoid: boolean;
  affectedMatchesCount: number;
  affectedMatches: AffectedMatch[];
  playerImpacts: Record<string, PlayerImpact>;
  checksum: string;
  warning?: string;
}

export interface MatchAuditLog {
  id: string;
  match_id: string;
  action?: string;
  action_type?: 'edit' | 'void';
  admin_user_id: string;
  admin_name?: string;
  reason: string;
  affected_matches_count: number;
  before_data: any;
  after_data: any;
  player_impacts: Record<string, any>;
  created_at: string;
}

