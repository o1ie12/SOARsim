/**
 * SOAR Studio v2.7 — Results Cards (Redesigned)
 *
 * Shows only 4 key flight metrics at a glance:
 *   Max Altitude, Flight Score, Max Velocity, Flight Time
 * All other metrics remain available in the trajectory charts
 * and advanced sections.
 */

"use client";

import type { SimulationSummary } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, Zap, Clock, Trophy } from "lucide-react";

interface ResultsCardsProps {
  summary: SimulationSummary;
  flightScore?: number;
}

interface CompactMetric {
  key: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
}

function formatValue(value: number, unit: string): string {
  if (unit === "m") {
    if (value >= 1000) return `${(value / 1000).toFixed(2)} km`;
    return `${value.toFixed(1)} m`;
  }
  if (unit === "m/s") return `${value.toFixed(1)} m/s`;
  if (unit === "s") return `${value.toFixed(2)} s`;
  return `${value.toFixed(1)}`;
}

export default function ResultsCards({ summary, flightScore }: ResultsCardsProps) {
  const metrics: CompactMetric[] = [
    {
      key: "altitude",
      label: "Maximum Altitude",
      value: formatValue(summary.maxAltitude, "m"),
      icon: <ArrowUp className="h-4 w-4" />,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      key: "score",
      label: "Flight Score",
      value: flightScore !== undefined ? `${flightScore}/100` : "—",
      icon: <Trophy className="h-4 w-4" />,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      key: "velocity",
      label: "Maximum Velocity",
      value: formatValue(summary.maxVelocity, "m/s"),
      icon: <Zap className="h-4 w-4" />,
      gradient: "from-rose-500 to-pink-500",
    },
    {
      key: "time",
      label: "Flight Time",
      value: formatValue(summary.flightTime, "s"),
      icon: <Clock className="h-4 w-4" />,
      gradient: "from-violet-500 to-purple-500",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map(({ key, label, value, icon, gradient }) => (
        <Card
          key={key}
          className="relative overflow-hidden border-border/60 shadow-sm transition-all hover:shadow-md group"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium text-muted-foreground">
                  {label}
                </p>
                <p className="text-xl font-bold tracking-tight tabular-nums">
                  {value}
                </p>
              </div>
              <div
                className={`rounded-lg bg-gradient-to-br p-2 text-white transition-transform group-hover:scale-110 ${gradient}`}
              >
                {icon}
              </div>
            </div>
          </CardContent>
          <div className={`h-0.5 w-full bg-gradient-to-r ${gradient}`} />
        </Card>
      ))}
    </div>
  );
}
