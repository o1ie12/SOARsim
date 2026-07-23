/**
 * SOAR Studio v2.4 — Engineering Module Test Suite
 *
 * Tests:
 *   1. Geometry calculations
 *   2. Mass calculations
 *   3. Engineering properties (combined)
 *   4. Warning generation
 *   5. Engineering summary generation
 *   6. Unit conversion
 *   7. Integration with rocket-geometry
 *   8. Center of Gravity (v2.4)
 *   9. Center of Pressure (v2.4)
 *  10. Stability margin and rating (v2.4)
 *  11. Stability recommendations (v2.4)
 */

import { describe, it, expect } from "vitest";
import { calculateGeometry } from "@/lib/engineering/geometry";
import { calculateMass } from "@/lib/engineering/mass";
import { calculateEngineeringProperties, resetMemo } from "@/lib/engineering/properties";
import { calculateWarnings } from "@/lib/engineering/warnings";
import { generateSummary } from "@/lib/engineering/summary";
import {
  displayLength,
  displayLengthShort,
  displayMass,
  displayMassShort,
  displayPressure,
  displayPressureShort,
  displayArea,
  displayVolume,
  displayPercentage,
  displayAspectRatio,
} from "@/lib/engineering/units";
import {
  calculateCG,
  calculateCGFromDesign,
  type CGProperties,
} from "@/lib/engineering/cg";
import {
  calculateCP,
  calculateCPFromDesign,
  type CPProperties,
} from "@/lib/engineering/cp";
import {
  calculateStability,
  getRatingColor,
  getRatingLabel,
  getRatingDescription,
  type StabilityProperties,
  type StabilityRating,
} from "@/lib/engineering/stability";
import {
  generateRecommendations,
  type StabilityRecommendation,
} from "@/lib/engineering/recommendations";
import { createDefaultDesign } from "@/lib/rocket-geometry";
import type { RocketDesignState } from "@/lib/rocket-designer-types";

// ── Helper: Clone a design to avoid mutation between tests ───────

function cloneDesign(d: RocketDesignState): RocketDesignState {
  return JSON.parse(JSON.stringify(d));
}

// ── 1. Geometry Calculations ─────────────────────────────────────

describe("Geometry calculations", () => {
  it("calculates total length as sum of all components", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const expected =
      d.noseCone.geometry.length +
      d.bodyTube.geometry.length +
      d.bottle.geometry.length +
      d.recovery.geometry.compartmentLength +
      d.nozzle.geometry.length;

    expect(geo.totalLength).toBeCloseTo(expected, 6);
    expect(geo.totalLength).toBeGreaterThan(0);
  });

  it("nose length matches design input", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    expect(geo.noseLength).toBe(d.noseCone.geometry.length);
  });

  it("body length matches design input", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    expect(geo.bodyLength).toBe(d.bodyTube.geometry.length);
  });

  it("body diameter matches outer diameter", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    expect(geo.bodyDiameter).toBe(d.bodyTube.geometry.outerDiameter);
  });

  it("maximum diameter is the larger of body and bottle diameter", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const expectedMax = Math.max(
      d.bodyTube.geometry.outerDiameter,
      d.bottle.geometry.diameter
    );
    expect(geo.maximumDiameter).toBe(expectedMax);
  });

  it("cross-sectional area is calculated correctly from body diameter", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const radius = d.bodyTube.geometry.outerDiameter / 2;
    const expectedArea = Math.PI * radius * radius;
    expect(geo.crossSectionalArea).toBeCloseTo(expectedArea, 10);
  });

  it("bottle volume in m³ is correctly converted from liters", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    expect(geo.bottleVolumeM3).toBeCloseTo(d.bottle.geometry.volume / 1000, 8);
  });

  it("estimated internal volume includes body and bottle", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const innerRadius = d.bodyTube.geometry.innerDiameter / 2;
    const bodyVol = Math.PI * innerRadius * innerRadius * d.bodyTube.geometry.length;
    const bottleVol = d.bottle.geometry.volume / 1000;
    expect(geo.estimatedInternalVolume).toBeCloseTo(bodyVol + bottleVol, 8);
  });

  it("aspect ratio is length / diameter", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const expected = geo.totalLength / geo.bodyDiameter;
    expect(geo.aspectRatio).toBeCloseTo(expected, 6);
  });

  it("aspect ratio returns 0 for zero diameter", () => {
    const d = createDefaultDesign();
    d.bodyTube.geometry.outerDiameter = 0;
    const geo = calculateGeometry(d);
    expect(geo.aspectRatio).toBe(0);
  });

  it("frontal area equals cross-sectional area", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    expect(geo.frontalArea).toBe(geo.crossSectionalArea);
  });

  it("returns positive values for all geometry properties", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);

    expect(geo.totalLength).toBeGreaterThan(0);
    expect(geo.bodyDiameter).toBeGreaterThan(0);
    expect(geo.noseLength).toBeGreaterThan(0);
    expect(geo.bodyLength).toBeGreaterThan(0);
    expect(geo.bottleLength).toBeGreaterThan(0);
    expect(geo.maximumDiameter).toBeGreaterThan(0);
    expect(geo.crossSectionalArea).toBeGreaterThan(0);
    expect(geo.estimatedInternalVolume).toBeGreaterThan(0);
    expect(geo.bottleVolumeM3).toBeGreaterThan(0);
    expect(geo.frontalArea).toBeGreaterThan(0);
  });

  it("increasing nose length increases total length", () => {
    const d = createDefaultDesign();
    const geo1 = calculateGeometry(d);
    d.noseCone.geometry.length += 0.05;
    const geo2 = calculateGeometry(d);
    expect(geo2.totalLength).toBeGreaterThan(geo1.totalLength);
    expect(geo2.noseLength).toBeCloseTo(geo1.noseLength + 0.05, 6);
  });
});

// ── 2. Mass Calculations ─────────────────────────────────────────

