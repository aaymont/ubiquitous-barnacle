const COMBO_WINDOW_MS = 2000;
const WIN_SCORE_THRESHOLD = 500;
const POWER_PEG_BONUS = 100;
const STANDARD_PEG_SCORE = 25;
const COMBO_BONUS_PER_PEG = 10;

let score = 0;
let recentHits: number[] = [];
let onScoreChange: ((s: number) => void) | null = null;
let onCombo: (() => void) | null = null;
let powerPegsHit = 0;
let totalPowerPegs = 0;

export function initScoring(powerPegCount: number) {
  score = 0;
  recentHits = [];
  totalPowerPegs = powerPegCount;
  powerPegsHit = 0;
}

export function setScoreCallbacks(scoreCb: (s: number) => void, comboCb: () => void) {
  onScoreChange = scoreCb;
  onCombo = comboCb;
}

export function recordPegHit(_pegId: string, isPowerPeg: boolean) {
  const now = Date.now();
  const points = isPowerPeg ? POWER_PEG_BONUS : STANDARD_PEG_SCORE;
  score += points;

  recentHits = recentHits.filter((t) => now - t < COMBO_WINDOW_MS);
  recentHits.push(now);

  if (isPowerPeg) powerPegsHit++;

  const comboBonus = recentHits.length >= 3 ? (recentHits.length - 2) * COMBO_BONUS_PER_PEG : 0;
  if (comboBonus > 0) {
    score += comboBonus;
    onCombo?.();
  }

  onScoreChange?.(score);
}

export function getScore(): number {
  return score;
}

export function hasWon(): boolean {
  return powerPegsHit >= totalPowerPegs || score >= WIN_SCORE_THRESHOLD;
}
