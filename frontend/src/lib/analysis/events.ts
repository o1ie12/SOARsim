/**
 * SOAR Studio — Flight Event Detection
 *
 * Detects key flight events from trajectory data.
 * Events are deterministic — no AI used.
 *
 * Each event includes:
 *   - Time (seconds from T+0)
 *   - Description
 *   - Relevant engineering values
 *   - Type classification
 */

import type { TrajectoryPoint } from "@/lib/api";

// ── Event Types ──────────────────────────────────────────────────

export type FlightEventType =
  | "launch"
  | "peak_thrust"
  | "water_depleted"
  | "burnout"
  | "max_velocity"
  | "max_q"
  | "max_mach"
  | "apogee"
  | "descent_begins"
  | "landing";

export interface FlightEvent {
  id: string;
  time: number;
  type: FlightEventType;
  label: string;
  description: string;
  values: Record<string, number>;
  phase: FlightPhase;
}

// ── Flight Phases ────────────────────────────────────────────────

export type FlightPhase =
  | "pre_launch"
  | "powered"
  | "water_exhaust"
  | "coast"
  | "apogee"
  | "descent"
  | "landed";

export interface FlightPhaseSegment {
  phase: FlightPhase;
  label: string;
  startTime: number;
  endTime: number;
  color: string;
}

export const PHASE_COLORS: Record<FlightPhase, string> = {
  pre_launch: "#6b7280",
  powered: "#f97316",
  water_exhaust: "#8b5cf6",
  coast: "#3b82f6",
  apogee: "#10b981",
  descent: "#ef4444",
  landed: "#1f2937",
};

export const PHASE_LABELS: Record<FlightPhase, string> = {
  pre_launch: "Pre-Launch",
  powered: "Powered Flight",
  water_exhaust: "Water Exhaust",
  coast: "Coast",
  apogee: "Apogee",
  descent: "Descent",
  landed: "Landed",
};

// ── Event Detection ──────────────────────────────────────────────

