/**
 * SOAR Studio — Mission Timeline Component (v2.5)
 *
 * Displays a chronological flight timeline with color-coded phases,
 * expandable event details, and hover/click interaction.
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  Flame,
  Droplets,
  Zap,
  Wind,
  Gauge,
  ArrowUp,
  ArrowDown,
  Target,
  Clock,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import type { TimelineEntry, FlightPhaseSegment } from "@/lib/analysis";
import { formatTime, formatAltitude, formatVelocity } from "@/lib/analysis";
import { PHASE_COLORS, PHASE_LABELS } from "@/lib/analysis";

// ── Event Icon ───────────────────────────────────────────────────

function getEventIcon(type: string) {
  switch (type) {
    case "launch": return <Play className="h-3.5 w-3.5" />;
    case "peak_thrust": return <Flame className="h-3.5 w-3.5" />;
    case "water_depleted": return <Droplets className="h-3.5 w-3.5" />;
    case "burnout": return <AlertTriangle className="h-3.5 w-3.5" />;
    case "max_velocity": return <Zap className="h-3.5 w-3.5" />;
    case "max_q": return <Wind className="h-3.5 w-3.5" />;
    case "max_mach": return <Gauge className="h-3.5 w-3.5" />;
    case "apogee": return <ArrowUp className="h-3.5 w-3.5" />;
    case "descent_begins": return <ArrowDown className="h-3.5 w-3.5" />;
    case "landing": return <Target className="h-3.5 w-3.5" />;
    default: return <Clock className="h-3.5 w-3.5" />;
  }
}

// ── Value Display ────────────────────────────────────────────────

function EventValues({ values }: { values: Record<string, number> }) {
  const valueLabels: Record<string, string> = {
    altitude: "Altitude",
    velocity: "Velocity",
    thrust: "Thrust",
    mass: "Mass",
    pressure: "Pressure",
    mach: "Mach",
    dynamicPressure: "Dynamic Pressure",
    distance: "Distance",
    time: "Time",
  };

  const valueUnits: Record<string, string> = {
    altitude: "m",
    velocity: "m/s",
    thrust: "N",
    mass: "kg",
    pressure: "Pa",
    mach: "",
    dynamicPressure: "Pa",
    distance: "m",
    time: "s",
  };

  return (
    <div className="mt-1.5 flex flex-wrap gap-2">
      {Object.entries(values).map(([key, val]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 rounded bg-muted/70 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground"
        >
          {valueLabels[key] || key}: {val.toFixed(2)} {valueUnits[key] || ""}
        </span>
      ))}
    </div>
  );
}

// ── Phase Bar ────────────────────────────────────────────────────

function PhaseBar({ phases, totalTime }: { phases: FlightPhaseSegment[]; totalTime: number }) {
  if (totalTime <= 0) return null;

  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      {phases
        .filter((p) => p.endTime > p.startTime)
        .map((phase, idx) => {
          const width = ((phase.endTime - phase.startTime) / totalTime) * 100;
          return (
            <div
              key={idx}
              className="transition-all duration-200 hover:opacity-80"
              style={{
                width: `${Math.max(width, 0.5)}%`,
                backgroundColor: phase.color,
              }}
              title={`${phase.label}: ${phase.startTime.toFixed(1)}s - ${phase.endTime.toFixed(1)}s`}
            />
          );
        })}
    </div>
  );
}

// ── Event Row ────────────────────────────────────────────────────

function EventRow({
  entry,
  isLast,
}: {
  entry: TimelineEntry;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasValues = Object.keys(entry.values).length > 0;
  const phaseColor = entry.phase?.color || "#6b7280";

  return (
    <div className="relative flex gap-3">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full border-2"
          style={{
            borderColor: phaseColor,
            backgroundColor: `${phaseColor}15`,
          }}
        >
          <span style={{ color: phaseColor }}>{getEventIcon(entry.type)}</span>
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-border/50" style={{ backgroundColor: `${phaseColor}30` }} />
        )}
      </div>

      {/* Event content */}
      <div className="flex-1 pb-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">{entry.label}</span>
              {entry.major && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                  Major
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {entry.description}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-xs font-mono font-medium tabular-nums">
              {formatTime(entry.time)}
            </span>
            {entry.index > 0 && (
              <span className="ml-1 text-[9px] text-muted-foreground">
                #{entry.index}
              </span>
            )}
          </div>
        </div>

        {/* Phase badge */}
        {entry.phase && (
          <span
            className="mt-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-medium"
            style={{
              backgroundColor: `${entry.phase.color}20`,
              color: entry.phase.color,
            }}
          >
            {entry.phase.label}
          </span>
        )}

        {/* Expandable values */}
        {hasValues && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight
              className={`h-2.5 w-2.5 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
            {expanded ? "Hide values" : "Show values"}
          </button>
        )}
        {expanded && hasValues && <EventValues values={entry.values} />}
      </div>
    </div>
  );
}

// ── Main Timeline Component ──────────────────────────────────────

interface FlightEventsTimelineProps {
  entries: TimelineEntry[];
  phases: FlightPhaseSegment[];
  activeEventType?: string;
}

export default function FlightEventsTimeline({
  entries,
  phases,
  activeEventType,
}: FlightEventsTimelineProps) {
  const totalTime = entries.length > 0 ? entries[entries.length - 1].time : 0;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-blue-500" />
            Mission Timeline
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-mono">
            {entries.length} events
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Chronological flight events with phase timeline
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {/* Phase bar */}
        <div className="px-4 pb-3">
          <p className="text-[9px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
            Flight Phases
          </p>
          <PhaseBar phases={phases} totalTime={totalTime} />
          <div className="mt-1.5 flex flex-wrap gap-2">
            {phases
              .filter((p) => p.endTime > p.startTime)
              .map((phase, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[8px] text-muted-foreground"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: phase.color }}
                  />
                  {phase.label}
                </span>
              ))}
          </div>
        </div>

        <Separator className="mb-1" />

        {/* Event list */}
        <div className="px-4 pb-4">
          {entries.map((entry, idx) => (
            <EventRow
              key={entry.id}
              entry={entry}
              isLast={idx === entries.length - 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
