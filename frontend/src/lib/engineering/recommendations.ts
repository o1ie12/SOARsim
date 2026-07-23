/**
 * SOAR Studio — Stability Recommendations
 *
 * Generates deterministic, rule-based engineering recommendations
 * to help users improve rocket stability.
 *
 * No AI is used — all logic is based on engineering thresholds.
 * Each recommendation is concise and actionable.
 */

import type { StabilityProperties, StabilityRating } from "./stability";
import type { CGProperties } from "./cg";
import type { CPProperties } from "./cp";
import type { GeometryProperties } from "./geometry";
import type { MassProperties } from "./mass";

// ── Recommendation Type ──────────────────────────────────────────

export interface StabilityRecommendation {
  id: string;
  type: "positive" | "suggestion" | "critical";
  message: string;
  detail: string;
  category: "mass" | "geometry" | "fins" | "general";
  /** Suggested action (what the user can do) */
  action?: string;
}

// ── Recommendation Generation ────────────────────────────────────

export function generateRecommendations(
  stability: StabilityProperties,
  cg: CGProperties,
  cp: CPProperties,
  geometry: GeometryProperties,
  mass: MassProperties,
): StabilityRecommendation[] {
  const recommendations: StabilityRecommendation[] = [];

  // ══════════════════════════════════════════════════════════════
  // POSITIVE — things that are working well
  // ══════════════════════════════════════════════════════════════

  if (stability.rating === "excellent" || stability.rating === "good") {
    recommendations.push({
      id: "stability-good",
      type: "positive",
      message: "Stability margin is adequate.",
      detail: `Current margin is ${stability.marginCalibers.toFixed(2)} calibers, which provides reliable passive stability.`,
      category: "general",
    });
  }

  if (stability.rating === "excellent") {
    recommendations.push({
      id: "stability-excellent",
      type: "positive",
      message: "Generous stability margin.",
      detail: `At ${stability.marginCalibers.toFixed(2)} calibers, the rocket has significant stability reserve.`,
      category: "general",
    });
  }

  if (cg.cgPercentBody < 60 && cg.cgPercentBody > 20) {
    recommendations.push({
      id: "cg-forward",
      type: "positive",
      message: "CG is well forward in the rocket.",
      detail: `CG is at ${cg.cgPercentLength.toFixed(0)}% of body length from nose, which is favourable for stability.`,
      category: "mass",
    });
  }

  // Check if fin contribution is strong
  const finCPcontribution = cp.components.find((c) => c.name === "Fins");
  if (finCPcontribution && finCPcontribution.percentage > 40) {
    recommendations.push({
      id: "fins-effective",
      type: "positive",
      message: "Fins provide good aerodynamic restoring force.",
      detail: `Fins contribute ${finCPcontribution.percentage.toFixed(0)}% of total normal force.`,
      category: "fins",
    });
  }

  // ══════════════════════════════════════════════════════════════
  // SUGGESTIONS — improvements the user can make
  // ══════════════════════════════════════════════════════════════

  if (stability.rating === "marginal" || stability.rating === "poor") {
    recommendations.push({
      id: "increase-margin",
      type: "suggestion",
      message: "Increase stability margin.",
      detail: `Current margin is ${stability.marginCalibers.toFixed(2)} calibers. Target at least 1.0 caliber for reliable stability.`,
      category: "general",
      action: "Move CG forward or CP aft",
    });
  }

  if (stability.rating === "unstable") {
    recommendations.push({
      id: "fix-instability",
      type: "critical",
      message: "Rocket is unstable — CG is behind CP.",
      detail: `CG is ${cg.cgPercentLength.toFixed(0)}% from nose, CP is ${cp.cpPercentLength.toFixed(0)}% from nose. CG must be forward of CP for stable flight.`,
      category: "general",
      action: "Add nose weight, enlarge fins, or reduce rear mass",
    });
  }

  // CG too far aft
  if (cg.cgPercentLength > 55) {
    recommendations.push({
      id: "cg-aft",
      type: "suggestion",
      message: "CG is relatively far aft.",
      detail: `CG is at ${cg.cgPercentLength.toFixed(0)}% of rocket length. Aim for 40-55% from nose.`,
      category: "mass",
      action: "Add mass to the nose cone or reduce tail mass",
    });
  }

  // Heavy tail components
  const tailMass = mass.nozzleMass + (mass.finMass * 0.3);
  if (tailMass > 0.02) {
    recommendations.push({
      id: "heavy-tail",
      type: "suggestion",
      message: "Rear components are relatively heavy.",
      detail: `Combined nozzle and fin mass: ${(tailMass * 1000).toFixed(0)} g. This pulls CG aft.`,
      category: "mass",
      action: "Use lighter materials for the nozzle and fins",
    });
  }

  // Fin size recommendations
  const totalCN = cp.totalCN;
  if (totalCN < 1.5 && stability.rating !== "excellent") {
    const noseCP = cp.components.find((c) => c.name === "Nose Cone");
    const noseCNpct = noseCP ? noseCP.percentage : 0;
    if (noseCNpct > 60) {
      recommendations.push({
        id: "fins-small",
        type: "suggestion",
        message: "Nose dominates CP — fins may be undersized.",
        detail: `Nose cone contributes ${noseCNpct.toFixed(0)}% of normal force. Enlarging fins would shift CP aft and improve stability.`,
        category: "fins",
        action: "Increase fin span or root chord",
      });
    }
  }

  // Geometry-based recommendations
  if (geometry.aspectRatio > 15 && stability.marginCalibers < 1.5) {
    recommendations.push({
      id: "slender-stability",
      type: "suggestion",
      message: "High aspect ratio rocket may need larger fins.",
      detail: `Slender rockets (L/D: ${geometry.aspectRatio.toFixed(1)}) require more fin area for equivalent stability.`,
      category: "geometry",
      action: "Increase fin size or reduce rocket length",
    });
  }

  if (designHasHeavyWater(mass.waterMassPercentage) && stability.marginCalibers < 1.5) {
    recommendations.push({
      id: "water-cg-effect",
      type: "suggestion",
      message: "High water mass may shift CG aft during flight.",
      detail: `Water is ${mass.waterMassPercentage.toFixed(0)}% of total mass. As water is expelled, CG shifts aft, reducing margin.`,
      category: "mass",
      action: "Consider reducing water volume or increasing initial margin",
    });
  }

  // Very short body
  if (geometry.bodyLength / geometry.totalLength < 0.3 && geometry.totalLength > 0) {
    recommendations.push({
      id: "short-body",
      type: "suggestion",
      message: "Short body tube limits fin placement options.",
      detail: `Body makes up only ${((geometry.bodyLength / geometry.totalLength) * 100).toFixed(0)}% of total length. Fins may be close to CG.`,
      category: "geometry",
      action: "Extend body tube or reduce other sections",
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CRITICAL — must-fix issues
  // ══════════════════════════════════════════════════════════════

  if (stability.marginCalibers < 0) {
    recommendations.push({
      id: "cg-behind-cp",
      type: "critical",
      message: "CG is aft of CP — rocket will be inherently unstable.",
      detail: `CG is ${(Math.abs(cg.cgFromNose - cp.cpFromNose) * 1000).toFixed(0)} mm behind CP. The rocket will weathercock or tumble immediately after launch.`,
      category: "general",
      action: "Add significant nose weight AND increase fin size",
    });
  }

  if (geometry.totalLength > 0 && geometry.bodyDiameter > 0 &&
      cg.cgFromNose > cp.cpFromNose && stability.marginCalibers > 0 &&
      stability.marginCalibers < 0.25) {
    recommendations.push({
      id: "very-low-margin",
      type: "critical",
      message: "Very low stability margin — barely stable.",
      detail: `Margin of ${stability.marginCalibers.toFixed(2)} calibers is below recommended minimum.`,
      category: "general",
      action: "Increase margin to at least 0.5 calibers",
    });
  }

  // Very short rocket that can't be stabilized
  if (geometry.totalLength < 0.3 && geometry.totalLength > 0 &&
      stability.marginCalibers < 1.0) {
    recommendations.push({
      id: "too-short-stable",
      type: "critical",
      message: "Very short rocket — difficult to stabilize with fins alone.",
      detail: `At ${(geometry.totalLength * 1000).toFixed(0)} mm, there is limited moment arm for fins.`,
      category: "geometry",
      action: "Increase rocket length or add a longer nose cone",
    });
  }

  // ══════════════════════════════════════════════════════════════
  // NO RECOMMENDATIONS — all good
  // ══════════════════════════════════════════════════════════════

  if (recommendations.length === 0) {
    recommendations.push({
      id: "all-good",
      type: "positive",
      message: "No stability concerns detected.",
      detail: "Current design parameters are within stable configuration ranges.",
      category: "general",
    });
  }

  return recommendations;
}

// ── Helper Functions ─────────────────────────────────────────────

function designHasHeavyWater(waterMassPercentage: number): boolean {
  return waterMassPercentage > 50;
}