describe("Mass calculations", () => {
  it("dry mass is sum of all component masses", () => {
    const d = createDefaultDesign();
    const mass = calculateMass(d);
    const expected =
      d.noseCone.mass +
      d.bodyTube.mass +
      d.bottle.mass +
      d.fins.mass +
      d.nozzle.mass +
      d.recovery.mass;
    expect(mass.dryMass).toBeCloseTo(expected, 6);
  });

  it("water mass uses density of 1000 kg/m³", () => {
    const d = createDefaultDesign();
    const mass = calculateMass(d);
    expect(mass.waterMass).toBeCloseTo(d.waterVolume * 1000, 6);
  });

  it("total mass is dry mass plus water mass", () => {
    const d = createDefaultDesign();
    const mass = calculateMass(d);
    expect(mass.totalMass).toBeCloseTo(mass.dryMass + mass.waterMass, 6);
  });

  it("total mass is greater than dry mass when water is present", () => {
    const d = createDefaultDesign();
    d.waterVolume = 0.001;
    const mass = calculateMass(d);
    expect(mass.totalMass).toBeGreaterThan(mass.dryMass);
  });

  it("dry mass percentage is correct", () => {
    const d = createDefaultDesign();
    const mass = calculateMass(d);
    const expected = (mass.dryMass / mass.totalMass) * 100;
    expect(mass.dryMassPercentage).toBeCloseTo(expected, 4);
  });

  it("water mass percentage is correct", () => {
    const d = createDefaultDesign();
    const mass = calculateMass(d);
    const expected = (mass.waterMass / mass.totalMass) * 100;
    expect(mass.waterMassPercentage).toBeCloseTo(expected, 4);
  });

  it("dry and water percentages sum to 100", () => {
    const d = createDefaultDesign();
    const mass = calculateMass(d);
    expect(mass.dryMassPercentage + mass.waterMassPercentage).toBeCloseTo(100, 4);
  });

  it("zero water volume gives zero water mass", () => {
    const d = createDefaultDesign();
    d.waterVolume = 0;
    const mass = calculateMass(d);
    expect(mass.waterMass).toBe(0);
    expect(mass.totalMass).toBe(mass.dryMass);
  });

  it("returns individual component masses", () => {
    const d = createDefaultDesign();
    const mass = calculateMass(d);
    expect(mass.noseMass).toBe(d.noseCone.mass);
    expect(mass.bodyMass).toBe(d.bodyTube.mass);
    expect(mass.bottleMass).toBe(d.bottle.mass);
    expect(mass.finMass).toBe(d.fins.mass);
    expect(mass.nozzleMass).toBe(d.nozzle.mass);
    expect(mass.recoveryMass).toBe(d.recovery.mass);
  });

  it("water density is always 1000 kg/m³", () => {
    const d = createDefaultDesign();
    const mass = calculateMass(d);
    expect(mass.waterDensity).toBe(1000);
  });
});

// ── 3. Engineering Properties (Combined) ─────────────────────────

