"use client";

import type { ValidateResponse } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowUp,
  Clock,
  Zap,
  Gauge,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Lightbulb,
} from "lucide-react";

interface ValidationDashboardProps {
  result: ValidateResponse;
}

function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 0.9) return "text-emerald-500";
  if (accuracy >= 0.7) return "text-amber-500";
  return "text-red-500";
}

function getAccuracyIcon(accuracy: number) {
  if (accuracy >= 0.9) return <CheckCircle className="h-6 w-6 text-emerald-500" />;
  if (accuracy >= 0.7) return <AlertTriangle className="h-6 w-6 text-amber-500" />;
  return <XCircle className="h-6 w-6 text-red-500" />;
}

function getAccuracyLabel(accuracy: number): string {
  if (accuracy >= 0.95) return "Excellent";
  if (accuracy >= 0.9) return "Very Good";
  if (accuracy >= 0.85) return "Good";
  if (accuracy >= 0.7) return "Acceptable";
  if (accuracy >= 0.5) return "Needs Improvement";
  return "Poor";
}

function MetricRow({
  metric,
  unit,
  icon,
  gradient,
}: {
  metric: { metricName: string; predicted: number; actual: number; absError: number; pctError?: number };
  unit: string;
  icon: React.ReactNode;
  gradient: string;
}) {
  const errorColor =
    metric.pctError !== undefined
      ? Math.abs(metric.pctError) < 5
        ? "text-emerald-500"
        : Math.abs(metric.pctError) < 15
        ? "text-amber-500"
        : "text-red-500"
      : "text-muted-foreground";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`rounded-lg bg-gradient-to-br p-2 text-white ${gradient}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium">{metric.metricName}</p>
          <p className="text-xs text-muted-foreground">{unit}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Predicted</p>
          <p className="text-sm font-mono font-semibold">
            {metric.predicted.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Actual</p>
          <p className="text-sm font-mono font-semibold">
            {metric.actual.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Difference</p>
          <p className={`text-sm font-mono font-semibold ${errorColor}`}>
            {metric.pctError !== undefined ? (
              <>
                {metric.pctError > 0 ? "+" : ""}
                {metric.pctError.toFixed(1)}%
              </>
            ) : (
              "N/A"
            )}
          </p>
        </div>
      </div>

      {/* Error bar */}
      {metric.pctError !== undefined && (
        <div className="mt-3">
          <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`absolute left-1/2 top-0 h-full rounded-full ${
                Math.abs(metric.pctError) < 5
                  ? "bg-emerald-500"
                  : Math.abs(metric.pctError) < 15
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{
                width: `${Math.min(Math.abs(metric.pctError) * 3, 50)}%`,
                left: metric.pctError < 0 ? `${50 - Math.min(Math.abs(metric.pctError) * 3, 50)}%` : "50%",
              }}
            />
            {/* Center line */}
            <div className="absolute left-1/2 top-0 h-full w-px bg-foreground/20" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ValidationDashboard({ result }: ValidationDashboardProps) {
  const { flight, simulation, metrics, summary, notes } = result;

  return (
    <div className="space-y-6">
      {/* Overall accuracy card */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-muted p-3">
                {getAccuracyIcon(summary.overallAccuracy)}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Overall Simulation Accuracy
                </p>
                <p className={`text-3xl font-bold tracking-tight ${getAccuracyColor(summary.overallAccuracy)}`}>
                  {(summary.overallAccuracy * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">
                  {getAccuracyLabel(summary.overallAccuracy)}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Altitude Error</p>
              <p className={`text-lg font-semibold ${
                summary.altitudeError !== undefined
                  ? Math.abs(summary.altitudeError) < 5
                    ? "text-emerald-500"
                    : Math.abs(summary.altitudeError) < 15
                    ? "text-amber-500"
                    : "text-red-500"
                  : "text-muted-foreground"
              }`}>
                {summary.altitudeError !== undefined
                  ? `${summary.altitudeError > 0 ? "+" : ""}${summary.altitudeError.toFixed(1)}%`
                  : "N/A"}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Flight Time Error</p>
              <p className={`text-lg font-semibold ${
                summary.flightTimeError !== undefined
                  ? Math.abs(summary.flightTimeError) < 5
                    ? "text-emerald-500"
                    : Math.abs(summary.flightTimeError) < 15
                    ? "text-amber-500"
                    : "text-red-500"
                  : "text-muted-foreground"
              }`}>
                {summary.flightTimeError !== undefined
                  ? `${summary.flightTimeError > 0 ? "+" : ""}${summary.flightTimeError.toFixed(1)}%`
                  : "N/A"}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Velocity Error</p>
              <p className={`text-lg font-semibold ${
                summary.velocityError !== undefined
                  ? Math.abs(summary.velocityError) < 5
                    ? "text-emerald-500"
                    : Math.abs(summary.velocityError) < 15
                    ? "text-amber-500"
                    : "text-red-500"
                  : "text-muted-foreground"
              }`}>
                {summary.velocityError !== undefined
                  ? `${summary.velocityError > 0 ? "+" : ""}${summary.velocityError.toFixed(1)}%`
                  : "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metric comparison cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => {
          let icon, gradient;
          if (metric.metricName.includes("Altitude")) {
            icon = <ArrowUp className="h-5 w-5" />;
            gradient = "from-blue-500 to-cyan-500";
          } else if (metric.metricName.includes("Time")) {
            icon = <Clock className="h-5 w-5" />;
            gradient = "from-amber-500 to-orange-500";
          } else {
            icon = <Zap className="h-5 w-5" />;
            gradient = "from-rose-500 to-pink-500";
          }
          return (
            <MetricRow
              key={metric.metricName}
              metric={metric}
              unit={metric.unit}
              icon={icon}
              gradient={gradient}
            />
          );
        })}
      </div>

      {/* Simulation summary */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Simulation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Max Altitude</p>
              <p className="text-sm font-mono font-semibold">{simulation.maxAltitude.toFixed(2)} m</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Flight Time</p>
              <p className="text-sm font-mono font-semibold">{simulation.flightTime.toFixed(2)} s</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Max Velocity</p>
              <p className="text-sm font-mono font-semibold">{simulation.maxVelocity.toFixed(2)} m/s</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Max Acceleration</p>
              <p className="text-sm font-mono font-semibold">{simulation.maxAcceleration.toFixed(2)} m/s²</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engineering notes */}
      {notes.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Engineering Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notes.map((note, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-muted/50 p-4"
                >
                  <p className="text-sm leading-relaxed">{note}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
