/**
 * SOAR Studio — Stability Analysis
 *
 * Computes stability margin, rating, and visualization marker data
 * from CG and CP positions.
 *
 * ── Stability Margin ─────────────────────────────────────────────
 *
 *   StabilityMargin (calibers) = (CP - CG) / BodyDiameter
 *
 * A positive margin means CP is aft of CG — the rocket is stable.
 * A negative margin means CG is aft of CP — the rocket is unstable.
 *
 * ── Ratings ──────────────────────────────────────────────────────
 *
 *   Excellent  : SM ≥ 2.0 calibers
 *   Good       : 1.0 ≤ SM < 2.0 calibers
 *   Marginal   : 0.5 ≤ SM < 1.0 calibers
 *   Poor       : 0.0 ≤ SM < 0.5 calibers
 *   Unstable   : SM < 0.0 calibers
 *
 * ── Marker Data ──────────────────────────────────────────────────
 *
 * Provides normalized positions (0-100% of rocket length) for
 * rendering CG and CP markers on the SVG visualization.
 *
 * Architecture allows future replacement with more advanced methods.
 * This module is pure calculation — no UI dependencies.
 */

import type { CGProperties } from "./cg";
import type { CPProperties } from "./cp";

// ── Stability Rating ─────────────────────────────────────────────

export type StabilityRating = "excellent" | "good" | "marginal" | "poor" | "unstable";

export interface StabilityProperties {
  /** Stability margin in calibers (body diameters) */
  marginCalibers: number;
  /** Stability rating label */
  rating: StabilityRating;
  /** Human-readable description of the rating */
  ratingDescription: string;
  /** Stability margin in meters */
  marginMeters: number;
  /** Whether CG is ahead of CP (stable condition) */
  isStable: boolean;
  /** Separation between CG and CP as % of body length */
  separationPercent: number;
  /** Visualization markers (normalized 0-1 of total length from nose) */
  markers: StabilityMarkers;
  /** Confidence note */
  confidenceNote: string;
  /** Whether the design is physically viable */
  isPhysicallyValid: boolean;
}

export interface StabilityMarkers {
  /** CG position as fraction from nose (0 = tip, 1 = tail) */
  cgFraction: number;
  /** CP position as fraction from nose (0 = tip, 1 = tail) */
  cpFraction: number;
  /** CG position in pixels or display units (relative) */
  cgPositionPx: number;
  /** CP position in pixels or display units (relative) */
  cpPositionPx: number;
  /** Total display length for scaling */
  totalLength: number;
}

// ── Rating Thresholds (in calibers) ──────────────────────────────

const THRESHOLDS = {
  excellent: 2.0,
  good: 1.0,
  marginal: 0.5,
  poor: 0.0,
} as const;

// ── Rating Labels ────────────────────────────────────────────────

const RATING_INFO: Record<StabilityRating, { label: string; description: string; color: string }> = {
  excellent: {
    label: "Excellent",
    description: "Rocket has a generous stability margin. Should track well during boost.",
    color: "emerald",
  },
  good: {
    label: "Good",
    description: "Stability margin is adequate for reliable flight.",
    color: "green",
  },
  marginal: {
    label: "Marginal",
    description: "Stability margin is low. Small disturbances may cause instability.",
    color: "amber",
  },
  poor: {
    label: "Poor",
    description: "Stability margin is very low or negative. Rocket may not fly stably.",
    color: "orange",
  },
  unstable: {
    label: "Unstable",
    description: "CG is aft of CP (or insufficient margin). Rocket will likely tumble. Increase fin size or move CG forward.",
    color: "red",
  },
};

// ── Stability Calculation ───────────────────────────────────────

export function calculateStability(
  cg: CGProperties,
  cp: CPProperties,
  bodyDiameter: number,
): StabilityProperties {
  const marginMeters = cp.cpFromNose - cg.cgFromNose;
  const marginCalibers = bodyDiameter > 0 ? marginMeters / bodyDiameter : 0;
  const isStable = marginMeters >= 0;
  const totalLength = cg.cgFromNose + cg.cgFromTail;

  // Determine rating
  let rating: StabilityRating;
  if (marginCalibers >= THRESHOLDS.excellent) {
    rating = "excellent";
  } else if (marginCalibers >= THRESHOLDS.good) {
    rating = "good";
  } else if (marginCalibers >= THRESHOLDS.marginal) {
    rating = "marginal";
  } else if (marginCalibers >= THRESHOLDS.poor) {
    rating = "poor";
  } else {
    rating = "unstable";
  }

  const separationPercent = totalLength > 0
    ? Math.abs(marginMeters / totalLength) * 100
    : 0;

  // Visualization markers (fraction of total length from nose)
  const cgFraction = totalLength > 0 ? cg.cgFromNose / totalLength : 0.5;
  const cpFraction = totalLength > 0 ? cp.cpFromNose / totalLength : 0.5;

  // PX positions (for a standard display width, e.g., 500px area)
  const DISPLAY_HEIGHT = 400;
  const cgPositionPx = cgFraction * DISPLAY_HEIGHT;
  const cpPositionPx = cpFraction * DISPLAY_HEIGHT;

  return {
    marginCalibers,
    rating,
    ratingDescription: RATING_INFO[rating].description,
    marginMeters,
    isStable,
    separationPercent,
    markers: {
      cgFraction,
      cpFraction,
      cgPositionPx,
      cpPositionPx,
      totalLength,
    },
    confidenceNote: "These calculations are approximate. Verify with actual swing tests before flight.",
    isPhysicallyValid: totalLength > 0 && bodyDiameter > 0,
  };
}

// ── Rating Color (for UI use) ────────────────────────────────────

export function getRatingColor(rating: StabilityRating): string {
  return RATING_INFO[rating].color;
}

export function getRatingLabel(rating: StabilityRating): string {
  return RATING_INFO[rating].label;
}

export function getRatingDescription(rating: StabilityRating): string {
  return RATING_INFO[rating].description;
}

// ── Export rating info ───────────────────────────────────────────

export { RATING_INFO };
