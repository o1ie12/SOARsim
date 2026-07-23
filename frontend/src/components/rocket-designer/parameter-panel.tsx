/**
 * SOAR Studio — Rocket Designer Parameter Panel
 *
 * Grouped cards with inline-validated numeric inputs.
 * Every change dispatches to the rocket model, which immediately
 * updates the SVG canvas (single source of truth).
 */

"use client";

import { useCallback } from "react";
import { useRocketDesigner } from "./rocket-designer-context";
import NumericInput from "./numeric-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler, Weight, Wind, Droplets, Target } from "lucide-react";

// ── Field descriptor ─────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  precision: number;
}

// ── Section definitions ──────────────────────────────────────────

const GEOMETRY_FIELDS: FieldDef[] = [
  { key: "noseLength", label: "Nose Length", unit: "mm", min: 20, max: 400, step: 1, precision: 0 },
  { key: "bodyLength", label: "Body Length", unit: "mm", min: 50, max: 600, step: 1, precision: 0 },
  { key: "bodyDiameter", label: "Body Diameter", unit: "mm", min: 30, max: 200, step: 1, precision: 0 },
  { key: "bottleLength", label: "Bottle Section", unit: "mm", min: 50, max: 500, step: 1, precision: 0 },
];

const MASS_FIELDS: FieldDef[] = [
  { key: "dryMass", label: "Dry Mass", unit: "g", min: 10, max: 2000, step: 1, precision: 0 },
];

const AERO_FIELDS: FieldDef[] = [
  { key: "dragCoefficient", label: "Drag Coefficient", unit: "Cd", min: 0.1, max: 1.5, step: 0.01, precision: 2 },
];

const PROPULSION_FIELDS: FieldDef[] = [
  { key: "bottleVolume", label: "Bottle Volume", unit: "L", min: 0.5, max: 5.0, step: 0.1, precision: 1 },
  { key: "waterVolume", label: "Water Volume", unit: "L", min: 0, max: 4.5, step: 0.05, precision: 2 },
  { key: "initialPressure", label: "Initial Pressure", unit: "bar", min: 1, max: 12, step: 0.5, precision: 1 },
  { key: "nozzleDiameter", label: "Nozzle Diameter", unit: "mm", min: 3, max: 30, step: 0.5, precision: 1 },
];

const LAUNCH_FIELDS: FieldDef[] = [
  { key: "launchAngle", label: "Launch Angle", unit: "°", min: 0, max: 90, step: 1, precision: 0 },
];

// ── Value getter ─────────────────────────────────────────────────

function getValue(design: ReturnType<typeof useRocketDesigner>["state"]["current"], key: string): number {
  switch (key) {
    case "noseLength": return design.noseCone.geometry.length * 1000;
    case "bodyLength": return design.bodyTube.geometry.length * 1000;
    case "bodyDiameter": return design.bodyTube.geometry.outerDiameter * 1000;
    case "bottleLength": return design.bottle.geometry.length * 1000;
    case "dryMass": return (design.noseCone.mass + design.bodyTube.mass + design.bottle.mass + design.fins.mass + design.nozzle.mass + design.recovery.mass) * 1000;
    case "dragCoefficient": return design.dragCoefficient;
    case "bottleVolume": return design.bottle.geometry.volume;
    case "waterVolume": return design.waterVolume * 1000;
    case "initialPressure": return design.initialPressure / 100000;
    case "nozzleDiameter": return design.nozzle.geometry.throatDiameter * 1000;
    case "launchAngle": return design.launchAngle;
    default: return 0;
  }
}

// ── Value setter ─────────────────────────────────────────────────

function setValue(
  dispatch: ReturnType<typeof useRocketDesigner>["dispatch"],
  key: string,
  value: number,
): void {
  // Normalise display units back to SI
  const mm = (v: number) => v / 1000;
  const L = (v: number) => v / 1000;
  const bar = (v: number) => v * 100000;

  switch (key) {
    case "noseLength":
      dispatch({ type: "SET_NOSE_CONE", payload: { length: mm(value) } });
      break;
    case "bodyLength":
      dispatch({ type: "SET_BODY_TUBE", payload: { length: mm(value) } });
      break;
    case "bodyDiameter":
      dispatch({
        type: "SET_BODY_TUBE",
        payload: {
          outerDiameter: mm(value),
          innerDiameter: Math.max(0.001, mm(value) - 0.003),
        },
      });
      break;
    case "bottleLength":
      dispatch({ type: "SET_BOTTLE", payload: { length: mm(value) } });
      break;
    case "dryMass":
      // Dry mass is a derived (computed) property — not directly editable.
      // Edits are deferred to v2.2 when per-component mass distribution is implemented.
      break;
    case "dragCoefficient":
      dispatch({ type: "SET_DRAG_COEFFICIENT", payload: value });
      break;
    case "bottleVolume":
      dispatch({ type: "SET_BOTTLE", payload: { volume: value } });
      break;
    case "waterVolume":
      dispatch({ type: "SET_WATER_VOLUME", payload: L(value) });
      break;
    case "initialPressure":
      dispatch({ type: "SET_INITIAL_PRESSURE", payload: bar(value) });
      break;
    case "nozzleDiameter":
      dispatch({
        type: "SET_NOZZLE",
        payload: { throatDiameter: mm(value), exitDiameter: mm(value) },
      });
      break;
    case "launchAngle":
      dispatch({ type: "SET_LAUNCH_ANGLE", payload: value });
      break;
  }
}

