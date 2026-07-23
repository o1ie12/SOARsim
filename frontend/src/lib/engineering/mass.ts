/**
 * SOAR Studio — Engineering Mass Calculations
 *
 * Computes all mass-related properties from rocket component masses.
 * All calculations return SI units (kg).
 */

import type { RocketDesignState } from "@/lib/rocket-designer-types";

// ── Mass Properties ──────────────────────────────────────────────

export interface MassProperties {
  /** Mass of nose cone in kg */
  noseMass: number;
  /** Mass of body tube in kg */
  bodyMass: number;
  /** Mass of bottle (pressure vessel) in kg */
  bottleMass: number;
  /** Mass of fins in kg */
  finMass: number;
  /** Mass of nozzle in kg */
  nozzleMass: number;
  /** Mass of recovery system in kg */
  recoveryMass: number;
  /** Total dry mass (all components, no water) in kg */
  dryMass: number;
  /** Mass of water in kg */
  waterMass: number;
  /** Total launch mass (dry mass + water) in kg */
  totalMass: number;
  /** Water mass as percentage of total mass */
  waterMassPercentage: number;
  /** Dry mass as percentage of total mass */
  dryMassPercentage: number;
  /** Water density used for calculation (kg/m³) */
  waterDensity: number;
}

// ── Mass Calculations ────────────────────────────────────────────

export function calculateMass(design: RocketDesignState): MassProperties {
  const noseMass = design.noseCone.mass;
  const bodyMass = design.bodyTube.mass;
  const bottleMass = design.bottle.mass;
  const finMass = design.fins.mass;
  const nozzleMass = design.nozzle.mass;
  const recoveryMass = design.recovery.mass;

  const dryMass = noseMass + bodyMass + bottleMass + finMass + nozzleMass + recoveryMass;

  // Water mass (density of water = 1000 kg/m³)
  const waterDensity = 1000;
  const waterMass = design.waterVolume * waterDensity;

  const totalMass = dryMass + waterMass;

  return {
    noseMass,
    bodyMass,
    bottleMass,
    finMass,
    nozzleMass,
    recoveryMass,
    dryMass,
    waterMass,
    totalMass,
    waterMassPercentage: totalMass > 0 ? (waterMass / totalMass) * 100 : 0,
    dryMassPercentage: totalMass > 0 ? (dryMass / totalMass) * 100 : 0,
    waterDensity,
  };
}
