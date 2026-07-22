/**
 * SOARSim Rocket Designer — Canvas Toolbar
 *
 * Overlay toolbar for zoom, pan, grid, and view controls.
 * Lives above the canvas as a floating row of buttons.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRocketDesigner } from "./rocket-designer-context";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, Grid3X3, Magnet, Ruler } from "lucide-react";

export default function CanvasToolbar() {
  const { dispatch, gridEnabled, snapToGrid, gridSpacing } = useRocketDesigner();
  const [controls, setControls] = useState<{ zoomIn: () => void; zoomOut: () => void; resetView: () => void } | null>(null);

  useEffect(() => {
    const c = (window as unknown as Record<string, unknown>).__rocketCanvasControls as typeof controls;
    if (c) setControls(c);
    const id = setInterval(() => {
      const c2 = (window as unknown as Record<string, unknown>).__rocketCanvasControls as typeof controls;
      if (c2 && c2 !== c) setControls(c2);
    }, 500);
    return () => clearInterval(id);
  }, []);

  const toggleGrid = useCallback(() => {
    dispatch({ type: "SET_GRID_ENABLED", payload: !gridEnabled });
  }, [dispatch, gridEnabled]);

  const toggleSnap = useCallback(() => {
    dispatch({ type: "SET_SNAP_TO_GRID", payload: !snapToGrid });
  }, [dispatch, snapToGrid]);

  return (
    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-lg border border-border/60 bg-background/90 p-1.5 shadow-sm backdrop-blur-sm">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={controls?.zoomIn ?? (() => {})}
        title="Zoom In"
        aria-label="Zoom In"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={controls?.zoomOut ?? (() => {})}
        title="Zoom Out"
        aria-label="Zoom Out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={controls?.resetView ?? (() => {})}
        title="Fit to Screen"
        aria-label="Fit to Screen"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-6 w-px bg-border" />

      <Button
        variant="ghost"
        size="sm"
        className={`h-8 w-8 p-0 ${gridEnabled ? "text-orange-500" : ""}`}
        onClick={toggleGrid}
        title={gridEnabled ? "Hide Grid" : "Show Grid"}
        aria-label="Toggle Grid"
      >
        <Grid3X3 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-8 w-8 p-0 ${snapToGrid ? "text-orange-500" : ""}`}
        onClick={toggleSnap}
        title={snapToGrid ? "Disable Snap" : "Enable Snap"}
        aria-label="Toggle Snap to Grid"
      >
        <Magnet className="h-4 w-4" />
      </Button>
    </div>
  );
}