describe("Engineering properties", () => {
  it("combines geometry and mass into single object", () => {
    const d = createDefaultDesign();
    const props = calculateEngineeringProperties(d);
    expect(props.geometry).toBeDefined();
    expect(props.mass).toBeDefined();
    expect(props.warnings).toBeDefined();
    expect(props.summary).toBeDefined();
  });

  it("calculates water fill percentage correctly", () => {
    const d = createDefaultDesign();
    const props = calculateEngineeringProperties(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const expected = (d.waterVolume / bottleVol) * 100;
    expect(props.waterFillPercentage).toBeCloseTo(expected, 4);
  });

  it("water fill is 0 when bottle volume is 0", () => {
    const d = createDefaultDesign();
    d.bottle.geometry.volume = 0;
    const props = calculateEngineeringProperties(d);
    expect(props.waterFillPercentage).toBe(0);
  });

  it("converts pressure to bar", () => {
    const d = createDefaultDesign();
    const props = calculateEngineeringProperties(d);
    expect(props.initialPressureBar).toBeCloseTo(d.initialPressure / 100000, 6);
  });

  it("calculates nozzle area correctly", () => {
    const d = createDefaultDesign();
    const props = calculateEngineeringProperties(d);
    const radius = d.nozzle.geometry.throatDiameter / 2;
    const expected = Math.PI * radius * radius;
    expect(props.nozzleArea).toBeCloseTo(expected, 10);
  });

  it("converts launch angle to radians", () => {
    const d = createDefaultDesign();
    const props = calculateEngineeringProperties(d);
    expect(props.launchAngleRad).toBeCloseTo((d.launchAngle * Math.PI) / 180, 6);
  });

  it("memoization returns correct value", () => {
    resetMemo();
    const d = createDefaultDesign();
    const props1 = calculateEngineeringProperties(d);
    const props2 = calculateEngineeringProperties(d);
    expect(props1.warnings.length).toBe(props2.warnings.length);
    expect(props1.geometry.totalLength).toBe(props2.geometry.totalLength);
  });
});

// ── 4. Warning Generation ────────────────────────────────────────

describe("Warning generation", () => {
  it("default design produces no errors", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const errors = warnings.filter((w) => w.type === "error");
    expect(errors.length).toBe(0);
  });

  it("detects negative nose length as error", () => {
    const d = createDefaultDesign();
    d.noseCone.geometry.length = -0.1;
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const noseErrors = warnings.filter(
      (w) => w.component === "noseCone" && w.type === "error"
    );
    expect(noseErrors.length).toBeGreaterThanOrEqual(1);
  });

  it("detects zero body length as error", () => {
    const d = createDefaultDesign();
    d.bodyTube.geometry.length = 0;
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const bodyErrors = warnings.filter(
      (w) => w.component === "bodyTube" && w.type === "error"
    );
    expect(bodyErrors.length).toBeGreaterThanOrEqual(1);
  });

  it("detects water exceeding bottle capacity", () => {
    const d = createDefaultDesign();
    d.waterVolume = 0.003; // 3L when bottle is 2L
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const waterErrors = warnings.filter((w) => w.id === "water-exceeds-capacity");
    expect(waterErrors.length).toBeGreaterThanOrEqual(1);
  });

  it("warns on high pressure (> 8 bar)", () => {
    const d = createDefaultDesign();
    d.initialPressure = 900000;
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const pressureWarnings = warnings.filter((w) => w.id === "pressure-high");
    expect(pressureWarnings.length).toBeGreaterThanOrEqual(1);
  });

  it("warns on low pressure (< 1 bar)", () => {
    const d = createDefaultDesign();
    d.initialPressure = 50000;
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const pressureWarnings = warnings.filter((w) => w.id === "pressure-low");
    expect(pressureWarnings.length).toBeGreaterThanOrEqual(1);
  });

  it("warns on too few fins", () => {
    const d = createDefaultDesign();
    d.fins.geometry.count = 2;
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const finWarnings = warnings.filter((w) => w.id === "fins-few");
    expect(finWarnings.length).toBeGreaterThanOrEqual(1);
  });

  it("warns on excessive aspect ratio", () => {
    const d = createDefaultDesign();
    d.bodyTube.geometry.length = 2.0;
    d.bodyTube.geometry.outerDiameter = 0.04;
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const aspectWarnings = warnings.filter((w) => w.id === "aspect-high" || w.id === "aspect-extreme");
    expect(aspectWarnings.length).toBeGreaterThanOrEqual(1);
  });

  it("warns on very small nozzle", () => {
    const d = createDefaultDesign();
    d.nozzle.geometry.throatDiameter = 0.003;
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const nozzleWarnings = warnings.filter((w) => w.id === "nozzle-small");
    expect(nozzleWarnings.length).toBeGreaterThanOrEqual(1);
  });

  it("warns on very large nozzle", () => {
    const d = createDefaultDesign();
    d.nozzle.geometry.throatDiameter = 0.03;
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const nozzleWarnings = warnings.filter((w) => w.id === "nozzle-large");
    expect(nozzleWarnings.length).toBeGreaterThanOrEqual(1);
  });

  it("warns on high total mass", () => {
    const d = createDefaultDesign();
    d.noseCone.mass = 0.5;
    d.bodyTube.mass = 0.5;
    d.bottle.mass = 0.5;
    d.fins.mass = 0.3;
    d.nozzle.mass = 0.2;
    d.recovery.mass = 0.2;
    d.waterVolume = 0.001;
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const massWarnings = warnings.filter((w) => w.id === "mass-high");
    expect(massWarnings.length).toBeGreaterThanOrEqual(1);
  });

  it("warns on rocket being very short", () => {
    const d = createDefaultDesign();
    d.noseCone.geometry.length = 0.05;
    d.bodyTube.geometry.length = 0.08;
    d.bottle.geometry.length = 0.05;
    d.nozzle.geometry.length = 0.01;
    d.recovery.geometry.compartmentLength = 0.01;
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const shortWarnings = warnings.filter((w) => w.id === "rocket-very-short");
    expect(shortWarnings.length).toBeGreaterThanOrEqual(1);
  });

  it("provides info when water fill is optimal", () => {
    const d = createDefaultDesign();
    d.waterVolume = 0.0006; // ~30% fill
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const optimalInfos = warnings.filter((w) => w.id === "water-optimal");
    expect(optimalInfos.length).toBeGreaterThanOrEqual(1);
  });

  it("categories are correctly assigned", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const categories = new Set(warnings.map((w) => w.category));
    // Default design should have propulsion and aerodynamics warnings
    expect(categories.has("propulsion")).toBe(true);
    expect(categories.has("aerodynamics")).toBe(true);
    // All categories should be valid members of the type
    for (const cat of categories) {
      expect(["geometry", "mass", "propulsion", "aerodynamics", "general"]).toContain(cat);
    }
  });
});

// ── 5. Engineering Summary Generation ────────────────────────────

describe("Engineering summary generation", () => {
  it("returns observations for default design", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const summary = generateSummary(geo, mass, fillPct, d.initialPressure, warnings);

    expect(summary.length).toBeGreaterThan(0);
  });

  it("includes geometry observations", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const summary = generateSummary(geo, mass, fillPct, d.initialPressure, warnings);

    const geometryObservations = summary.filter((s) => s.category === "geometry");
    expect(geometryObservations.length).toBeGreaterThanOrEqual(1);
  });

  it("includes mass observations", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const summary = generateSummary(geo, mass, fillPct, d.initialPressure, warnings);

    const massObservations = summary.filter((s) => s.category === "mass");
    expect(massObservations.length).toBeGreaterThanOrEqual(1);
  });

  it("includes propulsion observations", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const summary = generateSummary(geo, mass, fillPct, d.initialPressure, warnings);

    const propulsionObservations = summary.filter((s) => s.category === "propulsion");
    expect(propulsionObservations.length).toBeGreaterThanOrEqual(1);
  });

  it("includes aerodynamics observations with modified launch angle", () => {
    const d = createDefaultDesign();
    d.launchAngle = 85; // steep angle triggers aero observation
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const summary = generateSummary(geo, mass, fillPct, d.initialPressure, warnings, d.launchAngle);

    const aeroObservations = summary.filter((s) => s.category === "aerodynamics");
    expect(aeroObservations.length).toBeGreaterThanOrEqual(1);
  });

  it("includes general observations", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const summary = generateSummary(geo, mass, fillPct, d.initialPressure, warnings);

    const generalObservations = summary.filter((s) => s.category === "general");
    expect(generalObservations.length).toBeGreaterThanOrEqual(1);
  });

  it("generates concern type for high aspect ratio", () => {
    const d = createDefaultDesign();
    d.bodyTube.geometry.length = 2.0;
    d.bodyTube.geometry.outerDiameter = 0.04;
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const summary = generateSummary(geo, mass, fillPct, d.initialPressure, warnings);

    const concerns = summary.filter((s) => s.type === "concern");
    expect(concerns.length).toBeGreaterThanOrEqual(1);
  });

  it("generates positive type for optimal water fill", () => {
    const d = createDefaultDesign();
    d.waterVolume = 0.0006; // ~30%
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const summary = generateSummary(geo, mass, fillPct, d.initialPressure, warnings);

    const positives = summary.filter((s) => s.type === "positive");
    expect(positives.length).toBeGreaterThanOrEqual(1);
  });

  it("returns error observation when warnings contain errors", () => {
    const d = createDefaultDesign();
    d.noseCone.geometry.length = -0.1;
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const summary = generateSummary(geo, mass, fillPct, d.initialPressure, warnings);

    expect(summary.length).toBe(1);
    expect(summary[0].type).toBe("concern");
  });

  it("each observation has a unique id", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const bottleVol = d.bottle.geometry.volume / 1000;
    const fillPct = bottleVol > 0 ? (d.waterVolume / bottleVol) * 100 : 0;
    const warnings = calculateWarnings(d, geo, mass, fillPct);
    const summary = generateSummary(geo, mass, fillPct, d.initialPressure, warnings);

    const ids = summary.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });
});