export function detectEvents(trajectory: TrajectoryPoint[]): FlightEvent[] {
  const events: FlightEvent[] = [];
  if (trajectory.length < 2) return events;

  // Compute derived arrays
  const speeds = trajectory.map((p) => Math.sqrt(p.vx * p.vx + p.vy * p.vy));
  const accels = trajectory.map((p) => Math.sqrt(p.ax * p.ax + p.ay * p.ay));

  // ── 1. Launch ─────────────────────────────────────────────
  const launchPoint = trajectory[0];
  events.push({
    id: "launch",
    time: launchPoint.time,
    type: "launch",
    label: "Launch",
    description: "Rocket leaves the launch pad.",
    values: {
      mass: launchPoint.mass,
      pressure: launchPoint.pressure,
      thrust: launchPoint.thrust,
    },
    phase: "powered",
  });

  // ── 2. Peak Thrust ───────────────────────────────────────
  let maxThrustIdx = 0;
  let maxThrust = 0;
  for (let i = 0; i < trajectory.length; i++) {
    if (trajectory[i].thrust > maxThrust) {
      maxThrust = trajectory[i].thrust;
      maxThrustIdx = i;
    }
  }
  if (maxThrust >= 0) {
    events.push({
      id: "peak_thrust",
      time: trajectory[maxThrustIdx].time,
      type: "peak_thrust",
      label: "Peak Thrust",
      description: `Maximum thrust of ${maxThrust.toFixed(1)} N achieved.`,
      values: { thrust: maxThrust },
      phase: "powered",
    });
  }

  // ── 3. Water Depleted ────────────────────────────────────
  // Find where water goes from > 0 to 0 (or min)
  let waterDepletedIdx = -1;
  for (let i = 1; i < trajectory.length; i++) {
    if (trajectory[i - 1].waterRemaining > 0.001 && trajectory[i].waterRemaining <= 0.001) {
      waterDepletedIdx = i;
      break;
    }
  }
  if (waterDepletedIdx === -1) {
    // If water never depletes, use last point before trajectory ends
    const lastIdx = trajectory.length - 1;
    if (trajectory[lastIdx].waterRemaining <= 0.001) {
      waterDepletedIdx = lastIdx;
    }
  }
  if (waterDepletedIdx > 0) {
    events.push({
      id: "water_depleted",
      time: trajectory[waterDepletedIdx].time,
      type: "water_depleted",
      label: "Water Depleted",
      description: "All water expelled from the bottle.",
      values: {
        altitude: trajectory[waterDepletedIdx].y,
        velocity: speeds[waterDepletedIdx],
      },
      phase: "water_exhaust",
    });
  }

  // ── 4. Burnout ────────────────────────────────────────────
  // Last point with positive thrust
  let burnoutIdx = 0;
  for (let i = trajectory.length - 1; i >= 0; i--) {
    if (trajectory[i].thrust > 0.1) {
      burnoutIdx = i;
      break;
    }
  }
  if (burnoutIdx > 0 && burnoutIdx !== maxThrustIdx) {
    events.push({
      id: "burnout",
      time: trajectory[burnoutIdx].time,
      type: "burnout",
      label: "Burnout",
      description: `Propulsion ends at T+${trajectory[burnoutIdx].time.toFixed(2)} s.`,
      values: {
        altitude: trajectory[burnoutIdx].y,
        velocity: speeds[burnoutIdx],
        mass: trajectory[burnoutIdx].mass,
      },
      phase: "coast",
    });
  }

  // ── 5. Maximum Velocity ───────────────────────────────────
  let maxVelIdx = 0;
  let maxVel = 0;
  for (let i = 0; i < speeds.length; i++) {
    if (speeds[i] > maxVel) {
      maxVel = speeds[i];
      maxVelIdx = i;
    }
  }
  if (maxVelIdx > 0) {
    events.push({
      id: "max_velocity",
      time: trajectory[maxVelIdx].time,
      type: "max_velocity",
      label: "Maximum Velocity",
      description: `Peak speed of ${maxVel.toFixed(1)} m/s (Mach ${(
        maxVel / 340
      ).toFixed(2)}).`,
      values: {
        velocity: maxVel,
        mach: maxVel / 340,
        altitude: trajectory[maxVelIdx].y,
      },
      phase: "coast",
    });
  }

  // ── 6. Maximum Dynamic Pressure (Max Q) ───────────────────
  let maxQIdx = 0;
  let maxQ = 0;
  for (let i = 0; i < trajectory.length; i++) {
    const q = trajectory[i].dynamicPressure ?? 0;
    if (q > maxQ) {
      maxQ = q;
      maxQIdx = i;
    }
  }
  if (maxQIdx > 0 && maxQ > 0) {
    events.push({
      id: "max_q",
      time: trajectory[maxQIdx].time,
      type: "max_q",
      label: "Max Dynamic Pressure",
      description: `Maximum aerodynamic load: ${maxQ.toFixed(1)} Pa (${(maxQ / 1000).toFixed(1)} kPa).`,
      values: {
        dynamicPressure: maxQ,
        velocity: speeds[maxQIdx],
        altitude: trajectory[maxQIdx].y,
      },
      phase: "powered",
    });
  }

  // ── 7. Maximum Mach ──────────────────────────────────────
  let maxMachIdx = 0;
  let maxMach = 0;
  for (let i = 0; i < trajectory.length; i++) {
    const mach = trajectory[i].machNumber ?? (speeds[i] / 340);
    if (mach > maxMach) {
      maxMach = mach;
      maxMachIdx = i;
    }
  }
  if (maxMachIdx > 0 && maxMach > 0 && maxMachIdx !== maxVelIdx) {
    events.push({
      id: "max_mach",
      time: trajectory[maxMachIdx].time,
      type: "max_mach",
      label: "Maximum Mach",
      description: `Peak Mach number of ${maxMach.toFixed(2)} at ${trajectory[maxMachIdx].y.toFixed(0)} m altitude.`,
      values: {
        mach: maxMach,
        velocity: speeds[maxMachIdx],
        altitude: trajectory[maxMachIdx].y,
      },
      phase: speeds[maxMachIdx] > 0 && trajectory[maxMachIdx].thrust <= 0.1 ? "coast" : "powered",
    });
  }

  // ── 8. Apogee (Maximum Altitude) ─────────────────────────
  let maxAltIdx = 0;
  let maxAlt = 0;
  for (let i = 0; i < trajectory.length; i++) {
    if (trajectory[i].y > maxAlt) {
      maxAlt = trajectory[i].y;
      maxAltIdx = i;
    }
  }
  if (maxAltIdx > 0) {
    events.push({
      id: "apogee",
      time: trajectory[maxAltIdx].time,
      type: "apogee",
      label: "Apogee",
      description: `Maximum altitude of ${maxAlt.toFixed(1)} m reached.`,
      values: {
        altitude: maxAlt,
        velocity: speeds[maxAltIdx],
        time: trajectory[maxAltIdx].time,
      },
      phase: "apogee",
    });
  }

  // ── 9. Descent Begins ────────────────────────────────────
  // First point after apogee where vy becomes negative (descending)
  const descentStartIdx = maxAltIdx + 1 < trajectory.length ? maxAltIdx + 1 : maxAltIdx;
  if (descentStartIdx > maxAltIdx && descentStartIdx < trajectory.length) {
    events.push({
      id: "descent_begins",
      time: trajectory[descentStartIdx].time,
      type: "descent_begins",
      label: "Descent Begins",
      description: "Rocket starts falling back to earth.",
      values: {
        altitude: trajectory[descentStartIdx].y,
        velocity: speeds[descentStartIdx],
      },
      phase: "descent",
    });
  }

  // ── 10. Landing ──────────────────────────────────────────
  const lastIdx = trajectory.length - 1;
  if (lastIdx > 0) {
    events.push({
      id: "landing",
      time: trajectory[lastIdx].time,
      type: "landing",
      label: "Landing",
      description: `Rocket touches down after ${trajectory[lastIdx].time.toFixed(2)} s of flight.`,
      values: {
        altitude: trajectory[lastIdx].y,
        velocity: speeds[lastIdx],
        distance: Math.abs(trajectory[lastIdx].x),
      },
      phase: "landed",
    });
  }

  // Sort events by time to ensure chronological order
  events.sort((a, b) => a.time - b.time);

  return events;
}

