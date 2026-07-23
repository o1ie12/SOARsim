/**
 * SOAR Studio — Mission Summary
 *
 * Generates a professional engineering mission summary with:
 *   - Flight performance metrics
 *   - Engineering ratings
 *   - Key observations
 *   - Flight rating
 *
 * All logic is deterministic — no AI used.
 */

import type { SimulationSummary, TrajectoryPoint } from "@/lib/api";
import type { FlightEvent } from "./events";
import type { FlightScoreResult } from "./flightScore";

// ── Mission Summary Types ────────────────────────────────────────

export interface MissionSummary {
  /** Flight performance metrics */
  performance: FlightPerformance;
  /** Engineering ratings */
  ratings: EngineeringRatings;
  /** Flight rating label */
  flightRating: FlightRating;
  /** Deterministic observations */
  observations: string[];
  /** Flight phase durations */
  phaseDurations: PhaseDurations;
}

export interface FlightPerformance {
  maxAltitude: number; // m
  flightTime: number; // s
  maxVelocity: number; // m/s
  maxMach: number;
  maxAcceleration: number; // m/s²
  maxDynamicPressure: number; // Pa
  downrangeDistance: number; // m
  launchMass: number; // kg
  landingVelocity: number; // m/s
  maxThrust: number; // N
  totalImpulse: number; // N·s
  apogeeAltitude: number; // m
  avgVelocity: number; // m/s
  maxKineticEnergy: number; // J
  maxPotentialEnergy: number; // J
}

export interface EngineeringRatings {
  altitudeScore: number; // 0-100
  efficiencyScore: number; // 0-100
  stabilityScore: number; // 0-100
}

export type FlightRating = "excellent" | "good" | "fair" | "poor" | "critical";

export interface PhaseDurations {
  poweredFlight: number; // s
  coast: number; // s
  descent: number; // s
  totalFlight: number; // s
}

// ── Mission Summary Generation ───────────────────────────────────

