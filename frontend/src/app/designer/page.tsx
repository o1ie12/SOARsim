/**
 * SOARSim Rocket Designer — Page
 *
 * Two-column layout:
 *   LEFT:  Rocket SVG visualization + presets + Save button
 *   RIGHT: Engineering parameter cards
 *
 * Single source of truth: the RocketDesignerContext.
 */

"use client";

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";

import { RocketDesignerProvider, useRocketDesigner } from "@/components/rocket-designer/rocket-designer-context";
import RocketCanvas from "@/components/rocket-designer/rocket-canvas";
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
import { PenLine, Save, RotateCcw, Rocket } from "lucide-react";

import { ALL_PRESETS, loadPreset } from "@/lib/designer-presets";
import { loadDesign, saveDesign, hasSavedDesign } from "@/lib/designer-storage";
import { createDefaultDesign } from "@/lib/rocket-geometry";

// ── Inner page (lives inside the provider) ───────────────────────

function DesignerInner() {
  const { state, dispatch, warnings, calculations } = useRocketDesigner();
  const design = state.current;
  const [saved, setSaved] = useState(hasSavedDesign());

  // Load saved design on mount
  useEffect(() => {
    const existing = loadDesign();
    if (existing && existing.name !== "Water Rocket") {
      dispatch({ type: "LOAD_DESIGN", payload: existing });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const hasErrors = warnings.some((w) => w.type === "error");

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Top navigation ──────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            <span className="text-base font-bold tracking-tight">SOARSim</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <PenLine className="h-3.5 w-3.5" />
            Rocket Designer
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ════ LEFT COLUMN ════ */}
          <div className="flex-1 space-y-4 min-w-0">
            {/* Title */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Rocket Designer
                </h1>
                <p className="text-sm text-muted-foreground">
                  Design your rocket — select a preset or edit parameters below.
                </p>
              </div>
            </div>

            {/* SVG Canvas */}
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
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

            {/* Live Calculations (desktop: shown in left col, mobile: below) */}
            <div className="hidden lg:block">
              <RocketLiveCalculations />
            </div>
          </div>

          {/* ════ RIGHT COLUMN ════ */}
          <aside className="w-full lg:w-80 xl:w-96 shrink-0">
            <div className="space-y-6 lg:sticky lg:top-20">
              <ParameterPanel />

              {/* Live Calculations (mobile: shown here) */}
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
