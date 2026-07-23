/**
 * SOARSim v2.0 API Client
 *
 * Typed client for the backend simulation and validation API.
 * v2.0 adds validation endpoints for comparing simulations against real flight data.
 * All physics lives on the server — this layer only serializes/deserializes.
 */

// ── Request Types (v2.0 nested structure) ─────────────────────────

export interface RocketParams {
  dragCoefficient: number;
  crossSectionalArea: number;
}

export interface WaterRocketPropulsion {
  type: "water";
  dryMass: number;
  bottleVolume: number;
  waterVolume: number;
  initialPressure: number;
  nozzleDiameter: number;
}

export interface LaunchParams {
  angle: number;
}

export interface SimulateRequest {
  rocket: RocketParams;
  propulsion: WaterRocketPropulsion;
  launch: LaunchParams;
}

// ── Response Types (v0.2 enhanced) ────────────────────────────────

export interface TrajectoryPoint {
  time: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  thrust: number;
  mass: number;
  pressure: number;
  waterRemaining: number;
  // v2.5: Extended fields
  machNumber?: number;
  dynamicPressure?: number;
  totalEnergy?: number;
  kineticEnergy?: number;
  potentialEnergy?: number;
}

export interface SimulationSummary {
  maxAltitude: number;
  flightTime: number;
  maxVelocity: number;
  maxAcceleration: number;
  // v2.5: Extended fields
  maxMach: number;
  maxDynamicPressure: number;
  totalImpulse: number;
  specificImpulse: number;
  maxKineticEnergy: number;
  maxPotentialEnergy: number;
  landingDistance: number;
  landingX: number;
  landingY: number;
}

export interface SimulateResponse {
  summary: SimulationSummary;
  trajectory: TrajectoryPoint[];
}

// ── Validation Types (v0.3) ───────────────────────────────────────

export interface FlightDataRecord {
  id: string;
  date: string;
  notes: string;
  flightTime?: number;
  maxAltitude?: number;
  maxVelocity?: number;
  landingDistance?: number;
  launchAngle?: number;
  pressure?: number;
  waterVolume?: number;
  rocketMass?: number;
  source: string;
}

export interface CreateFlightRequest {
  notes?: string;
  flightTime?: number;
  maxAltitude?: number;
  maxVelocity?: number;
  landingDistance?: number;
  launchAngle?: number;
  pressure?: number;
  waterVolume?: number;
  rocketMass?: number;
  source?: string;
  csvRaw?: string;
}

export interface FlightDataResponse {
  flight: FlightDataRecord;
}

export interface FlightHistoryResponse {
  flights: FlightDataRecord[];
  total: number;
}

export interface MetricComparison {
  metricName: string;
  predicted: number;
  actual: number;
  absError: number;
  pctError?: number;
  unit: string;
}

export interface ValidationSummary {
  overallAccuracy: number;
  altitudeError?: number;
  flightTimeError?: number;
  velocityError?: number;
}

export interface ValidateRequest {
  simulation: SimulateRequest;
  flightId: string;
}

export interface ValidateResponse {
  flight: FlightDataRecord;
  simulation: SimulationSummary;
  metrics: MetricComparison[];
  summary: ValidationSummary;
  notes: string[];
}

// ── API Error ─────────────────────────────────────────────────────

export interface ApiError {
  detail: string;
}

// ── API Client ────────────────────────────────────────────────────

/**
 * Determine the backend API base URL based on the environment.
 * In development, point to the local FastAPI server.
 * In production, use the deployed backend URL.
 */
function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Default to local development server
  return "http://127.0.0.1:8000";
}

/**
 * Run a rocket flight simulation via the backend API.
 *
 * @param params - Rocket and propulsion configuration parameters.
 * @returns Simulation results including summary and full trajectory.
 * @throws Error if the API request fails.
 */
export async function runSimulation(
  params: SimulateRequest
): Promise<SimulateResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/simulate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    let detail = `Server error (${response.status})`;
    try {
      const errorBody: ApiError = await response.json();
      if (errorBody.detail) {
        detail = errorBody.detail;
      }
    } catch {
      // Unable to parse error response, use default message
    }
    throw new Error(detail);
  }

  return response.json() as Promise<SimulateResponse>;
}

// ── Validation API Functions (v0.3) ───────────────────────────────

/**
 * Create a new flight data record.
 *
 * @param request - Flight data to store (manual or CSV).
 * @returns The created flight record with assigned ID.
 * @throws Error if the API request fails.
 */
export async function createFlight(
  request: CreateFlightRequest
): Promise<FlightDataResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/flights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let detail = `Server error (${response.status})`;
    try {
      const errorBody: ApiError = await response.json();
      if (errorBody.detail) {
        detail = errorBody.detail;
      }
    } catch {
      // Unable to parse error response
    }
    throw new Error(detail);
  }

  return response.json() as Promise<FlightDataResponse>;
}

/**
 * List all flight data records.
 *
 * @returns All stored flight records, newest first.
 * @throws Error if the API request fails.
 */
export async function listFlights(): Promise<FlightHistoryResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/flights`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let detail = `Server error (${response.status})`;
    try {
      const errorBody: ApiError = await response.json();
      if (errorBody.detail) {
        detail = errorBody.detail;
      }
    } catch {
      // Unable to parse error response
    }
    throw new Error(detail);
  }

  return response.json() as Promise<FlightHistoryResponse>;
}

/**
 * Get a specific flight data record by ID.
 *
 * @param flightId - The unique identifier of the flight record.
 * @returns The flight record.
 * @throws Error if the API request fails.
 */
export async function getFlight(
  flightId: string
): Promise<FlightDataResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/flights/${flightId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let detail = `Server error (${response.status})`;
    try {
      const errorBody: ApiError = await response.json();
      if (errorBody.detail) {
        detail = errorBody.detail;
      }
    } catch {
      // Unable to parse error response
    }
    throw new Error(detail);
  }

  return response.json() as Promise<FlightDataResponse>;
}

/**
 * Delete a flight data record by ID.
 *
 * @param flightId - The unique identifier of the flight record.
 * @throws Error if the API request fails.
 */
export async function deleteFlight(flightId: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/flights/${flightId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let detail = `Server error (${response.status})`;
    try {
      const errorBody: ApiError = await response.json();
      if (errorBody.detail) {
        detail = errorBody.detail;
      }
    } catch {
      // Unable to parse error response
    }
    throw new Error(detail);
  }
}

/**
 * Validate a simulation against real flight data.
 *
 * @param request - Simulation parameters and flight ID to compare against.
 * @returns Full validation results with per-metric comparison.
 * @throws Error if the API request fails.
 */
export async function validateSimulation(
  request: ValidateRequest
): Promise<ValidateResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let detail = `Server error (${response.status})`;
    try {
      const errorBody: ApiError = await response.json();
      if (errorBody.detail) {
        detail = errorBody.detail;
      }
    } catch {
      // Unable to parse error response
    }
    throw new Error(detail);
  }

  return response.json() as Promise<ValidateResponse>;
}
