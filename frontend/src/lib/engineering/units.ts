/**
 * SOAR Studio — Engineering Unit System
 *
 * All internal calculations use metric (SI).
 * Unit conversion happens only at display boundaries.
 * Users can switch between Metric and Imperial display.
 */

export type UnitSystem = "metric" | "imperial";

export interface UnitDisplay {
  value: number;
  unit: string;
  label: string;
}

// ── Conversion Factors ───────────────────────────────────────────

const CONVERSIONS = {
  // Length
  mToMm: (m: number) => m * 1000,
  mmToM: (mm: number) => mm / 1000,
  mToIn: (m: number) => m * 39.3701,
  inToM: (in_: number) => in_ / 39.3701,
  mToFt: (m: number) => m * 3.28084,
  ftToM: (ft: number) => ft / 3.28084,

  // Area
  m2ToCm2: (m2: number) => m2 * 10000,
  m2ToIn2: (m2: number) => m2 * 1550.0031,
  m2ToFt2: (m2: number) => m2 * 10.7639,

  // Volume
  m3ToL: (m3: number) => m3 * 1000,
  m3ToGal: (m3: number) => m3 * 264.172,
  m3ToFlOz: (m3: number) => m3 * 33814.0,
  LToM3: (l: number) => l / 1000,
  galToM3: (gal: number) => gal / 264.172,

  // Mass
  kgToG: (kg: number) => kg * 1000,
  kgToLb: (kg: number) => kg * 2.20462,
  kgToOz: (kg: number) => kg * 35.274,
  gToKg: (g: number) => g / 1000,
  lbToKg: (lb: number) => lb / 2.20462,

  // Pressure
  paToBar: (pa: number) => pa / 100000,
  paToPsi: (pa: number) => pa / 6894.76,
  barToPa: (bar: number) => bar * 100000,
  psiToPa: (psi: number) => psi * 6894.76,

  // Temperature
  kToC: (k: number) => k - 273.15,
  kToF: (k: number) => (k - 273.15) * 9 / 5 + 32,
  cToK: (c: number) => c + 273.15,
};

// ── Length Display ───────────────────────────────────────────────

export function displayLength(meters: number, system: UnitSystem): UnitDisplay {
  if (system === "imperial") {
    const inches = CONVERSIONS.mToIn(meters);
    if (inches >= 12) {
      const feet = CONVERSIONS.mToFt(meters);
      return { value: feet, unit: "ft", label: `${feet.toFixed(2)} ft` };
    }
    return { value: inches, unit: "in", label: `${inches.toFixed(2)} in` };
  }
  const mm = CONVERSIONS.mToMm(meters);
  if (mm >= 1000) {
    return { value: meters, unit: "m", label: `${meters.toFixed(3)} m` };
  }
  return { value: mm, unit: "mm", label: `${mm.toFixed(0)} mm` };
}

export function displayLengthShort(meters: number, system: UnitSystem): string {
  const d = displayLength(meters, system);
  return `${formatValue(d.value, 1)} ${d.unit}`;
}

// ── Diameter Display ─────────────────────────────────────────────

export function displayDiameter(meters: number, system: UnitSystem): string {
  if (system === "imperial") {
    const inches = CONVERSIONS.mToIn(meters);
    return `⌀${inches.toFixed(2)} in`;
  }
  const mm = CONVERSIONS.mToMm(meters);
  return `⌀${mm.toFixed(0)} mm`;
}

// ── Area Display ─────────────────────────────────────────────────

export function displayArea(m2: number, system: UnitSystem): UnitDisplay {
  if (system === "imperial") {
    const in2 = CONVERSIONS.m2ToIn2(m2);
    if (in2 >= 144) {
      return { value: CONVERSIONS.m2ToFt2(m2), unit: "ft²", label: `${CONVERSIONS.m2ToFt2(m2).toFixed(3)} ft²` };
    }
    return { value: in2, unit: "in²", label: `${in2.toFixed(2)} in²` };
  }
  const cm2 = CONVERSIONS.m2ToCm2(m2);
  return { value: cm2, unit: "cm²", label: `${cm2.toFixed(2)} cm²` };
}

// ── Volume Display ───────────────────────────────────────────────