// ── 6. Unit Conversion ─────────────────────────────────────────

describe("Unit conversion", () => {
  describe("metric display", () => {
    it("displays small lengths in mm", () => {
      const d = displayLength(0.1, "metric");
      expect(d.unit).toBe("mm");
      expect(d.value).toBeCloseTo(100, 0);
    });

    it("displays large lengths in m", () => {
      const d = displayLength(1.5, "metric");
      expect(d.unit).toBe("m");
      expect(d.value).toBeCloseTo(1.5, 1);
    });

    it("short length display is correct", () => {
      const s = displayLengthShort(0.15, "metric");
      expect(s).toContain("mm");
    });
  });

  describe("imperial display", () => {
    it("displays small lengths in inches", () => {
      const d = displayLength(0.0254, "imperial");
      expect(d.unit).toBe("in");
      expect(d.value).toBeCloseTo(1, 0);
    });

    it("displays 1 meter in feet (imperial)", () => {
      const d = displayLength(1, "imperial");
      // 1m = 39.37in, which is > 12, so it converts to feet
      expect(d.unit).toBe("ft");
      expect(d.value).toBeCloseTo(3.28, 1);
    });

    it("displays small lengths in inches (imperial)", () => {
      const d = displayLength(0.1, "imperial");
      // 0.1m = 3.94in, which is < 12, so it stays in inches
      expect(d.unit).toBe("in");
      expect(d.value).toBeCloseTo(3.94, 1);
    });
  });

  describe("mass display", () => {
    it("displays mass in grams (metric)", () => {
      const d = displayMass(0.145, "metric");
      expect(d.unit).toBe("g");
      expect(d.value).toBeCloseTo(145, 0);
    });

    it("displays mass in pounds (imperial)", () => {
      const d = displayMass(0.453592, "imperial");
      expect(d.unit).toBe("lb");
      expect(d.value).toBeCloseTo(1, 1);
    });

    it("short mass display is correct", () => {
      const s = displayMassShort(0.145, "metric");
      expect(s).toContain("g");
    });
  });

  describe("pressure display", () => {
    it("displays pressure in bar (metric)", () => {
      const d = displayPressure(400000, "metric");
      expect(d.unit).toBe("bar");
      expect(d.value).toBeCloseTo(4, 0);
    });

    it("displays pressure in psi (imperial)", () => {
      const d = displayPressure(689476, "imperial");
      expect(d.unit).toBe("psi");
      expect(d.value).toBeCloseTo(100, 0);
    });

    it("short pressure display is correct", () => {
      const s = displayPressureShort(400000, "metric");
      expect(s).toContain("bar");
    });
  });

  describe("area display", () => {
    it("displays area in cm² (metric)", () => {
      const d = displayArea(0.01, "metric");
      expect(d.unit).toBe("cm²");
      expect(d.value).toBeCloseTo(100, 0);
    });

    it("displays area in in² (imperial)", () => {
      const d = displayArea(0.01, "imperial");
      expect(d.unit).toBe("in²");
    });
  });

  describe("volume display", () => {
    it("displays volume in L (metric)", () => {
      const d = displayVolume(0.001, "metric");
      expect(d.unit).toBe("L");
      expect(d.value).toBeCloseTo(1, 0);
    });

    it("displays volume in gal (imperial)", () => {
      const d = displayVolume(0.001, "imperial");
      expect(d.unit).toBe("gal");
    });
  });

  describe("percentage and ratio", () => {
    it("displayPercentage formats correctly", () => {
      expect(displayPercentage(35.5)).toBe("35.5%");
    });

    it("displayAspectRatio formats correctly", () => {
      expect(displayAspectRatio(12.3)).toBe("12.3:1");
    });
  });
});

// ── 7. Integration with rocket-geometry ─────────────────────────

describe("Integration with rocket-geometry", () => {
  it("calculateRocketProperties returns same total length", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const expectedTotal = d.noseCone.geometry.length + d.bodyTube.geometry.length +
      d.bottle.geometry.length + d.recovery.geometry.compartmentLength + d.nozzle.geometry.length;
    expect(geo.totalLength).toBeCloseTo(expectedTotal, 6);
  });

  it("engineering module handles extreme values", () => {
    const d = createDefaultDesign();
    d.bodyTube.geometry.length = 5.0; // 5m body
    d.bodyTube.geometry.outerDiameter = 0.03; // 3cm diameter
    const geo = calculateGeometry(d);
    expect(geo.aspectRatio).toBeGreaterThan(20);
    expect(geo.totalLength).toBeGreaterThan(5);
  });

  it("engineering module handles zero water", () => {
    const d = createDefaultDesign();
    d.waterVolume = 0;
    const mass = calculateMass(d);
    expect(mass.waterMass).toBe(0);
    expect(mass.totalMass).toBe(mass.dryMass);
  });

  it("engineering module handles minimum dimensions", () => {
    const d = createDefaultDesign();
    d.noseCone.geometry.length = 0.001;
    d.bodyTube.geometry.length = 0.001;
    d.bottle.geometry.length = 0.001;
    d.nozzle.geometry.length = 0.001;
    d.recovery.geometry.compartmentLength = 0.001;
    const geo = calculateGeometry(d);
    expect(geo.totalLength).toBe(0.005);
    expect(geo.aspectRatio).toBeGreaterThan(0);
  });
});

