/**
 * SOAR Studio — Rocket Designer (v2.4)
 *
 * Two-column layout with interactive editing + engineering panel:
 *   LEFT:  Rocket SVG + Canvas Toolbar + presets + Engineering Panel
 *   RIGHT: Selection Panel + Parameter Panel
 *
 * v2.3: Added Engineering Properties Panel with live calculations,
 * mass breakdown, engineering summary, warnings, and unit switching.
 * v2.4: Added Stability analysis — CG, CP, stability margin, markers,
 * recommendations, and stability explainer. All calculations update live.
 */

"use client";

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";

import { RocketDesignerProvider, useRocketDesigner } from "@/components/rocket-designer/rocket-designer-context";
import RocketCanvas from "@/components/rocket-designer/rocket-canvas";
import CanvasToolbar from "@/components/rocket-designer/canvas-toolbar";
import SelectionPanel from "@/components/rocket-designer/selection-panel";
import ParameterPanel from "@/components/rocket-designer/parameter-panel";
import RocketLiveCalculations from "@/components/rocket-designer/rocket-live-calculations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PenLine, Save, RotateCcw, Rocket, Undo2, Redo2 } from "lucide-react";

import { ALL_PRESETS, loadPreset } from "@/lib/designer-presets";
import { loadDesign, saveDesign, hasSavedDesign } from "@/lib/designer-storage";
import { createDefaultDesign } from "@/lib/rocket-geometry";

// ── Inner page (lives inside the provider) ───────────────────────

function DesignerInner() {
  const { state, dispatch, warnings, calculations, canUndo, canRedo, undo, redo, selectedComponent } = useRocketDesigner();
  const design = state.current;
  const [saved, setSaved] = useState(hasSavedDesign());

  // Load saved design on mount
  useEffect(() => {
    const existing = loadDesign();
    if (existing && existing.name !== "Water Rocket") {
      dispatch({ type: "LOAD_DESIGN", payload: existing });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcuts ─────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
      if (e.key === "Escape" && selectedComponent) {
        e.preventDefault();
        dispatch({ type: "SELECT_COMPONENT", payload: null });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, selectedComponent, dispatch]);

  // ── Handlers ──────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    saveDesign(design);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [design]);

  const handleReset = useCallback(() => {
    dispatch({ type: "LOAD_DESIGN", payload: createDefaultDesign() });
  }, [dispatch]);

  const handlePreset = useCallback(
    (value: string | null) => {
      if (!value) return;
      const preset = loadPreset(value);
      if (preset) {
        dispatch({ type: "LOAD_DESIGN", payload: preset });
      }
    },
    [dispatch],
  );

  const handleDeselect = useCallback(() => {
    dispatch({ type: "SELECT_COMPONENT", payload: null });
  }, [dispatch]);

  const hasErrors = warnings.some((w) => w.type === "error");

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Top navigation ──────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            <span className="text-base font-bold tracking-tight">SOAR Studio</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <PenLine className="h-3.5 w-3.5" />
            Rocket Designer
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">v2.4</span>
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ════ LEFT COLUMN ════ */}
          <div className="flex-1 space-y-4 min-w-0">
            {/* Title + Undo/Redo */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Rocket Designer
                </h1>
                <p className="text-sm text-muted-foreground">
                  {selectedComponent
                    ? `Editing: ${selectedComponent} — drag handles or edit values`
                    : "Click a component on the rocket to edit it, or adjust parameters below."}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
                  <Redo2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* SVG Canvas with toolbar overlay */}
            <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm" style={{ minHeight: 500 }}>
              <CanvasToolbar />
              <RocketCanvas />
            </div>

            {/* Presets + Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Rocket className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Preset:</span>
              </div>
              <Select onValueChange={handlePreset} value="">
                <SelectTrigger className="h-9 w-48 text-sm">
                  <SelectValue placeholder="Select a preset..." />
                </SelectTrigger>
                <SelectContent>
                  {ALL_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={handleSave}
                size="sm"
                variant="default"
                className="gap-1.5"
                disabled={hasErrors}
              >
                <Save className="h-4 w-4" />
                {saved ? "Saved!" : "Save Rocket"}
              </Button>

              <Button
                onClick={handleReset}
                size="sm"
                variant="outline"
                className="gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>

              {selectedComponent && (
                <Button
                  onClick={handleDeselect}
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-xs"
                >
                  Deselect
                </Button>
              )}
            </div>

            {/* Warnings */}
            {warnings.filter((w) => w.type === "error").length > 0 && (
              <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
                <CardContent className="p-3 text-xs text-red-700 dark:text-red-400">
                  {warnings.filter((w) => w.type === "error").map((w) => (
                    <p key={w.id}>{w.message}</p>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Live Calculations */}
            <div className="hidden lg:block">
              <RocketLiveCalculations />
            </div>
          </div>

          {/* ════ RIGHT COLUMN ════ */}
          <aside className="w-full lg:w-80 xl:w-96 shrink-0">
            <div className="space-y-4 lg:sticky lg:top-20">
              {/* Selection Panel (context-sensitive) */}
              <SelectionPanel />

              {/* Parameter Panel (full) */}
              <ParameterPanel />

              {/* Live Calculations (mobile) */}
              <div className="lg:hidden">
                <RocketLiveCalculations />
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

// ── Page wrapper (provides context) ──────────────────────────────

export default function DesignerPage() {
  return (
    <RocketDesignerProvider>
      <DesignerInner />
    </RocketDesignerProvider>
  );
}
