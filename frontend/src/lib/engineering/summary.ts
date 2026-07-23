/**
 * SOAR Studio — Engineering Summary
 *
 * Automatically generates deterministic engineering observations.
 * Uses rule-based logic — no AI.
 *
 * Each observation describes what the design implies,
 * not just what the values are.
 */

import type { GeometryProperties } from "./geometry";
import type { MassProperties } from "./mass";
import type { EngineeringWarning } from "./warnings";

// ── Summary Observation ──────────────────────────────────────────

export interface EngineeringSummary {
  id: string;
  type: "positive" | "neutral" | "concern";
  message: string;
  category: "geometry" | "mass" | "propulsion" | "aerodynamics" | "general";
}

// ── Summary Generation ───────────────────────────────────────────

export function generateSummary(
  geometry: GeometryProperties,
  mass: MassProperties,
  waterFillPercentage: number,
  initialPressure: number,
  warnings: EngineeringWarning[],
  launchAngleDeg: number = 75,
): EngineeringSummary[] {
  const summary: EngineeringSummary[] = [];
  const hasErrors = warnings.some((w) => w.type === "error");

  if (hasErrors) {
    summary.push({
      id: "has-errors",
      type: "concern",
      message: "Design has configuration errors that must be resolved before launch.",
      category: "general",
    });
    return summary;
  }

  // ══════════════════════════════════════════════════════════════
  // Geometry Observations
  // ══════════════════════════════════════════════════════════════

  if (geometry.aspectRatio >= 10 && geometry.aspectRatio <= 15) {
    summary.push({
      id: "aspect-good",
      type: "positive",
      message: "Aspect ratio is well-balanced, offering good aerodynamic efficiency.",
      category: "geometry",
    });
  } else if (geometry.aspectRatio > 15) {
    summary.push({
      id: "aspect-high",
      type: "concern",
      message: "Rocket has a high aspect ratio, which may improve altitude but requires careful stability design.",
      category: "geometry",
    });
  } else if (geometry.aspectRatio < 5 && geometry.aspectRatio > 0) {
    summary.push({
      id: "aspect-low",
      type: "neutral",
      message: "Rocket is relatively compact with a low aspect ratio — drag will be a larger factor.",
      category: "geometry",
    });
  }

  if (geometry.totalLength > 1.0) {
    summary.push({
      id: "rocket-long",
      type: "neutral",
      message: `At ${(geometry.totalLength * 1000).toFixed(0)} mm, this is a long rocket. Structural stiffness may be a concern.`,
      category: "geometry",
    });
  } else if (geometry.totalLength > 0 && geometry.totalLength < 0.35) {
    summary.push({
      id: "rocket-short",
      type: "neutral",
      message: `Rocket is relatively short (${(geometry.totalLength * 1000).toFixed(0)} mm). May not have room for optimal fin placement.`,
      category: "geometry",
    });
  }

  if (geometry.maximumDiameter > 0.12) {
    summary.push({
      id: "large-diameter",
      type: "neutral",
      message: `Large diameter (${(geometry.maximumDiameter * 1000).toFixed(0)} mm) increases internal volume but also increases drag.`,
      category: "geometry",
    });
  } else if (geometry.maximumDiameter > 0 && geometry.maximumDiameter < 0.06) {
    summary.push({
      id: "narrow-diameter",
      type: "neutral",
      message: `Narrow body (${(geometry.maximumDiameter * 1000).toFixed(0)} mm) reduces drag but limits internal space.`,
      category: "geometry",
    });
  }

  const bodyRatio = geometry.bodyLength / geometry.totalLength;
  if (bodyRatio > 0.5) {
    summary.push({
      id: "body-dominant",
      type: "neutral",
      message: "Body tube dominates the rocket length. Consider whether this improves or hurts stability.",
      category: "geometry",
    });
  }

  // ══════════════════════════════════════════════════════════════
  // Mass Observations
  // ══════════════════════════════════════════════════════════════

  if (mass.totalMass > 1.0) {
    summary.push({
      id: "mass-high",
      type: "concern",
      message: `Total launch mass of ${(mass.totalMass * 1000).toFixed(0)} g is high. Ensure the launch system can handle the weight.`,
      category: "mass",
    });
  } else if (mass.totalMass < 0.2 && mass.totalMass > 0) {
    summary.push({
      id: "mass-light",
      type: "neutral",
      message: `Lightweight design (${(mass.totalMass * 1000).toFixed(0)} g). Will be sensitive to wind conditions.`,
      category: "mass",
    });
  }

  if (mass.dryMass > 0.2) {
    summary.push({
      id: "dry-mass-high",
      type: "concern",
      message: `Dry mass of ${(mass.dryMass * 1000).toFixed(0)} g is high. Consider lighter materials.`,
      category: "mass",
    });
  }

  const waterRatio = mass.waterMassPercentage;
  if (waterRatio >= 60) {
    summary.push({
      id: "water-heavy",
      type: "concern",
      message: "Water makes up a large portion of total mass — short burn time expected.",
      category: "mass",
    });
  } else if (waterRatio >= 40 && waterRatio < 60) {
    summary.push({
      id: "water-balanced",
      type: "positive",
      message: "Good water-to-dry-mass ratio for sustained thrust.",
      category: "mass",
    });
  }

  // ══════════════════════════════════════════════════════════════
  // Propulsion Observations
  // ══════════════════════════════════════════════════════════════

  if (waterFillPercentage >= 25 && waterFillPercentage <= 40) {
    summary.push({
      id: "fill-optimal",
      type: "positive",
      message: "Water fill is within the recommended range of 25-40% for optimal performance.",
      category: "propulsion",
    });
  } else if (waterFillPercentage > 40 && waterFillPercentage <= 60) {
    summary.push({
      id: "fill-high",
      type: "neutral",
      message: `Water fill at ${waterFillPercentage.toFixed(0)}% is above optimal — expect shorter burn with higher initial thrust.`,
      category: "propulsion",
    });
  } else if (waterFillPercentage > 60 && waterFillPercentage <= 100) {
    summary.push({
      id: "fill-very-high",
      type: "concern",
      message: `Water fill at ${waterFillPercentage.toFixed(0)}% is significantly above the recommended range.`,
      category: "propulsion",
    });
  } else if (waterFillPercentage > 0 && waterFillPercentage < 25) {
    summary.push({
      id: "fill-low",
      type: "neutral",
      message: `Water fill at ${waterFillPercentage.toFixed(0)}%. Lower fill provides longer burn but may reduce peak thrust.`,
      category: "propulsion",
    });
  }

  if (initialPressure > 600000) {
    summary.push({
      id: "pressure-high",
      type: "concern",
      message: `Initial pressure of ${(initialPressure / 100000).toFixed(1)} bar is high. Verify bottle pressure rating.`,
      category: "propulsion",
    });
  } else if (initialPressure >= 300000 && initialPressure <= 600000) {
    summary.push({
      id: "pressure-good",
      type: "positive",
      message: `Initial pressure of ${(initialPressure / 100000).toFixed(1)} bar is within a practical range.`,
      category: "propulsion",
    });
  } else if (initialPressure > 0 && initialPressure < 300000) {
    summary.push({
      id: "pressure-low",
      type: "neutral",
      message: `Initial pressure of ${(initialPressure / 100000).toFixed(1)} bar is low. Altitude will be limited.`,
      category: "propulsion",
    });
  }

  // ══════════════════════════════════════════════════════════════
  // Aerodynamics Observations
  // ══════════════════════════════════════════════════════════════

  const frontalAreaCm2 = geometry.frontalArea * 10000;
  if (frontalAreaCm2 > 80) {
    summary.push({
      id: "large-frontal",
      type: "concern",
      message: `Large frontal area (${frontalAreaCm2.toFixed(1)} cm²) will increase drag significantly.`,
      category: "aerodynamics",
    });
  } else if (frontalAreaCm2 < 20 && frontalAreaCm2 > 0) {
    summary.push({
      id: "small-frontal",
      type: "positive",
      message: `Small frontal area (${frontalAreaCm2.toFixed(1)} cm²) helps reduce drag.`,
      category: "aerodynamics",
    });
  }

  if (launchAngleDeg >= 80) {
    summary.push({
      id: "steep-launch",
      type: "neutral",
      message: "Steep launch angle (> 80°) favours altitude over distance.",
      category: "aerodynamics",
    });
  } else if (launchAngleDeg <= 45) {
    summary.push({
      id: "shallow-launch",
      type: "neutral",
      message: "Shallow launch angle favours distance over altitude.",
      category: "aerodynamics",
    });
  }

  // ══════════════════════════════════════════════════════════════
  // General Observations
  // ══════════════════════════════════════════════════════════════

  const totalWarningCount = warnings.filter((w) => w.type === "warning").length;
  if (totalWarningCount === 0) {
    summary.push({
      id: "no-warnings",
      type: "positive",
      message: "No engineering warnings — design parameters are within recommended ranges.",
      category: "general",
    });
  } else if (totalWarningCount <= 2) {
    summary.push({
      id: "few-warnings",
      type: "neutral",
      message: `${totalWarningCount} minor warning${totalWarningCount > 1 ? "s" : ""} — review and verify before launch.`,
      category: "general",
    });
  } else {
    summary.push({
      id: "many-warnings",
      type: "concern",
      message: `${totalWarningCount} warnings — design may benefit from further optimisation.`,
      category: "general",
    });
  }

  return summary;
}
