"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Rocket, Loader2, Droplets, Wind, Target } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type {
  SimulateRequest,
  RocketParams,
  WaterRocketPropulsion,
  LaunchParams,
} from "@/lib/api";

interface SimulationFormProps {
  onSimulate: (params: SimulateRequest) => void;
  loading: boolean;
}

const DEFAULT_ROCKET: RocketParams = {
  dragCoefficient: 0.45,
  crossSectionalArea: 0.008,
};

const DEFAULT_PROPULSION: WaterRocketPropulsion = {
  type: "water",
  dryMass: 0.15,
  bottleVolume: 0.002,
  waterVolume: 0.0007,
  initialPressure: 400000,
  nozzleDiameter: 0.013,
};

const DEFAULT_LAUNCH: LaunchParams = {
  angle: 75,
};

interface FieldDef {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
}

const ROCKET_FIELDS: FieldDef[] = [
  { key: "dragCoefficient", label: "Drag Coefficient", unit: "Cd", min: 0, max: 1.5, step: 0.01 },
  { key: "crossSectionalArea", label: "Cross-Sectional Area", unit: "cm²", min: 1, max: 100, step: 1, format: (v) => v.toFixed(0) },
];

const PROPULSION_FIELDS: FieldDef[] = [
  { key: "dryMass", label: "Dry Mass", unit: "kg", min: 0.05, max: 2.0, step: 0.01, format: (v) => v.toFixed(2) },
  { key: "bottleVolume", label: "Bottle Volume", unit: "L", min: 0.25, max: 3.0, step: 0.05, format: (v) => (v * 1000).toFixed(0) },
  { key: "waterVolume", label: "Water Volume", unit: "L", min: 0, max: 2.5, step: 0.05, format: (v) => (v * 1000).toFixed(0) },
  { key: "initialPressure", label: "Initial Pressure", unit: "bar", min: 1, max: 15, step: 0.5, format: (v) => (v / 100000).toFixed(1) },
  { key: "nozzleDiameter", label: "Nozzle Diameter", unit: "mm", min: 3, max: 30, step: 0.5, format: (v) => (v * 1000).toFixed(1) },
];

const LAUNCH_FIELDS: FieldDef[] = [
  { key: "angle", label: "Launch Angle", unit: "°", min: 0, max: 90, step: 1, format: (v) => v.toFixed(0) },
];

export default function SimulationForm({ onSimulate, loading }: SimulationFormProps) {
  const [rocket, setRocket] = useState<RocketParams>(DEFAULT_ROCKET);
  const [propulsion, setPropulsion] = useState<WaterRocketPropulsion>(DEFAULT_PROPULSION);
  const [launch, setLaunch] = useState<LaunchParams>(DEFAULT_LAUNCH);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (propulsion.waterVolume >= propulsion.bottleVolume) {
      errors.push("Water volume must be less than bottle volume");
    }
    if (propulsion.waterVolume > 0 && propulsion.bottleVolume > 0) {
      const fillPercent = (propulsion.waterVolume / propulsion.bottleVolume) * 100;
      if (fillPercent > 60) {
        errors.push(`Fill ratio is ${fillPercent.toFixed(0)}% — optimal is 25-40%`);
      }
    }
    if (propulsion.initialPressure < 100000) {
      errors.push("Pressure below 1 bar — rocket may not launch");
    }
    return errors;
  }, [propulsion]);

  const handleRocketChange = (key: keyof RocketParams) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseFloat(e.target.value);
    if (key === "crossSectionalArea") value = value / 10000;
    if (!isNaN(value)) setRocket((prev) => ({ ...prev, [key]: value }));
  };

  const handlePropulsionChange = (key: keyof WaterRocketPropulsion) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseFloat(e.target.value);
    if (key === "bottleVolume" || key === "waterVolume") value = value / 1000;
    else if (key === "initialPressure") value = value * 100000;
    else if (key === "nozzleDiameter") value = value / 1000;
    if (!isNaN(value)) setPropulsion((prev) => ({ ...prev, [key]: value }));
  };

  const handleLaunchChange = (key: keyof LaunchParams) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) setLaunch((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => onSimulate({ rocket, propulsion, launch });

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Rocket className="h-5 w-5 text-orange-500" />
          Rocket Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Wind className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Aerodynamics</h3>
          </div>
          <div className="space-y-4">
            {ROCKET_FIELDS.map((field) => (
              <FormField
                key={field.key}
                field={field}
                value={field.key === "crossSectionalArea" ? rocket[field.key as keyof RocketParams] * 10000 : rocket[field.key as keyof RocketParams] as number}
                onChange={handleRocketChange(field.key as keyof RocketParams)}
              />
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <div className="mb-3 flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold">Water Rocket Propulsion</h3>
          </div>
          <div className="space-y-4">
            {PROPULSION_FIELDS.map((field) => {
              const rawValue = propulsion[field.key as keyof WaterRocketPropulsion] as number;
              let displayValue = rawValue;
              if (field.key === "bottleVolume" || field.key === "waterVolume") displayValue = rawValue * 1000;
              else if (field.key === "initialPressure") displayValue = rawValue / 100000;
              else if (field.key === "nozzleDiameter") displayValue = rawValue * 1000;
              return (
                <FormField key={field.key} field={field} value={displayValue} onChange={handlePropulsionChange(field.key as keyof WaterRocketPropulsion)} />
              );
            })}
            {propulsion.bottleVolume > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Fill ratio</span>
                <span className={propulsion.waterVolume / propulsion.bottleVolume > 0.4 ? "text-amber-500 font-medium" : "text-emerald-500"}>
                  {((propulsion.waterVolume / propulsion.bottleVolume) * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div>
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Launch</h3>
          </div>
          <div className="space-y-4">
            {LAUNCH_FIELDS.map((field) => (
              <FormField key={field.key} field={field} value={launch[field.key as keyof LaunchParams] as number} onChange={handleLaunchChange(field.key as keyof LaunchParams)} />
            ))}
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            {validationErrors.map((error, i) => (
              <p key={i} className="text-xs text-amber-700 dark:text-amber-400">⚠ {error}</p>
            ))}
          </div>
        )}

        <Button onClick={handleSubmit} disabled={loading || validationErrors.length > 0} className="w-full gap-2 rounded-full font-semibold" size="lg">
          {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Simulating...</>) : (<><Rocket className="h-4 w-4" /> Launch!</>)}
        </Button>
      </CardContent>
    </Card>
  );
}

function FormField({ field, value, onChange }: { field: FieldDef; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const displayValue = field.format ? field.format(value) : value.toFixed(2);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{field.label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">{displayValue} {field.unit}</span>
      </div>
      <input type="range" min={field.min} max={field.max} step={field.step} value={value} onChange={onChange} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-foreground [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110" aria-label={`${field.label} slider`} />
      <Input type="number" min={field.min} max={field.max} step={field.step} value={value} onChange={onChange} className="h-8 text-xs" aria-label={`${field.label} exact value`} />
    </div>
  );
}
