/**
 * SOARSim Rocket Designer — Preset Designs
 *
 * Three sample rockets demonstrating different configurations.
 * Presets are deep-copied when selected to avoid mutation.
 */

import { createDefaultDesign, MATERIALS } from "@/lib/rocket-geometry";
import type { RocketDesignState } from "@/lib/rocket-designer-types";

function deepClone(d: RocketDesignState): RocketDesignState {
  return JSON.parse(JSON.stringify(d));
}

function base(name: string, description: string): RocketDesignState {
  const d = createDefaultDesign();
  d.id = `preset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  d.name = name;
  d.description = description;
  const now = new Date().toISOString();
  d.createdAt = now;
  d.modifiedAt = now;
  return d;
}

/**
 * Beginner Water Rocket — Simple, safe, low-pressure.
 * Uses a standard 1.5L soda bottle with minimal modifications.
 */
export function beginnerWaterRocket(): RocketDesignState {
  const d = base(
    "Beginner Water Rocket",
    "A simple, safe water rocket built from a standard 1.5L soda bottle. Ideal for first launches.",
  );

  d.bodyTube.geometry.length = 0.20;
  d.bodyTube.geometry.outerDiameter = 0.065;
  d.bodyTube.geometry.innerDiameter = 0.062;
  d.bodyTube.mass = 0.035;

  d.bottle.geometry.length = 0.28;
  d.bottle.geometry.diameter = 0.105;
  d.bottle.geometry.volume = 2.0;
  d.bottle.mass = 0.050;

  d.noseCone.geometry.length = 0.12;
  d.noseCone.mass = 0.015;

  d.fins.geometry.count = 3;
  d.fins.geometry.height = 0.06;
  d.fins.geometry.span = 0.08;
  d.fins.geometry.tipSpan = 0.04;
  d.fins.geometry.sweep = 0.02;
  d.fins.mass = 0.010;

  d.nozzle.geometry.throatDiameter = 0.013;
  d.nozzle.geometry.exitDiameter = 0.013;
  d.nozzle.geometry.length = 0.025;
  d.nozzle.mass = 0.004;

  d.dragCoefficient = 0.48;
  d.launchAngle = 75;
  d.waterVolume = 0.0006;
  d.initialPressure = 350000;

  return deepClone(d);
}

/**
 * Competition Rocket — Optimised for altitude with higher pressure.
 * Uses a 2L bottle with longer body tube and larger fins.
 */
export function competitionRocket(): RocketDesignState {
  const d = base(
    "Competition Rocket",
    "An altitude-optimised design with a 2L bottle, higher pressure, and larger stabilising fins.",
  );

  d.bodyTube.geometry.length = 0.35;
  d.bodyTube.geometry.outerDiameter = 0.070;
  d.bodyTube.geometry.innerDiameter = 0.066;
  d.bodyTube.mass = 0.055;

  d.bottle.geometry.length = 0.32;
  d.bottle.geometry.diameter = 0.110;
  d.bottle.geometry.volume = 2.5;
  d.bottle.mass = 0.060;

  d.noseCone.geometry.length = 0.18;
  d.noseCone.mass = 0.020;

  d.fins.geometry.count = 4;
  d.fins.geometry.height = 0.10;
  d.fins.geometry.span = 0.12;
  d.fins.geometry.tipSpan = 0.06;
  d.fins.geometry.sweep = 0.04;
  d.fins.mass = 0.018;

  d.nozzle.geometry.throatDiameter = 0.011;
  d.nozzle.geometry.exitDiameter = 0.011;
  d.nozzle.geometry.length = 0.030;
  d.nozzle.mass = 0.005;

  d.recovery.geometry.compartmentLength = 0.06;
  d.recovery.mass = 0.012;

  d.dragCoefficient = 0.42;
  d.launchAngle = 80;
  d.waterVolume = 0.0008;
  d.initialPressure = 600000;

  return deepClone(d);
}

/**
 * Experimental Rocket — High-performance, high-risk.
 * Pushes structural limits with very high pressure and aggressive geometry.
 */
export function experimentalRocket(): RocketDesignState {
  const d = base(
    "Experimental Rocket",
    "A high-performance testbed pushing pressure and geometry limits. Requires careful structural review.",
  );

  d.bodyTube.geometry.length = 0.45;
  d.bodyTube.geometry.outerDiameter = 0.055;
  d.bodyTube.geometry.innerDiameter = 0.051;
  d.bodyTube.mass = 0.065;
  d.bodyTube.material = MATERIALS.carbon;

  d.bottle.geometry.length = 0.35;
  d.bottle.geometry.diameter = 0.095;
  d.bottle.geometry.volume = 3.0;
  d.bottle.mass = 0.070;
  d.bottle.material = MATERIALS.carbon;

  d.noseCone.geometry.length = 0.22;
  d.noseCone.mass = 0.025;
  d.noseCone.material = MATERIALS.carbon;

  d.fins.geometry.count = 4;
  d.fins.geometry.height = 0.12;
  d.fins.geometry.span = 0.14;
  d.fins.geometry.tipSpan = 0.05;
  d.fins.geometry.sweep = 0.05;
  d.fins.mass = 0.015;
  d.fins.material = MATERIALS.plywood;

  d.nozzle.geometry.throatDiameter = 0.009;
  d.nozzle.geometry.exitDiameter = 0.009;
  d.nozzle.geometry.length = 0.035;
  d.nozzle.mass = 0.006;

  d.recovery.geometry.compartmentLength = 0.08;
  d.recovery.mass = 0.015;

  d.dragCoefficient = 0.35;
  d.launchAngle = 85;
  d.waterVolume = 0.0009;
  d.initialPressure = 800000;

  return deepClone(d);
}

/** All presets as a named list. */
export const ALL_PRESETS = [
  { label: "Beginner Water Rocket", value: "beginner", factory: beginnerWaterRocket },
  { label: "Competition Rocket", value: "competition", factory: competitionRocket },
  { label: "Experimental Rocket", value: "experimental", factory: experimentalRocket },
] as const;

export function loadPreset(value: string): RocketDesignState | null {
  const preset = ALL_PRESETS.find((p) => p.value === value);
  return preset ? preset.factory() : null;
}
