/**
 * SOARSim Rocket Designer - Engineering Parameters Panel
 *
 * Displays editable numeric inputs organized by section.
 * Changes sync immediately with the visual editor.
 */

"use client";

import React, { useCallback } from "react";
import { useRocketDesigner } from "./rocket-designer-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Rocket,
  Wind,
  Gauge,
  Droplets,
  Target,
  ChevronRight,
} from "lucide-react";

// ── Field Definitions ────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  section: string;
}

const NOSE_CONE_FIELDS: FieldDef[] = [
  { key: "noseLength", label: "Nose Length", unit: "mm", min: 20, max: 300, step: 1, section: "geometry" },
];

const BODY_FIELDS: FieldDef[] = [
  { key: "bodyLength", label: "Body Length", unit: "mm", min: 50, max: 500, step: 1, section: "geometry" },
  { key: "bodyDiameter", label: "Body Diameter", unit: "mm", min: 30, max: 200, step: 1, section: "geometry" },
];

const BOTTLE_FIELDS: FieldDef[] = [
  { key: "bottleLength", label: "Bottle Length", unit: "mm", min: 50, max: 400, step: 1, section: "geometry" },
  { key: "bottleDiameter", label: "Bottle Diameter", unit: "mm", min: 50, max: 200, step: 1, section: "geometry" },
];

const FIN_FIELDS: FieldDef[] = [
  { key: "finCount", label: "Fin Count", unit: "", min: 2, max: 6, step: 1, section: "geometry" },
  { key: "finHeight", label: "Fin Height", unit: "mm", min: 10, max: 150, step: 1, section: "geometry" },
  { key: "finSpan", label: "Fin Span (root)", unit: "mm", min: 20, max: 200, step: 1, section: "geometry" },
  { key: "finTipSpan", label: "Fin Tip Span", unit: "mm", min: 10, max: 100, step: 1, section: "geometry" },
  { key: "finSweep", label: "Fin Sweep", unit: "mm", min: 0, max: 100, step: 1, section: "geometry" },
];

const NOZZLE_FIELDS: FieldDef[] = [
  { key: "nozzleDiameter", label: "Nozzle Diameter", unit: "mm", min: 3, max: 30, step: 0.5, section: "geometry" },
];

const AERO_FIELDS: FieldDef[] = [
  { key: "dragCoefficient", label: "Drag Coefficient", unit: "Cd", min: 0.1, max: 1.5, step: 0.01, section: "aerodynamics" },
];

const PROPULSION_FIELDS: FieldDef[] = [
  { key: "waterVolume", label: "Water Volume", unit: "L", min: 0, max: 3.0, step: 0.05, section: "propulsion" },
  { key: "initialPressure", label: "Initial Pressure", unit: "bar", min: 1, max: 15, step: 0.5, section: "propulsion" },
];

const LAUNCH_FIELDS: FieldDef[] = [
  { key: "launchAngle", label: "Launch Angle", unit: "°", min: 0, max: 90, step: 1, section: "launch" },
];

// ── Value Getters ────────────────────────────────────────────────

function getFieldValue(design: ReturnType<typeof useRocketDesigner>["state"]["current"], key: string): number {
  switch (key) {
    case "noseLength": return design.noseCone.geometry.length * 1000;
    case "bodyLength": return design.bodyTube.geometry.length * 1000;
    case "bodyDiameter": return design.bodyTube.geometry.outerDiameter * 1000;
    case "bottleLength": return design.bottle.geometry.length * 1000;
    case "bottleDiameter": return design.bottle.geometry.diameter * 1000;
    case "finCount": return design.fins.geometry.count;
    case "finHeight": return design.fins.geometry.height * 1000;
    case "finSpan": return design.fins.geometry.span * 1000;
    case "finTipSpan": return design.fins.geometry.tipSpan * 1000;
    case "finSweep": return design.fins.geometry.sweep * 1000;
    case "nozzleDiameter": return design.nozzle.geometry.throatDiameter * 1000;
    case "dragCoefficient": return design.dragCoefficient;
    case "waterVolume": return design.waterVolume * 1000;
    case "initialPressure": return design.initialPressure / 100000;
    case "launchAngle": return design.launchAngle;
    default: return 0;
  }
}

// ── Value Setters ────────────────────────────────────────────────

function createSetter(
  dispatch: ReturnType<typeof useRocketDesigner>["dispatch"],
  key: string,
  value: number
): void {
  const metersValue = value / 1000; // mm to meters

  switch (key) {
    case "noseLength":
      dispatch({ type: "SET_NOSE_CONE", payload: { length: metersValue } });
      break;
    case "bodyLength":
      dispatch({ type: "SET_BODY_TUBE", payload: { length: metersValue } });
      break;
    case "bodyDiameter":
      dispatch({
        type: "SET_BODY_TUBE",
        payload: {
          outerDiameter: metersValue,
          innerDiameter: Math.max(0.001, metersValue - 0.003),
        },
      });
      break;
    case "bottleLength":
      dispatch({ type: "SET_BOTTLE", payload: { length: metersValue } });
      break;
    case "bottleDiameter":
      dispatch({ type: "SET_BOTTLE", payload: { diameter: metersValue } });
      break;
    case "finCount":
      dispatch({ type: "SET_FINS", payload: { count: Math.round(value) } });
      break;
    case "finHeight":
      dispatch({ type: "SET_FINS", payload: { height: metersValue } });
      break;
    case "finSpan":
      dispatch({ type: "SET_FINS", payload: { span: metersValue } });
      break;
    case "finTipSpan":
      dispatch({ type: "SET_FINS", payload: { tipSpan: metersValue } });
      break;
    case "finSweep":
      dispatch({ type: "SET_FINS", payload: { sweep: metersValue } });
      break;
    case "nozzleDiameter":
      dispatch({
        type: "SET_NOZZLE",
        payload: { throatDiameter: metersValue, exitDiameter: metersValue },
      });
      break;
    case "dragCoefficient":
      dispatch({ type: "SET_DRAG_COEFFICIENT", payload: value });
      break;
    case "waterVolume":
      dispatch({ type: "SET_WATER_VOLUME", payload: value / 1000 }); // L to m³
      break;
    case "initialPressure":
      dispatch({ type: "SET_INITIAL_PRESSURE", payload: value * 100000 }); // bar to Pa
      break;
    case "launchAngle":
      dispatch({ type: "SET_LAUNCH_ANGLE", payload: value });
      break;
  }
}

