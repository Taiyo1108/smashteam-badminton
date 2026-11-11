/**
 * SmashTeam ELO & MOBA Rank Grind Calculation Utility (Client-side)
 * Exact 1:1 synchronization with backend/utils/elo.js
 */

export interface PlayerGrindInfo {
  matchesCount?: number;
  lossCount?: number;
}

export interface PlayerOutcome {
  delta: number;
  baseDelta?: number;
  itemBonus?: number;
  hasHopeStar?: boolean;
  isWinBoost: boolean;
  isLossShield: boolean;
  nextMatchesCount: number;
  nextLossCount: number;
}

export interface RankMatchEloResult {
  team1Elo: number;
  team2Elo: number;
  winProb1: number;
  winProb2: number;
  baseDelta: number;
  eloExchanged: number;
  team1Won: boolean;
  elo1New: number;
  elo2New: number;
  elo1_partnerNew: number | null;
  elo2_partnerNew: number | null;
  p1Diff: number;
  p2Diff: number;
  p1pDiff: number;
  p2pDiff: number;
  p1Outcome: PlayerOutcome;
  p2Outcome: PlayerOutcome;
  p1pOutcome: PlayerOutcome | null;
  p2pOutcome: PlayerOutcome | null;
}

export function getKFactor(matches: number): number {
  const m = Number(matches) || 0;
  if (m <= 5) return 40;
  if (m <= 10) return 38;
  if (m <= 25) return 36;
  if (m <= 50) return 32;
  if (m <= 100) return 28;
  return 26;
}

