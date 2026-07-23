/**
 * SOAR Studio — Engineering Geometry Calculations
 *
 * Computes all geometric properties from rocket component dimensions.
 * All calculations return SI units (meters, m², m³).
 */

import type { RocketDesignState } from "@/lib/rocket-designer-types";

// ── Geometry Properties ──────────────────────────────────────────

export interface GeometryProperties {
  /** Total rocket length (nose + body + bottle + recovery + nozzle) in meters */
  totalLength: number;
  /** Body tube outer diameter in meters */
  bodyDiameter: number;
  /** Nose cone length in meters */
  noseLength: number;
  /** Body tube length in meters */
  bodyLength: number;
  /** Bottle length in meters */
  bottleLength: number;
  /** Maximum diameter across the rocket (body or bottle, whichever is larger) in meters */
  maximumDiameter: number;
  /** Cross-sectional area of the body tube in m² */
  crossSectionalArea: number;
  /** Estimated internal volume of the rocket in m³ */
  estimatedInternalVolume: number;
  /** Bottle internal volume in m³ */
  bottleVolumeM3: number;
  /** Bottle volume in liters (from model) */
  bottleVolumeLiters: number;
  /** Nose cone base radius in meters */
  noseBaseRadius: number;
  /** Aspect ratio (total length / body diameter) */
  aspectRatio: number;
  /** Fineness ratio (same as aspect ratio) */
  finenessRatio: number;
  /** Frontal area (cross-sectional area) in m² */
  frontalArea: number;
}

// ── Default Material Densities ───────────────────────────────────

export const MATERIALS = {
  cardboard: { name: "Cardboard", density: 680 },
  plastic: { name: "Plastic (PET)", density: 1380 },
  carbon: { name: "Carbon Fiber", density: 1600 },
  fiberglass: { name: "Fiberglass", density: 1800 },
  balsa: { name: "Balsa Wood", density: 160 },
  plywood: { name: "Plywood", density: 700 },
  foam: { name: "Foam", density: 50 },
  aluminum: { name: "Aluminum", density: 2700 },
} as const;

export type MaterialKey = keyof typeof MATERIALS;

// ── Geometry Calculations ────────────────────────────────────────

export function calculateGeometry(design: RocketDesignState): GeometryProperties {
  const noseLength = design.noseCone.geometry.length;
  const bodyLength = design.bodyTube.geometry.length;
  const bottleLength = design.bottle.geometry.length;
  const recoveryLength = design.recovery.geometry.compartmentLength;
  const nozzleLength = design.nozzle.geometry.length;

  const totalLength = noseLength + bodyLength + bottleLength + recoveryLength + nozzleLength;

  const bodyDiameter = design.bodyTube.geometry.outerDiameter;
  const bottleDiameter = design.bottle.geometry.diameter;
  const maximumDiameter = Math.max(bodyDiameter, bottleDiameter);

  const bodyRadius = bodyDiameter / 2;
  const crossSectionalArea = Math.PI * bodyRadius * bodyRadius;

  // Internal volume estimation
  const innerRadius = design.bodyTube.geometry.innerDiameter / 2;
  const bodyInternalVolume = Math.PI * innerRadius * innerRadius * bodyLength;
  const bottleVolumeM3 = design.bottle.geometry.volume / 1000;
  const estimatedInternalVolume = bodyInternalVolume + bottleVolumeM3;

  // Aspect ratio
  const aspectRatio = bodyDiameter > 0 ? totalLength / bodyDiameter : 0;

  return {
    totalLength,
    bodyDiameter,
    noseLength,
    bodyLength,
    bottleLength,
    maximumDiameter,
    crossSectionalArea,
    estimatedInternalVolume,
    bottleVolumeM3,
    bottleVolumeLiters: design.bottle.geometry.volume,
    noseBaseRadius: design.noseCone.geometry.baseRadius,
    aspectRatio,
    finenessRatio: aspectRatio,
    frontalArea: crossSectionalArea,
  };
}
