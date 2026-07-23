/**
 * SOAR Studio — Mission Timeline
 *
 * Generates a chronological timeline of flight events.
 * Organizes detected events into a readable sequence with
 * phase coloring and contextual engineering values.
 */

import type { TrajectoryPoint } from "@/lib/api";
import { detectEvents, detectPhases, getChartMarkers, type FlightEvent, type FlightPhaseSegment, type FlightEventType, type ChartMarker } from "./events";

// ── Timeline Entry ───────────────────────────────────────────────

export interface TimelineEntry {
  /** Unique identifier */
  id: string;
  /** Sequential index (1-based) */
  index: number;
  /** Time from launch (seconds) */
  time: number;
  /** Event type */
  type: FlightEventType;
  /** Short label */
  label: string;
  /** Detailed description */
  description: string;
  /** Engineering values relevant to this event */
  values: Record<string, number>;
  /** Flight phase at this event */
  phase: FlightPhaseSegment;
  /** Whether this is a major event (highlighted in UI) */
  major: boolean;
}

// ── Major vs Minor Events ────────────────────────────────────────

const MAJOR_EVENTS: Set<FlightEventType> = new Set([
  "launch",
  "burnout",
  "apogee",
  "landing",
]);

// ── Timeline Generation ──────────────────────────────────────────

export function generateTimeline(
  trajectory: TrajectoryPoint[],
): {
  entries: TimelineEntry[];
  phases: FlightPhaseSegment[];
  markers: ChartMarker[];
} {
  const events = detectEvents(trajectory);
  const phases = detectPhases(trajectory, events);
  const markers = getChartMarkers(events);

  // Sort events by time
  const sorted = [...events].sort((a, b) => a.time - b.time);

  // Map events to timeline entries with phase context
  const entries: TimelineEntry[] = sorted.map((event, idx) => {
    // Find the phase this event belongs to
    const phase =
      phases.find(
        (p) => event.time >= p.startTime && event.time <= p.endTime
      ) || phases[0];

    return {
      id: event.id,
      index: idx + 1,
      time: event.time,
      type: event.type,
      label: event.label,
      description: event.description,
      values: event.values,
      phase,
      major: MAJOR_EVENTS.has(event.type),
    };
  });

  return { entries, phases, markers };
}

// ── Format timeline for display ──────────────────────────────────

export function formatTime(seconds: number): string {
  if (seconds < 1) {
    return `T+${(seconds * 1000).toFixed(0)} ms`;
  }
  return `T+${seconds.toFixed(2)} s`;
}

export function formatAltitude(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters.toFixed(1)} m`;
}

export function formatVelocity(mps: number): string {
  if (mps >= 100) {
    return `${mps.toFixed(1)} m/s`;
  }
  return `${mps.toFixed(2)} m/s`;
}