// ── Flight Phase Detection ───────────────────────────────────────

export function detectPhases(
  trajectory: TrajectoryPoint[],
  events: FlightEvent[]
): FlightPhaseSegment[] {
  if (trajectory.length < 2) return [];

  const totalTime = trajectory[trajectory.length - 1].time;
  const segments: FlightPhaseSegment[] = [];

  // Find key time points from events
  const getTime = (type: FlightEventType): number => {
    const event = events.find((e) => e.type === type);
    return event ? event.time : 0;
  };

  const launchTime = 0;
  const burnoutTime = getTime("burnout") || getTime("water_depleted") || totalTime * 0.1;
  const apogeeTime = getTime("apogee") || totalTime * 0.5;
  const descentTime = getTime("descent_begins") || apogeeTime + 0.01;
  const landingTime = totalTime;

  // Pre-Launch (T=0 to first step)
  segments.push({
    phase: "pre_launch",
    label: PHASE_LABELS.pre_launch,
    startTime: 0,
    endTime: 0,
    color: PHASE_COLORS.pre_launch,
  });

  // Powered Flight
  segments.push({
    phase: "powered",
    label: PHASE_LABELS.powered,
    startTime: launchTime,
    endTime: burnoutTime,
    color: PHASE_COLORS.powered,
  });

  // Water Exhaust (after water depleted, brief phase)
  const waterExhaust = getTime("water_depleted");
  if (waterExhaust > 0 && waterExhaust < burnoutTime) {
    segments.push({
      phase: "water_exhaust",
      label: PHASE_LABELS.water_exhaust,
      startTime: waterExhaust,
      endTime: burnoutTime,
      color: PHASE_COLORS.water_exhaust,
    });
  }

  // Coast
  segments.push({
    phase: "coast",
    label: PHASE_LABELS.coast,
    startTime: burnoutTime,
    endTime: apogeeTime,
    color: PHASE_COLORS.coast,
  });

  // Apogee (instantaneous)
  segments.push({
    phase: "apogee",
    label: PHASE_LABELS.apogee,
    startTime: apogeeTime,
    endTime: descentTime,
    color: PHASE_COLORS.apogee,
  });

  // Descent
  segments.push({
    phase: "descent",
    label: PHASE_LABELS.descent,
    startTime: descentTime,
    endTime: landingTime,
    color: PHASE_COLORS.descent,
  });

  // Landed
  segments.push({
    phase: "landed",
    label: PHASE_LABELS.landed,
    startTime: landingTime,
    endTime: landingTime,
    color: PHASE_COLORS.landed,
  });

  return segments;
}

// ── Event Markers for Charts ─────────────────────────────────────

export interface ChartMarker {
  time: number;
  label: string;
  type: FlightEventType;
  color: string;
}

export function getChartMarkers(events: FlightEvent[]): ChartMarker[] {
  const markerColors: Record<FlightEventType, string> = {
    launch: "#6b7280",
    peak_thrust: "#f97316",
    water_depleted: "#8b5cf6",
    burnout: "#ef4444",
    max_velocity: "#3b82f6",
    max_q: "#f59e0b",
    max_mach: "#06b6d4",
    apogee: "#10b981",
    descent_begins: "#6366f1",
    landing: "#1f2937",
  };

  return events.map((e) => ({
    time: e.time,
    label: e.label,
    type: e.type,
    color: markerColors[e.type],
  }));
}
