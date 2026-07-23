/**
 * SOAR Studio v2.6 — Design Scorecard
 *
 * A weighted scoring system that lets users prioritize objectives.
 * Each objective is scored 0-100 and weighted by user preference.
 * The overall score is the weighted average.
 *
 * Users can adjust weights to find the best design for their goals.
 * No AI — all calculations are deterministic.
 */

import type { RocketDesignState } from "@/lib/rocket-designer-types";
import { calculateEngineeringProperties } from "@/lib/engineering/properties";
import type { SimulationData } from "./compare";

// ── Scorecard Types ──────────────────────────────────────────────

export interface ScorecardObjective {
  id: string;
  label: string;
  description: string;
  defaultWeight: number; // 0-100
  unit: string;
  /** Higher values are better for this objective */
  higherIsBetter: boolean;
  /** Reference values for scoring */
  ref: { excellent: number; good: number; fair: number; poor: number };
}

export interface ScorecardResult {
  overall: number;
  grade: string;
  objectives: ScoredObjective[];
  rocketId: string;
  rocketName: string;
}

export interface ScoredObjective {
  id: string;
  label: string;
  score: number; // 0-100
  weight: number; // current weight (0-100)
  weightedScore: number; // score * (weight / 100)
  value: number;
  unit: string;
  explanation: string;
}

export interface ScorecardConfig {
  objectives: ScorecardObjective[];
  weights: Record<string, number>; // objectiveId → weight (0-100)
}

// ── Default Objectives ───────────────────────────────────────────

export const DEFAULT_OBJECTIVES: ScorecardObjective[] = [
  {
    id: "max_altitude",
    label: "Maximum Altitude",
    description: "How high the rocket flies",
    defaultWeight: 25,
    unit: "m",
    higherIsBetter: true,
    ref: { excellent: 100, good: 50, fair: 25, poor: 10 },
  },
  {
    id: "stability_margin",
    label: "Stability Margin",
    description: "Aerodynamic stability in calibers",
    defaultWeight: 20,
    unit: "cal",
    higherIsBetter: true,
    ref: { excellent: 2.0, good: 1.0, fair: 0.5, poor: 0.25 },
  },
  {
    id: "flight_time",
    label: "Flight Duration",
    description: "Total time in the air",
    defaultWeight: 15,
    unit: "s",
    higherIsBetter: true,
    ref: { excellent: 15, good: 8, fair: 5, poor: 2 },
  },
  {
    id: "low_mass",
    label: "Low Mass",
    description: "Lightest overall launch mass",
    defaultWeight: 10,
    unit: "kg",
    higherIsBetter: false,
    ref: { excellent: 0.1, good: 0.2, fair: 0.4, poor: 0.6 },
  },
  {
    id: "short_length",
    label: "Compact Design",
    description: "Shortest overall rocket length",
    defaultWeight: 10,
    unit: "m",
    higherIsBetter: false,
    ref: { excellent: 0.3, good: 0.5, fair: 0.8, poor: 1.2 },
  },
  {
    id: "low_drag",
    label: "Low Drag",
    description: "Smallest drag coefficient",
    defaultWeight: 10,
    unit: "",
    higherIsBetter: false,
    ref: { excellent: 0.2, good: 0.35, fair: 0.5, poor: 0.8 },
  },
  {
    id: "efficiency",
    label: "Propulsive Efficiency",
    description: "Altitude per unit of water mass",
    defaultWeight: 10,
    unit: "m/kg",
    higherIsBetter: true,
    ref: { excellent: 500, good: 200, fair: 100, poor: 50 },
  },
];

// ── Grade Scale ──────────────────────────────────────────────────

export function getScorecardGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function getScorecardGradeColor(grade: string): string {
  switch (grade) {
    case "A": return "text-emerald-500";
    case "B": return "text-green-500";
    case "C": return "text-amber-500";
    case "D": return "text-orange-500";
    case "F": return "text-red-500";
    default: return "text-muted-foreground";
  }
}

// ── Scoring Engine ───────────────────────────────────────────────

