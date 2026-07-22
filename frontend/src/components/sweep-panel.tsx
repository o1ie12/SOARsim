"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FlaskConical } from "lucide-react";
import { runSweep, type SweepResult } from "@/lib/analysis-api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const SWEEP_PARAMETERS = [
  { name: "pressure", label: "Initial Pressure", unit: "Pa", min: 50000, max: 1000000, step: 50000 },
  { name: "waterVolume", label: "Water Volume", unit: "m³", min: 0.0001, max: 0.0015, step: 0.0001 },
  { name: "launchAngle", label: "Launch Angle", unit: "°", min: 10, max: 90, step: 5 },
  { name: "nozzleDiameter", label: "Nozzle Diameter", unit: "m", min: 0.005, max: 0.025, step: 0.001 },
];

const DEFAULT_BASE = {
  dryMass: 0.15,
  bottleVolume: 0.002,
  waterVolume: 0.0007,
  pressure: 400000,
  nozzleDiameter: 0.013,
  dragCoefficient: 0.45,
  crossSectionalArea: 0.008,
  launchAngle: 75,
};

export default function SweepPanel() {
  const [param, setParam] = useState("pressure");
  const [numValues, setNumValues] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SweepResult | null>(null);

  const handleSweep = async () => {
    setLoading(true);
    setError(null);
    try {
      const paramInfo = SWEEP_PARAMETERS.find((p) => p.name === param)!;
      const values: number[] = [];
      for (let i = 0; i < numValues; i++) {
        const frac = i / (numValues - 1);
        values.push(paramInfo.min + frac * (paramInfo.max - paramInfo.min));
      }
      // Round to reasonable precision
      const rounded = values.map((v) => (param === "waterVolume" || param === "nozzleDiameter" ? Math.round(v * 10000) / 10000 : Math.round(v)));

      const data = await runSweep({ parameter: param, values: rounded, baseConfig: DEFAULT_BASE });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sweep failed");
    } finally {
      setLoading(false);
    }
  };

  const paramInfo = SWEEP_PARAMETERS.find((p) => p.name === param)!;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Left: Controls */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sweep Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Parameter to Sweep</Label>
              <Select value={param} onValueChange={(v) => setParam(v ?? "pressure")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SWEEP_PARAMETERS.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.label} ({p.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Number of Values ({numValues})</Label>
              <Input
                type="range"
                min={3}
                max={20}
                value={numValues}
                onChange={(e) => setNumValues(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Range: {paramInfo.min} → {paramInfo.max} {paramInfo.unit}
              </p>
            </div>

            <Button onClick={handleSweep} disabled={loading} className="w-full">
              {loading ? "Running Sweep..." : "Run Parameter Sweep"}
            </Button>
          </CardContent>
        </Card>

        {/* Right: Results */}
        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24">
              <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                Running {numValues} simulations...
              </p>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Statistics */}
              <div className="grid gap-4 sm:grid-cols-4">
                <Card className="border-border/60">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Best Altitude</p>
                    <p className="text-2xl font-bold">{result.statistics.bestValue.toFixed(1)}m</p>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Mean Altitude</p>
                    <p className="text-2xl font-bold">{result.statistics.meanAltitude.toFixed(1)}m</p>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Std Dev</p>
                    <p className="text-2xl font-bold">{result.statistics.stdAltitude.toFixed(1)}m</p>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Sensitivity</p>
                    <p className="text-2xl font-bold">{result.statistics.sensitivity.toFixed(2)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Chart */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Altitude vs {paramInfo.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart
                      data={result.results.map((r) => ({
                        x: r.parameterValue,
                        altitude: r.maxAltitude,
                        velocity: r.maxVelocity,
                        flightTime: r.flightTime,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis
                        dataKey="x"
                        label={{ value: `${paramInfo.label} (${paramInfo.unit})`, position: "bottom", offset: -5 }}
                        className="text-xs"
                      />
                      <YAxis
                        label={{ value: "Max Altitude (m)", angle: -90, position: "insideLeft" }}
                        className="text-xs"
                      />
                      <Tooltip
                        // @ts-expect-error - Recharts ValueType is overly restrictive
                        formatter={(value: number, name: string) => [
                          name === "altitude" ? `${value.toFixed(1)}m` : name === "velocity" ? `${value.toFixed(1)}m/s` : `${value.toFixed(2)}s`,
                          name === "altitude" ? "Max Altitude" : name === "velocity" ? "Max Velocity" : "Flight Time",
                        ]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="altitude"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={{ fill: "#f97316", r: 4 }}
                        name="Max Altitude (m)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Data Table */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Detailed Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="pb-2 text-left font-medium text-muted-foreground">
                            {paramInfo.label} ({paramInfo.unit})
                          </th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">Altitude (m)</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">Flight Time (s)</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">Velocity (m/s)</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">Accel (m/s²)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.results.map((r, i) => (
                          <tr
                            key={i}
                            className={`border-b border-border/40 ${i === result.statistics.bestIndex ? "bg-orange-500/5 font-medium" : ""}`}
                          >
                            <td className="py-2">{r.parameterValue.toLocaleString()}</td>
                            <td className="py-2 text-right">{r.maxAltitude.toFixed(1)}</td>
                            <td className="py-2 text-right">{r.flightTime.toFixed(2)}</td>
                            <td className="py-2 text-right">{r.maxVelocity.toFixed(1)}</td>
                            <td className="py-2 text-right">{r.maxAcceleration.toFixed(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!result && !loading && !error && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24">
              <FlaskConical className="h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                Configure and run a parameter sweep
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Vary one parameter to see how it affects rocket performance
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
