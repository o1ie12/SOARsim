/**
 * SOARSim Rocket Geometry Engine
 *
 * Calculates all derived properties from rocket component geometry.
 * Separated from rendering and state management.
 */

import type {
  RocketDesignState,
  RocketCalculations,
  ValidationWarning,
  NoseConeGeometry,
  BodyTubeGeometry,
  BottleGeometry,
  FinGeometry,
  NozzleGeometry,
} from "./rocket-designer-types";

// ── Material Densities (kg/m³) ──────────────────────────────────

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
  const noseLength = design.noseCone.geometry.length;
  const bodyLength = design.bodyTube.geometry.length;
  const bottleLength = design.bottle.geometry.length;
  const recoveryLength = design.recovery.geometry.compartmentLength;
  const nozzleLength = design.nozzle.geometry.length;

  const totalLength =
    noseLength + bodyLength + bottleLength + recoveryLength + nozzleLength;

  const bodyDiameter = design.bodyTube.geometry.outerDiameter;
  const crossSectionalArea = Math.PI * Math.pow(bodyDiameter / 2, 2);

  // Mass calculations
  const noseMass = design.noseCone.mass;
  const bodyMass = design.bodyTube.mass;
  const bottleMass = design.bottle.mass;
  const finMass = design.fins.mass;
  const nozzleMass = design.nozzle.mass;
  const recoveryMass = design.recovery.mass;

  const dryMass = noseMass + bodyMass + bottleMass + finMass + nozzleMass + recoveryMass;

  // Water mass (density = 1000 kg/m³)
  const waterVolumeM3 = design.waterVolume;
  const waterMass = waterVolumeM3 * 1000;

  const totalMass = dryMass + waterMass;

  // Internal volume estimation (cylindrical approximation)
  const internalRadius = design.bodyTube.geometry.innerDiameter / 2;
  const bodyInternalVolume = Math.PI * Math.pow(internalRadius, 2) * bodyLength;
  const bottleVolume = design.bottle.geometry.volume / 1000; // liters to m³
  const estimatedInternalVolume = bodyInternalVolume + bottleVolume;

  // Water fill percentage (of bottle capacity)
  const waterFillPercentage =
    bottleVolume > 0 ? (waterVolumeM3 / bottleVolume) * 100 : 0;

  // Center of gravity estimation (from tail)
  // Simplified: weighted average of component positions
  const totalMoment =
    noseMass * (totalLength - noseLength / 2) +
    bodyMass * (bottleLength + recoveryLength + nozzleLength + bodyLength / 2) +
    bottleMass * (recoveryLength + nozzleLength + bottleLength / 2) +
    finMass * (nozzleLength + design.fins.geometry.position + 0.02) +
    nozzleMass * (nozzleLength / 2) +
    recoveryMass * (nozzleLength + recoveryLength / 2) +
    waterMass * (recoveryLength + nozzleLength + bottleLength / 2);

  const centerOfGravity = totalMass > 0 ? totalMoment / totalMass : 0;

  // Stability margin (placeholder - would need center of pressure)
  const stabilityMargin = 0; // TODO: Calculate center of pressure

  // Aspect ratio
  const aspectRatio = bodyDiameter > 0 ? totalLength / bodyDiameter : 0;

  return {
    totalLength,
    bodyDiameter,
    noseLength,
    bodyLength,
    crossSectionalArea,
    totalMass,
    dryMass,
    waterMass,
    estimatedInternalVolume,
    waterFillPercentage,
    centerOfGravity,
    stabilityMargin,
    aspectRatio,
    finenessRatio: aspectRatio,
  };
}

// ── Validation ───────────────────────────────────────────────────

export function validateDesign(
  design: RocketDesignState
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const calc = calculateRocketProperties(design);

  // Physical impossibilities (errors)
  if (design.bodyTube.geometry.outerDiameter <= design.bodyTube.geometry.innerDiameter) {
    warnings.push({
      id: "body-diameter-invalid",
      type: "error",
      message: "Body outer diameter must be greater than inner diameter",
      component: "bodyTube",
    });
  }

  if (design.nozzle.geometry.throatDiameter > design.bottle.geometry.diameter) {
    warnings.push({
      id: "nozzle-too-large",
      type: "error",
      message: "Nozzle diameter cannot exceed bottle diameter",
      component: "nozzle",
    });
  }

  if (design.nozzle.geometry.throatDiameter <= 0) {
    warnings.push({
      id: "nozzle-zero",
      type: "error",
      message: "Nozzle diameter must be positive",
      component: "nozzle",
    });
  }

  if (design.noseCone.geometry.length <= 0) {
    warnings.push({
      id: "nose-zero",
      type: "error",
      message: "Nose cone length must be positive",
      component: "noseCone",
    });
  }

  if (design.bodyTube.geometry.length <= 0) {
    warnings.push({
      id: "body-zero",
      type: "error",
      message: "Body tube length must be positive",
      component: "bodyTube",
    });
  }

  // Engineering warnings
  if (calc.waterFillPercentage > 60) {
    warnings.push({
      id: "water-high",
      type: "warning",
      message: `Water fill at ${calc.waterFillPercentage.toFixed(0)}% — optimal is 25-40%`,
    });
  }

  if (calc.waterFillPercentage < 10 && design.waterVolume > 0) {
    warnings.push({
      id: "water-low",
      type: "warning",
      message: `Water fill at ${calc.waterFillPercentage.toFixed(0)}% — rocket may not generate sufficient thrust`,
    });
  }

  if (design.initialPressure > 800000) {
    warnings.push({
      id: "pressure-high",
      type: "warning",
      message: "Pressure exceeds 8 bar — structural integrity may be compromised",
    });
  }

  if (design.initialPressure < 100000) {
    warnings.push({
      id: "pressure-low",
      type: "warning",
      message: "Pressure below 1 bar — rocket may not launch",
    });
  }

  if (calc.aspectRatio > 15) {
    warnings.push({
      id: "aspect-high",
      type: "warning",
      message: "Very high fineness ratio — rocket may be difficult to stabilize",
    });
  }

  if (calc.aspectRatio < 5 && calc.aspectRatio > 0) {
    warnings.push({
      id: "aspect-low",
      type: "warning",
      message: "Low fineness ratio — drag may be significant",
    });
  }

  if (design.fins.geometry.count < 3) {
    warnings.push({
      id: "fins-few",
      type: "warning",
      message: "Fewer than 3 fins may cause instability",
      component: "fins",
    });
  }

  if (design.fins.geometry.height < 0.03) {
    warnings.push({
      id: "fins-small",
      type: "info",
      message: "Small fins may provide insufficient stability",
      component: "fins",
    });
  }

  // Info messages
  if (calc.waterFillPercentage >= 25 && calc.waterFillPercentage <= 40) {
    warnings.push({
      id: "water-optimal",
      type: "info",
      message: "Water fill ratio is in the optimal range (25-40%)",
    });
  }

  return warnings;
}

// ── Unit Conversions ─────────────────────────────────────────────

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
