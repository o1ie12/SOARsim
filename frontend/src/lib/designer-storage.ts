/**
 * SOARSim Rocket Designer — Local Storage Persistence
 *
 * Saves and loads rocket designs from localStorage.
 * For v2.1 this is the only persistence mechanism.
 * No workspace backend is involved.
 */

import type { RocketDesignState } from "@/lib/rocket-designer-types";
import { createDefaultDesign } from "@/lib/rocket-geometry";

const STORAGE_KEY = "soarsim_rocket_designer";

/** Retrieve the saved design (or default if none exists). */
export function loadDesign(): RocketDesignState {
  if (typeof window === "undefined") return createDefaultDesign();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultDesign();
    const parsed = JSON.parse(raw) as RocketDesignState;
    // Basic sanity check — must have expected shape
    if (parsed && parsed.noseCone && parsed.bodyTube && parsed.bottle) {
      return parsed;
    }
    return createDefaultDesign();
  } catch {
    return createDefaultDesign();
  }
}

/** Persist a design to localStorage. */
export function saveDesign(design: RocketDesignState): void {
  if (typeof window === "undefined") return;
  try {
    const stamped = {
      ...design,
      modifiedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
  } catch {
    // localStorage full or unavailable — silently fail
    console.warn("Rocket Designer: failed to save to localStorage");
  }
}

/** Remove the saved design. */
export function clearDesign(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}

/** Check whether a saved design exists. */
export function hasSavedDesign(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