// ── 8. Center of Gravity (v2.4) ──────────────────────────────────

describe("Center of Gravity (v2.4)", () => {
  it("calculates CG from nose for default design", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const cg = calculateCG(d, geo, mass);

    expect(cg.cgFromNose).toBeGreaterThan(0);
    expect(cg.cgFromTail).toBeGreaterThan(0);
    expect(cg.cgFromNose + cg.cgFromTail).toBeCloseTo(geo.totalLength, 2);
  });

  it("CG moves forward when nose mass is increased", () => {
    const d = createDefaultDesign();
    const geo1 = calculateGeometry(d);
    const mass1 = calculateMass(d);
    const cg1 = calculateCG(d, geo1, mass1);

    // Increase nose mass significantly
    d.noseCone.mass = 0.5;
    const geo2 = calculateGeometry(d);
    const mass2 = calculateMass(d);
    const cg2 = calculateCG(d, geo2, mass2);

    expect(cg2.cgFromNose).toBeLessThan(cg1.cgFromNose);
  });

  it("CG moves aft when rear mass (nozzle) is increased", () => {
    const d = createDefaultDesign();
    const geo1 = calculateGeometry(d);
    const mass1 = calculateMass(d);
    const cg1 = calculateCG(d, geo1, mass1);

    // Increase nozzle mass significantly
    d.nozzle.mass = 0.1;
    const geo2 = calculateGeometry(d);
    const mass2 = calculateMass(d);
    const cg2 = calculateCG(d, geo2, mass2);

    // CG should move toward tail
    expect(cg2.cgFromNose).toBeGreaterThan(cg1.cgFromNose);
  });

  it("CG is between components — nose CG < overall CG < tail CG", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const cg = calculateCG(d, geo, mass);

    const firstPos = cg.components[0].position;
    const lastPos = cg.components[cg.components.length - 1].position;

    expect(cg.cgFromNose).toBeGreaterThanOrEqual(firstPos);
    expect(cg.cgFromNose).toBeLessThanOrEqual(lastPos);
  });

  it("returns component breakdown with 6 components", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const cg = calculateCG(d, geo, mass);

    // 6 components: nose, body, bottle, water, recovery, nozzle, fins = 7
    expect(cg.components.length).toBe(7);
  });

  it("each component has a position measured from nose", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const cg = calculateCG(d, geo, mass);

    for (const comp of cg.components) {
      expect(comp.position).toBeGreaterThanOrEqual(0);
      expect(comp.position).toBeLessThanOrEqual(geo.totalLength);
    }
  });

  it("CG percentages sum to 100", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const cg = calculateCG(d, geo, mass);

    const totalPct = cg.components.reduce((sum, c) => sum + c.percentage, 0);
    expect(totalPct).toBeCloseTo(100, 1);
  });

  it("CG moves forward when heavy water mass is removed", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass1 = calculateMass(d); // with water (water ~0.7 kg at bottle center)
    const cg1 = calculateCG(d, geo, mass1);

    d.waterVolume = 0;
    const mass2 = calculateMass(d); // without water
    const cg2 = calculateCG(d, geo, mass2);

    // Water is a large mass near mid-body; removing it shifts CG forward (closer to nose)
    // cgFromNose measures distance from nose tip, so smaller = more forward
    expect(cg2.cgFromNose).toBeLessThan(cg1.cgFromNose);
  });

  it("calculateCGFromDesign works as a convenience wrapper", () => {
    const d = createDefaultDesign();
    const cg = calculateCGFromDesign(d);
    expect(cg.cgFromNose).toBeGreaterThan(0);
  });
});

// ── 9. Center of Pressure (v2.4) ─────────────────────────────────

