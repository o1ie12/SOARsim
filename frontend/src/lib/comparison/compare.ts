/**
 * SOAR Studio v2.6 — Design Comparison Engine
 *
 * Compares multiple rocket designs side-by-side across geometry, mass,
 * aerodynamics, stability, simulation, and mission categories.
 *
 * Highlights best/worst values and computes differences.
 * All logic is deterministic — no AI used.
 */

import type { RocketDesignState } from "@/lib/rocket-designer-types";
import { calculateEngineeringProperties } from "@/lib/engineering/properties";

// ── Comparison Types ─────────────────────────────────────────────

export interface ComparedRocket {
  id: string;
  name: string;
  design: RocketDesignState;
  engineering: ReturnType<typeof calculateEngineeringProperties>;
}

export type ComparisonCategory =
  | "geometry"
  | "mass"
  | "aerodynamics"
  | "stability"
  | "simulation"
  | "mission";

export interface ComparisonMetric {
  id: string;
  label: string;
  category: ComparisonCategory;
  unit: string;
  values: Record<string, number>; // rocketId → value
  bestRocketId: string | null; // null if equal
  worstRocketId: string | null;
  higherIsBetter: boolean;
  diffPct: number; // max - min / min * 100
}

export interface SimulationData {
  maxAltitude: number;
  flightTime: number;
  maxVelocity: number;
  maxAcceleration: number;
  downrangeDistance: number;
  landingVelocity: number;
}

// ── Metric Definitions ───────────────────────────────────────────

interface MetricDef {
  id: string;
  label: string;
  category: ComparisonCategory;
  unit: string;
  higherIsBetter: boolean;
  extract: (design: RocketDesignState, eng: ReturnType<typeof calculateEngineeringProperties>, sim?: SimulationData) => number;
}

const METRIC_DEFINITIONS: MetricDef[] = [
  // ── Geometry ──
  { id: "overall_length", label: "Overall Length", category: "geometry", unit: "m", higherIsBetter: false, extract: (_, eng) => eng.geometry.totalLength },
  { id: "diameter", label: "Diameter", category: "geometry", unit: "m", higherIsBetter: false, extract: (_, eng) => eng.geometry.bodyDiameter },
  { id: "aspect_ratio", label: "Aspect Ratio", category: "geometry", unit: "", higherIsBetter: false, extract: (_, eng) => eng.geometry.aspectRatio },
  { id: "internal_volume", label: "Internal Volume", category: "geometry", unit: "L", higherIsBetter: false, extract: (_, eng) => eng.geometry.estimatedInternalVolume * 1000 },

  // ── Mass ──
  { id: "dry_mass", label: "Dry Mass", category: "mass", unit: "kg", higherIsBetter: false, extract: (_, eng) => eng.mass.dryMass },
  { id: "water_mass", label: "Water Mass", category: "mass", unit: "kg", higherIsBetter: false, extract: (_, eng) => eng.mass.waterMass },
  { id: "launch_mass", label: "Launch Mass", category: "mass", unit: "kg", higherIsBetter: false, extract: (_, eng) => eng.mass.totalMass },

  // ── Aerodynamics ──
  { id: "drag_coefficient", label: "Drag Coefficient", category: "aerodynamics", unit: "", higherIsBetter: false, extract: (design) => design.dragCoefficient },
  { id: "frontal_area", label: "Frontal Area", category: "aerodynamics", unit: "m²", higherIsBetter: false, extract: (_, eng) => eng.geometry.frontalArea },

  // ── Stability ──
  { id: "cg_position", label: "CG (from nose)", category: "stability", unit: "m", higherIsBetter: true, extract: (_, eng) => eng.cg.cgFromNose },
  { id: "cp_position", label: "CP (from nose)", category: "stability", unit: "m", higherIsBetter: true, extract: (_, eng) => eng.cp.cpFromNose },
  { id: "stability_margin", label: "Stability Margin", category: "stability", unit: "cal", higherIsBetter: true, extract: (_, eng) => eng.stability.marginCalibers },
  { id: "stability_rating", label: "Stability Rating", category: "stability", unit: "", higherIsBetter: true, extract: (_, eng) => {
    const ratings: Record<string, number> = { excellent: 5, good: 4, marginal: 3, poor: 2, unstable: 1 };
    return ratings[eng.stability.rating] ?? 0;
  }},

  // ── Simulation ──
  { id: "max_altitude", label: "Max Altitude", category: "simulation", unit: "m", higherIsBetter: true, extract: (_, __, sim) => sim?.maxAltitude ?? 0 },
  { id: "flight_time", label: "Flight Time", category: "simulation", unit: "s", higherIsBetter: true, extract: (_, __, sim) => sim?.flightTime ?? 0 },
  { id: "max_velocity", label: "Max Velocity", category: "simulation", unit: "m/s", higherIsBetter: true, extract: (_, __, sim) => sim?.maxVelocity ?? 0 },
  { id: "max_acceleration", label: "Max Acceleration", category: "simulation", unit: "m/s²", higherIsBetter: false, extract: (_, __, sim) => sim?.maxAcceleration ?? 0 },
  { id: "downrange_distance", label: "Downrange Distance", category: "simulation", unit: "m", higherIsBetter: true, extract: (_, __, sim) => sim?.downrangeDistance ?? 0 },
  { id: "landing_velocity", label: "Landing Velocity", category: "simulation", unit: "m/s", higherIsBetter: false, extract: (_, __, sim) => sim?.landingVelocity ?? 0 },
];

