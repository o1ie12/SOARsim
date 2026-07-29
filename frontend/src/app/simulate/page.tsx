/**
 * SOAR Studio v2.7 — Simulation Studio (Redesigned)
 *
 * Five-section workflow layout:
 *   1. Rocket Configuration (collapsible sections, first 4 expanded)
 *   2. Simulation Results (4 key metrics: Max Altitude, Flight Score, Max Velocity, Flight Time)
 *   3. Mission Summary (engineering observations, concise)
 *   4. Trajectory Analysis (larger charts with event markers)
 *   5. Advanced Flight Data (collapsible: Dynamic P, Mach, Thrust, Acceleration, Event Timeline)
 *
 * Progressive disclosure — advanced data hidden until requested.
 * Semantic color system: blue=info, green=success, orange=warning, red=critical.
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { AlertCircle, Rocket, Loader2, ChevronDown, ChevronRight, BarChart3, Sparkles } from "lucide-react";

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

// ── Advanced Section Component ───────────────────────────────────

function AdvancedSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 py-2 text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {icon}
          <span>{title}</span>
        </div>
        <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0">
          {open ? "hide" : "show"}
        </Badge>
      </button>
      {open && <div className="pt-2">{children}</div>}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────

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
    const bottleVolEst = waterMass > 0 ? waterMass * 1.2 : 0.002;
    const waterFillPct = bottleVolEst > 0 ? (waterMass / bottleVolEst) * 100 : 35;

    const s = computeFlightScore(
      result.summary,
      Math.min(waterFillPct, 80),
      75,
      1.0
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
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            <span className="text-base font-bold tracking-tight">SOAR Studio</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            Simulation Studio
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">v2.7</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Simulation Studio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure your water rocket, launch, and analyze the complete mission profile.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          {/* ═══ LEFT COLUMN — Section 1: Rocket Configuration ═══ */}
          <div>
            <SimulationForm onSimulate={handleSimulate} loading={loading} />
          </div>

          {/* ═══ RIGHT COLUMN — Results ═══ */}
          <div className="space-y-6 min-w-0">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Simulation Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  Running simulation...
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Computing water rocket physics — trajectory, thrust, and aerodynamics
                </p>
              </div>
            )}

            {result && !loading && (
              <>
                {/* ═══ SECTION 2: Simulation Results (4 key metrics) ═══ */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Simulation Results
                    </h2>
                  </div>
                  <ResultsCards
                    summary={result.summary}
                    flightScore={score?.overall}
                  />
                </section>

                {score && missionSummary && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Flight Score — redesigned */}
                    <div>
                      <MissionScore score={score} />
                    </div>

                    {/* ═══ SECTION 3: Mission Summary ═══ */}
                    <div className="space-y-4">
                      {/* Mission Timeline — compact */}
                      {timeline && (
                        <FlightEventsTimeline
                          entries={timeline.entries}
                          phases={timeline.phases}
                        />
                      )}

                      {/* Engineering Summary Card */}
                      <Card className="border-border/60 shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            Mission Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {missionSummary.observations.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                Engineering Observations
                              </p>
                              {missionSummary.observations.map((obs, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-1.5"
                                >
                                  <span className="h-1.5 w-1.5 mt-1 shrink-0 rounded-full bg-blue-400" />
                                  <p className="text-[11px] leading-relaxed text-muted-foreground">{obs}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Phase durations */}
                          <div className="mt-3 flex flex-wrap gap-3">
                            <PhaseChip label="Powered" value={`${missionSummary.phaseDurations.poweredFlight.toFixed(2)}s`} color="#f97316" />
                            <PhaseChip label="Coast" value={`${missionSummary.phaseDurations.coast.toFixed(2)}s`} color="#3b82f6" />
                            <PhaseChip label="Descent" value={`${missionSummary.phaseDurations.descent.toFixed(2)}s`} color="#ef4444" />
                            <PhaseChip label="Total" value={`${missionSummary.phaseDurations.totalFlight.toFixed(2)}s`} color="#1f2937" />
                          </div>

                          {/* Flight Rating */}
                          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                            <span className="text-[10px] font-medium text-muted-foreground">Flight Rating:</span>
                            <Badge
                              className={`text-[10px] px-2 py-0.5 font-semibold ${getFlightRatingColor(missionSummary.flightRating)}`}
                              variant="outline"
                            >
                              {getFlightRatingLabel(missionSummary.flightRating)}
                            </Badge>
                          </div>

                          {/* Metric grid */}
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <MetricChip label="Max Alt" value={`${missionSummary.performance.maxAltitude.toFixed(1)} m`} />
                            <MetricChip label="Max Vel" value={`${missionSummary.performance.maxVelocity.toFixed(1)} m/s`} />
                            <MetricChip label="Max Mach" value={`M${missionSummary.performance.maxMach.toFixed(2)}`} />
                            <MetricChip label="Max Accel" value={`${missionSummary.performance.maxAcceleration.toFixed(1)} m/s²`} />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                <Separator className="my-2" />

                {/* ═══ SECTION 4: Trajectory Analysis (larger charts) ═══ */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Trajectory Analysis
                    </h2>
                    {timeline?.markers && timeline.markers.length > 0 && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                        {timeline.markers.length} event markers
                      </Badge>
                    )}
                  </div>
                  <FlightCharts
                    trajectory={result.trajectory}
                    markers={timeline?.markers}
                  />
                </section>

                {/* ═══ SECTION 5: Advanced Flight Data (collapsible) ═══ */}
                <section>
                  <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        Advanced Flight Data
                      </CardTitle>
                      <p className="text-[10px] text-muted-foreground">
                        Additional metrics and detailed event timeline
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {/* Detailed metric grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <MetricChip label="Max Dynamic P" value={`${(missionSummary?.performance.maxDynamicPressure ?? 0) / 1000 > 0 ? ((missionSummary?.performance.maxDynamicPressure ?? 0) / 1000).toFixed(1) + " kPa" : "—"}`} />
                        <MetricChip label="Downrange" value={`${missionSummary?.performance.downrangeDistance.toFixed(1) ?? "—"} m`} />
                        <MetricChip label="Launch Mass" value={`${missionSummary?.performance.launchMass.toFixed(3) ?? "—"} kg`} />
                        <MetricChip label="Landing Vel" value={`${missionSummary?.performance.landingVelocity?.toFixed(1) ?? "—"} m/s`} />
                      </div>

                      <Separator className="my-1" />

                      {/* Full event timeline — collapsed */}
                      <AdvancedSection title="Event Timeline" icon={<BarChart3 className="h-3.5 w-3.5 text-blue-400" />} defaultOpen={false}>
                        {timeline && (
                          <FlightEventsTimeline
                            entries={timeline.entries}
                            phases={timeline.phases}
                          />
                        )}
                      </AdvancedSection>
                    </CardContent>
                  </Card>
                </section>
              </>
            )}

            {!result && !loading && !error && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20">
                <Rocket className="h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  Configure your water rocket and launch
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Adjust the parameters on the left, then hit &quot;Launch!&quot;
                </p>
                <div className="mt-4 flex items-center gap-4 text-[10px] text-muted-foreground/50">
                  <span>Drag → set air resistance</span>
                  <span>·</span>
                  <span>Water → choose fuel load</span>
                  <span>·</span>
                  <span>Angle → aim the rocket</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Helper Components ────────────────────────────────────────────

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/15 px-2.5 py-1.5">
      <p className="text-[9px] text-muted-foreground">{label}</p>
      <p className="text-xs font-mono font-bold tabular-nums mt-0.5">{value}</p>
    </div>
  );
}

function PhaseChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-muted-foreground">{label}:</span>
      <span className="text-[10px] font-mono font-medium">{value}</span>
    </div>
  );
}
