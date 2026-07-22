/**
 * SOARSim v2.0 Workspace API Client
 *
 * Typed client for the workspace backend: rocket library, history,
 * comparison, projects, reports, dashboard, and search.
 *
 * All persistence lives on the server (local JSON files).
 * This layer only serializes/deserializes.
 */

const BASE = getApiBaseUrl();

function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  return "http://127.0.0.1:8000";
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    let detail = `Server error (${res.status})`;
    try {
      const body = await res.json();
      if (body.detail) detail = body.detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────────

export interface RocketDesign {
  id: string;
  name: string;
  description: string;
  tags: string[];
  dragCoefficient: number;
  crossSectionalArea: number;
  propulsionType: string;
  dryMass: number;
  bottleVolume: number;
  waterVolume: number;
  initialPressure: number;
  nozzleDiameter: number;
  launchAngle: number;
  createdAt: string;
  modifiedAt: string;
  version: number;
  isFavorite: boolean;
}

export interface SimulationRecord {
  id: string;
  rocketId: string | null;
  rocketName: string;
  date: string;
  physicsVersion: string;
  request: Record<string, unknown>;
  maxAltitude: number;
  maxVelocity: number;
  maxAcceleration: number;
  flightTime: number;
  weather: Record<string, unknown>;
  tags: string[];
  notes: string;
}

export interface ValidationRecord {
  id: string;
  simulationId: string | null;
  flightId: string | null;
  date: string;
  predicted: Record<string, unknown>;
  actual: Record<string, unknown>;
  metrics: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
  notes: string[];
}

export interface Report {
  id: string;
  title: string;
  rocketName: string;
  rocketId: string | null;
  createdAt: string;
  rocketOverview: Record<string, unknown>;
  simulationParameters: Record<string, unknown>;
  performanceMetrics: Record<string, unknown>;
  trajectoryData: Array<Record<string, unknown>>;
  validationSummary: Record<string, unknown> | null;
  engineeringNotes: string[];
}

export interface ComparisonMetric {
  metricName: string;
  unit: string;
  values: Record<string, number>;
  bestRocketId: string | null;
}

export interface ComparisonResult {
  rocketIds: string[];
  rocketNames: Record<string, string>;
  metrics: ComparisonMetric[];
  summaryNotes: string[];
}

export interface DashboardData {
  recentRockets: RocketDesign[];
  recentSimulations: SimulationRecord[];
  recentValidations: ValidationRecord[];
  recentReports: Report[];
  favoriteRockets: RocketDesign[];
  stats: {
    totalRockets: number;
    totalSimulations: number;
    totalValidations: number;
    totalReports: number;
  };
}

// ── Rocket Library ───────────────────────────────────────────────

export async function listRockets(params?: {
  query?: string;
  tags?: string;
  favorites?: boolean;
}): Promise<{ rockets: RocketDesign[]; total: number }> {
  const sp = new URLSearchParams();
  if (params?.query) sp.set("query", params.query);
  if (params?.tags) sp.set("tags", params.tags);
  if (params?.favorites) sp.set("favorites", "true");
  const qs = sp.toString();
  return api(`/api/workspace/rockets${qs ? `?${qs}` : ""}`);
}

export async function createRocket(data: {
  name?: string;
  description?: string;
  tags?: string[];
  dragCoefficient?: number;
  crossSectionalArea?: number;
  dryMass?: number;
  bottleVolume?: number;
  waterVolume?: number;
  initialPressure?: number;
  nozzleDiameter?: number;
  launchAngle?: number;
}): Promise<{ rocket: RocketDesign }> {
  return api("/api/workspace/rockets", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getRocket(id: string): Promise<{ rocket: RocketDesign }> {
  return api(`/api/workspace/rockets/${id}`);
}

export async function updateRocket(
  id: string,
  data: Partial<RocketDesign>
): Promise<{ rocket: RocketDesign }> {
  return api(`/api/workspace/rockets/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRocket(id: string): Promise<{ status: string }> {
  return api(`/api/workspace/rockets/${id}`, { method: "DELETE" });
}

export async function duplicateRocket(
  id: string,
  name?: string
): Promise<{ rocket: RocketDesign }> {
  return api(`/api/workspace/rockets/${id}/duplicate`, {
    method: "POST",
    body: JSON.stringify(name ? { name } : {}),
  });
}

export async function toggleFavorite(
  id: string
): Promise<{ rocket: RocketDesign }> {
  return api(`/api/workspace/rockets/${id}/favorite`, { method: "POST" });
}

export async function exportRocket(id: string): Promise<unknown> {
  return api(`/api/workspace/rockets/${id}/export`);
}

export async function importRocket(
  data: unknown
): Promise<{ rocket: RocketDesign }> {
  return api("/api/workspace/rockets/import", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Tags ─────────────────────────────────────────────────────────

export async function listTags(): Promise<{ tags: string[] }> {
  return api("/api/workspace/tags");
}

// ── Simulation History ───────────────────────────────────────────

export async function saveSimulation(data: {
  rocketId?: string;
  rocketName?: string;
  request: Record<string, unknown>;
  maxAltitude: number;
  maxVelocity: number;
  maxAcceleration: number;
  flightTime: number;
  tags?: string[];
  notes?: string;
}): Promise<{ simulation: SimulationRecord }> {
  return api("/api/workspace/simulations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listSimulations(params?: {
  rocketId?: string;
  tags?: string;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<{ simulations: SimulationRecord[]; total: number }> {
  const sp = new URLSearchParams();
  if (params?.rocketId) sp.set("rocket_id", params.rocketId);
  if (params?.tags) sp.set("tags", params.tags);
  if (params?.query) sp.set("query", params.query);
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.offset) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return api(`/api/workspace/simulations${qs ? `?${qs}` : ""}`);
}

export async function deleteSimulation(id: string): Promise<{ status: string }> {
  return api(`/api/workspace/simulations/${id}`, { method: "DELETE" });
}

// ── Validation History ───────────────────────────────────────────

export async function saveValidation(data: {
  simulationId?: string;
  flightId?: string;
  predicted: Record<string, unknown>;
  actual: Record<string, unknown>;
  metrics: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
  notes: string[];
}): Promise<{ validation: ValidationRecord }> {
  return api("/api/workspace/validations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listValidations(params?: {
  simulationId?: string;
  flightId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ validations: ValidationRecord[]; total: number }> {
  const sp = new URLSearchParams();
  if (params?.simulationId) sp.set("simulation_id", params.simulationId);
  if (params?.flightId) sp.set("flight_id", params.flightId);
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.offset) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return api(`/api/workspace/validations${qs ? `?${qs}` : ""}`);
}

export async function deleteValidation(id: string): Promise<{ status: string }> {
  return api(`/api/workspace/validations/${id}`, { method: "DELETE" });
}

// ── Comparison ───────────────────────────────────────────────────

export async function compareRockets(
  rocketIds: string[]
): Promise<ComparisonResult> {
  return api("/api/workspace/compare", {
    method: "POST",
    body: JSON.stringify({ rocketIds }),
  });
}

// ── Projects (.soarsim files) ────────────────────────────────────

export async function exportProject(data: {
  rocketIds: string[];
  name?: string;
  description?: string;
}): Promise<unknown> {
  return api("/api/workspace/projects/export", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function importProject(
  data: unknown
): Promise<{ project: Record<string, unknown> }> {
  return api("/api/workspace/projects/import", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listProjects(): Promise<{
  projects: Array<Record<string, unknown>>;
}> {
  return api("/api/workspace/projects");
}

// ── Reports ──────────────────────────────────────────────────────

export async function generateReport(data: {
  rocketName: string;
  rocketId?: string;
  simulationRequest: Record<string, unknown>;
  simulationSummary: Record<string, unknown>;
  trajectory?: Array<Record<string, unknown>>;
  validation?: Record<string, unknown>;
  notes?: string[];
}): Promise<{ report: Report }> {
  return api("/api/workspace/reports", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listReports(): Promise<{
  reports: Report[];
  total: number;
}> {
  return api("/api/workspace/reports");
}

export async function getReport(id: string): Promise<{ report: Report }> {
  return api(`/api/workspace/reports/${id}`);
}

export async function getReportHtml(id: string): Promise<string> {
  const res = await fetch(`${BASE}/api/workspace/reports/${id}/html`);
  if (!res.ok) throw new Error(`Failed to fetch report HTML (${res.status})`);
  return res.text();
}

export async function getReportMarkdown(id: string): Promise<string> {
  const res = await api<{ markdown: string }>(
    `/api/workspace/reports/${id}/markdown`
  );
  return res.markdown;
}

export async function deleteReport(id: string): Promise<{ status: string }> {
  return api(`/api/workspace/reports/${id}`, { method: "DELETE" });
}

// ── Dashboard ────────────────────────────────────────────────────

export async function getDashboard(): Promise<DashboardData> {
  return api("/api/workspace/dashboard");
}

// ── Global Search ────────────────────────────────────────────────

export async function globalSearch(q: string): Promise<{
  rockets: RocketDesign[];
  simulations: SimulationRecord[];
  reports: Report[];
}> {
  return api(`/api/workspace/search?q=${encodeURIComponent(q)}`);
}