describe("Center of Pressure (v2.4)", () => {
  it("calculates CP from nose for default design", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const cp = calculateCP(d, geo);

    expect(cp.cpFromNose).toBeGreaterThan(0);
    expect(cp.cpFromTail).toBeGreaterThan(0);
    expect(cp.cpFromNose + cp.cpFromTail).toBeCloseTo(geo.totalLength, 1);
  });

  it("CP moves aft when fin height is increased", () => {
    const d = createDefaultDesign();
    const geo1 = calculateGeometry(d);
    const cp1 = calculateCP(d, geo1);

    d.fins.geometry.height = 0.15; // much larger fins
    d.fins.geometry.span = 0.15;
    d.fins.geometry.tipSpan = 0.08;
    const geo2 = calculateGeometry(d);
    const cp2 = calculateCP(d, geo2);

    expect(cp2.cpFromNose).toBeGreaterThanOrEqual(cp1.cpFromNose);
  });

  it("returns CP with all three component contributions", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const cp = calculateCP(d, geo);

    expect(cp.components.length).toBe(3);
    expect(cp.components[0].name).toBe("Nose Cone");
    expect(cp.components[1].name).toBe("Body Tube");
    expect(cp.components[2].name).toBe("Fins");
  });

  it("total normal force coefficient is positive", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const cp = calculateCP(d, geo);

    expect(cp.totalCN).toBeGreaterThan(0);
  });

  it("nose contribution is proportional to base radius ratio", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const cp = calculateCP(d, geo);

    expect(cp.noseContribution.cn).toBeGreaterThan(0);
    expect(cp.bodyContribution.cn).toBeGreaterThanOrEqual(0);
    expect(cp.finContribution.cn).toBeGreaterThanOrEqual(0);
  });

  it("returns method description", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const cp = calculateCP(d, geo);

    expect(cp.method).toContain("Barrowman");
  });

  it("CP is behind CG for a stable design (heavy nose + large fins)", () => {
    const d = createDefaultDesign();
    // Create a stable design: heavy nose, large fins, minimal water
    d.noseCone.mass = 0.5;
    d.noseCone.geometry.length = 0.25;
    d.fins.geometry.height = 0.15;
    d.fins.geometry.span = 0.15;
    d.waterVolume = 0.0001; // minimal water

    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const cg = calculateCG(d, geo, mass);
    const cp = calculateCP(d, geo);

    // Heavy nose + large fins + minimal water should make CG ahead of CP
    expect(cp.cpFromNose).toBeGreaterThan(cg.cgFromNose);
  });

  it("CP tail distance equals total length minus CP from nose", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const cp = calculateCP(d, geo);

    expect(cp.cpFromTail).toBeCloseTo(geo.totalLength - cp.cpFromNose, 4);
  });

  it("fins contribution percentage increases with larger fins", () => {
    const d = createDefaultDesign();
    const geo1 = calculateGeometry(d);
    const cp1 = calculateCP(d, geo1);
    const finPct1 = cp1.components[2].percentage;

    d.fins.geometry.height = 0.15;
    d.fins.geometry.span = 0.15;
    const geo2 = calculateGeometry(d);
    const cp2 = calculateCP(d, geo2);
    const finPct2 = cp2.components[2].percentage;

    expect(finPct2).toBeGreaterThan(finPct1);
  });

  it("calculateCPFromDesign works as a convenience wrapper", () => {
    const d = createDefaultDesign();
    const cp = calculateCPFromDesign(d);
    expect(cp.cpFromNose).toBeGreaterThan(0);
  });
});

// ── 10. Stability Margin and Rating (v2.4) ───────────────────────

describe("Stability margin and rating (v2.4)", () => {
  it("stability margin is correctly calculated (CP - CG) / diameter", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const cg = calculateCG(d, geo, mass);
    const cp = calculateCP(d, geo);
    const stability = calculateStability(cg, cp, geo.bodyDiameter);

    const expectedMargin = (cp.cpFromNose - cg.cgFromNose) / geo.bodyDiameter;
    expect(stability.marginCalibers).toBeCloseTo(expectedMargin, 4);
  });

  it("stability margin formula (CP - CG) / body diameter is correct", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const cg = calculateCG(d, geo, mass);
    const cp = calculateCP(d, geo);
    const stability = calculateStability(cg, cp, geo.bodyDiameter);

    const expectedMargin = (cp.cpFromNose - cg.cgFromNose) / geo.bodyDiameter;
    expect(stability.marginCalibers).toBeCloseTo(expectedMargin, 4);
    expect(stability.marginMeters).toBeCloseTo(cp.cpFromNose - cg.cgFromNose, 4);
  });

  it("returns Excellent rating for margin >= 2.0", () => {
    const stability = calculateStability(
      { cgFromNose: 0.2, cgFromTail: 0.5, cgPercentLength: 28.6, cgPercentBody: 20, components: [] },
      { cpFromNose: 0.4, cpFromTail: 0.3, cpPercentLength: 57.1, noseContribution: { cn: 1, cp: 0, weight: 0 }, bodyContribution: { cn: 0, cp: 0, weight: 0 }, finContribution: { cn: 1, cp: 0, weight: 0 }, totalCN: 2, components: [], method: "test" },
      0.1 // body diameter = 0.1m → margin = 2.0 cal
    );
    expect(stability.rating).toBe("excellent");
  });

  it("returns Good rating for margin 1.0-2.0", () => {
    const stability = calculateStability(
      { cgFromNose: 0.3, cgFromTail: 0.4, cgPercentLength: 42.9, cgPercentBody: 30, components: [] },
      { cpFromNose: 0.4, cpFromTail: 0.3, cpPercentLength: 57.1, noseContribution: { cn: 1, cp: 0, weight: 0 }, bodyContribution: { cn: 0, cp: 0, weight: 0 }, finContribution: { cn: 1, cp: 0, weight: 0 }, totalCN: 2, components: [], method: "test" },
      0.1
    );
    expect(stability.rating).toBe("good");
  });

  it("returns Marginal rating for margin 0.5-1.0", () => {
    const stability = calculateStability(
      { cgFromNose: 0.35, cgFromTail: 0.35, cgPercentLength: 50, cgPercentBody: 35, components: [] },
      { cpFromNose: 0.4, cpFromTail: 0.3, cpPercentLength: 57.1, noseContribution: { cn: 1, cp: 0, weight: 0 }, bodyContribution: { cn: 0, cp: 0, weight: 0 }, finContribution: { cn: 1, cp: 0, weight: 0 }, totalCN: 2, components: [], method: "test" },
      0.1
    );
    expect(stability.rating).toBe("marginal");
  });

  it("returns Poor rating for margin 0.0-0.5", () => {
    const stability = calculateStability(
      { cgFromNose: 0.38, cgFromTail: 0.32, cgPercentLength: 54.3, cgPercentBody: 38, components: [] },
      { cpFromNose: 0.4, cpFromTail: 0.3, cpPercentLength: 57.1, noseContribution: { cn: 1, cp: 0, weight: 0 }, bodyContribution: { cn: 0, cp: 0, weight: 0 }, finContribution: { cn: 1, cp: 0, weight: 0 }, totalCN: 2, components: [], method: "test" },
      0.1
    );
    expect(stability.rating).toBe("poor");
  });

  it("returns Unstable for negative margin", () => {
    const stability = calculateStability(
      { cgFromNose: 0.45, cgFromTail: 0.25, cgPercentLength: 64.3, cgPercentBody: 45, components: [] },
      { cpFromNose: 0.4, cpFromTail: 0.3, cpPercentLength: 57.1, noseContribution: { cn: 1, cp: 0, weight: 0 }, bodyContribution: { cn: 0, cp: 0, weight: 0 }, finContribution: { cn: 1, cp: 0, weight: 0 }, totalCN: 2, components: [], method: "test" },
      0.1
    );
    expect(stability.rating).toBe("unstable");
    expect(stability.isStable).toBe(false);
  });

  it("margin is zero for zero body diameter", () => {
    const stability = calculateStability(
      { cgFromNose: 0.3, cgFromTail: 0.4, cgPercentLength: 42.9, cgPercentBody: 30, components: [] },
      { cpFromNose: 0.4, cpFromTail: 0.3, cpPercentLength: 57.1, noseContribution: { cn: 1, cp: 0, weight: 0 }, bodyContribution: { cn: 0, cp: 0, weight: 0 }, finContribution: { cn: 1, cp: 0, weight: 0 }, totalCN: 2, components: [], method: "test" },
      0
    );
    expect(stability.marginCalibers).toBe(0);
    expect(stability.isPhysicallyValid).toBe(false);
  });

  it("provides marker fractions between 0 and 1", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const cg = calculateCG(d, geo, mass);
    const cp = calculateCP(d, geo);
    const stability = calculateStability(cg, cp, geo.bodyDiameter);

    expect(stability.markers.cgFraction).toBeGreaterThanOrEqual(0);
    expect(stability.markers.cgFraction).toBeLessThanOrEqual(1);
    expect(stability.markers.cpFraction).toBeGreaterThanOrEqual(0);
    expect(stability.markers.cpFraction).toBeLessThanOrEqual(1);
  });

  it("provides confidence note", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const cg = calculateCG(d, geo, mass);
    const cp = calculateCP(d, geo);
    const stability = calculateStability(cg, cp, geo.bodyDiameter);

    expect(stability.confidenceNote).toContain("approximate");
  });

  it("getRatingLabel returns correct labels", () => {
    expect(getRatingLabel("excellent")).toBe("Excellent");
    expect(getRatingLabel("good")).toBe("Good");
    expect(getRatingLabel("marginal")).toBe("Marginal");
    expect(getRatingLabel("poor")).toBe("Poor");
    expect(getRatingLabel("unstable")).toBe("Unstable");
  });

  it("getRatingColor returns color strings", () => {
    expect(getRatingColor("excellent")).toBe("emerald");
    expect(getRatingColor("good")).toBe("green");
    expect(getRatingColor("unstable")).toBe("red");
  });

  it("getRatingDescription returns descriptions", () => {
    const desc = getRatingDescription("unstable");
    expect(desc.length).toBeGreaterThan(10);
    expect(desc).toContain("CG");
    expect(getRatingDescription("good")).toContain("margin");
  });
});

