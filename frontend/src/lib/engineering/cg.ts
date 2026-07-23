/**
 * SOAR Studio — Center of Gravity Calculation
 *
 * Estimates the rocket's center of gravity using weighted component masses
 * and their geometric positions along the longitudinal axis.
 *
 * Methodology:
 *   CG = Σ(mᵢ × xᵢ) / Σ(mᵢ)
 *
 *   where mᵢ  = component mass (kg)
 *         xᵢ  = distance from nose tip (m)
 *
 * Assumptions:
 *   - Components are modelled as point masses at their geometric centers
 *   - Nose cone CG: 40-50% from tip, depending on shape
 *   - Body tube CG: at geometric center of tube
 *   - Bottle CG: at geometric center of bottle section
 *   - Water CG: same as bottle CG (water fills the bottle)
 *   - Fins CG: at fin position + 30% of root chord from fin root
 *   - Nozzle CG: at geometric center of nozzle
 *   - Recovery CG: at geometric center of recovery compartment
 *
 * All values are in SI units (meters, kg).
 */

import type { RocketDesignState } from "@/lib/rocket-designer-types";
import { calculateGeometry, type GeometryProperties } from "./geometry";
import { calculateMass, type MassProperties } from "./mass";

// ── CG Properties ────────────────────────────────────────────────

export interface CGProperties {
  /** Center of gravity — distance from nose tip (m) */
  cgFromNose: number;
  /** Center of gravity — distance from tail (m) */
  cgFromTail: number;
  /** CG as percentage of total rocket length */
  cgPercentLength: number;
  /** CG as percentage of body length from nose */
  cgPercentBody: number;
  /** Individual component CG positions from nose (m) */
  components: CgComponent[];
}

export interface CgComponent {
  name: string;
  mass: number; // kg
  position: number; // m from nose tip
  percentage: number; // % contribution to total mass
}

// ── Nose CG Factor ──────────────────────────────────────────────

function noseCgFactor(type: string): number {
  // Fraction of nose length from nose tip where CG lies
  switch (type) {
    case "conical":
      return 0.666; // CG at 2/3 length from tip
    case "ogive":
      return 0.466; // Tangent ogive approximation
    case "parabolic":
      return 0.500;
    case "elliptical":
      return 0.534;
    default:
      return 0.500;
  }
}

// ── CG Calculation ──────────────────────────────────────────────

export function calculateCG(
  design: RocketDesignState,
  geometry: GeometryProperties,
  mass: MassProperties,
): CGProperties {
  const components: CgComponent[] = [];
  let totalWeightedPos = 0;
  let totalMass = 0;

  // Compute cumulative Y positions from nose tip
  let yPos = 0;

  // ── 1. Nose Cone ──────────────────────────────────────────────
  const noseCGoffset = geometry.noseLength * noseCgFactor(design.noseCone.geometry.type);
  const nosePos = yPos + noseCGoffset;
  components.push({
    name: "Nose Cone",
    mass: mass.noseMass,
    position: nosePos,
    percentage: 0, // computed below
  });
  totalWeightedPos += mass.noseMass * nosePos;
  totalMass += mass.noseMass;

  yPos += geometry.noseLength;

  // ── 2. Body Tube ──────────────────────────────────────────────
  const bodyPos = yPos + geometry.bodyLength / 2;
  components.push({
    name: "Body Tube",
    mass: mass.bodyMass,
    position: bodyPos,
    percentage: 0,
  });
  totalWeightedPos += mass.bodyMass * bodyPos;
  totalMass += mass.bodyMass;

  yPos += geometry.bodyLength;

  // ── 3. Bottle (Pressure Vessel) ──────────────────────────────
  const bottlePos = yPos + geometry.bottleLength / 2;
  components.push({
    name: "Pressure Vessel",
    mass: mass.bottleMass,
    position: bottlePos,
    percentage: 0,
  });
  totalWeightedPos += mass.bottleMass * bottlePos;
  totalMass += mass.bottleMass;

  // Water sits in the bottle → CG at bottle center
  const waterPos = yPos + geometry.bottleLength / 2;
  components.push({
    name: "Water",
    mass: mass.waterMass,
    position: waterPos,
    percentage: 0,
  });
  totalWeightedPos += mass.waterMass * waterPos;
  totalMass += mass.waterMass;

  yPos += geometry.bottleLength;

  // ── 4. Recovery Compartment ─────────────────────────────────
  const recoveryPos = yPos + design.recovery.geometry.compartmentLength / 2;
  components.push({
    name: "Recovery",
    mass: mass.recoveryMass,
    position: recoveryPos,
    percentage: 0,
  });
  totalWeightedPos += mass.recoveryMass * recoveryPos;
  totalMass += mass.recoveryMass;

  yPos += design.recovery.geometry.compartmentLength;

  // ── 5. Nozzle ────────────────────────────────────────────────
  const nozzlePos = yPos + design.nozzle.geometry.length / 2;
  components.push({
    name: "Nozzle",
    mass: mass.nozzleMass,
    position: nozzlePos,
    percentage: 0,
  });
  totalWeightedPos += mass.nozzleMass * nozzlePos;
  totalMass += mass.nozzleMass;

  // ── 6. Fins ──────────────────────────────────────────────────
  // Position of fins: from tail (nozzle is at very rear), so
  // fin position is measured from nose tip.
  // The fin root is at (bodyBottom - finSweep), CG at ~30% of root chord
  const totalLength = geometry.totalLength;
  const finRootChord = design.fins.geometry.span;
  const finCgOffset = finRootChord * 0.3;
  const finPosFromTail = design.fins.geometry.position + finCgOffset;
  const finPos = Math.max(0, totalLength - nozzleLength(design) - finPosFromTail);

  components.push({
    name: "Fins",
    mass: mass.finMass,
    position: finPos,
    percentage: 0,
  });
  totalWeightedPos += mass.finMass * finPos;
  totalMass += mass.finMass;

  // ── Overall CG ───────────────────────────────────────────────
  const cgFromNose = totalMass > 0 ? totalWeightedPos / totalMass : 0;
  const cgFromTail = totalMass > 0 ? geometry.totalLength - cgFromNose : 0;
  const cgPercentLength = geometry.totalLength > 0
    ? (cgFromNose / geometry.totalLength) * 100
    : 0;
  const cgPercentBody = (geometry.bodyLength + geometry.noseLength) > 0
    ? (cgFromNose / (geometry.bodyLength + geometry.noseLength)) * 100
    : 0;

  // Compute percentages
  const compWithPct = components.map((c) => ({
    ...c,
    percentage: totalMass > 0 ? (c.mass / totalMass) * 100 : 0,
  }));

  return {
    cgFromNose,
    cgFromTail,
    cgPercentLength,
    cgPercentBody,
    components: compWithPct,
  };
}

// ── Helper ───────────────────────────────────────────────────────

function nozzleLength(design: RocketDesignState): number {
  return design.nozzle.geometry.length;
}

// ── Quick CG (for context — uses internal geometry/mass calls) ──

export function calculateCGFromDesign(design: RocketDesignState): CGProperties {
  const geometry = calculateGeometry(design);
  const mass = calculateMass(design);
  return calculateCG(design, geometry, mass);
}
