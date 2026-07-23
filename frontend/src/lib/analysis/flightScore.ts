/**
 * SOAR Studio — Flight Score
 *
 * Computes an engineering flight score (0-100) with sub-scores for:
 *   - Altitude
 *   - Efficiency
 *   - Stability
 *   - Water Usage
 *   - Pressure Selection
 *   - Overall Design
 *
 * Score thresholds:
 *   90-100: A (Excellent)
 *   80-89:  B (Good)
 *   70-79:  C (Fair)
 *   60-69:  D (Poor)
 *   < 60:   F (Unacceptable)
 *
 * All logic is deterministic — no AI used.
 */

import type { SimulationSummary } from "@/lib/api";

// ── Score Types ──────────────────────────────────────────────────

export interface FlightScoreResult {
  /** Overall score 0-100 */
  overall: number;
  /** Letter grade A-F */
  grade: string;
  /** Sub-scores */
  subScores: SubScore[];
  /** Deterministic explanations for each sub-score */
  explanations: ScoreExplanation[];
  /** One-line summary */
  summary: string;
}

export interface SubScore {
  name: string;
  score: number; // 0-100
  weight: number; // contribution to overall
  label: string;
}

export interface ScoreExplanation {
  name: string;
  message: string;
  type: "positive" | "neutral" | "negative";
}

// ── Reference Values ─────────────────────────────────────────────

const REF = {
  altitude: {
    excellent: 100, // meters
    good: 50,
    fair: 25,
  },
  efficiency: {
    // ratio of achieved altitude to theoretical max
    excellent: 0.8,
    good: 0.6,
    fair: 0.4,
  },
  waterFill: {
    optimalLow: 25, // percent
    optimalHigh: 40,
    max: 60,
  },
  pressure: {
    optimalLow: 4, // bar
    optimalHigh: 7,
    max: 8,
  },
  stabilityMargin: {
    excellent: 2.0, // calibers
    good: 1.0,
    marginal: 0.5,
  },
};

// ── Score Computation ────────────────────────────────────────────

