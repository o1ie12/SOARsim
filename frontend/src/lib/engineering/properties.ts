/**
 * SOAR Studio — Unified Engineering Properties
 *
 * Combines geometry, mass, and stability calculations into a single
 * comprehensive engineering properties object.
 * Used by the context to provide live calculations.
 *
 * v2.4: Added CG, CP, stability, and recommendations.
 */

import type { RocketDesignState } from "@/lib/rocket-designer-types";
import { calculateGeometry, type GeometryProperties } from "./geometry";
import { calculateMass, type MassProperties } from "./mass";
import { calculateWarnings, type EngineeringWarning } from "./warnings";
import { generateSummary, type EngineeringSummary } from "./summary";
import { calculateCG, type CGProperties } from "./cg";
import { calculateCP, type CPProperties } from "./cp";
import { calculateStability, type StabilityProperties } from "./stability";
import { generateRecommendations, type StabilityRecommendation } from "./recommendations";

// ── Comprehensive Engineering Properties ─────────────────────────

export interface EngineeringProperties {
  geometry: GeometryProperties;
  mass: MassProperties;

  // Water / Propulsion
  waterVolume: number; // m³
  waterFillPercentage: number; // 0-100
  initialPressure: number; // Pa
  initialPressureBar: number; // bar
  nozzleDiameter: number; // m
  nozzleArea: number; // m²

  // Aerodynamics
  dragCoefficient: number;
  launchAngleDeg: number;
  launchAngleRad: number;

  // v2.4: Stability
  cg: CGProperties;
  cp: CPProperties;
  stability: StabilityProperties;
  stabilityRecommendations: StabilityRecommendation[];

  // Warnings and summary
  warnings: EngineeringWarning[];
  summary: EngineeringSummary[];
}

// ── Constants ────────────────────────────────────────────────────

export const WATER_DENSITY = 1000; // kg/m³

// ── Calculation ──────────────────────────────────────────────────

export function calculateEngineeringProperties(
  design: RocketDesignState
): EngineeringProperties {
  const geometry = calculateGeometry(design);
  const mass = calculateMass(design);

  const waterVolume = design.waterVolume;
  const bottleVolumeM3 = geometry.bottleVolumeM3;
  const waterFillPercentage = bottleVolumeM3 > 0
    ? (waterVolume / bottleVolumeM3) * 100
    : 0;

  const nozzleRadius = design.nozzle.geometry.throatDiameter / 2;
  const nozzleArea = Math.PI * nozzleRadius * nozzleRadius;

  // v2.4: Stability calculations
  const cg = calculateCG(design, geometry, mass);
  const cp = calculateCP(design, geometry);
  const stability = calculateStability(cg, cp, geometry.bodyDiameter);
  const stabilityRecommendations = generateRecommendations(stability, cg, cp, geometry, mass);

  const warnings = calculateWarnings(design, geometry, mass, waterFillPercentage);
  const summary = generateSummary(geometry, mass, waterFillPercentage, design.initialPressure, warnings, design.launchAngle);

  return {
    geometry,
    mass,
    waterVolume,
    waterFillPercentage,
    initialPressure: design.initialPressure,
    initialPressureBar: design.initialPressure / 100000,
    nozzleDiameter: design.nozzle.geometry.throatDiameter,
    nozzleArea,
    dragCoefficient: design.dragCoefficient,
    launchAngleDeg: design.launchAngle,
    launchAngleRad: (design.launchAngle * Math.PI) / 180,
    cg,
    cp,
    stability,
    stabilityRecommendations,
    warnings,
    summary,
  };
}

// ── Memoization helper ───────────────────────────────────────────

let lastDesignJson: string | undefined;
let lastResult: EngineeringProperties | undefined;

export function calculateEngineeringPropertiesMemo(
  design: RocketDesignState
): EngineeringProperties {
  const json = JSON.stringify(design);
  if (json !== lastDesignJson) {
    lastDesignJson = json;
    lastResult = calculateEngineeringProperties(design);
  }
  return lastResult!;
}

// Reset memoization (useful for testing)
export function resetMemo(): void {
  lastDesignJson = undefined;
  lastResult = undefined;
}
