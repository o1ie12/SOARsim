"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { runMonteCarlo, type MonteCarloResult, type ToleranceConfig } from "@/lib/analysis-api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
} from "recharts";

const DEFAULT_TOLERANCES: ToleranceConfig[] = [
  { name: "pressure", nominal: 400000, tolerancePct: 5.0, distribution: "uniform" },
  { name: "dryMass", nominal: 0.15, tolerancePct: 2.0, distribution: "uniform" },
  { name: "launchAngle", nominal: 75.0, tolerancePct: 1.33, distribution: "uniform" },
];

const PARAM_LABELS: Record<string, string> = {
  pressure: "Pressure (Pa)",
  dryMass: "Dry Mass (kg)",
  launchAngle: "Launch Angle (°)",
  waterVolume: "Water Volume (m³)",
  nozzleDiameter: "Nozzle Diameter (m)",
};

function buildHistogram(values: number[], nBins: number = 20) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binWidth = (max - min) / nBins;
  if (binWidth === 0) return [{ bin: min, count: values.length }];

  const bins: { bin: number; count: number }[] = [];
  for (let i = 0; i < nBins; i++) {
    const edge = min + i * binWidth;
    const count = values.filter((v) => v >= edge && v < edge + binWidth).length;
    bins.push({ bin: Math.round(edge * 10) / 10, count });
  }
  return bins;
}

export default function MonteCarloPanel() {
  const [tolerances, setTolerances] = useState<ToleranceConfig[]>(DEFAULT_TOLERANCES);
  const [nRuns, setNRuns] = useState(500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MonteCarloResult | null>(null);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await runMonteCarlo({ tolerances, nRuns, seed: 42 });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Monte Carlo failed");
    } finally {
      setLoading(false);
    }
  };

  const histogram = result ? buildHistogram(result.runs.map((r) => r.maxAltitude)) : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Left: Controls */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Uncertainty Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Number of Runs ({nRuns})</Label>
              <Input
                type="range"
                min={50}
                max={2000}
                step={50}
                value={nRuns}
                onChange={(e) => setNRuns(parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-3">
              <Label>Parameter Tolerances</Label>
              {tolerances.map((t, i) => (
                <div key={t.name} className="rounded-lg border border-border p-3 space-y-2">
                  <p className="text-sm font-medium">{PARAM_LABELS[t.name] || t.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Nominal</Label>
                      <Input
                        type="number"
                        value={t.nominal}
                        onChange={(e) => {
                          const next = [...tolerances];
                          next[i] = { ...next[i], nominal: parseFloat(e.target.value) || 0 };
                          setTolerances(next);
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tolerance (±%)</Label>
                      <Input
                        type="number"
                        value={t.tolerancePct}
                        onChange={(e) => {
                          const next = [...tolerances];
                          next[i] = { ...next[i], tolerancePct: parseFloat(e.target.value) || 0 };
                          setTolerances(next);
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={handleRun} disabled={loading} className="w-full">
              {loading ? "Running..." : `Run ${nRuns} Simulations`}
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
                Running {nRuns} simulations...
              </p>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Summary Stats */}
              <div className="grid gap-4 sm:grid-cols-4">
                <Card className="border-border/60">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Mean Altitude</p>
                    <p className="text-2xl font-bold">{result.altitudeStats.mean.toFixed(1)}m</p>
                    <p className="text-xs text-muted-foreground">±{result.altitudeStats.std.toFixed(1)}m</p>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">95% CI</p>
                    <p className="text-lg font-bold">
                      {result.altitudeCI.lower.toFixed(1)} – {result.altitudeCI.upper.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">meters</p>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">CEP (50%)</p>
                    <p className="text-2xl font-bold">{result.landingDispersion.circularErrorProbability.toFixed(1)}m</p>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Min / Max</p>
                    <p className="text-lg font-bold">
                      {result.altitudeStats.min.toFixed(0)} – {result.altitudeStats.max.toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">meters</p>
                  </CardContent>
                </Card>
              </div>

              {/* Altitude Distribution */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Altitude Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={histogram}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="bin" label={{ value: "Altitude (m)", position: "bottom", offset: -5 }} className="text-xs" />
                      <YAxis label={{ value: "Count", angle: -90, position: "insideLeft" }} className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Landing Dispersion Scatter */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Landing Dispersion</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis type="number" dataKey="x" name="X" label={{ value: "X (m)", position: "bottom", offset: -5 }} className="text-xs" />
                      <YAxis type="number" dataKey="y" name="Y" label={{ value: "Y (m)", angle: -90, position: "insideLeft" }} className="text-xs" />
                      <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                      <Scatter
                        name="Landings"
                        data={result.runs.map((r) => ({ x: r.landingDistance * Math.cos(Math.PI / 4), y: r.landingDistance * Math.sin(Math.PI / 4) }))}
                        fill="#f97316"
                        fillOpacity={0.4}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}

          {!result && !loading && !error && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24">
              <p className="text-sm font-medium text-muted-foreground">
                Configure tolerances and run Monte Carlo analysis
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Quantify how parameter uncertainty affects flight performance
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