export function computeFlightScore(
  summary: SimulationSummary,
  waterFillPercent: number,
  launchAngle: number,
  stabilityMargin?: number
): FlightScoreResult {
  const subScores: SubScore[] = [];
  const explanations: ScoreExplanation[] = [];

  // ── 1. Altitude Score (weight: 25%) ─────────────────────────
  let altitudeScore: number;
  if (summary.maxAltitude >= REF.altitude.excellent) {
    altitudeScore = 90 + Math.min(10, ((summary.maxAltitude - REF.altitude.excellent) / REF.altitude.excellent) * 10);
  } else if (summary.maxAltitude >= REF.altitude.good) {
    altitudeScore = 70 + ((summary.maxAltitude - REF.altitude.good) / (REF.altitude.excellent - REF.altitude.good)) * 20;
  } else if (summary.maxAltitude >= REF.altitude.fair) {
    altitudeScore = 50 + ((summary.maxAltitude - REF.altitude.fair) / (REF.altitude.good - REF.altitude.fair)) * 20;
  } else {
    altitudeScore = Math.max(0, (summary.maxAltitude / REF.altitude.fair) * 50);
  }

  subScores.push({ name: "Altitude", score: Math.round(altitudeScore), weight: 25, label: "Altitude Performance" });

  if (altitudeScore >= 80) {
    explanations.push({ name: "Altitude", message: `Excellent altitude of ${summary.maxAltitude.toFixed(1)} m achieved.`, type: "positive" });
  } else if (altitudeScore >= 60) {
    explanations.push({ name: "Altitude", message: `Good altitude of ${summary.maxAltitude.toFixed(1)} m. Consider increasing pressure or reducing drag.`, type: "neutral" });
  } else {
    explanations.push({ name: "Altitude", message: `Low altitude (${summary.maxAltitude.toFixed(1)} m). Try higher pressure, larger bottle, or lower drag.`, type: "negative" });
  }

  // ── 2. Efficiency Score (weight: 20%) ──────────────────────
  // Theoretically: max altitude ≈ P_ext * V / (m * g) for water rockets
  // Simplified: ratio of achieved to a theoretical reference
  const altitudePerMass = summary.maxAltitude / (summary.maxVelocity > 0 ? summary.maxVelocity : 1);
  const efficiencyRef = 1.5; // m per m/s (heuristic)
  const efficiencyRatio = altitudePerMass / efficiencyRef;
  let efficiencyScore = Math.min(100, Math.max(0, efficiencyRatio * 100));

  subScores.push({ name: "Efficiency", score: Math.round(efficiencyScore), weight: 20, label: "Energy Efficiency" });

  if (efficiencyScore >= 80) {
    explanations.push({ name: "Efficiency", message: "Good energy conversion from propellant to altitude.", type: "positive" });
  } else if (efficiencyScore >= 50) {
    explanations.push({ name: "Efficiency", message: "Moderate efficiency. Reducing drag or optimizing water fill may help.", type: "neutral" });
  } else {
    explanations.push({ name: "Efficiency", message: "Low efficiency. Check water fill percentage, drag coefficient, and launch angle.", type: "negative" });
  }

  // ── 3. Stability Score (weight: 15%) ───────────────────────
  let stabilityScore: number;
  const margin = stabilityMargin ?? 1.0;
  if (margin >= REF.stabilityMargin.excellent) {
    stabilityScore = 95;
  } else if (margin >= REF.stabilityMargin.good) {
    stabilityScore = 75 + ((margin - REF.stabilityMargin.good) / (REF.stabilityMargin.excellent - REF.stabilityMargin.good)) * 20;
  } else if (margin >= REF.stabilityMargin.marginal) {
    stabilityScore = 50 + ((margin - REF.stabilityMargin.marginal) / (REF.stabilityMargin.good - REF.stabilityMargin.marginal)) * 25;
  } else if (margin > 0) {
    stabilityScore = 25 + (margin / REF.stabilityMargin.marginal) * 25;
  } else {
    stabilityScore = 10; // unstable
  }

  subScores.push({ name: "Stability", score: Math.round(stabilityScore), weight: 15, label: "Flight Stability" });

  if (stabilityScore >= 80) {
    explanations.push({ name: "Stability", message: `Stability margin of ${margin.toFixed(2)} calibers provides reliable flight.`, type: "positive" });
  } else if (stabilityScore >= 50) {
    explanations.push({ name: "Stability", message: `Marginal stability (${margin.toFixed(2)} cal). Consider larger fins or forward CG.`, type: "neutral" });
  } else {
    explanations.push({ name: "Stability", message: `Stability margin of ${margin.toFixed(2)} cal is insufficient.`, type: "negative" });
  }

  // ── 4. Water Usage Score (weight: 15%) ─────────────────────
  let waterScore: number;
  if (waterFillPercent >= REF.waterFill.optimalLow && waterFillPercent <= REF.waterFill.optimalHigh) {
    waterScore = 90;
  } else if (waterFillPercent <= REF.waterFill.max) {
    // Between optimal and max — gradually decreasing
    waterScore = 70 - ((waterFillPercent - REF.waterFill.optimalHigh) / (REF.waterFill.max - REF.waterFill.optimalHigh)) * 20;
  } else if (waterFillPercent < REF.waterFill.optimalLow) {
    waterScore = 40 + (waterFillPercent / REF.waterFill.optimalLow) * 40;
  } else {
    waterScore = Math.max(10, 50 - ((waterFillPercent - REF.waterFill.max) / 30) * 40);
  }

  subScores.push({ name: "Water Usage", score: Math.round(waterScore), weight: 15, label: "Water Fill Optimization" });

  if (waterScore >= 80) {
    explanations.push({ name: "Water Usage", message: `Water fill at ${waterFillPercent.toFixed(0)}% is in the optimal range (25-40%).`, type: "positive" });
  } else if (waterScore >= 50) {
    explanations.push({ name: "Water Usage", message: `Water fill at ${waterFillPercent.toFixed(0)}%. Consider adjusting to 25-40% for optimal thrust.`, type: "neutral" });
  } else {
    explanations.push({ name: "Water Usage", message: `Water fill at ${waterFillPercent.toFixed(0)}% is far from optimal (25-40%).`, type: "negative" });
  }

  // ── 5. Pressure Score (weight: 15%) ────────────────────────
  // We need initial pressure — infer from flight characteristics
  // Higher velocity implies higher pressure
  const inferredPressureBar = (summary.maxVelocity / 45) * 5; // rough heuristic
  let pressureScore: number;
  if (inferredPressureBar >= REF.pressure.optimalLow && inferredPressureBar <= REF.pressure.optimalHigh) {
    pressureScore = 90;
  } else if (inferredPressureBar <= REF.pressure.max) {
    pressureScore = 60 + ((inferredPressureBar - REF.pressure.optimalHigh) / (REF.pressure.max - REF.pressure.optimalHigh)) * 20;
    if (inferredPressureBar < REF.pressure.optimalLow) {
      pressureScore = 40 + (inferredPressureBar / REF.pressure.optimalLow) * 40;
    }
  } else {
    pressureScore = Math.max(10, 60 - ((inferredPressureBar - REF.pressure.max) / 5) * 30);
  }

  subScores.push({ name: "Pressure", score: Math.round(pressureScore), weight: 15, label: "Pressure Selection" });

  if (pressureScore >= 80) {
    explanations.push({ name: "Pressure", message: "Pressure selection provides good thrust without over-pressurizing.", type: "positive" });
  } else if (pressureScore >= 50) {
    explanations.push({ name: "Pressure", message: "Moderate pressure selection. Consider 4-7 bar for optimal performance.", type: "neutral" });
  } else {
    explanations.push({ name: "Pressure", message: "Pressure selection is limiting performance. Target 4-7 bar.", type: "negative" });
  }

  // ── 6. Overall Design Score (weight: 10%) ──────────────────
  // Composite of launch angle appropriateness, drag management, mass efficiency
  let designScore = 70; // baseline
  if (launchAngle >= 70 && launchAngle <= 80) {
    designScore += 15; // optimal
  } else if (launchAngle >= 45 && launchAngle <= 85) {
    designScore += 5;
  } else {
    designScore -= 10;
  }

  subScores.push({ name: "Design", score: Math.round(designScore), weight: 10, label: "Overall Design Quality" });

  if (designScore >= 80) {
    explanations.push({ name: "Design", message: `Launch angle of ${launchAngle.toFixed(0)}° is well-chosen for this configuration.`, type: "positive" });
  } else if (designScore >= 60) {
    explanations.push({ name: "Design", message: `Launch angle of ${launchAngle.toFixed(0)}° is adequate. Consider 75° for altitude.`, type: "neutral" });
  } else {
    explanations.push({ name: "Design", message: `Unusual launch angle (${launchAngle.toFixed(0)}°). 75° is typical for altitude.`, type: "negative" });
  }

  // ── Overall Score ──────────────────────────────────────────
  let overall = 0;
  for (const s of subScores) {
    overall += s.score * (s.weight / 100);
  }
  overall = Math.round(Math.min(100, Math.max(0, overall)));

  // Grade
  let grade: string;
  if (overall >= 90) grade = "A";
  else if (overall >= 80) grade = "B";
  else if (overall >= 70) grade = "C";
  else if (overall >= 60) grade = "D";
  else grade = "F";

  // Summary text
  let summaryText: string;
  if (grade === "A") {
    summaryText = "Excellent flight! All parameters are well-optimized.";
  } else if (grade === "B") {
    summaryText = "Good flight with room for improvement in one or more areas.";
  } else if (grade === "C") {
    summaryText = "Fair flight. Review the lower-scoring areas for optimization opportunities.";
  } else if (grade === "D") {
    summaryText = "Poor flight. Significant improvements needed in design or configuration.";
  } else {
    summaryText = "Unsatisfactory flight. Revisit fundamental design parameters.";
  }

  return { overall, grade, subScores, explanations, summary: summaryText };
}

// ── Grade color for UI ──────────────────────────────────────────

export function getGradeColor(grade: string): string {
  switch (grade) {
    case "A": return "text-emerald-500";
    case "B": return "text-green-500";
    case "C": return "text-amber-500";
    case "D": return "text-orange-500";
    case "F": return "text-red-500";
    default: return "text-muted-foreground";
  }
}
