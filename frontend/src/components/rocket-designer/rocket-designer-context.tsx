/**
 * SOARSim Rocket Designer State Management
 *
 * React Context + useReducer with undo/redo support.
 * All state changes go through the reducer for predictability.
 */

"use client";

import React, { createContext, useContext, useReducer, useCallback, type ReactNode } from "react";
import type {
  RocketDesignState,
  RocketDesignerAction,
  NoseConeGeometry,
  BodyTubeGeometry,
  BottleGeometry,
  FinGeometry,
  NozzleGeometry,
  RecoveryGeometry,
} from "@/lib/rocket-designer-types";
import { createDefaultDesign, calculateRocketProperties, validateDesign } from "@/lib/rocket-geometry";

// ── History State ────────────────────────────────────────────────

interface DesignerHistory {
  current: RocketDesignState;
  past: RocketDesignState[];
  future: RocketDesignState[];
  selectedComponent: string | null;
}

// ── Reducer ──────────────────────────────────────────────────────

function rocketReducer(
  state: DesignerHistory,
  action: RocketDesignerAction
): DesignerHistory {
  switch (action.type) {
    case "SET_NOSE_CONE": {
      const updated = {
        ...state.current,
        modifiedAt: new Date().toISOString(),
        noseCone: {
          ...state.current.noseCone,
          geometry: {
            ...state.current.noseCone.geometry,
            ...action.payload,
          } as NoseConeGeometry,
        },
      };
      return {
        ...state,
        current: updated,
        past: [...state.past, state.current],
        future: [],
      };
    }

    case "SET_BODY_TUBE": {
      const updated = {
        ...state.current,
        modifiedAt: new Date().toISOString(),
        bodyTube: {
          ...state.current.bodyTube,
          geometry: {
            ...state.current.bodyTube.geometry,
            ...action.payload,
          } as BodyTubeGeometry,
        },
      };
      return {
        ...state,
        current: updated,
        past: [...state.past, state.current],
        future: [],
      };
    }

    case "SET_BOTTLE": {
      const updated = {
        ...state.current,
        modifiedAt: new Date().toISOString(),
        bottle: {
          ...state.current.bottle,
          geometry: {
            ...state.current.bottle.geometry,
            ...action.payload,
          } as BottleGeometry,
        },
      };
      return {
        ...state,
        current: updated,
        past: [...state.past, state.current],
        future: [],
      };
    }

    case "SET_FINS": {
      const updated = {
        ...state.current,
        modifiedAt: new Date().toISOString(),
        fins: {
          ...state.current.fins,
          geometry: {
            ...state.current.fins.geometry,
            ...action.payload,
          } as FinGeometry,
        },
      };
      return {
        ...state,
        current: updated,
        past: [...state.past, state.current],
        future: [],
      };
    }

    case "SET_NOZZLE": {
      const updated = {
        ...state.current,
        modifiedAt: new Date().toISOString(),
        nozzle: {
          ...state.current.nozzle,
          geometry: {
            ...state.current.nozzle.geometry,
            ...action.payload,
          } as NozzleGeometry,
        },
      };
      return {
        ...state,
        current: updated,
        past: [...state.past, state.current],
        future: [],
      };
    }

    case "SET_RECOVERY": {
      const updated = {
        ...state.current,
        modifiedAt: new Date().toISOString(),
        recovery: {
          ...state.current.recovery,
          geometry: {
            ...state.current.recovery.geometry,
            ...action.payload,
          } as RecoveryGeometry,
        },
      };
      return {
        ...state,
        current: updated,
        past: [...state.past, state.current],
        future: [],
      };
    }

    case "SET_DRAG_COEFFICIENT":
      return {
        ...state,
        current: {
          ...state.current,
          modifiedAt: new Date().toISOString(),
          dragCoefficient: action.payload,
        },
        past: [...state.past, state.current],
        future: [],
      };

    case "SET_LAUNCH_ANGLE":
      return {
        ...state,
        current: {
          ...state.current,
          modifiedAt: new Date().toISOString(),
          launchAngle: action.payload,
        },
        past: [...state.past, state.current],
        future: [],
      };

    case "SET_WATER_VOLUME":
      return {
        ...state,
        current: {
          ...state.current,
          modifiedAt: new Date().toISOString(),
          waterVolume: action.payload,
        },
        past: [...state.past, state.current],
        future: [],
      };

    case "SET_INITIAL_PRESSURE":
      return {
        ...state,
        current: {
          ...state.current,
          modifiedAt: new Date().toISOString(),
          initialPressure: action.payload,
        },
        past: [...state.past, state.current],
        future: [],
      };

    case "SET_NAME":
      return {
        ...state,
        current: {
          ...state.current,
          modifiedAt: new Date().toISOString(),
          name: action.payload,
        },
        past: [...state.past, state.current],
        future: [],
      };

    case "SET_DESCRIPTION":
      return {
        ...state,
        current: {
          ...state.current,
          modifiedAt: new Date().toISOString(),
          description: action.payload,
        },
        past: [...state.past, state.current],
        future: [],
      };

    case "LOAD_DESIGN":
      return {
        ...state,
        current: action.payload,
        past: [...state.past, state.current],
        future: [],
      };

    case "RESET_TO_DEFAULT":
      return {
        ...state,
        current: createDefaultDesign(),
        past: [...state.past, state.current],
        future: [],
      };

    case "UNDO": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      return {
        ...state,
        current: previous,
        past: newPast,
        future: [state.current, ...state.future],
      };
    }

    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        ...state,
        current: next,
        past: [...state.past, state.current],
        future: newFuture,
      };
    }

    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────────────

interface RocketDesignerContextType {
  state: DesignerHistory;
  calculations: ReturnType<typeof calculateRocketProperties>;
  warnings: ReturnType<typeof validateDesign>;
  dispatch: React.Dispatch<RocketDesignerAction>;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

const RocketDesignerContext = createContext<RocketDesignerContextType | null>(null);

// ── Provider ─────────────────────────────────────────────────────

export function RocketDesignerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(rocketReducer, null, () => ({
    current: createDefaultDesign(),
    past: [],
    future: [],
    selectedComponent: null,
  }));

  const calculations = calculateRocketProperties(state.current);
  const warnings = validateDesign(state.current);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);

  return (
    <RocketDesignerContext.Provider
      value={{
        state,
        calculations,
        warnings,
        dispatch,
        canUndo,
        canRedo,
        undo,
        redo,
      }}
    >
      {children}
    </RocketDesignerContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────

export function useRocketDesigner() {
  const context = useContext(RocketDesignerContext);
  if (!context) {
    throw new Error("useRocketDesigner must be used within a RocketDesignerProvider");
  }
  return context;
}
