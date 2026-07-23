/**
 * SOAR Studio — Rocket Designer Selection Panel
 *
 * When a component is selected on the canvas, this panel shows
 * only the relevant parameters for that component.
 * Edits update the model immediately (dual-input sync).
 */

"use client";

import { useCallback } from "react";
import { useRocketDesigner } from "./rocket-designer-context";
import NumericInput from "./numeric-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MousePointer2, Ruler, Wind, Gauge, Target, Droplets } from "lucide-react";

interface SelectionField {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  precision: number;
}

const FIELD_MAP: Record<string, SelectionField[]> = {
  noseCone: [
    { key: "noseLength", label: "Length", unit: "mm", min: 20, max: 400, step: 1, precision: 0 },
  ],
  bodyTube: [
    { key: "bodyLength", label: "Length", unit: "mm", min: 50, max: 600, step: 1, precision: 0 },
    { key: "bodyDiameter", label: "Diameter", unit: "mm", min: 30, max: 200, step: 1, precision: 0 },
  ],
  bottle: [
    { key: "bottleLength", label: "Length", unit: "mm", min: 50, max: 500, step: 1, precision: 0 },
    { key: "bottleDiameter", label: "Diameter", unit: "mm", min: 50, max: 200, step: 1, precision: 0 },
  ],
  fins: [
    { key: "finCount", label: "Count", unit: "", min: 2, max: 6, step: 1, precision: 0 },
    { key: "finHeight", label: "Height (radial)", unit: "mm", min: 10, max: 150, step: 1, precision: 0 },
    { key: "finSpan", label: "Root Chord", unit: "mm", min: 20, max: 200, step: 1, precision: 0 },
    { key: "finTipSpan", label: "Tip Chord", unit: "mm", min: 10, max: 100, step: 1, precision: 0 },
  ],
  nozzle: [
    { key: "nozzleDiameter", label: "Throat Diameter", unit: "mm", min: 3, max: 30, step: 0.5, precision: 1 },
  ],
};

function getValue(design: ReturnType<typeof useRocketDesigner>["state"]["current"], key: string): number {
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
    case "nozzleDiameter": return design.nozzle.geometry.throatDiameter * 1000;
    default: return 0;
  }
}

function setValue(
  dispatch: ReturnType<typeof useRocketDesigner>["dispatch"],
  key: string,
  value: number,
): void {
  const mm = (v: number) => v / 1000;
  switch (key) {
    case "noseLength": dispatch({ type: "SET_NOSE_CONE", payload: { length: mm(value) } }); break;
    case "bodyLength": dispatch({ type: "SET_BODY_TUBE", payload: { length: mm(value) } }); break;
    case "bodyDiameter": dispatch({ type: "SET_BODY_TUBE", payload: { outerDiameter: mm(value), innerDiameter: Math.max(0.001, mm(value) - 0.003) } }); break;
    case "bottleLength": dispatch({ type: "SET_BOTTLE", payload: { length: mm(value) } }); break;
    case "bottleDiameter": dispatch({ type: "SET_BOTTLE", payload: { diameter: mm(value) } }); break;
    case "finCount": dispatch({ type: "SET_FINS", payload: { count: Math.round(value) } }); break;
    case "finHeight": dispatch({ type: "SET_FINS", payload: { height: mm(value) } }); break;
    case "finSpan": dispatch({ type: "SET_FINS", payload: { span: mm(value) } }); break;
    case "finTipSpan": dispatch({ type: "SET_FINS", payload: { tipSpan: mm(value) } }); break;
    case "nozzleDiameter": dispatch({ type: "SET_NOZZLE", payload: { throatDiameter: mm(value), exitDiameter: mm(value) } }); break;
  }
}

function getError(key: string, value: number, design: ReturnType<typeof useRocketDesigner>["state"]["current"]): string | null {
  switch (key) {
    case "bodyDiameter": {
      if (value <= design.bodyTube.geometry.innerDiameter * 1000) return "Must exceed inner diameter";
      return null;
    }
    case "nozzleDiameter": {
      if (value > design.bottle.geometry.diameter * 1000) return "Exceeds bottle diameter";
      if (value <= 0) return "Must be positive";
      return null;
    }
    default:
      if (value <= 0) return "Must be positive";
      return null;
  }
}

const COMPONENT_ICONS: Record<string, React.ReactNode> = {
  noseCone: <Ruler className="h-4 w-4 text-orange-500" />,
  bodyTube: <Ruler className="h-4 w-4 text-gray-500" />,
  bottle: <Droplets className="h-4 w-4 text-blue-500" />,
  fins: <Wind className="h-4 w-4 text-gray-500" />,
  nozzle: <Target className="h-4 w-4 text-gray-800" />,
};

const COMPONENT_LABELS: Record<string, string> = {
  noseCone: "Nose Cone",
  bodyTube: "Body Tube",
  bottle: "Pressure Vessel",
  fins: "Fins",
  nozzle: "Nozzle",
};

export default function SelectionPanel() {
  const { state, dispatch, selectedComponent } = useRocketDesigner();
  const design = state.current;

  const handleChange = useCallback(
    (key: string, value: number) => setValue(dispatch, key, value),
    [dispatch],
  );

  if (!selectedComponent) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <MousePointer2 className="h-4 w-4" />
            Component Properties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Click a component on the rocket to edit its properties.
          </p>
        </CardContent>
      </Card>
    );
  }

  const fields = FIELD_MAP[selectedComponent];
  if (!fields) return null;

  return (
    <Card className="border-orange-500/30 shadow-sm ring-1 ring-orange-500/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-muted-foreground">{COMPONENT_ICONS[selectedComponent]}</span>
          {COMPONENT_LABELS[selectedComponent] ?? selectedComponent}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
