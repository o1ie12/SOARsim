/**
 * SOAR Studio v2.6 — Design Comparison Module
 *
 * Central barrel export for all comparison-related logic.
 *
 * Architecture:
 *   compare.ts      → Comparison engine (metrics, winners)
 *   scorecard.ts    → Weighted scoring system with adjustable objectives
 *   optimization.ts → Rule-based optimization assistant
 *
 * All calculations are pure functions operating on RocketDesignState.
 * No UI dependencies.
 */

export {
  compareDesigns,
  CATEGORY_LABELS,
  getMetricColor,
  type ComparedRocket,
  type ComparisonCategory,
  type ComparisonMetric,
  type SimulationData,
} from "./compare";

export {
  scoreDesign,
  createDefaultScorecardConfig,
  findBestDesign,
  getScorecardGrade,
  getScorecardGradeColor,
  DEFAULT_OBJECTIVES,
  type ScorecardObjective,
  type ScorecardResult,
  type ScoredObjective,
  type ScorecardConfig,
} from "./scorecard";

export {
  generateOptimizations,
  GOAL_LABELS,
  type OptimizationGoal,
  type OptimizationSuggestion,
  type OptimizationResult,
} from "./optimization";
