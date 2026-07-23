/**
 * SOAR Studio v2.5 — Mission Analysis Test Suite
 *
 * Tests:
 *   1. Event detection from trajectory
 *   2. Timeline generation
 *   3. Flight score computation
 *   4. Mission summary generation
 *   5. Integration with API types
 */

import { describe, it, expect } from "vitest";
import {
  detectEvents,
  detectPhases,
  getChartMarkers,
  PHASE_COLORS,
  PHASE_LABELS,
  type FlightEvent,
} from "@/lib/analysis/events";
import type { TrajectoryPoint } from "@/lib/api";
import { generateTimeline, formatTime, formatAltitude, formatVelocity } from "@/lib/analysis/timeline";
import { computeFlightScore, getGradeColor } from "@/lib/analysis/flightScore";
import { generateMissionSummary, getFlightRatingLabel, getFlightRatingColor } from "@/lib/analysis/missionSummary";

// ── Helpers ──────────────────────────────────────────────────────

function createMockTrajectory(overrides?: Partial<TrajectoryPoint>[]): TrajectoryPoint[] {
  // Generate a realistic 100-point flight profile
  const points: TrajectoryPoint[] = [];
  const dt = 0.05;
  let y = 0, vy = 0, t = 0;
  const initialMass = 0.845;
  let mass = initialMass;
  let waterRemaining = 1.0;
  const thrustDuration = 0.35;

  for (let i = 0; i < 200; i++) {
    t = i * dt;

    // Simulate a simple flight profile
    if (t < thrustDuration) {
      // Powered flight
      const thrust = 20 * (1 - t / thrustDuration);
      mass = initialMass - (initialMass - 0.145) * (t / thrustDuration);
      waterRemaining = Math.max(0, 1 - t / thrustDuration);
      vy = 10 * t;
      y = 0.5 * 10 * t * t;
    } else if (t < 0.5) {
      // Coast up
      vy = 3.5 - 9.81 * (t - thrustDuration);
      y += vy * dt;
      mass = 0.145;
      waterRemaining = 0;
    } else {
      // Coast and descent
      vy = 3.5 - 9.81 * (t - thrustDuration);
      y += vy * dt;
      if (y < 0) y = 0;
      mass = 0.145;
      waterRemaining = 0;
    }

    const speed = Math.abs(vy);
    const mach = speed / 340;
    const q = 0.5 * 1.225 * speed * speed;
    const thrust = t < thrustDuration ? 20 * (1 - t / thrustDuration) : 0;
    const ax = 0;
    const ay = vy > 0 && t < 0.5 ? (t < thrustDuration ? 10 : -9.81) : -9.81;

    points.push({
      time: t,
      x: 0.5 * t * 5,
      y: Math.max(y, 0),
      vx: 5,
      vy,
      ax,
      ay,
      thrust,
      mass,
      pressure: 400000 * Math.max(0, 1 - t / thrustDuration),
      waterRemaining,
      machNumber: mach,
      dynamicPressure: q,
      totalEnergy: 0.5 * mass * speed * speed + mass * 9.80665 * y,
      kineticEnergy: 0.5 * mass * speed * speed,
      potentialEnergy: mass * 9.80665 * y,
      ...(overrides?.[i] || {}),
    });
  }

  return points;
}

function createSimulationSummary() {
  return {
    maxAltitude: 45.2,
    flightTime: 7.84,
    maxVelocity: 22.5,
    maxAcceleration: 28.3,
    maxMach: 0.066,
    maxDynamicPressure: 350.2,
    totalImpulse: 4.5,
    specificImpulse: 0.55,
    maxKineticEnergy: 180.5,
    maxPotentialEnergy: 360.2,
    landingDistance: 18.5,
    landingX: 18.5,
    landingY: 0.5,
  };
}

// ── 1. Event Detection ───────────────────────────────────────────

