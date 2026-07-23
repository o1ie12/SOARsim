/**
 * SOAR Studio — Rocket Designer Types
 *
 * Defines the complete data model for the visual rocket designer.
 * Separated from rendering, physics, and state management.
 */

// ── Rocket Component Geometry ────────────────────────────────────

export interface NoseConeGeometry {
  type: "conical" | "ogive" | "parabolic" | "elliptical";
  length: number; // meters
  baseRadius: number; // derived from body diameter
}

export interface BodyTubeGeometry {
  length: number; // meters
  outerDiameter: number; // meters
  innerDiameter: number; // meters (wall thickness implied)
  wallThickness: number; // meters
}

export interface BottleGeometry {
  length: number; // meters
  diameter: number; // meters
  volume: number; // liters (display)
  wallThickness: number; // meters
}

export interface FinGeometry {
  count: number; // 3 or 4 typical
  height: number; // meters (radial extent from body)
  span: number; // meters (chord length at root)
  tipSpan: number; // meters (chord length at tip)
  sweep: number; // meters (leading edge sweep)
  thickness: number; // meters
  position: number; // meters from tail
}

export interface NozzleGeometry {
  inletDiameter: number; // meters
  throatDiameter: number; // meters
  exitDiameter: number; // meters
  length: number; // meters
}

export interface RecoveryGeometry {
  type: "parachute" | "streamer" | "none";
  compartmentLength: number; // meters
}

// ── Material Properties ──────────────────────────────────────────

export interface MaterialProperties {
  density: number; // kg/m³
  name: string;
}

// ── Rocket Component ─────────────────────────────────────────────

export interface RocketComponent {
  id: string;
  type: "noseCone" | "bodyTube" | "bottle" | "fins" | "nozzle" | "recovery";
  name: string;
  visible: boolean;
  geometry: NoseConeGeometry | BodyTubeGeometry | BottleGeometry | FinGeometry | NozzleGeometry | RecoveryGeometry;
  material: MaterialProperties;
  mass: number; // kg
}

// ── Complete Rocket Design ───────────────────────────────────────

export interface RocketDesignState {
  id: string;
  name: string;
  description: string;
  version: number;
  createdAt: string;
  modifiedAt: string;

  // Components
  noseCone: RocketComponent & { geometry: NoseConeGeometry };
  bodyTube: RocketComponent & { geometry: BodyTubeGeometry };
  bottle: RocketComponent & { geometry: BottleGeometry };
  fins: RocketComponent & { geometry: FinGeometry };
  nozzle: RocketComponent & { geometry: NozzleGeometry };
  recovery: RocketComponent & { geometry: RecoveryGeometry };

  // Aerodynamics
  dragCoefficient: number;

  // Launch parameters
  launchAngle: number; // degrees

  // Propulsion (water rocket specific)
  waterVolume: number; // m³
  initialPressure: number; // Pa
}

// ── Calculated Properties ────────────────────────────────────────

export interface RocketCalculations {
  totalLength: number; // meters
  bodyDiameter: number; // meters
  noseLength: number; // meters
  bodyLength: number; // meters
  crossSectionalArea: number; // m²
  totalMass: number; // kg
  dryMass: number; // kg (without water)
  waterMass: number; // kg
  estimatedInternalVolume: number; // m³
  waterFillPercentage: number; // 0-100
  centerOfGravity: number; // meters from tail
  stabilityMargin: number; // calibers (placeholder)
  aspectRatio: number; // length/diameter
  finenessRatio: number; // length/diameter
}

// ── Validation ───────────────────────────────────────────────────

export interface ValidationWarning {
  id: string;
  type: "error" | "warning" | "info";
  message: string;
  component?: string;
}

// ── State Management ─────────────────────────────────────────────

export type RocketDesignerAction =
  | { type: "SET_NOSE_CONE"; payload: Partial<NoseConeGeometry> }
  | { type: "SET_BODY_TUBE"; payload: Partial<BodyTubeGeometry> }
  | { type: "SET_BOTTLE"; payload: Partial<BottleGeometry> }
  | { type: "SET_FINS"; payload: Partial<FinGeometry> }
  | { type: "SET_NOZZLE"; payload: Partial<NozzleGeometry> }
  | { type: "SET_RECOVERY"; payload: Partial<RecoveryGeometry> }
  | { type: "SET_DRAG_COEFFICIENT"; payload: number }
  | { type: "SET_LAUNCH_ANGLE"; payload: number }
  | { type: "SET_WATER_VOLUME"; payload: number }
  | { type: "SET_INITIAL_PRESSURE"; payload: number }
  | { type: "SET_NAME"; payload: string }
  | { type: "SET_DESCRIPTION"; payload: string }
  | { type: "LOAD_DESIGN"; payload: RocketDesignState }
  | { type: "RESET_TO_DEFAULT" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SELECT_COMPONENT"; payload: string | null }
  | { type: "SET_GRID_ENABLED"; payload: boolean }
  | { type: "SET_SNAP_TO_GRID"; payload: boolean }
  | { type: "SET_GRID_SPACING"; payload: number }
  | { type: "SET_UNIT_SYSTEM"; payload: "metric" | "imperial" };

export interface RocketDesignerState {
  current: RocketDesignState;
  history: RocketDesignState[];
  historyIndex: number;
  selectedComponent: string | null;
  dragState: DragState | null;
}

export interface DragState {
  component: string;
  property: string;
  startValue: number;
  startMouseY: number;
}

export interface CanvasViewState {
  zoom: number;
  panX: number;
  panY: number;
}

// ── Preset Designs ───────────────────────────────────────────────

export interface RocketPreset {
  name: string;
  description: string;
  design: RocketDesignState;
}

// ── Utility: Unique ID ───────────────────────────────────────────

export function generateId(): string {
  return `rocket_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ── Unit System ──────────────────────────────────────────────────

export type UnitSystem = "metric" | "imperial";
