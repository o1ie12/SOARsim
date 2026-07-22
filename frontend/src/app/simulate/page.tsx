"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { AlertCircle, Rocket } from "lucide-react";

import SimulationForm from "@/components/simulation-form";
import ResultsCards from "@/components/results-cards";
import FlightCharts from "@/components/flight-charts";
import {
  runSimulation,
  type SimulateRequest,
  type SimulateResponse,
} from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

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
            <span className="text-lg font-bold tracking-tight">SOARSim</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Rocket className="h-3.5 w-3.5" />
            Simulation Studio
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
            Configure your water rocket, launch, and analyze the flight trajectory.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          {/* Left column — Inputs */}
          <div>
            <SimulationForm onSimulate={handleSimulate} loading={loading} />
          </div>

          {/* Right column — Results */}
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Simulation Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24">
                <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
                <p className="mt-4 text-sm font-medium text-muted-foreground">
                  Running simulation...
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Computing water rocket physics with Euler integration
                </p>
              </div>
            )}

            {result && !loading && (
              <>
                {/* Results cards */}
                <section>
                  <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Flight Summary
                  </h2>
                  <ResultsCards summary={result.summary} />
                </section>

                <Separator />

                {/* Charts */}
                <section>
                  <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Trajectory Analysis
                  </h2>
                  <FlightCharts trajectory={result.trajectory} />
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
