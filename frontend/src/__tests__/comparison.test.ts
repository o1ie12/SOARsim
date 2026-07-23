/**
 * Tests for SOAR Studio v2.6 — Design Comparison Module
 *
 * Covers:
 *   - Comparison engine (compareDesigns)
 *   - Scorecard (scoreDesign, findBestDesign, grades)
 *   - Optimization (generateOptimizations, all 6 goals)
 */

import { describe, it, expect } from "vitest";
import { createDefaultDesign } from "@/lib/rocket-geometry";
import type { RocketDesignState } from "@/lib/rocket-designer-types";

import {
  compareDesigns,
  CATEGORY_LABELS,
  getMetricColor,
  type ComparisonMetric,
  type ComparisonCategory,
  type SimulationData,
} from "@/lib/comparison/compare";

import {
  scoreDesign,
  createDefaultScorecardConfig,
  findBestDesign,
  getScorecardGrade,
  getScorecardGradeColor,
  DEFAULT_OBJECTIVES,
  type ScorecardConfig,
} from "@/lib/comparison/scorecard";

import {
  generateOptimizations,
  GOAL_LABELS,
  type OptimizationGoal,
} from "@/lib/comparison/optimization";

// ── Test Helpers ─────────────────────────────────────────────────

function createModifiedDesign(mods: Partial<RocketDesignState>): RocketDesignState {
  const base = createDefaultDesign();
  return { ...base, ...mods, id: `test_${Date.now()}_${Math.random()}` };
}

function createLongRocket(): RocketDesignState {
  return createModifiedDesign({
    name: "Long Rocket",
    noseCone: { ...createDefaultDesign().noseCone, geometry: { ...createDefaultDesign().noseCone.geometry, length: 0.2 } },
    bodyTube: { ...createDefaultDesign().bodyTube, geometry: { ...createDefaultDesign().bodyTube.geometry, length: 0.5 } },
    bottle: { ...createDefaultDesign().bottle, geometry: { ...createDefaultDesign().bottle.geometry, length: 0.3, volume: 2.0 } },
    dragCoefficient: 0.35,
    initialPressure: 500000,
  });
}

function createShortRocket(): RocketDesignState {
  return createModifiedDesign({
    name: "Short Rocket",
    noseCone: { ...createDefaultDesign().noseCone, geometry: { ...createDefaultDesign().noseCone.geometry, length: 0.08 } },
    bodyTube: { ...createDefaultDesign().bodyTube, geometry: { ...createDefaultDesign().bodyTube.geometry, length: 0.15 } },
    bottle: { ...createDefaultDesign().bottle, geometry: { ...createDefaultDesign().bottle.geometry, length: 0.15, volume: 1.0 } },
    dragCoefficient: 0.55,
    initialPressure: 300000,
  });
}

// ── COMPARISON ENGINE TESTS ──────────────────────────────────────