export function calculateRankMatchElo(params: {
  elo1: number;
  elo2: number;
  player1Id: string;
  player2Id: string;
  winnerId: string;
  matches1?: number;
  matches2?: number;
  elo1Partner?: number | null;
  elo2Partner?: number | null;
  matches1Partner?: number;
  matches2Partner?: number;
  player1PartnerId?: string | null;
  player2PartnerId?: string | null;
  grindInfo?: {
    p1?: PlayerGrindInfo;
    p2?: PlayerGrindInfo;
    p1p?: PlayerGrindInfo;
    p2p?: PlayerGrindInfo;
  };
  itemEffects?: {
    p1?: { hopeStar?: boolean };
    p2?: { hopeStar?: boolean };
    p1p?: { hopeStar?: boolean };
    p2p?: { hopeStar?: boolean };
  };
}): RankMatchEloResult {
  const {
    elo1, elo2, player1Id, player2Id, winnerId,
    matches1 = 0, matches2 = 0,
    elo1Partner = null, elo2Partner = null,
    matches1Partner = 0, matches2Partner = 0,
    player1PartnerId = null, player2PartnerId = null,
    grindInfo = {},
    itemEffects = {}
  } = params;

  // 1. Team ratings (averages)
  const T1 = elo1Partner !== null ? (elo1 + elo1Partner) / 2 : elo1;
  const T2 = elo2Partner !== null ? (elo2 + elo2Partner) / 2 : elo2;

  // 2. Individual K-factors
  const K1 = getKFactor(matches1);
  const K2 = getKFactor(matches2);

  // 3. Team K-factors
  let K_team1 = K1;
  if (elo1Partner !== null) {
    const K1_p = getKFactor(matches1Partner);
    K_team1 = (K1 + K1_p) / 2;
  }

  let K_team2 = K2;
  if (elo2Partner !== null) {
    const K2_p = getKFactor(matches2Partner);
    K_team2 = (K2 + K2_p) / 2;
  }

  // Common K for the match to guarantee symmetric base exchange
  const K_match = (K_team1 + K_team2) / 2;

  // 4. Expected scores
  const E1 = 1 / (1 + Math.pow(10, (T2 - T1) / 400));
  const E2 = 1 - E1;

  // 5. Team 1 won check
  const team1Won = winnerId === player1Id || (player1PartnerId !== null && winnerId === player1PartnerId);

  // 6. Base Delta [8, 40]
  const clampDelta = (d: number) => Math.max(-40, Math.min(40, d));
  const expectedWinnerScore = team1Won ? E1 : E2;
  const baseDelta = Math.max(8, clampDelta(Math.round(K_match * (1 - expectedWinnerScore))));

  // 7. Individual Player Outcomes (MOBA Ranked Grind & Hope Star Mechanics)
  const computePlayerOutcome = (playerWon: boolean, playerGrind?: PlayerGrindInfo, playerItem?: { hopeStar?: boolean }): PlayerOutcome => {
    const matchesCount = Math.max(0, Math.min(5, Number(playerGrind?.matchesCount) || 0));
    const lossCount = Math.max(0, Math.min(5, Number(playerGrind?.lossCount) || 0));

    let delta = 0;
    let isWinBoost = false;
    let isLossShield = false;
    let nextMatchesCount = matchesCount;
    let nextLossCount = lossCount;

    if (playerWon) {
      if (matchesCount >= 5) {
        isWinBoost = true;
        delta = baseDelta * 2; // THƯỞNG X2 ELO
        nextMatchesCount = 0;
      } else {
        delta = baseDelta;
        nextMatchesCount = Math.min(5, matchesCount + 1);
      }
      nextLossCount = lossCount;
    } else {
      if (matchesCount < 5) {
        nextMatchesCount = matchesCount + 1;
      } else {
        nextMatchesCount = 5; // Armed, waiting for win
      }

      if (lossCount >= 5) {
        isLossShield = true;
        delta = 0; // MIỄN TRỪ 100% ELO
        nextLossCount = 0;
      } else {
        delta = -baseDelta;
        nextLossCount = Math.min(5, lossCount + 1);
      }
    }

    let itemBonus = 0;
    const hasHopeStar = !!playerItem?.hopeStar;
    if (hasHopeStar) {
      if (playerWon) {
        itemBonus = Math.min(Math.max(baseDelta, 0), 20);
        delta += itemBonus;
      } else {
        itemBonus = 0;
      }
    }

    return {
      delta,
      baseDelta,
      itemBonus,
      hasHopeStar,
      isWinBoost,
      isLossShield,
      nextMatchesCount,
      nextLossCount
    };
  };

  const p1Outcome = computePlayerOutcome(team1Won, grindInfo.p1, itemEffects.p1);
  const p2Outcome = computePlayerOutcome(!team1Won, grindInfo.p2, itemEffects.p2);
  const p1pOutcome = elo1Partner !== null ? computePlayerOutcome(team1Won, grindInfo.p1p, itemEffects.p1p) : null;
  const p2pOutcome = elo2Partner !== null ? computePlayerOutcome(!team1Won, grindInfo.p2p, itemEffects.p2p) : null;

  const delta1 = p1Outcome.delta;
  const delta2 = p2Outcome.delta;
  const delta1_p = p1pOutcome ? p1pOutcome.delta : 0;
  const delta2_p = p2pOutcome ? p2pOutcome.delta : 0;

  const elo1New = Math.max(100, Math.round(elo1 + delta1));
  const elo1_partnerNew = elo1Partner !== null ? Math.max(100, Math.round(elo1Partner + delta1_p)) : null;
  const elo2New = Math.max(100, Math.round(elo2 + delta2));
  const elo2_partnerNew = elo2Partner !== null ? Math.max(100, Math.round(elo2Partner + delta2_p)) : null;

  const eloExchanged = team1Won ? Math.abs(delta1) : Math.abs(delta2);

  return {
    team1Elo: Math.round(T1),
    team2Elo: Math.round(T2),
    winProb1: Math.round(E1 * 100),
    winProb2: Math.round(E2 * 100),
    baseDelta,
    eloExchanged,
    team1Won,
    elo1New,
    elo2New,
    elo1_partnerNew,
    elo2_partnerNew,
    p1Diff: delta1,
    p2Diff: delta2,
    p1pDiff: delta1_p,
    p2pDiff: delta2_p,
    p1Outcome,
    p2Outcome,
    p1pOutcome,
    p2pOutcome
  };
}
