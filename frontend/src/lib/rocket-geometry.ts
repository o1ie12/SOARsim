/**
 * SOAR Studio — Rocket Geometry Engine
 *
 * Calculates all derived properties from rocket component geometry.
 * Bridges the new engineering module with existing legacy code.
 * v2.3: Delegates to the engineering/ module for all calculations.
 */

import type {
  RocketDesignState,
  RocketCalculations,
  ValidationWarning,
} from "./rocket-designer-types";

import { MATERIALS, calculateGeometry, calculateMass } from "./engineering";
import { calculateEngineeringProperties } from "./engineering/properties";

export { MATERIALS };
export type { MaterialKey } from "./engineering";

// ── Default Design ───────────────────────────────────────────────

export function createDefaultDesign(): RocketDesignState {
  const now = new Date().toISOString();
  return {
    id: `design_${Date.now()}`,
    name: "Water Rocket",
    description: "Standard water rocket design",
    version: 1,
    createdAt: now,
    modifiedAt: now,

    noseCone: {
      id: "nose",
      type: "noseCone",
      name: "Nose Cone",
      visible: true,
      geometry: { type: "ogive", length: 0.15, baseRadius: 0.0325 },
      material: MATERIALS.plastic,
      mass: 0.02,
    },

    bodyTube: {
      id: "body",
      type: "bodyTube",
      name: "Body Tube",
      visible: true,
      geometry: {
        length: 0.30,
        outerDiameter: 0.065,
        innerDiameter: 0.062,
        wallThickness: 0.0015,
      },
      material: MATERIALS.cardboard,
      mass: 0.05,
    },

    bottle: {
      id: "bottle",
      type: "bottle",
      name: "Pressure Vessel",
      visible: true,
      geometry: {
        length: 0.25,
        diameter: 0.105,
        volume: 2.0,
        wallThickness: 0.001,
      },
      material: MATERIALS.plastic,
      mass: 0.045,
    },

    fins: {
      id: "fins",
      type: "fins",
      name: "Fins",
      visible: true,
      geometry: {
        count: 3,
        height: 0.08,
        span: 0.10,
        tipSpan: 0.05,
        sweep: 0.03,
        thickness: 0.002,
        position: 0,
      },
      material: MATERIALS.cardboard,
      mass: 0.015,
    },

    nozzle: {
      id: "nozzle",
      type: "nozzle",
      name: "Nozzle",
      visible: true,
      geometry: {
        inletDiameter: 0.021,
        throatDiameter: 0.013,
        exitDiameter: 0.013,
        length: 0.03,
      },
      material: MATERIALS.plastic,
      mass: 0.005,
    },

    recovery: {
      id: "recovery",
      type: "recovery",
      name: "Recovery System",
      visible: true,
      geometry: {
        type: "parachute",
        compartmentLength: 0.05,
      },
      material: MATERIALS.foam,
      mass: 0.01,
    },

    dragCoefficient: 0.45,
    launchAngle: 75,
    waterVolume: 0.0007,
    initialPressure: 400000,
  };
}

// ── Geometry Calculations ────────────────────────────────────────

export function calculateRocketProperties(
  design: RocketDesignState
): RocketCalculations {
  const eng = calculateEngineeringProperties(design);
  const geo = eng.geometry;
  const mass = eng.mass;

  return {
    totalLength: geo.totalLength,
    bodyDiameter: geo.bodyDiameter,
    noseLength: geo.noseLength,
    bodyLength: geo.bodyLength,
    crossSectionalArea: geo.crossSectionalArea,
    totalMass: mass.totalMass,
    dryMass: mass.dryMass,
    waterMass: mass.waterMass,
    estimatedInternalVolume: geo.estimatedInternalVolume,
    waterFillPercentage: eng.waterFillPercentage,
    centerOfGravity: eng.cg.cgFromNose,
    stabilityMargin: eng.stability.marginCalibers,
    aspectRatio: geo.aspectRatio,
    finenessRatio: geo.aspectRatio,
  };
}

// ── Validation ───────────────────────────────────────────────────

export function validateDesign(
  design: RocketDesignState
): ValidationWarning[] {
  const eng = calculateEngineeringProperties(design);
  return eng.warnings.map((w) => ({
    id: w.id,
    type: w.type,
    message: w.message,
    component: w.component,
  }));
}

// ── Unit Conversions (legacy wrappers for backward compatibility) ─
export function metersToDisplay(m: number): number {
  return m * 1000; // meters to mm
}
export function displayToMeters(mm: number): number {
  return mm / 1000; // mm to meters
}
export function litersToDisplay(m3: number): number {
  return m3 * 1000; // m³ to liters
}
export function displayToLiters(L: number): number {
  return L / 1000; // liters to m³
}
export function paToBar(pa: number): number {
  return pa / 100000;
}
export function barToPa(bar: number): number {
  return bar * 100000;
}
export function kgToGrams(kg: number): number {
  return kg * 1000;
}
export function m2ToCm2(m2: number): number {
  return m2 * 10000;
}
