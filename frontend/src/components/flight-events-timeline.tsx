/**
 * SOAR Studio v2.7 — Mission Timeline Component (Redesigned)
 *
 * Compact timeline showing only key events by default.
 * "Show Complete Timeline" button reveals all events.
 * Reduced visual weight, cleaner layout.
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { TimelineEntry, FlightPhaseSegment } from "@/lib/analysis";
import { formatTime } from "@/lib/analysis";
import { PHASE_COLORS, PHASE_LABELS } from "@/lib/analysis";

const KEY_EVENT_TYPES = new Set([
  "launch",
  "peak_thrust",
  "burnout",
  "apogee",
  "landing",
]);

// ── Event Icon ───────────────────────────────────────────────────

function getEventIcon(type: string) {
  switch (type) {
    case "launch": return <Play className="h-3 w-3" />;
    case "peak_thrust": return <Flame className="h-3 w-3" />;
    case "water_depleted": return <Droplets className="h-3 w-3" />;
    case "burnout": return <AlertTriangle className="h-3 w-3" />;
    case "max_velocity": return <Zap className="h-3 w-3" />;
    case "max_q": return <Wind className="h-3 w-3" />;
    case "max_mach": return <Gauge className="h-3 w-3" />;
    case "apogee": return <ArrowUp className="h-3 w-3" />;
    case "descent_begins": return <ArrowDown className="h-3 w-3" />;
    case "landing": return <Target className="h-3 w-3" />;
    default: return <Clock className="h-3 w-3" />;
  }
}

// ── Event Values Chips ───────────────────────────────────────────

function EventValues({ values }: { values: Record<string, number> }) {
  const valueUnits: Record<string, string> = {
    altitude: "m", velocity: "m/s", thrust: "N",
    mass: "kg", pressure: "Pa", mach: "",
    dynamicPressure: "Pa", distance: "m",
  };

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {Object.entries(values).map(([key, val]) => (
        <span
          key={key}
          className="inline-flex items-center gap-0.5 rounded bg-muted/70 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground"
        >
          {key === "altitude" ? "Alt" :
           key === "velocity" ? "Vel" :
           key === "thrust" ? "Thr" :
           key === "mass" ? "Mass" :
           key === "mach" ? "M" : key}: {val.toFixed(1)} {valueUnits[key] || ""}
        </span>
      ))}
    </div>
  );
}

// ── Phase Bar ────────────────────────────────────────────────────

function PhaseBar({ phases, totalTime }: { phases: FlightPhaseSegment[]; totalTime: number }) {
  if (totalTime <= 0) return null;

  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
      {phases
        .filter((p) => p.endTime > p.startTime)
        .map((phase, idx) => {
          const width = ((phase.endTime - phase.startTime) / totalTime) * 100;
          return (
            <div
              key={idx}
              className="transition-all duration-200"
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
    <div className="relative flex gap-2.5">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        <div
          className="flex h-5 w-5 items-center justify-center rounded-full border"
          style={{
            borderColor: phaseColor,
            backgroundColor: `${phaseColor}15`,
          }}
        >
          <span className="text-muted-foreground" style={{ color: phaseColor }}>
            {getEventIcon(entry.type)}
          </span>
        </div>
        {!isLast && <div className="w-px flex-1 bg-border/40" />}
      </div>

      {/* Event content */}
      <div className="flex-1 pb-3 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold">{entry.label}</span>
              {entry.major && (
                <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 leading-none">
                  Key
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
              {entry.description}
            </p>
          </div>
          <span className="shrink-0 text-[11px] font-mono font-medium tabular-nums text-muted-foreground">
            {formatTime(entry.time)}
          </span>
        </div>

        {/* Phase badge */}
        {entry.phase && (
          <span
            className="mt-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-medium"
            style={{
              backgroundColor: `${entry.phase.color}18`,
              color: entry.phase.color,
            }}
          >
            {entry.phase.label}
          </span>
        )}

        {/* Expand values */}
        {hasValues && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? "Hide" : "Show details"}
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
}

export default function FlightEventsTimeline({
  entries,
  phases,
}: FlightEventsTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const totalTime = entries.length > 0 ? entries[entries.length - 1].time : 0;

  const displayed = showAll ? entries : entries.filter((e) => KEY_EVENT_TYPES.has(e.type));
  const hiddenCount = entries.length - displayed.length;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-blue-400" />
            Mission Timeline
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-mono">
            {entries.length} events
          </Badge>
        </div>
        {!showAll && hiddenCount > 0 && (
          <p className="text-[10px] text-muted-foreground">
            Showing {displayed.length} key events ({hiddenCount} hidden)
          </p>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {/* Phase bar */}
        <div className="px-4 pb-2">
          <p className="text-[9px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
            Flight Phases
          </p>
          <PhaseBar phases={phases} totalTime={totalTime} />
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {phases
              .filter((p) => p.endTime > p.startTime)
              .map((phase, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[8px] text-muted-foreground"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: phase.color }} />
                  {phase.label}
                </span>
              ))}
          </div>
        </div>

        <Separator className="mb-1" />

        {/* Event list */}
        <div className="px-4 pb-3">
          {displayed.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No events recorded.</p>
          ) : (
            displayed.map((entry, idx) => (
              <EventRow
                key={entry.id}
                entry={entry}
                isLast={idx === displayed.length - 1}
              />
            ))
          )}

          {/* Expand button */}
          {!showAll && hiddenCount > 0 && (
            <div className="mt-1 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] gap-1 text-muted-foreground"
                onClick={() => setShowAll(true)}
              >
                Show Complete Timeline ({hiddenCount} more)
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          )}
          {showAll && hiddenCount > 0 && (
            <div className="mt-1 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] gap-1 text-muted-foreground"
                onClick={() => setShowAll(false)}
              >
                Show fewer
                <ChevronUp className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
