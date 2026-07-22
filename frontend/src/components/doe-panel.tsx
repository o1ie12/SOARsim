"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { runFullFactorial, type DoEResult, type FactorLevel } from "@/lib/analysis-api";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const DEFAULT_FACTORS: FactorLevel[] = [
  { name: "pressure", levels: [200000, 400000, 600000], unit: "Pa" },
  { name: "waterVolume", levels: [0.0004, 0.0007, 0.0010], unit: "m³" },
];

const DEFAULT_BASE = {
  dryMass: 0.15,
  bottleVolume: 0.002,
  nozzleDiameter: 0.013,
  dragCoefficient: 0.45,
  crossSectionalArea: 0.008,
  launchAngle: 75,
};

const PARAM_LABELS: Record<string, string> = {
  pressure: "Pressure (Pa)",
  waterVolume: "Water Volume (m³)",
  launchAngle: "Launch Angle (°)",
  nozzleDiameter: "Nozzle Diameter (m)",
};

export default function DoEPanel() {
  const [factors, setFactors] = useState<FactorLevel[]>(DEFAULT_FACTORS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DoEResult | null>(null);

  const addFactor = () => {
    if (factors.length >= 4) return;
    setFactors([...factors, { name: "launchAngle", levels: [60, 75, 90], unit: "°" }]);
  };

  const removeFactor = (idx: number) => {
    if (factors.length <= 1) return;
    setFactors(factors.filter((_, i) => i !== idx));
  };

  const updateFactorLevels = (idx: number, levelsStr: string) => {
    const levels = levelsStr.split(",").map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
    const next = [...factors];
    next[idx] = { ...next[idx], levels };
    setFactors(next);
  };

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await runFullFactorial({ factors, baseConfig: DEFAULT_BASE });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Experiment failed");
    } finally {
      setLoading(false);
    }
  };

  const totalRuns = factors.reduce((acc, f) => acc * Math.max(f.levels.length, 1), 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Left: Controls */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Experiment Design</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Factors</Label>
                <Button variant="outline" size="sm" onClick={addFactor} disabled={factors.length >= 4}>
                  + Add Factor
                </Button>
              </div>

              {factors.map((f, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <select
                      className="text-sm font-medium bg-transparent border-none outline-none"
                      value={f.name}
                      onChange={(e) => {
                        const next = [...factors];
                        next[i] = { ...next[i], name: e.target.value };
                        setFactors(next);
                      }}
                    >
                      <option value="pressure">Pressure</option>
                      <option value="waterVolume">Water Volume</option>
                      <option value="launchAngle">Launch Angle</option>
                      <option value="nozzleDiameter">Nozzle Diameter</option>
                      <option value="dryMass">Dry Mass</option>
                      <option value="dragCoefficient">Drag Coefficient</option>
                    </select>
                    {factors.length > 1 && (
                      <button
                        onClick={() => removeFactor(i)}
                        className="text-xs text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Levels (comma-separated)</Label>
                    <Input
                      value={f.levels.join(", ")}
                      onChange={(e) => updateFactorLevels(i, e.target.value)}
                      className="h-8 text-sm font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium">Total Combinations</p>
              <p className="text-2xl font-bold">{totalRuns}</p>
              <p className="text-xs text-muted-foreground">
                {factors.map((f) => `${f.levels.length} ${PARAM_LABELS[f.name]?.split(" ")[0] || f.name}`).join(" × ")}
              </p>
            </div>

            <Button
              onClick={handleRun}
              disabled={loading || totalRuns > 10000}
              className="w-full"
            >
              {loading ? "Running..." : "Run Full Factorial"}
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
                Running {totalRuns} simulations...
              </p>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Best Design Highlight */}
              <Card className="border-orange-500/40 bg-orange-500/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-orange-600">🏆 Best Performing Design</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Max Altitude</p>
                      <p className="text-2xl font-bold">{result.points[result.bestIndex]?.maxAltitude.toFixed(1)}m</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground mb-1">Parameters</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(result.points[result.bestIndex]?.parameters || {}).map(([k, v]) => (
                          <span key={k} className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium">
                            {PARAM_LABELS[k]?.split(" ")[0] || k}: {typeof v === "number" && v < 1 ? v.toFixed(4) : v.toLocaleString()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scatter Plot */}
              {factors.length >= 2 && (
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {PARAM_LABELS[factors[0].name]?.split(" ")[0] || factors[0].name} vs{" "}
                      {PARAM_LABELS[factors[1].name]?.split(" ")[0] || factors[1].name} (color = altitude)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name={factors[0].name}
                          label={{ value: PARAM_LABELS[factors[0].name] || factors[0].name, position: "bottom", offset: -5 }}
                          className="text-xs"
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name={factors[1].name}
                          label={{ value: PARAM_LABELS[factors[1].name] || factors[1].name, angle: -90, position: "insideLeft" }}
                          className="text-xs"
                        />
                        <Tooltip
                          // @ts-expect-error - Recharts ValueType is overly restrictive
                          formatter={(value: number, name: string) => [
                            name === "altitude" ? `${value.toFixed(1)}m` : value.toLocaleString(),
                            name === "altitude" ? "Altitude" : name,
                          ]}
                        />
                        <Scatter
                          name="Designs"
                          data={result.points.map((p) => ({
                            x: p.parameters[factors[0].name] || 0,
                            y: p.parameters[factors[1].name] || 0,
                            altitude: p.maxAltitude,
                            rank: p.rank,
                          }))}
                          fill="#f97316"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Rankings Table */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Design Rankings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="pb-2 text-left font-medium text-muted-foreground">Rank</th>
                          {factors.map((f) => (
                            <th key={f.name} className="pb-2 text-right font-medium text-muted-foreground">
                              {PARAM_LABELS[f.name]?.split(" ")[0] || f.name}
                            </th>
                          ))}
                          <th className="pb-2 text-right font-medium text-muted-foreground">Altitude (m)</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">Flight Time (s)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.points
                          .sort((a, b) => a.rank - b.rank)
                          .slice(0, 20)
                          .map((p, i) => (
                            <tr
                              key={p.runIndex}
                              className={`border-b border-border/40 ${p.rank === 1 ? "bg-orange-500/5 font-medium" : ""}`}
                            >
                              <td className="py-2">
                                {p.rank === 1 ? "🏆" : `#${p.rank}`}
                              </td>
                              {factors.map((f) => (
                                <td key={f.name} className="py-2 text-right font-mono text-xs">
                                  {typeof p.parameters[f.name] === "number" && p.parameters[f.name] < 1
                                    ? p.parameters[f.name].toFixed(4)
                                    : p.parameters[f.name]?.toLocaleString()}
                                </td>
                              ))}
                              <td className="py-2 text-right">{p.maxAltitude.toFixed(1)}</td>
                              <td className="py-2 text-right">{p.flightTime.toFixed(2)}</td>
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
              <p className="text-sm font-medium text-muted-foreground">
                Configure factors and run a full factorial experiment
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Test every combination of parameter levels to find the best design
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
