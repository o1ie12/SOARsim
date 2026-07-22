/**
 * Analysis API client for SOARSim v2.0.
 *
 * Provides typed functions for calling the analysis endpoints:
 * - Parameter sweeps
 * - Monte Carlo uncertainty analysis
 * - Design of Experiments
 * - Statistics
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ── Types ──────────────────────────────────────────────────────────

export interface SweepRequest {
  parameter: string;
  values: number[];
  baseConfig: Record<string, number>;
}

export interface SweepResult {
  parameterName: string;
  parameterUnit: string;
  parameterValues: number[];
  results: {
    parameterValue: number;
    maxAltitude: number;
    flightTime: number;
    maxVelocity: number;
    maxAcceleration: number;
    maxDynamicPressure: number;
    landingDistance: number;
  }[];
  statistics: {
    bestIndex: number;
    bestValue: number;
    meanAltitude: number;
    stdAltitude: number;
    minAltitude: number;
    maxAltitude: number;
    sensitivity: number;
  };
}

export interface ToleranceConfig {
  name: string;
  nominal: number;
  tolerancePct: number;
  distribution?: string;
}

export interface MonteCarloRequest {
  tolerances: ToleranceConfig[];
  nRuns: number;
  seed?: number;
  altitudeThreshold?: number;
}

export interface MonteCarloResult {
  nRuns: number;
  tolerances: ToleranceConfig[];
  altitudeStats: {
    count: number;
    mean: number;
    std: number;
    min: number;
    max: number;
    median: number;
    q25: number;
    q75: number;
  };
  altitudeCI: {
    mean: number;
    lower: number;
    upper: number;
    confidenceLevel: number;
  };
  flightTimeStats: { mean: number; std: number; min: number; max: number };
  velocityStats: { mean: number; std: number; min: number; max: number };
  landingDispersion: {
    meanX: number;
    meanY: number;
    stdX: number;
    stdY: number;
    circularErrorProbability: number;
    maxRange: number;
    minRange: number;
  };
  probabilityAboveThreshold: Record<string, number>;
  runs: {
    runIndex: number;
    parameters: Record<string, number>;
    maxAltitude: number;
    flightTime: number;
    maxVelocity: number;
    landingDistance: number;
  }[];
}

export interface FactorLevel {
  name: string;
  levels: number[];
  unit?: string;
}

export interface DoERequest {
  factors: FactorLevel[];
  baseConfig: Record<string, number>;
}

export interface DoEResult {
  designType: string;
  totalRuns: number;
  bestIndex: number;
  worstIndex: number;
  factors: FactorLevel[];
  points: {
    runIndex: number;
    parameters: Record<string, number>;
    maxAltitude: number;
    flightTime: number;
    maxVelocity: number;
    landingDistance: number;
    rank: number;
  }[];
}

export interface SweepParameter {
  name: string;
  unit: string;
  min: number;
  max: number;
  default: number;
}

// ── API Functions ──────────────────────────────────────────────────

export async function runSweep(request: SweepRequest): Promise<SweepResult> {
  const response = await fetch(`${API_BASE}/api/analysis/sweep`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Sweep failed" }));
    throw new Error(error.detail || "Sweep failed");
  }
  return response.json();
}

export async function listSweepParameters(): Promise<SweepParameter[]> {
  const response = await fetch(`${API_BASE}/api/analysis/sweep/parameters`);
  if (!response.ok) throw new Error("Failed to list parameters");
  const data = await response.json();
  return data.parameters;
}

export async function runMonteCarlo(request: MonteCarloRequest): Promise<MonteCarloResult> {
  const response = await fetch(`${API_BASE}/api/analysis/montecarlo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Monte Carlo failed" }));
    throw new Error(error.detail || "Monte Carlo failed");
  }
  return response.json();
}

export async function runFullFactorial(request: DoERequest): Promise<DoEResult> {
  const response = await fetch(`${API_BASE}/api/analysis/experiments/full-factorial`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Experiment failed" }));
    throw new Error(error.detail || "Experiment failed");
  }
  return response.json();
}