describe("Event detection", () => {
  it("detects launch event", () => {
    const trajectory = createMockTrajectory();
    const events = detectEvents(trajectory);
    const launch = events.find((e) => e.type === "launch");
    expect(launch).toBeDefined();
    expect(launch!.time).toBe(0);
    expect(launch!.label).toBe("Launch");
  });

  it("detects peak thrust event", () => {
    const trajectory = createMockTrajectory();
    const events = detectEvents(trajectory);
    const peak = events.find((e) => e.type === "peak_thrust");
    expect(peak).toBeDefined();
    expect(peak!.values.thrust).toBeGreaterThan(0);
  });

  it("detects water depleted event", () => {
    const trajectory = createMockTrajectory();
    const events = detectEvents(trajectory);
    const depleted = events.find((e) => e.type === "water_depleted");
    expect(depleted).toBeDefined();
  });

  it("detects apogee (max altitude) event", () => {
    const trajectory = createMockTrajectory();
    const events = detectEvents(trajectory);
    const apogee = events.find((e) => e.type === "apogee");
    expect(apogee).toBeDefined();
    expect(apogee!.values.altitude).toBeGreaterThan(0);
  });

  it("detects max velocity event", () => {
    const trajectory = createMockTrajectory();
    const events = detectEvents(trajectory);
    const maxVel = events.find((e) => e.type === "max_velocity");
    expect(maxVel).toBeDefined();
    expect(maxVel!.values.velocity).toBeGreaterThan(0);
  });

  it("detects max dynamic pressure event", () => {
    const trajectory = createMockTrajectory();
    const events = detectEvents(trajectory);
    const maxQ = events.find((e) => e.type === "max_q");
    expect(maxQ).toBeDefined();
    expect(maxQ!.values.dynamicPressure).toBeGreaterThan(0);
  });

  it("detects landing event", () => {
    const trajectory = createMockTrajectory();
    const events = detectEvents(trajectory);
    const landing = events.find((e) => e.type === "landing");
    expect(landing).toBeDefined();
    expect(landing!.values.distance).toBeGreaterThan(0);
  });

  it("returns events sorted by time", () => {
    const trajectory = createMockTrajectory();
    const events = detectEvents(trajectory);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].time).toBeGreaterThanOrEqual(events[i - 1].time);
    }
  });

  it("each event has required fields", () => {
    const trajectory = createMockTrajectory();
    const events = detectEvents(trajectory);
    for (const event of events) {
      expect(event.id).toBeTruthy();
      expect(event.type).toBeTruthy();
      expect(event.label).toBeTruthy();
      expect(event.description).toBeTruthy();
      expect(event.time).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns at least 5 events for a valid trajectory", () => {
    const trajectory = createMockTrajectory();
    const events = detectEvents(trajectory);
    expect(events.length).toBeGreaterThanOrEqual(5);
  });

  it("returns empty array for empty trajectory", () => {
    const events = detectEvents([]);
    expect(events.length).toBe(0);
  });

  it("detects descent begins event after apogee", () => {
    const trajectory = createMockTrajectory();
    const events = detectEvents(trajectory);
    const apogee = events.find((e) => e.type === "apogee");
    const descent = events.find((e) => e.type === "descent_begins");
    expect(apogee).toBeDefined();
    expect(descent).toBeDefined();
    expect(descent!.time).toBeGreaterThanOrEqual(apogee!.time);
  });
});

// ── 2. Phase Detection ───────────────────────────────────────────

describe("Phase detection", () => {
  it("returns phase segments for valid trajectory", () => {
    const trajectory = createMockTrajectory();
    const events = detectEvents(trajectory);
    const phases = detectPhases(trajectory, events);
    expect(phases.length).toBeGreaterThan(0);
  });

  it("powered flight phase starts at time 0", () => {
    const trajectory = createMockTrajectory();
    const events = detectEvents(trajectory);
    const phases = detectPhases(trajectory, events);
    const powered = phases.find((p) => p.phase === "powered");
    expect(powered).toBeDefined();
    expect(powered!.startTime).toBe(0);
  });

  it("phase colors are defined for all phases", () => {
    const allPhases = ["pre_launch", "powered", "water_exhaust", "coast", "apogee", "descent", "landed"];
    for (const phase of allPhases) {
      expect(PHASE_COLORS[phase as keyof typeof PHASE_COLORS]).toBeDefined();
      expect(PHASE_LABELS[phase as keyof typeof PHASE_LABELS]).toBeDefined();
    }
  });
});

// ── 3. Timeline Generation ──────────────────────────────────────

describe("Timeline generation", () => {
  it("generates timeline with entries, phases, and markers", () => {
    const trajectory = createMockTrajectory();
    const timeline = generateTimeline(trajectory);
    expect(timeline.entries.length).toBeGreaterThan(0);
    expect(timeline.phases.length).toBeGreaterThan(0);
    expect(timeline.markers.length).toBeGreaterThan(0);
  });

  it("markers match events count", () => {
    const trajectory = createMockTrajectory();
    const events = detectEvents(trajectory);
    const timeline = generateTimeline(trajectory);
    expect(timeline.markers.length).toBe(events.length);
  });

  it("entries are sequentially indexed", () => {
    const trajectory = createMockTrajectory();
    const timeline = generateTimeline(trajectory);
    for (let i = 0; i < timeline.entries.length; i++) {
      expect(timeline.entries[i].index).toBe(i + 1);
    }
  });
});