// ── Form Field Component ─────────────────────────────────────────

interface FormFieldProps {
  field: FieldDef;
  value: number;
  onChange: (value: number) => void;
}

function FormField({ field, value, onChange }: FormFieldProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      if (!isNaN(newValue)) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  const displayValue = field.key === "dragCoefficient"
    ? value.toFixed(2)
    : field.step < 1
    ? value.toFixed(1)
    : value.toFixed(0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{field.label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {displayValue} {field.unit}
        </span>
      </div>
      <input
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        onChange={handleChange}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-orange-500 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
        aria-label={`${field.label} slider`}
      />
      <Input
        type="number"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        onChange={handleChange}
        className="h-8 text-xs"
        aria-label={`${field.label} exact value`}
      />
    </div>
  );
}

// ── Section Component ────────────────────────────────────────────

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            isOpen ? "rotate-90" : ""
          }`}
        />
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold">{title}</span>
        </div>
      </button>
      {isOpen && <div className="space-y-4 px-4 pb-4">{children}</div>}
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────

export default function RocketParametersPanel() {
  const { state, dispatch } = useRocketDesigner();
  const { current: design } = state;

  const handleFieldChange = useCallback(
    (key: string, value: number) => {
      createSetter(dispatch, key, value);
    },
    [dispatch]
  );

  return (
    <Card className="border-border/60 shadow-sm h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Rocket className="h-5 w-5 text-orange-500" />
          Engineering Parameters
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto max-h-[calc(100vh-200px)]">
        {/* Nose Cone */}
        <Section
          title="Nose Cone"
          icon={<Rocket className="h-4 w-4 text-orange-500" />}
        >
          {NOSE_CONE_FIELDS.map((field) => (
            <FormField
              key={field.key}
              field={field}
              value={getFieldValue(design, field.key)}
              onChange={(v) => handleFieldChange(field.key, v)}
            />
          ))}
        </Section>

        {/* Body Tube */}
        <Section
          title="Body Tube"
          icon={<Rocket className="h-4 w-4 text-gray-500" />}
        >
          {BODY_FIELDS.map((field) => (
            <FormField
              key={field.key}
              field={field}
              value={getFieldValue(design, field.key)}
              onChange={(v) => handleFieldChange(field.key, v)}
            />
          ))}
        </Section>

        {/* Bottle */}
        <Section
          title="Pressure Vessel"
          icon={<Gauge className="h-4 w-4 text-blue-500" />}
        >
          {BOTTLE_FIELDS.map((field) => (
            <FormField
              key={field.key}
              field={field}
              value={getFieldValue(design, field.key)}
              onChange={(v) => handleFieldChange(field.key, v)}
            />
          ))}
        </Section>

        {/* Fins */}
        <Section
          title="Fins"
          icon={<Wind className="h-4 w-4 text-gray-500" />}
        >
          {FIN_FIELDS.map((field) => (
            <FormField
              key={field.key}
              field={field}
              value={getFieldValue(design, field.key)}
              onChange={(v) => handleFieldChange(field.key, v)}
            />
          ))}
        </Section>

        {/* Nozzle */}
        <Section
          title="Nozzle"
          icon={<Target className="h-4 w-4 text-gray-800" />}
        >
          {NOZZLE_FIELDS.map((field) => (
            <FormField
              key={field.key}
              field={field}
              value={getFieldValue(design, field.key)}
              onChange={(v) => handleFieldChange(field.key, v)}
            />
          ))}
        </Section>

        {/* Aerodynamics */}
        <Section
          title="Aerodynamics"
          icon={<Wind className="h-4 w-4 text-blue-500" />}
        >
          {AERO_FIELDS.map((field) => (
            <FormField
              key={field.key}
              field={field}
              value={getFieldValue(design, field.key)}
              onChange={(v) => handleFieldChange(field.key, v)}
            />
          ))}
        </Section>

        {/* Propulsion */}
        <Section
          title="Propulsion"
          icon={<Droplets className="h-4 w-4 text-blue-500" />}
        >
          {PROPULSION_FIELDS.map((field) => (
            <FormField
              key={field.key}
              field={field}
              value={getFieldValue(design, field.key)}
              onChange={(v) => handleFieldChange(field.key, v)}
            />
          ))}
        </Section>

        {/* Launch */}
        <Section
          title="Launch"
          icon={<Target className="h-4 w-4 text-orange-500" />}
        >
          {LAUNCH_FIELDS.map((field) => (
            <FormField
              key={field.key}
              field={field}
              value={getFieldValue(design, field.key)}
              onChange={(v) => handleFieldChange(field.key, v)}
            />
          ))}
        </Section>
      </CardContent>
    </Card>
  );
}