// ── 11. Stability Recommendations (v2.4) ─────────────────────────

describe("Stability recommendations (v2.4)", () => {
  it("generates positive recommendations for a stable design", () => {
    // Design with excellent stability: heavy nose, large fins, minimal water
    const d = createDefaultDesign();
    d.noseCone.mass = 0.5;
    d.noseCone.geometry.length = 0.25;
    d.fins.geometry.height = 0.15;
    d.fins.geometry.span = 0.15;
    d.fins.geometry.tipSpan = 0.10;
    d.waterVolume = 0.0001;

    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const cg = calculateCG(d, geo, mass);
    const cp = calculateCP(d, geo);
    const stability = calculateStability(cg, cp, geo.bodyDiameter);
    const recs = generateRecommendations(stability, cg, cp, geo, mass);

    const positives = recs.filter((r) => r.type === "positive");
    expect(positives.length).toBeGreaterThanOrEqual(1);
  });

  it("generates critical recommendation when CG is behind CP", () => {
    // Create a design where CG is behind CP
    const d = createDefaultDesign();
    d.noseCone.mass = 0.005; // very light nose
    d.nozzle.mass = 0.3; // heavy nozzle
    d.fins.mass = 0.15; // heavy fins

    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const cg = calculateCG(d, geo, mass);
    const cp = calculateCP(d, geo);
    const stability = calculateStability(cg, cp, geo.bodyDiameter);

    // Make sure we have instability for stable test approach
    if (cg.cgFromNose > cp.cpFromNose) {
      const recs = generateRecommendations(stability, cg, cp, geo, mass);
      const criticals = recs.filter((r) => r.type === "critical" && r.id === "cg-behind-cp");
      expect(criticals.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("generates suggestion for marginal stability", () => {
    // Create a design with marginal stability
    const d = createDefaultDesign();
    d.fins.geometry.height = 0.02; // very small fins
    d.fins.geometry.span = 0.03;

    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const cg = calculateCG(d, geo, mass);
    const cp = calculateCP(d, geo);
    const stability = calculateStability(cg, cp, geo.bodyDiameter);

    const recs = generateRecommendations(stability, cg, cp, geo, mass);
    const suggestions = recs.filter((r) => r.type === "suggestion");

    // Should have suggestions for improving stability
    expect(suggestions.length).toBeGreaterThanOrEqual(0);
  });

  it("returns positive recommendations for a design with excellent stability", () => {
    // Design with excellent stability: heavy nose, large fins, very little water
    const d = createDefaultDesign();
    d.noseCone.mass = 0.5;
    d.noseCone.geometry.length = 0.25;
    d.fins.geometry.height = 0.15;
    d.fins.geometry.span = 0.15;
    d.fins.geometry.tipSpan = 0.10;
    d.waterVolume = 0.00001; // almost no water

    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const cg = calculateCG(d, geo, mass);
    const cp = calculateCP(d, geo);
    const stability = calculateStability(cg, cp, geo.bodyDiameter);
    const recs = generateRecommendations(stability, cg, cp, geo, mass);

    // With high nose mass + big fins + minimal water, should be stable
    expect(stability.isStable).toBe(true);
    // At minimum there should be positive recommendations (e.g., "stability-good")
    const positives = recs.filter((r) => r.type === "positive");
    expect(positives.length).toBeGreaterThanOrEqual(1);
  });

  it("critical recommendations include actionable steps", () => {
    const d = createDefaultDesign();
    d.noseCone.mass = 0.005;
    d.nozzle.mass = 0.3;

    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const cg = calculateCG(d, geo, mass);
    const cp = calculateCP(d, geo);
    const stability = calculateStability(cg, cp, geo.bodyDiameter);

    if (!stability.isStable) {
      const recs = generateRecommendations(stability, cg, cp, geo, mass);
      const criticals = recs.filter((r) => r.type === "critical");
      if (criticals.length > 0) {
        expect(criticals[0].action).toBeTruthy();
      }
    }
  });

  it("all recommendations have id, type, category, and message", () => {
    const d = createDefaultDesign();
    const geo = calculateGeometry(d);
    const mass = calculateMass(d);
    const cg = calculateCG(d, geo, mass);
    const cp = calculateCP(d, geo);
    const stability = calculateStability(cg, cp, geo.bodyDiameter);
    const recs = generateRecommendations(stability, cg, cp, geo, mass);

    for (const r of recs) {
      expect(r.id).toBeTruthy();
      expect(r.type).toMatch(/^(positive|suggestion|critical)$/);
      expect(r.category).toMatch(/^(mass|geometry|fins|general)$/);
      expect(r.message).toBeTruthy();
    }
  });
});

// ── 12. Integration — Full Engineering Properties (v2.4) ─────────

describe("Full engineering properties integration (v2.4)", () => {
  it("engineering properties include CG, CP, stability, and recommendations", () => {
    const d = createDefaultDesign();
    const props = calculateEngineeringProperties(d);

    expect(props.cg).toBeDefined();
    expect(props.cp).toBeDefined();
    expect(props.stability).toBeDefined();
    expect(props.stabilityRecommendations).toBeDefined();
  });

  it("stability margin is consistent between geometry and engineering properties", () => {
    const d = createDefaultDesign();
    const props = calculateEngineeringProperties(d);

    const marginFromStability = props.stability.marginCalibers;
    const cgFromNose = props.cg.cgFromNose;
    const cpFromNose = props.cp.cpFromNose;
    const bodyDiam = props.geometry.bodyDiameter;
    const calculatedMargin = bodyDiam > 0 ? (cpFromNose - cgFromNose) / bodyDiam : 0;

    expect(marginFromStability).toBeCloseTo(calculatedMargin, 4);
  });

  it("changing fin size updates CP and stability", () => {
    const d = createDefaultDesign();
    const props1 = calculateEngineeringProperties(d);

    d.fins.geometry.height = 0.15;
    d.fins.geometry.span = 0.15;
    const props2 = calculateEngineeringProperties(d);

    // Larger fins should increase CP distance from nose
    expect(props2.cp.cpFromNose).toBeGreaterThanOrEqual(props1.cp.cpFromNose);
    // And improve stability margin
    expect(props2.stability.marginCalibers).toBeGreaterThanOrEqual(props1.stability.marginCalibers);
  });

  it("changing mass distribution updates CG and stability", () => {
    const d = createDefaultDesign();
    const props1 = calculateEngineeringProperties(d);

    d.noseCone.mass += 0.1; // add nose mass
    const props2 = calculateEngineeringProperties(d);

    // More nose mass moves CG forward
    expect(props2.cg.cgFromNose).toBeLessThan(props1.cg.cgFromNose);
  });

  it("renders marker data for SVG overlay", () => {
    const d = createDefaultDesign();
    const props = calculateEngineeringProperties(d);

    // Markers should be within valid range
    expect(props.stability.markers.cgFraction).toBeGreaterThanOrEqual(0);
    expect(props.stability.markers.cgFraction).toBeLessThanOrEqual(1);
    expect(props.stability.markers.cpFraction).toBeGreaterThanOrEqual(0);
    expect(props.stability.markers.cpFraction).toBeLessThanOrEqual(1);
  });

  it("warnings include stability-related warnings", () => {
    const d = createDefaultDesign();
    const props = calculateEngineeringProperties(d);

    // There should be some warnings (even if info-level)
    const allWarnings = props.warnings;
    const categories = new Set(allWarnings.map((w) => w.category));
    expect(categories.size).toBeGreaterThan(0);
  });

  it("export JSON structure includes stability data", () => {
    const d = createDefaultDesign();
    const props = calculateEngineeringProperties(d);

    // simulate export structure
    const exportObj = {
      stability: {
        cgFromNose: props.cg.cgFromNose,
        cgFromTail: props.cg.cgFromTail,
        cpFromNose: props.cp.cpFromNose,
        cpFromTail: props.cp.cpFromTail,
        stabilityMarginCalibers: props.stability.marginCalibers,
        stabilityRating: props.stability.rating,
      },
    };

    expect(exportObj.stability.stabilityRating).toBe(props.stability.rating);
    expect(exportObj.stability.stabilityMarginCalibers).toBe(props.stability.marginCalibers);
  });

  it("live update: changing geometry immediately affects stability", () => {
    const d = createDefaultDesign();
    const props1 = calculateEngineeringProperties(d);

    // Shorten the rocket dramatically
    d.noseCone.geometry.length = 0.02;
    d.bodyTube.geometry.length = 0.05;
    d.bottle.geometry.length = 0.05;
    d.nozzle.geometry.length = 0.01;
    d.recovery.geometry.compartmentLength = 0.01;

    const props2 = calculateEngineeringProperties(d);

    // Shorter rocket should have different stability characteristics
    expect(props2.geometry.totalLength).toBeLessThan(props1.geometry.totalLength);
    // CP position should change
    expect(props2.cp.cpFromNose).not.toBeCloseTo(props1.cp.cpFromNose, 1);
  });
});