export function scoreDesign(
  design: RocketDesignState,
  simulation: SimulationData | null,
  config: ScorecardConfig,
): ScorecardResult {
  const eng = calculateEngineeringProperties(design);

  // Compute efficiency: altitude / water mass
  const waterMass = eng.mass.waterMass;    const efficiency = waterMass > 0 ? ((simulation?.maxAltitude ?? 0) / waterMass) : 0;

  // Value extractors for each objective
  const valueExtractors: Record<string, () => number> = {
    max_altitude: () => simulation?.maxAltitude ?? 0,
    stability_margin: () => eng.stability.marginCalibers,
    flight_time: () => simulation?.flightTime ?? 0,
    low_mass: () => eng.mass.totalMass,
    short_length: () => eng.geometry.totalLength,
    low_drag: () => design.dragCoefficient,
    efficiency: () => efficiency,
  };

  const explanationGenerators: Record<string, (val: number) => string> = {
    max_altitude: (val) => val >= 80 ? `Excellent altitude of ${val.toFixed(1)} m.` :
      val >= 30 ? `Good altitude of ${val.toFixed(1)} m.` :
      `Limited altitude of ${val.toFixed(1)} m.`,
    stability_margin: (val) => val >= 1.5 ? `Very stable at ${val.toFixed(2)} cal.` :
      val >= 0.5 ? `Adequate stability (${val.toFixed(2)} cal).` :
      `Low stability margin (${val.toFixed(2)} cal).`,
    flight_time: (val) => val >= 10 ? `Long flight of ${val.toFixed(1)} s.` :
      val >= 5 ? `Moderate flight time (${val.toFixed(1)} s).` :
      `Short flight (${val.toFixed(1)} s).`,
    low_mass: (val) => val <= 0.2 ? `Very light at ${(val * 1000).toFixed(0)} g.` :
      val <= 0.4 ? `Moderate mass of ${(val * 1000).toFixed(0)} g.` :
      `Heavy design at ${(val * 1000).toFixed(0)} g.`,
    short_length: (val) => val <= 0.4 ? `Compact at ${(val * 1000).toFixed(0)} mm.` :
      val <= 0.7 ? `Moderate length of ${(val * 1000).toFixed(0)} mm.` :
      `Long rocket at ${(val * 1000).toFixed(0)} mm.`,
    low_drag: (val) => val <= 0.3 ? `Low drag (Cd=${val.toFixed(2)}).` :
      val <= 0.5 ? `Moderate drag (Cd=${val.toFixed(2)}).` :
      `High drag coefficient (Cd=${val.toFixed(2)}).`,
    efficiency: (val) => val >= 300 ? `Excellent efficiency of ${val.toFixed(0)} m/kg.` :
      val >= 100 ? `Good efficiency (${val.toFixed(0)} m/kg).` :
      `Low efficiency (${val.toFixed(0)} m/kg).`,
  };

  const objectives: ScoredObjective[] = config.objectives.map((obj) => {
    const value = valueExtractors[obj.id]?.() ?? 0;
    const weight = config.weights[obj.id] ?? obj.defaultWeight;

    // Compute score 0-100 based on reference values
    let score: number;
    if (obj.higherIsBetter) {
      if (value >= obj.ref.excellent) score = 90 + Math.min(10, ((value - obj.ref.excellent) / obj.ref.excellent) * 10);
      else if (value >= obj.ref.good) score = 70 + ((value - obj.ref.good) / (obj.ref.excellent - obj.ref.good)) * 20;
      else if (value >= obj.ref.fair) score = 50 + ((value - obj.ref.fair) / (obj.ref.good - obj.ref.fair)) * 20;
      else score = Math.max(0, (value / obj.ref.fair) * 50);
    } else {
      // Lower is better — invert
      if (value <= obj.ref.excellent) score = 90 + Math.min(10, ((obj.ref.excellent - value) / obj.ref.excellent) * 10);
      else if (value <= obj.ref.good) score = 70 + ((obj.ref.good - value) / (obj.ref.good - obj.ref.excellent)) * 20;
      else if (value <= obj.ref.fair) score = 50 + ((obj.ref.fair - value) / (obj.ref.fair - obj.ref.good)) * 20;
      else score = Math.max(0, (obj.ref.poor / value) * 40);
    }

    score = Math.round(Math.min(100, Math.max(0, score)));
    const weightedScore = score * (weight / 100);
    const explanation = explanationGenerators[obj.id]?.(value) ?? `${value.toFixed(2)} ${obj.unit}`;

    return {
      id: obj.id,
      label: obj.label,
      score,
      weight,
      weightedScore,
      value,
      unit: obj.unit,
      explanation,
    };
  });

  // Compute overall score
  const totalWeight = objectives.reduce((sum, o) => sum + o.weight, 0);
  const overall = totalWeight > 0
    ? Math.round(objectives.reduce((sum, o) => sum + o.weightedScore, 0) / totalWeight * 100)
    : 0;

  const grade = getScorecardGrade(overall);

  return {
    overall: Math.min(100, Math.max(0, overall)),
    grade,
    objectives,
    rocketId: design.id,
    rocketName: design.name,
  };
}

// ── Create default config ────────────────────────────────────────

export function createDefaultScorecardConfig(): ScorecardConfig {
  return {
    objectives: DEFAULT_OBJECTIVES,
    weights: Object.fromEntries(DEFAULT_OBJECTIVES.map((o) => [o.id, o.defaultWeight])),
  };
}

// ── Find best design from scorecard results ──────────────────────

export function findBestDesign(results: ScorecardResult[]): ScorecardResult | null {
  if (results.length === 0) return null;
  return results.reduce((best, current) => current.overall > best.overall ? current : best);
}