export function displayVolume(m3: number, system: UnitSystem): UnitDisplay {
  if (system === "imperial") {
    const gal = CONVERSIONS.m3ToGal(m3);
    return { value: gal, unit: "gal", label: `${gal.toFixed(3)} gal` };
  }
  const liters = CONVERSIONS.m3ToL(m3);
  return { value: liters, unit: "L", label: `${liters.toFixed(2)} L` };
}

// ── Mass Display ─────────────────────────────────────────────────

export function displayMass(kg: number, system: UnitSystem): UnitDisplay {
  if (system === "imperial") {
    const lb = CONVERSIONS.kgToLb(kg);
    return { value: lb, unit: "lb", label: `${lb.toFixed(3)} lb` };
  }
  const g = CONVERSIONS.kgToG(kg);
  return { value: g, unit: "g", label: `${g.toFixed(1)} g` };
}

export function displayMassShort(kg: number, system: UnitSystem): string {
  const d = displayMass(kg, system);
  return `${formatValue(d.value, 1)} ${d.unit}`;
}

// ── Pressure Display ─────────────────────────────────────────────

export function displayPressure(pa: number, system: UnitSystem): UnitDisplay {
  if (system === "imperial") {
    const psi = CONVERSIONS.paToPsi(pa);
    return { value: psi, unit: "psi", label: `${psi.toFixed(1)} psi` };
  }
  const bar = CONVERSIONS.paToBar(pa);
  return { value: bar, unit: "bar", label: `${bar.toFixed(2)} bar` };
}

export function displayPressureShort(pa: number, system: UnitSystem): string {
  const d = displayPressure(pa, system);
  return `${formatValue(d.value, 1)} ${d.unit}`;
}

// ── Percentage Display ───────────────────────────────────────────

export function displayPercentage(fraction: number): string {
  return `${fraction.toFixed(1)}%`;
}

// ── Aspect Ratio Display ─────────────────────────────────────────

export function displayAspectRatio(ratio: number): string {
  return `${ratio.toFixed(1)}:1`;
}

// ── Format Helper ────────────────────────────────────────────────

export function formatValue(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

// ── SI to Display conversion for common engineering values ───────

export interface EngineeringDisplay {
  label: string;
  value: string;
  unit: string;
  rawValue: number;
}

export function toEngineeringDisplay(
  label: string,
  siValue: number,
  system: UnitSystem,
  type: "length" | "diameter" | "area" | "volume" | "mass" | "pressure" | "percentage" | "ratio" | "dimensionless"
): EngineeringDisplay {
  switch (type) {
    case "length": {
      const d = displayLength(siValue, system);
      return { label, value: formatValue(d.value, 1), unit: d.unit, rawValue: d.value };
    }
    case "diameter": {
      const d = displayLength(siValue, system);
      return { label, value: formatValue(d.value, 1), unit: d.unit, rawValue: d.value };
    }
    case "area": {
      const d = displayArea(siValue, system);
      return { label, value: formatValue(d.value, 2), unit: d.unit, rawValue: d.value };
    }
    case "volume": {
      const d = displayVolume(siValue, system);
      return { label, value: formatValue(d.value, 2), unit: d.unit, rawValue: d.value };
    }
    case "mass": {
      const d = displayMass(siValue, system);
      return { label, value: formatValue(d.value, 1), unit: d.unit, rawValue: d.value };
    }
    case "pressure": {
      const d = displayPressure(siValue, system);
      return { label, value: formatValue(d.value, 1), unit: d.unit, rawValue: d.value };
    }
    case "percentage":
      return { label, value: formatValue(siValue, 1), unit: "%", rawValue: siValue };
    case "ratio":
      return { label, value: formatValue(siValue, 1), unit: "", rawValue: siValue };
    case "dimensionless":
      return { label, value: formatValue(siValue, 2), unit: "", rawValue: siValue };
  }
}

export const UNITS = {
  metric: {
    length: "mm",
    lengthLarge: "m",
    diameter: "mm",
    area: "cm²",
    volume: "L",
    mass: "g",
    massLarge: "kg",
    pressure: "bar",
    temperature: "°C",
  },
  imperial: {
    length: "in",
    lengthLarge: "ft",
    diameter: "in",
    area: "in²",
    volume: "gal",
    mass: "oz",
    massLarge: "lb",
    pressure: "psi",
    temperature: "°F",
  },
} as const;