// ── Validation errors ────────────────────────────────────────────

function getError(
  key: string,
  value: number,
  design: ReturnType<typeof useRocketDesigner>["state"]["current"],
): string | null {
  switch (key) {
    case "waterVolume": {
      const bottleL = design.bottle.geometry.volume;
      if (value > bottleL) return `Water volume (${value.toFixed(2)}L) exceeds bottle capacity (${bottleL.toFixed(1)}L)`;
      if (value < 0) return "Water volume cannot be negative";
      return null;
    }
    case "bodyDiameter": {
      const outerM = value / 1000;
      const innerM = design.bodyTube.geometry.innerDiameter;
      if (outerM <= innerM) return `Outer diameter (${value.toFixed(0)}mm) must exceed inner diameter`;
      return null;
    }
    case "nozzleDiameter": {
      const bottleDM = design.bottle.geometry.diameter * 1000;
      if (value > bottleDM) return `Nozzle diameter (${value.toFixed(1)}mm) exceeds bottle diameter (${bottleDM.toFixed(0)}mm)`;
      if (value <= 0) return "Nozzle diameter must be positive";
      return null;
    }
    case "bottleVolume": {
      if (value <= 0) return "Bottle volume must be positive";
      return null;
    }
    case "noseLength":
    case "bodyLength":
    case "bottleLength": {
      if (value <= 0) return "Length must be positive";
      return null;
    }
    default:
      return null;
  }
}

// ── Section component ────────────────────────────────────────────

function ParameterSection({
  title,
  icon,
  fields,
}: {
  title: string;
  icon: React.ReactNode;
  fields: FieldDef[];
}) {
  const { state, dispatch } = useRocketDesigner();
  const design = state.current;

  const handleChange = useCallback(
    (key: string, value: number) => {
      setValue(dispatch, key, value);
    },
    [dispatch],
  );

  const { calculations } = useRocketDesigner();

  // Compute overall length for the Geometry section
  const isGeometrySection = fields.some((f) => f.key === "noseLength");

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isGeometrySection && (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
            <span className="text-sm text-muted-foreground">Overall Length</span>
            <span className="text-sm font-mono font-medium tabular-nums">
              {(calculations.totalLength * 1000).toFixed(0)} mm
            </span>
          </div>
        )}
        {fields.map((field) => (
          <NumericInput
            key={field.key}
            label={field.label}
            unit={field.unit}
            value={getValue(design, field.key)}
            min={field.min}
            max={field.max}
            step={field.step}
            precision={field.precision}
            error={getError(field.key, getValue(design, field.key), design)}
            onChange={(v) => handleChange(field.key, v)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ── Main Panel ───────────────────────────────────────────────────

export default function ParameterPanel() {
  return (
    <div className="space-y-4">
      {/* Rocket name / description */}
      <RocketNameCard />

      <ParameterSection
        title="Rocket Geometry"
        icon={<Ruler className="h-4 w-4" />}
        fields={GEOMETRY_FIELDS}
      />

      <ParameterSection
        title="Mass"
        icon={<Weight className="h-4 w-4" />}
        fields={MASS_FIELDS}
      />

      <ParameterSection
        title="Aerodynamics"
        icon={<Wind className="h-4 w-4" />}
        fields={AERO_FIELDS}
      />

      <ParameterSection
        title="Propulsion"
        icon={<Droplets className="h-4 w-4" />}
        fields={PROPULSION_FIELDS}
      />

      <ParameterSection
        title="Launch"
        icon={<Target className="h-4 w-4" />}
        fields={LAUNCH_FIELDS}
      />
    </div>
  );
}

// ── Rocket name editor ───────────────────────────────────────────

function RocketNameCard() {
  const { state, dispatch } = useRocketDesigner();
  const design = state.current;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-4 space-y-2">
        <input
          type="text"
          value={design.name}
          onChange={(e) => dispatch({ type: "SET_NAME", payload: e.target.value })}
          className="w-full bg-transparent text-lg font-bold tracking-tight outline-none placeholder:text-muted-foreground"
          placeholder="Rocket name"
          aria-label="Rocket name"
        />
        <input
          type="text"
          value={design.description}
          onChange={(e) => dispatch({ type: "SET_DESCRIPTION", payload: e.target.value })}
          className="w-full bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/60"
          placeholder="Brief description"
          aria-label="Rocket description"
        />
      </CardContent>
    </Card>
  );
}