// ── 4. Format Helpers ────────────────────────────────────────────

describe("Format helpers", () => {
  it("formatTime shows T+ prefix", () => {
    expect(formatTime(1.5)).toContain("T+");
    expect(formatTime(0.5)).toContain("T+");
    expect(formatTime(0)).toContain("T+");
  });

  it("formatTime shows ms for sub-second times", () => {
    const formatted = formatTime(0.05);
    expect(formatted).toContain("ms");
    expect(formatted).toContain("T+");
  });

  it("formatTime shows seconds for >1s times", () => {
    const formatted = formatTime(3.25);
    expect(formatted).toContain("s");
    expect(formatted).not.toContain("ms");
  });

  it("formatAltitude shows km for high values", () => {
    expect(formatAltitude(1500)).toContain("km");
    expect(formatAltitude(100)).toContain("m");
    expect(formatAltitude(100)).not.toContain("km");
  });

  it("formatVelocity shows m/s", () => {
    expect(formatVelocity(25)).toContain("m/s");
  });
});

// ── 5. Flight Score ──────────────────────────────────────────────

describe("Flight score", () => {
  it("computes overall score between 0 and 100", () => {
    const summary = createSimulationSummary();
    const score = computeFlightScore(summary, 35, 75, 1.5);
    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(100);
  });

  it("returns a valid grade (A-F)", () => {
    const summary = createSimulationSummary();
    const score = computeFlightScore(summary, 35, 75, 1.5);
    expect(["A", "B", "C", "D", "F"]).toContain(score.grade);
  });

  it("returns 6 sub-scores", () => {
    const summary = createSimulationSummary();
    const score = computeFlightScore(summary, 35, 75, 1.5);
    expect(score.subScores.length).toBe(6);
  });

  it("sub-scores are between 0 and 100", () => {
    const summary = createSimulationSummary();
    const score = computeFlightScore(summary, 35, 75, 1.5);
    for (const sub of score.subScores) {
      expect(sub.score).toBeGreaterThanOrEqual(0);
      expect(sub.score).toBeLessThanOrEqual(100);
    }
  });

  it("sub-score weights sum to 100", () => {
    const summary = createSimulationSummary();
    const score = computeFlightScore(summary, 35, 75, 1.5);
    const totalWeight = score.subScores.reduce((sum, s) => sum + s.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it("excellent altitude (>100m) scores A or B", () => {
    const summary = { ...createSimulationSummary(), maxAltitude: 120 };
    const score = computeFlightScore(summary, 35, 75, 2.5);
    expect(score.grade === "A" || score.grade === "B").toBe(true);
  });

  it("low altitude scores lower", () => {
    const summary = { ...createSimulationSummary(), maxAltitude: 5 };
    const score = computeFlightScore(summary, 80, 75, 0.2);
    expect(score.overall).toBeLessThan(70);
  });

  it("optimal water fill (25-40%) gives higher score", () => {
    const summary = createSimulationSummary();
    const score1 = computeFlightScore(summary, 35, 75, 1.5);
    const score2 = computeFlightScore(summary, 80, 75, 1.5);
    expect(score1.overall).toBeGreaterThanOrEqual(score2.overall);
  });

  it("returns explanations for each sub-score", () => {
    const summary = createSimulationSummary();
    const score = computeFlightScore(summary, 35, 75, 1.5);
    expect(score.explanations.length).toBe(6);
    for (const exp of score.explanations) {
      expect(exp.name).toBeTruthy();
      expect(exp.message).toBeTruthy();
      expect(["positive", "neutral", "negative"]).toContain(exp.type);
    }
  });

  it("getGradeColor returns CSS color class", () => {
    expect(getGradeColor("A")).toContain("text");
    expect(getGradeColor("F")).toContain("text");
  });

  it("has a summary message", () => {
    const summary = createSimulationSummary();
    const score = computeFlightScore(summary, 35, 75, 1.5);
    expect(score.summary.length).toBeGreaterThan(10);
  });

  it("optimal parameters score grade A", () => {
    const summary = { ...createSimulationSummary(), maxAltitude: 150, flightTime: 12, maxVelocity: 35 };
    const score = computeFlightScore(summary, 33, 75, 2.5);
    expect(score.grade).toBe("A");
  });
});

// ── 6. Mission Summary ──────────────────────────────────────────

describe("Mission summary", () => {
  it("generates mission summary from trajectory and score", () => {
    const trajectory = createMockTrajectory();
    const summary = createSimulationSummary();
    const score = computeFlightScore(summary, 35, 75, 1.5);
    const events = detectEvents(trajectory);
    const mission = generateMissionSummary(summary, trajectory, score, events);

    expect(mission).toBeDefined();
    expect(mission.performance).toBeDefined();
    expect(mission.ratings).toBeDefined();
    expect(mission.observations.length).toBeGreaterThan(0);
  });

  it("performance metrics are positive", () => {
    const trajectory = createMockTrajectory();
    const summary = createSimulationSummary();
    const score = computeFlightScore(summary, 35, 75, 1.5);
    const events = detectEvents(trajectory);
    const mission = generateMissionSummary(summary, trajectory, score, events);

    expect(mission.performance.maxAltitude).toBeGreaterThan(0);
    expect(mission.performance.flightTime).toBeGreaterThan(0);
    expect(mission.performance.maxVelocity).toBeGreaterThan(0);
    expect(mission.performance.maxThrust).toBeGreaterThanOrEqual(0);
    expect(mission.performance.totalImpulse).toBeGreaterThanOrEqual(0);
  });

  it("returns valid flight rating", () => {
    const trajectory = createMockTrajectory();
    const summary = createSimulationSummary();
    const score = computeFlightScore(summary, 35, 75, 1.5);
    const events = detectEvents(trajectory);
    const mission = generateMissionSummary(summary, trajectory, score, events);

    expect(["excellent", "good", "fair", "poor", "critical"]).toContain(mission.flightRating);
  });

  it("phase durations are computed correctly", () => {
    const trajectory = createMockTrajectory();
    const summary = createSimulationSummary();
    const score = computeFlightScore(summary, 35, 75, 1.5);
    const events = detectEvents(trajectory);
    const mission = generateMissionSummary(summary, trajectory, score, events);

    // Phase durations come from event detection, which may differ from summary
    expect(mission.phaseDurations.totalFlight).toBeGreaterThan(0);
    expect(mission.phaseDurations.poweredFlight).toBeGreaterThanOrEqual(0);
    expect(mission.phaseDurations.coast).toBeGreaterThanOrEqual(0);
    expect(mission.phaseDurations.descent).toBeGreaterThanOrEqual(0);
    expect(mission.phaseDurations.poweredFlight + mission.phaseDurations.coast + mission.phaseDurations.descent)
      .toBeLessThanOrEqual(mission.phaseDurations.totalFlight + 0.01);
  });

  it("getFlightRatingLabel returns readable labels", () => {
    expect(getFlightRatingLabel("excellent")).toBe("Excellent");
    expect(getFlightRatingLabel("good")).toBe("Good");
    expect(getFlightRatingLabel("fair")).toBe("Fair");
    expect(getFlightRatingLabel("poor")).toBe("Poor");
    expect(getFlightRatingLabel("critical")).toBe("Critical");
  });

  it("getFlightRatingColor returns CSS color class", () => {
    expect(getFlightRatingColor("excellent")).toContain("text");
    expect(getFlightRatingColor("critical")).toContain("text");
  });
});

// ── 7. Integration with Chart Markers ────────────────────────────

describe("Chart markers", () => {
  it("generates markers with required fields", () => {
    const trajectory = createMockTrajectory();
    const events = detectEvents(trajectory);
    const markers = getChartMarkers(events);

    expect(markers.length).toBeGreaterThan(0);
    for (const marker of markers) {
      expect(marker.time).toBeGreaterThanOrEqual(0);
      expect(marker.label).toBeTruthy();
      expect(marker.type).toBeTruthy();
      expect(marker.color).toBeTruthy();
    }
  });

  it("marker count matches event count", () => {
    const trajectory = createMockTrajectory();
    const events = detectEvents(trajectory);
    const markers = getChartMarkers(events);
    expect(markers.length).toBe(events.length);
  });

  it("markers are sorted by time", () => {
    const trajectory = createMockTrajectory();
    const events = detectEvents(trajectory);
    const markers = getChartMarkers(events);
    for (let i = 1; i < markers.length; i++) {
      expect(markers[i].time).toBeGreaterThanOrEqual(markers[i - 1].time - 0.001);
    }
  });
});
