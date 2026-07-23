"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { AlertCircle, Rocket, Loader2 } from "lucide-react";

import SimulationForm from "@/components/simulation-form";
import ResultsCards from "@/components/results-cards";
import FlightCharts from "@/components/flight-charts";
import FlightEventsTimeline from "@/components/flight-events-timeline";
import MissionScore from "@/components/mission-score";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  runSimulation,
  type SimulateRequest,
  type SimulateResponse,
} from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  generateTimeline,
  computeFlightScore,
  generateMissionSummary,
  getFlightRatingLabel,
  getFlightRatingColor,
  type MissionSummary,
} from "@/lib/analysis";

export default function SimulatePage() {
  const [result, setResult] = useState<SimulateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = useCallback(async (params: SimulateRequest) => {
    setLoading(true);
    setError(null);
    try {
      const data = await runSimulation(params);
      setResult(data);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "An unexpected error occurred.";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // v2.5: Compute mission analysis from trajectory
  const { timeline, score, missionSummary } = useMemo(() => {
    if (!result) return { timeline: null, score: null, missionSummary: null };

    const t = generateTimeline(result.trajectory);

    // Compute water fill percentage from trajectory
    const initialMass = result.trajectory[0]?.mass ?? 0;
    const dryMass = result.trajectory[result.trajectory.length - 1]?.mass ?? initialMass;
    const waterMass = initialMass - dryMass;
    // Estimate bottle volume from mass difference (rough heuristic)
    const bottleVolEst = waterMass > 0 ? waterMass * 1.2 : 0.002;
    const waterFillPct = bottleVolEst > 0 ? (waterMass / bottleVolEst) * 100 : 35;

    const s = computeFlightScore(
      result.summary,
      Math.min(waterFillPct, 80),
      75, // default launch angle
      1.0 // default stability margin (not available from simulation)
    );

    const m = generateMissionSummary(
      result.summary,
      result.trajectory,
      s,
      t.entries.map((e) => ({
        id: e.id,
        time: e.time,
        type: e.type,
        label: e.label,
        description: e.description,
        values: e.values,
        phase: e.phase.phase as any,
      }))
    );

    return { timeline: t, score: s, missionSummary: m };
  }, [result]);

  return (
    <div className="flex flex-1 flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            <span className="text-lg font-bold tracking-tight">SOAR Studio</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Rocket className="h-3.5 w-3.5" />
            Simulation Studio
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">v2.5</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Simulation Studio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure your water rocket, launch, and analyze the complete mission profile.
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[380px_1fr]">
          {/* Left column — Inputs */}
          <div>
            <SimulationForm onSimulate={handleSimulate} loading={loading} />
          </div>

          {/* Right column — Results */}
          <div className="space-y-6 min-w-0">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Simulation Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground/40" />
                <p className="mt-4 text-sm font-medium text-muted-foreground">
                  Running simulation...
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Computing water rocket physics — trajectory, thrust, and aerodynamics
                </p>
              </div>
            )}

            {result && !loading && (
              <>
                {/* Flight Summary Cards */}
                <section>
                  <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Flight Summary
                  </h2>
                  <ResultsCards summary={result.summary} />
                </section>

                <Separator />

                {/* v2.5: Mission Overview — Score + Timeline + Summary */}
                {score && missionSummary && (
                  <div className="grid gap-6 lg:grid-cols-3">
                    {/* Flight Score */}
                    <div className="lg:col-span-1">
                      <MissionScore score={score} />
                    </div>

                    {/* Mission Timeline */}
                    <div className="lg:col-span-2">
                      {timeline && (
                        <FlightEventsTimeline
                          entries={timeline.entries}
                          phases={timeline.phases}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Mission Summary */}
                {missionSummary && (
                  <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Rocket className="h-4 w-4 text-orange-500" />
                        Mission Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <SummaryMetric label="Max Altitude" value={`${missionSummary.performance.maxAltitude.toFixed(1)} m`} />
                        <SummaryMetric label="Max Velocity" value={`${missionSummary.performance.maxVelocity.toFixed(1)} m/s`} />
                        <SummaryMetric label="Flight Time" value={`${missionSummary.performance.flightTime.toFixed(2)} s`} />
                        <SummaryMetric label="Max Mach" value={`M${missionSummary.performance.maxMach.toFixed(2)}`} />
                        <SummaryMetric label="Max Acceleration" value={`${missionSummary.performance.maxAcceleration.toFixed(1)} m/s²`} />
                        <SummaryMetric label="Max Dynamic P" value={`${(missionSummary.performance.maxDynamicPressure / 1000).toFixed(1)} kPa`} />
                        <SummaryMetric label="Downrange Distance" value={`${missionSummary.performance.downrangeDistance.toFixed(1)} m`} />
                        <SummaryMetric label="Launch Mass" value={`${missionSummary.performance.launchMass.toFixed(3)} kg`} />
                      </div>

                      {/* Observations */}
                      {missionSummary.observations.length > 0 && (
                        <div className="mt-4 space-y-1.5">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            Engineering Observations
                          </p>
                          {missionSummary.observations.map((obs, i) => (
                            <div key={i} className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                              <Rocket className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                              <p className="text-[11px] leading-relaxed text-muted-foreground">{obs}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Phase Durations */}
                      <div className="mt-4 flex flex-wrap gap-4">
                        <PhaseBadge label="Powered Flight" value={`${missionSummary.phaseDurations.poweredFlight.toFixed(2)}s`} color="#f97316" />
                        <PhaseBadge label="Coast" value={`${missionSummary.phaseDurations.coast.toFixed(2)}s`} color="#3b82f6" />
                        <PhaseBadge label="Descent" value={`${missionSummary.phaseDurations.descent.toFixed(2)}s`} color="#ef4444" />
                        <PhaseBadge label="Total" value={`${missionSummary.phaseDurations.totalFlight.toFixed(2)}s`} color="#1f2937" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Flight Rating */}
                {missionSummary && (
                  <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                    <span className="text-xs font-medium text-muted-foreground">Flight Rating:</span>
                    <Badge
                      className={`text-[11px] px-3 py-1 font-semibold ${getFlightRatingColor(missionSummary.flightRating)}`}
                      variant="outline"
                    >
                      {getFlightRatingLabel(missionSummary.flightRating)}
                    </Badge>
                  </div>
                )}

                <Separator />

                {/* Trajectory Charts with Event Markers */}
                <section>
                  <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Trajectory Analysis
                  </h2>
                  <FlightCharts
                    trajectory={result.trajectory}
                    markers={timeline?.markers}
                  />
                </section>
              </>
            )}

            {!result && !loading && !error && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24">
                <Rocket className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-sm font-medium text-muted-foreground">
                  Configure your water rocket and launch
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Adjust the parameters on the left, then hit &quot;Launch!&quot;
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Helper Components ────────────────────────────────────────────

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-mono font-bold tabular-nums mt-0.5">{value}</p>
    </div>
  );
}

function PhaseBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-muted-foreground">{label}:</span>
      <span className="text-[10px] font-mono font-medium">{value}</span>
    </div>
  );
}
