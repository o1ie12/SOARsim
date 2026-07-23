/**
 * SOAR Studio v2.5 — Mission Analysis Module
 *
 * Central barrel export for all mission analysis calculations.
 *
 * Architecture:
 *   events.ts          → Flight event detection from trajectory data
 *   timeline.ts        → Chronological mission timeline generation
 *   flightScore.ts     → Engineering flight score (0-100, A-F)
 *   missionSummary.ts  → Professional engineering mission summary
 *
 * All calculations are pure functions operating on trajectory data.
 * No UI dependencies.
 */

export {
  detectEvents,
  detectPhases,
  getChartMarkers,
  type FlightEvent,
  type FlightEventType,
  type FlightPhase,
  type FlightPhaseSegment,
  type ChartMarker,
  PHASE_COLORS,
  PHASE_LABELS,
} from "./events";

export {
  generateTimeline,
  formatTime,
  formatAltitude,
  formatVelocity,
  type TimelineEntry,
} from "./timeline";

export {
  computeFlightScore,
  getGradeColor,
  type FlightScoreResult,
  type SubScore,
  type ScoreExplanation,
} from "./flightScore";

export {
  generateMissionSummary,
  getFlightRatingLabel,
  getFlightRatingColor,
  type MissionSummary,
  type FlightPerformance,
  type EngineeringRatings,
  type FlightRating,
  type PhaseDurations,
} from "./missionSummary";
