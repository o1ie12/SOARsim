/**
 * SOAR Studio — Engineering Module
 *
 * Central barrel export for all engineering calculations.
 *
 * Architecture:
 *   geometry.ts       →  Pure geometry calculations (sizes, areas, volumes)
 *   mass.ts           →  Mass and weight calculations
 *   properties.ts     →  Combined engineering properties
 *   cg.ts             →  Center of gravity (v2.4)
 *   cp.ts             →  Center of pressure — Barrowman (v2.4)
 *   stability.ts      →  Stability margin, rating, markers (v2.4)
 *   recommendations.ts → Stability recommendations (v2.4)
 *   warnings.ts       →  Rule-based engineering warnings
 *   summary.ts        →  Deterministic engineering observations
 *   units.ts          →  Metric/Imperial unit conversion
 *
 * All calculations return SI units internally.
 * Display conversion happens at the UI boundary.
 */

export {
  calculateGeometry,
  type GeometryProperties,
  MATERIALS,
} from "./geometry";
export type { MaterialKey } from "./geometry";

export {
  calculateMass,
  type MassProperties,
} from "./mass";

export {
  calculateEngineeringProperties,
  calculateEngineeringPropertiesMemo,
  resetMemo,
  type EngineeringProperties,
  WATER_DENSITY,
} from "./properties";

export {
  calculateWarnings,
  type EngineeringWarning,
} from "./warnings";

export {
  generateSummary,
  type EngineeringSummary,
} from "./summary";

export {
  displayLength,
  displayLengthShort,
  displayDiameter,
  displayArea,
  displayVolume,
  displayMass,
  displayMassShort,
  displayPressure,
  displayPressureShort,
  displayPercentage,
  displayAspectRatio,
  toEngineeringDisplay,
  formatValue,
  UNITS,
  type UnitSystem,
  type UnitDisplay,
  type EngineeringDisplay,
} from "./units";

// ── v2.4: Center of Gravity ──────────────────────────────────────

export {
  calculateCG,
  calculateCGFromDesign,
  type CGProperties,
  type CgComponent,
} from "./cg";

// ── v2.4: Center of Pressure ─────────────────────────────────────

export {
  calculateCP,
  calculateCPFromDesign,
  type CPProperties,
  type CpContribution,
  type CpComponent,
} from "./cp";

// ── v2.4: Stability Analysis ─────────────────────────────────────

export {
  calculateStability,
  getRatingColor,
  getRatingLabel,
  getRatingDescription,
  RATING_INFO,
  type StabilityProperties,
  type StabilityRating,
  type StabilityMarkers,
} from "./stability";

// ── v2.4: Stability Recommendations ──────────────────────────────

export {
  generateRecommendations,
  type StabilityRecommendation,
} from "./recommendations";
