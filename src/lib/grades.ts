import type { Grade } from '../types'

/**
 * Weighted mean of scores. Grades without a weight take the average weight of
 * the ones that have one (plain mean when none do), so unweighted results
 * still count instead of vanishing.
 */
export function weightedAverage(grades: Grade[]): number {
  const specified = grades.filter((g) => g.weightPct !== undefined)
  const fallback =
    specified.length > 0
      ? specified.reduce((sum, g) => sum + (g.weightPct ?? 0), 0) / specified.length
      : 1
  let totalWeight = 0
  let total = 0
  for (const g of grades) {
    const w = g.weightPct ?? fallback
    totalWeight += w
    total += g.scorePct * w
  }
  return totalWeight > 0 ? total / totalWeight : 0
}

/** Standard 4.0 GPA bands from a percentage. */
export function gpaFromPct(pct: number): number {
  if (pct >= 93) return 4.0
  if (pct >= 90) return 3.7
  if (pct >= 87) return 3.3
  if (pct >= 83) return 3.0
  if (pct >= 80) return 2.7
  if (pct >= 77) return 2.3
  if (pct >= 73) return 2.0
  if (pct >= 70) return 1.7
  if (pct >= 67) return 1.3
  if (pct >= 65) return 1.0
  return 0
}

export interface RemainingNeed {
  remainingWeightPct: number
  /** Average % needed on the remaining assessments to hit the target. */
  neededPct: number
  /** True when neededPct exceeds 100 — the target is no longer reachable. */
  outOfReach: boolean
}

/**
 * Given received grades (with weights) and a target final mark, what average is
 * needed on the not-yet-graded weight. Returns null when it can't be computed —
 * no weights recorded, or every weighted assessment is already in.
 */
export function neededOnRemaining(grades: Grade[], targetPct: number): RemainingNeed | null {
  const weighted = grades.filter((g) => g.weightPct !== undefined && g.weightPct > 0)
  const receivedWeight = weighted.reduce((sum, g) => sum + (g.weightPct ?? 0), 0)
  const remaining = 100 - receivedWeight
  if (weighted.length === 0 || remaining <= 0.5) return null

  const pointsSoFar = weighted.reduce((sum, g) => sum + (g.scorePct * (g.weightPct ?? 0)) / 100, 0)
  const needed = ((targetPct - pointsSoFar) / remaining) * 100
  return {
    remainingWeightPct: Math.round(remaining),
    neededPct: Math.max(0, Math.round(needed)),
    outOfReach: needed > 100,
  }
}