export function generateMissionSummary(
  summary: SimulationSummary,
  trajectory: TrajectoryPoint[],
  score: FlightScoreResult,
  events: FlightEvent[],
): MissionSummary {
  // Compute performance metrics
  const speeds = trajectory.map((p) => Math.sqrt(p.vx * p.vx + p.vy * p.vy));
  const launchMass = trajectory.length > 0 ? trajectory[0].mass : 0;
  const landingVelocity = trajectory.length > 0 ? speeds[trajectory.length - 1] : 0;
  const maxThrust = Math.max(...trajectory.map((p) => p.thrust));
  const downrangeDistance = trajectory.length > 0 ? Math.abs(trajectory[trajectory.length - 1].x) : 0;

  // Average velocity (excluding zero points)
  const movingSpeeds = speeds.filter((s) => s > 0.1);
  const avgVelocity = movingSpeeds.length > 0
    ? movingSpeeds.reduce((a, b) => a + b, 0) / movingSpeeds.length
    : 0;

  // Energy
  const maxKE = Math.max(...trajectory.map((p) => 0.5 * p.mass * speeds[trajectory.indexOf(p)] * speeds[trajectory.indexOf(p)]));
  const maxPE = Math.max(...trajectory.map((p) => p.mass * 9.80665 * p.y));

  // Total impulse (integrate thrust over time)
  let totalImpulse = 0;
  for (let i = 1; i < trajectory.length; i++) {
    const dt = trajectory[i].time - trajectory[i - 1].time;
    totalImpulse += trajectory[i].thrust * dt;
  }

  // Phase durations
  const apogeeEvent = events.find((e) => e.type === "apogee");
  const burnoutEvent = events.find((e) => e.type === "burnout");
  const descentEvent = events.find((e) => e.type === "descent_begins");
  const landingEvent = events.find((e) => e.type === "landing");

  const apogeeTime = apogeeEvent?.time ?? summary.flightTime * 0.5;
  const burnoutTime = burnoutEvent?.time ?? summary.flightTime * 0.1;
  const descentTime = descentEvent?.time ?? apogeeTime + 0.01;
  const landingTime = landingEvent?.time ?? summary.flightTime;

  const phaseDurations: PhaseDurations = {
    poweredFlight: burnoutTime,
    coast: apogeeTime - burnoutTime,
    descent: landingTime - descentTime,
    totalFlight: landingTime,
  };

  // Flight rating
  let flightRating: FlightRating;
  if (score.overall >= 80 && summary.maxAltitude > 20) {
    flightRating = "excellent";
  } else if (score.overall >= 60 && summary.maxAltitude > 10) {
    flightRating = "good";
  } else if (score.overall >= 40) {
    flightRating = "fair";
  } else if (score.overall >= 20) {
    flightRating = "poor";
  } else {
    flightRating = "critical";
  }

  // Deterministic observations
  const observations: string[] = [];

  if (summary.maxAltitude > 50) {
    observations.push(`Reached ${summary.maxAltitude.toFixed(1)} m — ${summary.maxAltitude > 100 ? "impressive altitude for a water rocket." : "good altitude performance."}`);
  } else if (summary.maxAltitude > 20) {
    observations.push(`Reached ${summary.maxAltitude.toFixed(1)} m — moderate altitude. Consider optimizing water fill and pressure.`);
  } else {
    observations.push(`Altitude limited to ${summary.maxAltitude.toFixed(1)} m — review drag, mass, and propulsion parameters.`);
  }

  if (summary.maxMach > 0.3) {
    observations.push(`Mach ${summary.maxMach.toFixed(2)} at peak — compressibility effects may become significant above Mach 0.3.`);
  }

  if (phaseDurations.coast > phaseDurations.poweredFlight * 3) {
    observations.push(`Long coast phase (${phaseDurations.coast.toFixed(1)} s) — rocket maintains momentum well after burnout.`);
  }

  if (summary.flightTime > 10) {
    observations.push(`Total flight time of ${summary.flightTime.toFixed(1)} s — allows ample time for recovery system deployment.`);
  } else if (summary.flightTime < 5) {
    observations.push(`Short flight time (${summary.flightTime.toFixed(1)} s) — recovery system deployment window is limited.`);
  }

  if (downrangeDistance > summary.maxAltitude) {
    observations.push(`Downrange distance (${downrangeDistance.toFixed(1)} m) exceeds altitude — trajectory is relatively flat.`);
  } else {
    observations.push(`Altitude exceeds downrange distance — trajectory is steep, favouring altitude over range.`);
  }

  if (summary.maxVelocity > 50) {
    observations.push(`High velocity (${summary.maxVelocity.toFixed(1)} m/s) — ensure structural integrity at peak speed.`);
  }

  return {
    performance: {
      maxAltitude: summary.maxAltitude,
      flightTime: summary.flightTime,
      maxVelocity: summary.maxVelocity,
      maxMach: summary.maxMach,
      maxAcceleration: summary.maxAcceleration,
      maxDynamicPressure: summary.maxDynamicPressure,
      downrangeDistance,
      launchMass,
      landingVelocity,
      maxThrust,
      totalImpulse,
      apogeeAltitude: summary.maxAltitude,
      avgVelocity,
      maxKineticEnergy: maxKE,
      maxPotentialEnergy: maxPE,
    },
    ratings: {
      altitudeScore: score.subScores.find((s) => s.name === "Altitude")?.score ?? 50,
      efficiencyScore: score.subScores.find((s) => s.name === "Efficiency")?.score ?? 50,
      stabilityScore: score.subScores.find((s) => s.name === "Stability")?.score ?? 50,
    },
    flightRating,
    observations,
    phaseDurations,
  };
}

// ── Flight Rating Helpers ────────────────────────────────────────

export function getFlightRatingLabel(rating: FlightRating): string {
  switch (rating) {
    case "excellent": return "Excellent";
    case "good": return "Good";
    case "fair": return "Fair";
    case "poor": return "Poor";
    case "critical": return "Critical";
  }
}

export function getFlightRatingColor(rating: FlightRating): string {
  switch (rating) {
    case "excellent": return "text-emerald-500";
    case "good": return "text-green-500";
    case "fair": return "text-amber-500";
    case "poor": return "text-orange-500";
    case "critical": return "text-red-500";
  }
}