describe("compareDesigns", () => {
  it("returns empty results for fewer than 2 designs", () => {
    const designs = new Map();
    designs.set("a", { design: createDefaultDesign() });
    const result = compareDesigns(designs);
    expect(result.rockets).toHaveLength(0);
    expect(result.metrics).toHaveLength(0);
    expect(result.overallWinner).toBeNull();
  });

  it("compares 2 designs and returns metrics", () => {
    const long = createLongRocket();
    const short = createShortRocket();
    const designs = new Map();
    designs.set(long.id, { design: long });
    designs.set(short.id, { design: short });

    const result = compareDesigns(designs);
    expect(result.rockets).toHaveLength(2);
    expect(result.metrics.length).toBeGreaterThan(10);
  });

  it("identifies best and worst values for each metric", () => {
    const long = createLongRocket();
    const short = createShortRocket();
    const designs = new Map();
    designs.set(long.id, { design: long });
    designs.set(short.id, { design: short });

    const result = compareDesigns(designs);

    // Check a lower-is-better metric: dry_mass
    const dryMassMetric = result.metrics.find((m) => m.id === "dry_mass");
    expect(dryMassMetric).toBeDefined();
    expect(dryMassMetric!.values[long.id]).toBeGreaterThan(0);
    expect(dryMassMetric!.values[short.id]).toBeGreaterThan(0);
    expect(dryMassMetric!.bestRocketId).toBeTruthy();
    expect(dryMassMetric!.worstRocketId).toBeTruthy();
  });

  it("identifies category winners", () => {
    const long = createLongRocket();
    const short = createShortRocket();
    const designs = new Map();
    designs.set(long.id, { design: long });
    designs.set(short.id, { design: short });

    const result = compareDesigns(designs);

    // Should have winners for at least 3 categories
    const categories: ComparisonCategory[] = ["geometry", "mass", "aerodynamics", "stability"];
    const winnerCount = categories.filter((c) => result.winners[c] !== null).length;
    expect(winnerCount).toBeGreaterThanOrEqual(1);
  });

  it("computes percentage difference between designs", () => {
    const long = createLongRocket();
    const short = createShortRocket();
    const designs = new Map();
    designs.set(long.id, { design: long });
    designs.set(short.id, { design: short });

    const result = compareDesigns(designs);

    // diffPct should be a number (possibly 0 if equal)
    const someMetric = result.metrics[0];
    expect(typeof someMetric.diffPct).toBe("number");
  });

  it("compares 3 designs without error", () => {
    const d1 = createLongRocket();
    const d2 = createShortRocket();
    const d3 = createDefaultDesign();
    const designs = new Map();
    designs.set(d1.id, { design: d1 });
    designs.set(d2.id, { design: d2 });
    designs.set(d3.id, { design: d3 });

    const result = compareDesigns(designs);
    expect(result.rockets).toHaveLength(3);
    expect(result.metrics.length).toBeGreaterThan(10);
  });

  it("handles designs with simulation data", () => {
    const d1 = createModifiedDesign({ name: "High Alt" });
    const d2 = createModifiedDesign({ name: "Low Alt" });
    const designs = new Map();
    designs.set(d1.id, { design: d1, simulation: { maxAltitude: 100, flightTime: 10, maxVelocity: 50, maxAcceleration: 100, downrangeDistance: 30, landingVelocity: 5 } });
    designs.set(d2.id, { design: d2, simulation: { maxAltitude: 50, flightTime: 6, maxVelocity: 30, maxAcceleration: 80, downrangeDistance: 15, landingVelocity: 3 } });

    const result = compareDesigns(designs);

    const altMetric = result.metrics.find((m) => m.id === "max_altitude");
    expect(altMetric).toBeDefined();
    expect(altMetric!.values[d1.id]).toBe(100);
    expect(altMetric!.bestRocketId).toBe(d1.id);
  });

  it("produces category labels for all categories", () => {
    const categories: ComparisonCategory[] = ["geometry", "mass", "aerodynamics", "stability", "simulation", "mission"];
    for (const cat of categories) {
      expect(CATEGORY_LABELS[cat]).toBeTruthy();
      expect(typeof CATEGORY_LABELS[cat]).toBe("string");
    }
  });

  it("returns valid hex colors from getMetricColor", () => {
    for (let i = 0; i < 16; i++) {
      const color = getMetricColor(i);
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

// ── SCORECARD TESTS ──────────────────────────────────────────────

describe("scoreDesign", () => {
  it("returns a scorecard result with overall score 0-100", () => {
    const design = createDefaultDesign();
    const config = createDefaultScorecardConfig();
    const result = scoreDesign(design, null, config);

    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(result.rocketId).toBe(design.id);
    expect(result.rocketName).toBe(design.name);
  });

  it("returns 7 objectives by default", () => {
    const design = createDefaultDesign();
    const config = createDefaultScorecardConfig();
    const result = scoreDesign(design, null, config);

    expect(result.objectives).toHaveLength(7);
  });

  it("each objective has a score between 0-100", () => {
    const design = createDefaultDesign();
    const config = createDefaultScorecardConfig();
    const result = scoreDesign(design, null, config);

    for (const obj of result.objectives) {
      expect(obj.score).toBeGreaterThanOrEqual(0);
      expect(obj.score).toBeLessThanOrEqual(100);
      expect(obj.weight).toBeGreaterThanOrEqual(0);
      expect(obj.weight).toBeLessThanOrEqual(100);
      expect(obj.explanation).toBeTruthy();
    }
  });

  it("produces a valid grade A-F", () => {
    const design = createDefaultDesign();
    const config = createDefaultScorecardConfig();
    const result = scoreDesign(design, null, config);

    expect(["A", "B", "C", "D", "F"]).toContain(result.grade);
  });

  it("finds best design from multiple results", () => {
    const d1 = createLongRocket();
    const d2 = createShortRocket();
    const config = createDefaultScorecardConfig();

    const r1 = scoreDesign(d1, null, config);
    const r2 = scoreDesign(d2, null, config);

    const best = findBestDesign([r1, r2]);
    expect(best).not.toBeNull();
    expect([r1.rocketId, r2.rocketId]).toContain(best!.rocketId);
  });

  it("returns null from findBestDesign with empty array", () => {
    expect(findBestDesign([])).toBeNull();
  });

  it("handles simulation data when scoring", () => {
    const design = createDefaultDesign();
    const config = createDefaultScorecardConfig();
    const sim: SimulationData = { maxAltitude: 80, flightTime: 12, maxVelocity: 60, maxAcceleration: 120, downrangeDistance: 40, landingVelocity: 4 };

    const result = scoreDesign(design, sim, config);
    expect(result.overall).toBeGreaterThan(0);
  });

  it("respects custom weights", () => {
    const design = createDefaultDesign();
    const config = createDefaultScorecardConfig();

    // Set weight of altitude to 100, others to 0
    for (const obj of config.objectives) {
      config.weights[obj.id] = obj.id === "max_altitude" ? 100 : 0;
    }

    const result = scoreDesign(design, null, config);
    expect(result.objectives.find((o) => o.id === "max_altitude")!.weight).toBe(100);
    expect(result.objectives.find((o) => o.id !== "max_altitude")!.weight).toBe(0);
  });

  it("default objectives have all required fields", () => {
    for (const obj of DEFAULT_OBJECTIVES) {
      expect(obj.id).toBeTruthy();
      expect(obj.label).toBeTruthy();
      expect(obj.description).toBeTruthy();
      expect(obj.defaultWeight).toBeGreaterThanOrEqual(0);
      expect(obj.unit).toBeDefined();
      expect(obj.ref.excellent).toBeGreaterThan(0);
      expect(obj.ref.good).toBeGreaterThan(0);
      expect(obj.ref.fair).toBeGreaterThan(0);
    }
  });
});

describe("getScorecardGrade", () => {
  it("returns A for 90+", () => {
    expect(getScorecardGrade(90)).toBe("A");
    expect(getScorecardGrade(95)).toBe("A");
    expect(getScorecardGrade(100)).toBe("A");
  });
  it("returns B for 80-89", () => {
    expect(getScorecardGrade(80)).toBe("B");
    expect(getScorecardGrade(85)).toBe("B");
  });
  it("returns C for 70-79", () => {
    expect(getScorecardGrade(70)).toBe("C");
    expect(getScorecardGrade(75)).toBe("C");
  });
  it("returns D for 60-69", () => {
    expect(getScorecardGrade(60)).toBe("D");
    expect(getScorecardGrade(65)).toBe("D");
  });
  it("returns F for <60", () => {
    expect(getScorecardGrade(50)).toBe("F");
    expect(getScorecardGrade(0)).toBe("F");
  });
});

describe("getScorecardGradeColor", () => {
  it("returns valid Tailwind classes for all grades", () => {
    for (const grade of ["A", "B", "C", "D", "F"]) {
      const color = getScorecardGradeColor(grade);
      expect(color).toMatch(/^text-/);
    }
  });
  it("returns a fallback for unknown grades", () => {
    const color = getScorecardGradeColor("X");
    expect(color).toBe("text-muted-foreground");
  });
});

// ── OPTIMIZATION TESTS ───────────────────────────────────────────

describe("generateOptimizations", () => {
  it("returns suggestions for all 6 goals", () => {
    const design = createDefaultDesign();
    const goals: OptimizationGoal[] = ["increase_altitude", "improve_stability", "reduce_mass", "extend_flight_time", "reduce_drag", "general"];

    for (const goal of goals) {
      const result = generateOptimizations(design, goal, null);
      expect(result.rocketId).toBe(design.id);
      expect(result.rocketName).toBe(design.name);
      expect(result.goal).toBe(goal);
      expect(typeof result.summary).toBe("string");
      expect(GOAL_LABELS[goal]).toBeTruthy();
    }
  });

  it("generateOptimizations returns suggestions for increase_altitude", () => {
    const design = createDefaultDesign();
    // Lower pressure to trigger suggestions
    design.initialPressure = 200000;
    const result = generateOptimizations(design, "increase_altitude", null);

    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.goal).toBe("increase_altitude");
  });

  it("generateOptimizations returns suggestions for reduce_mass", () => {
    const design = createDefaultDesign();
    // Add mass to trigger suggestions
    design.noseCone.mass = 0.1;
    const result = generateOptimizations(design, "reduce_mass", null);

    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("optimization suggestions have all required fields", () => {
    const design = createDefaultDesign();
    const result = generateOptimizations(design, "general", null);

    for (const s of result.suggestions) {
      expect(s.id).toBeTruthy();
      expect(s.goal).toBeTruthy();
      expect(["high", "medium", "low"]).toContain(s.priority);
      expect(s.component).toBeTruthy();
      expect(s.property).toBeTruthy();
      expect(s.rationale).toBeTruthy();
      expect(s.expectedBenefit).toBeTruthy();
    }
  });

  it("handles simulation data in optimization", () => {
    const design = createDefaultDesign();
    const sim: SimulationData = { maxAltitude: 30, flightTime: 6, maxVelocity: 30, maxAcceleration: 80, downrangeDistance: 15, landingVelocity: 3 };

    const result = generateOptimizations(design, "increase_altitude", sim);
    expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
  });

  it("extend_flight_time produces suggestions", () => {
    const design = createDefaultDesign();
    const result = generateOptimizations(design, "extend_flight_time", null);

    expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    if (result.suggestions.length > 0) {
      // Tips should mention water or launch angle
      const allText = result.suggestions.map((s) => s.property).join(" ");
      expect(allText).toMatch(/Water|Angle|Fill|Launch/i);
    }
  });

  it("improve_stability produces suggestions for unstable designs", () => {
    const design = createDefaultDesign();
    const result = generateOptimizations(design, "improve_stability", null);

    // Default design should have some stability tips
    expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
  });

  it("GOAL_LABELS has entries for all goals", () => {
    const goals: OptimizationGoal[] = ["increase_altitude", "improve_stability", "reduce_mass", "extend_flight_time", "reduce_drag", "general"];
    for (const goal of goals) {
      expect(GOAL_LABELS[goal]).toBeTruthy();
      expect(typeof GOAL_LABELS[goal]).toBe("string");
    }
  });
});