// ── Comparison Engine ────────────────────────────────────────────

export function compareDesigns(
  designs: Map<string, { design: RocketDesignState; simulation?: SimulationData }>
): {
  rockets: ComparedRocket[];
  metrics: ComparisonMetric[];
  winners: Record<ComparisonCategory, string | null>;
  overallWinner: string | null;
} {
  const rocketIds = Array.from(designs.keys());
  if (rocketIds.length < 2) {
    return { rockets: [], metrics: [], winners: {} as Record<ComparisonCategory, string | null>, overallWinner: null };
  }

  // Compute engineering properties for each design
  const rockets: ComparedRocket[] = rocketIds.map((id) => {
    const entry = designs.get(id)!;
    return {
      id,
      name: entry.design.name,
      design: entry.design,
      engineering: calculateEngineeringProperties(entry.design),
    };
  });

  const rocketMap = new Map(rockets.map((r) => [r.id, r]));

  // Compute metrics
  const metrics: ComparisonMetric[] = METRIC_DEFINITIONS.map((def) => {
    const values: Record<string, number> = {};
    for (const [id, entry] of designs) {
      const rocket = rocketMap.get(id)!;
      values[id] = def.extract(rocket.design, rocket.engineering, entry.simulation);
    }

    // Find best and worst
    let bestId: string | null = null;
    let worstId: string | null = null;
    let bestVal = def.higherIsBetter ? -Infinity : Infinity;
    let worstVal = def.higherIsBetter ? Infinity : -Infinity;

    for (const [id, val] of Object.entries(values)) {
      if (def.higherIsBetter) {
        if (val > bestVal) { bestVal = val; bestId = id; }
        if (val < worstVal) { worstVal = val; worstId = id; }
      } else {
        if (val < bestVal) { bestVal = val; bestId = id; }
        if (val > worstVal) { worstVal = val; worstId = id; }
      }
    }

    // Compute % difference
    const diffPct = worstVal !== 0 ? ((bestVal - worstVal) / Math.abs(worstVal)) * 100 : 0;

    return {
      id: def.id,
      label: def.label,
      category: def.category,
      unit: def.unit,
      values,
      bestRocketId: bestId,
      worstRocketId: worstId,
      higherIsBetter: def.higherIsBetter,
      diffPct,
    };
  });

  // Compute category winners (most metrics in category with best value)
  const categories: ComparisonCategory[] = ["geometry", "mass", "aerodynamics", "stability", "simulation", "mission"];
  const winners: Record<ComparisonCategory, string | null> = {} as Record<ComparisonCategory, string | null>;

  for (const cat of categories) {
    const catMetrics = metrics.filter((m) => m.category === cat && m.bestRocketId);
    if (catMetrics.length === 0) { winners[cat] = null; continue; }

    const score: Record<string, number> = {};
    for (const m of catMetrics) {
      if (m.bestRocketId) {
        score[m.bestRocketId] = (score[m.bestRocketId] ?? 0) + 1;
      }
    }
    winners[cat] = Object.entries(score).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }

  // Overall winner (most wins across categories)
  const winCounts: Record<string, number> = {};
  for (const cat of categories) {
    if (winners[cat]) {
      winCounts[winners[cat]!] = (winCounts[winners[cat]!] ?? 0) + 1;
    }
  }
  const overallWinner = Object.entries(winCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return { rockets, metrics, winners, overallWinner };
}

// ── Category Labels ──────────────────────────────────────────────

export const CATEGORY_LABELS: Record<ComparisonCategory, string> = {
  geometry: "Geometry",
  mass: "Mass",
  aerodynamics: "Aerodynamics",
  stability: "Stability",
  simulation: "Simulation",
  mission: "Mission",
};

export function getMetricColor(index: number): string {
  const colors = [
    "#f97316", "#3b82f6", "#10b981", "#8b5cf6",
    "#f59e0b", "#ef4444", "#06b6d4", "#ec4899",
    "#6366f1", "#14b8a6", "#84cc16", "#d946ef",
    "#0ea5e9", "#fb923c", "#a3e635", "#38bdf8",
  ];
  return colors[index % colors.length];
}
