/**
 * SOAR Studio — Engineering Warnings
 *
 * Rule-based warning generation for rocket design.
 * Warnings do not prevent editing unless the value is physically impossible.
 * Uses deterministic logic — no AI.
 */

import type { RocketDesignState } from "@/lib/rocket-designer-types";
import type { GeometryProperties } from "./geometry";
import type { MassProperties } from "./mass";

// ── Warning Types ────────────────────────────────────────────────

export interface EngineeringWarning {
  id: string;
  type: "error" | "warning" | "info";
  message: string;
  component?: string;
  category: "geometry" | "mass" | "propulsion" | "aerodynamics" | "general";
}

// ── Warning Generation ───────────────────────────────────────────

export function calculateWarnings(
  design: RocketDesignState,
  geometry: GeometryProperties,
  mass: MassProperties,
  waterFillPercentage: number
): EngineeringWarning[] {
  const warnings: EngineeringWarning[] = [];

  // ════════════════════════════════════════════════════════════════
  // ERRORS — Physically impossible configurations
  // ════════════════════════════════════════════════════════════════

  // Negative dimensions
  if (design.noseCone.geometry.length <= 0) {
    warnings.push({
      id: "nose-negative",
      type: "error",
      message: "Nose cone length must be positive.",
      component: "noseCone",
      category: "geometry",
    });
  }

  if (design.bodyTube.geometry.length <= 0) {
    warnings.push({
      id: "body-negative",
      type: "error",
      message: "Body tube length must be positive.",
      component: "bodyTube",
      category: "geometry",
    });
  }

  if (design.bodyTube.geometry.outerDiameter <= 0) {
    warnings.push({
      id: "diameter-negative",
      type: "error",
      message: "Body diameter must be positive.",
      component: "bodyTube",
      category: "geometry",
    });
  }

  if (design.bottle.geometry.length <= 0) {
    warnings.push({
      id: "bottle-negative",
      type: "error",
      message: "Bottle length must be positive.",
      component: "bottle",
      category: "geometry",
    });
  }

  if (design.bottle.geometry.diameter <= 0) {
    warnings.push({
      id: "bottle-diameter-negative",
      type: "error",
      message: "Bottle diameter must be positive.",
      component: "bottle",
      category: "geometry",
    });
  }

  if (design.nozzle.geometry.throatDiameter <= 0) {
    warnings.push({
      id: "nozzle-negative",
      type: "error",
      message: "Nozzle diameter must be positive.",
      component: "nozzle",
      category: "geometry",
    });
  }

  // Body diameter vs inner diameter
  if (design.bodyTube.geometry.outerDiameter <= design.bodyTube.geometry.innerDiameter) {
    warnings.push({
      id: "body-diameter-invalid",
      type: "error",
      message: "Body outer diameter must be greater than inner diameter.",
      component: "bodyTube",
      category: "geometry",
    });
  }

  // Nozzle too large for bottle
  if (design.nozzle.geometry.throatDiameter > design.bottle.geometry.diameter) {
    warnings.push({
      id: "nozzle-too-large",
      type: "error",
      message: "Nozzle diameter cannot exceed bottle diameter.",
      component: "nozzle",
      category: "geometry",
    });
  }

  // Water exceeds bottle capacity
  if (waterFillPercentage > 100) {
    warnings.push({
      id: "water-exceeds-capacity",
      type: "error",
      message: `Water volume (${(design.waterVolume * 1000).toFixed(2)} L) exceeds bottle capacity (${geometry.bottleVolumeLiters.toFixed(1)} L).`,
      category: "propulsion",
    });
  }

  // Bottle too short for nozzle
  if (design.bottle.geometry.length < design.nozzle.geometry.length && design.bottle.geometry.length > 0) {
    warnings.push({
      id: "bottle-too-short",
      type: "error",
      message: "Bottle section is shorter than nozzle — check dimensions.",
      component: "bottle",
      category: "geometry",
    });
  }

  // ════════════════════════════════════════════════════════════════
  // WARNINGS — Suboptimal but physically possible
  // ════════════════════════════════════════════════════════════════

  // Water fill percentage
  if (waterFillPercentage > 60 && waterFillPercentage <= 100) {
    warnings.push({
      id: "water-high",
      type: "warning",
      message: `Water fill at ${waterFillPercentage.toFixed(0)}% is above the recommended range (25-40%). High water fill reduces air volume for expansion.`,
      category: "propulsion",
    });
  }

  if (waterFillPercentage > 0 && waterFillPercentage < 10) {
    warnings.push({
      id: "water-low",
      type: "warning",
      message: `Water fill at ${waterFillPercentage.toFixed(0)}% is very low. Rocket may not generate sufficient thrust.`,
      category: "propulsion",
    });
  }

  // Pressure warnings
  if (design.initialPressure > 800000) {
    warnings.push({
      id: "pressure-high",
      type: "warning",
      message: `Pressure (${(design.initialPressure / 100000).toFixed(1)} bar) exceeds 8 bar — structural integrity may be compromised.`,
      category: "propulsion",
    });
  }

  if (design.initialPressure < 100000 && design.initialPressure > 0) {
    warnings.push({
      id: "pressure-low",
      type: "warning",
      message: `Pressure (${(design.initialPressure / 100000).toFixed(1)} bar) is below 1 bar — rocket may not launch effectively.`,
      category: "propulsion",
    });
  }

  // Aspect ratio warnings
  if (geometry.aspectRatio > 20) {
    warnings.push({
      id: "aspect-extreme",
      type: "warning",
      message: `Aspect ratio of ${geometry.aspectRatio.toFixed(1)}:1 is extremely high. Rocket may be very difficult to stabilize.`,
      category: "aerodynamics",
    });
  } else if (geometry.aspectRatio > 15) {
    warnings.push({
      id: "aspect-high",
      type: "warning",
      message: `Aspect ratio of ${geometry.aspectRatio.toFixed(1)}:1 is high. Ensure adequate fin sizing for stability.`,
      category: "aerodynamics",
    });
  }

  if (geometry.aspectRatio < 5 && geometry.aspectRatio > 0) {
    warnings.push({
      id: "aspect-low",
      type: "warning",
      message: `Aspect ratio of ${geometry.aspectRatio.toFixed(1)}:1 is low. Frontal drag may be significant relative to mass.`,
      category: "aerodynamics",
    });
  }

  // Fin count
  if (design.fins.geometry.count < 3 && design.fins.geometry.count > 0) {
    warnings.push({
      id: "fins-few",
      type: "warning",
      message: `${design.fins.geometry.count} fins may provide insufficient stability. Consider using 3 or 4 fins.`,
      component: "fins",
      category: "aerodynamics",
    });
  }

  if (design.fins.geometry.count > 4) {
    warnings.push({
      id: "fins-many",
      type: "info",
      message: `${design.fins.geometry.count} fins may add unnecessary drag. Consider 3 or 4 fins.`,
      component: "fins",
      category: "aerodynamics",
    });
  }

  // Fin dimensions
  if (design.fins.geometry.height < 0.03 && design.fins.geometry.height > 0) {
    warnings.push({
      id: "fins-small",
      type: "warning",
      message: "Fins are very small (height < 30 mm). Stability may be inadequate.",
      component: "fins",
      category: "aerodynamics",
    });
  }

  if (design.fins.geometry.height > 0.15) {
    warnings.push({
      id: "fins-large",
      type: "warning",
      message: "Fins are very large (height > 150 mm). May add significant drag.",
      component: "fins",
      category: "aerodynamics",
    });
  }

  // Nozzle size
  if (design.nozzle.geometry.throatDiameter < 0.005 && design.nozzle.geometry.throatDiameter > 0) {
    warnings.push({
      id: "nozzle-small",
      type: "warning",
      message: "Very small nozzle diameter (< 5 mm). May restrict flow and reduce thrust.",
      component: "nozzle",
      category: "propulsion",
    });
  }

  if (design.nozzle.geometry.throatDiameter > 0.025) {
    warnings.push({
      id: "nozzle-large",
      type: "warning",
      message: "Very large nozzle diameter (> 25 mm). Water will exit very quickly, reducing burn time.",
      component: "nozzle",
      category: "propulsion",
    });
  }

  // Mass warnings
  if (mass.totalMass > 2.0) {
    warnings.push({
      id: "mass-high",
      type: "warning",
      message: `Total launch mass (${(mass.totalMass * 1000).toFixed(0)} g) is unusually high — verify structural limits.`,
      category: "mass",
    });
  }

  if (mass.totalMass > 0 && mass.totalMass < 0.05) {
    warnings.push({
      id: "mass-low",
      type: "info",
      message: `Total launch mass (${(mass.totalMass * 1000).toFixed(0)} g) is very light. May be affected by wind.`,
      category: "mass",
    });
  }

  // Rocket length warnings
  if (geometry.totalLength > 1.5) {
    warnings.push({
      id: "rocket-long",
      type: "warning",
      message: `Rocket length (${(geometry.totalLength * 1000).toFixed(0)} mm) exceeds 1.5 m — consider structural reinforcement.`,
      category: "geometry",
    });
  }

  if (geometry.totalLength > 0 && geometry.totalLength < 0.2) {
    warnings.push({
      id: "rocket-short",
      type: "info",
      message: "Rocket is relatively compact. May not achieve high altitudes.",
      category: "geometry",
    });
  }

  // Rocket unusually short
  if (geometry.totalLength < 0.3 && geometry.totalLength > 0) {
    warnings.push({
      id: "rocket-very-short",
      type: "warning",
      message: "Rocket is unusually short. Stability may be difficult to achieve.",
      category: "geometry",
    });
  }

  // Bottle capacity check
  if (geometry.bottleVolumeLiters > 3.0) {
    warnings.push({
      id: "bottle-large",
      type: "info",
      message: `Bottle volume (${geometry.bottleVolumeLiters.toFixed(1)} L) is large — verify launcher compatibility.`,
      component: "bottle",
      category: "propulsion",
    });
  }

  // ════════════════════════════════════════════════════════════════
  // INFO — Helpful observations
  // ════════════════════════════════════════════════════════════════

  if (waterFillPercentage >= 25 && waterFillPercentage <= 40) {
    warnings.push({
      id: "water-optimal",
      type: "info",
      message: `Water fill at ${waterFillPercentage.toFixed(0)}% is in the optimal range (25-40%).`,
      category: "propulsion",
    });
  }

  if (geometry.aspectRatio >= 10 && geometry.aspectRatio <= 15) {
    warnings.push({
      id: "aspect-good",
      type: "info",
      message: `Aspect ratio of ${geometry.aspectRatio.toFixed(1)}:1 is within a good range for stability.`,
      category: "aerodynamics",
    });
  }

  if (design.dragCoefficient < 0.3 && design.dragCoefficient > 0) {
    warnings.push({
      id: "drag-low",
      type: "info",
      message: `Drag coefficient of ${design.dragCoefficient.toFixed(2)} is low — good for altitude performance.`,
      category: "aerodynamics",
    });
  }

  if (design.dragCoefficient > 0.6) {
    warnings.push({
      id: "drag-high",
      type: "info",
      message: `Drag coefficient of ${design.dragCoefficient.toFixed(2)} is high — consider streamlining.`,
      category: "aerodynamics",
    });
  }

  if (design.recovery.geometry.compartmentLength === 0) {
    warnings.push({
      id: "no-recovery",
      type: "info",
      message: "No recovery system configured. Rocket will fall ballistically.",
      component: "recovery",
      category: "general",
    });
  }

  return warnings;
}
