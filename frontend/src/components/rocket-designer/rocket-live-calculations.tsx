/**
 * SOAR Studio — Engineering Properties Panel
 *
 * v2.3: Comprehensive live engineering panel with geometry, mass, propulsion, and aerodynamics.
 * v2.4: Added Stability section with CG/CP display, stability rating, recommendations,
 *       and collapsible Stability Explainer.
 */

"use client";

import React, { useCallback, useState, useMemo } from "react";
import { useRocketDesigner } from "./rocket-designer-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Calculator,
  Weight,
  Droplets,
  Gauge,
  Target,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronRight,
  Copy,
  FileJson,
  Ruler as RulerIcon,
  Lightbulb,
  TrendingUp,
  ShieldAlert,
  BookOpen,
} from "lucide-react";
import {
  toEngineeringDisplay,
  displayLengthShort,
  displayMassShort,
  displayPressureShort,
  displayPercentage,
  displayAspectRatio,
  type UnitSystem,
} from "@/lib/engineering";
import type { EngineeringProperties } from "@/lib/engineering/properties";
import type { EngineeringSummary } from "@/lib/engineering/summary";
import type { EngineeringWarning } from "@/lib/engineering/warnings";
import type { StabilityRecommendation } from "@/lib/engineering/recommendations";
import type { StabilityRating } from "@/lib/engineering/stability";

// ── Collapsible Section ──────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  badge,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/40 transition-colors"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
        />
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {icon}
          <span>{title}</span>
        </div>
        {badge && <div className="ml-auto">{badge}</div>}
      </button>
      {isOpen && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </div>
  );
}

// ── Metric Row ───────────────────────────────────────────────────

function MetricRow({
  label,
  value,
  icon,
  color,
  highlight,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  color?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 ${
        highlight ? "bg-muted/60 ring-1 ring-border/40" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className={`text-xs font-mono font-medium tabular-nums ${color || "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

// ── Mass Breakdown Bar ───────────────────────────────────────────

function MassBreakdownBar({
  dryMass,
  waterMass,
  totalMass,
  unitSystem,
}: {
  dryMass: number;
  waterMass: number;
  totalMass: number;
  unitSystem: UnitSystem;
}) {
  const dryPct = totalMass > 0 ? (dryMass / totalMass) * 100 : 0;
  const waterPct = totalMass > 0 ? (waterMass / totalMass) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex h-5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="bg-blue-500 transition-all duration-300"
          style={{ width: `${waterPct}%` }}
          title={`Water: ${waterPct.toFixed(1)}%`}
        />
        <div
          className="bg-orange-500 transition-all duration-300"
          style={{ width: `${dryPct}%` }}
          title={`Dry: ${dryPct.toFixed(1)}%`}
        />
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Water</span>
          <span className="font-mono font-medium">{displayMassShort(waterMass, unitSystem)}</span>
          <span className="text-muted-foreground">({waterPct.toFixed(0)}%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          <span className="text-muted-foreground">Dry</span>
          <span className="font-mono font-medium">{displayMassShort(dryMass, unitSystem)}</span>
          <span className="text-muted-foreground">({dryPct.toFixed(0)}%)</span>
        </div>
      </div>
    </div>
  );
}

// ── Stability Rating Badge ───────────────────────────────────────

function StabilityRatingBadge({ rating }: { rating: StabilityRating }) {
  const config: Record<StabilityRating, { label: string; color: string; icon: React.ReactNode }> = {
    excellent: {
      label: "Excellent",
      color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    good: {
      label: "Good",
      color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    marginal: {
      label: "Marginal",
      color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
      icon: <ShieldAlert className="h-3 w-3" />,
    },
    poor: {
      label: "Poor",
      color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
      icon: <ShieldAlert className="h-3 w-3" />,
    },
    unstable: {
      label: "Unstable",
      color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
      icon: <ShieldAlert className="h-3 w-3" />,
    },
  };

  const c = config[rating];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${c.color}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

// ── Stability Marker Bar ─────────────────────────────────────────

function StabilityMarkerBar({
  cgFraction,
  cpFraction,
  totalLength,
  marginCalibers,
  isStable,
}: {
  cgFraction: number;
  cpFraction: number;
  totalLength: number;
  marginCalibers: number;
  isStable: boolean;
}) {
  const barWidth = 100; // percentage
  const cgLeft = Math.max(2, Math.min(98, cgFraction * 100));
  const cpLeft = Math.max(2, Math.min(98, cpFraction * 100));
  const cgLabel = `${(cgFraction * 100).toFixed(0)}%`;
  const cpLabel = `${(cpFraction * 100).toFixed(0)}%`;

  return (
    <div className="space-y-1.5">
      <div className="relative h-6 w-full rounded-md bg-gradient-to-r from-blue-100 via-white to-orange-100 dark:from-blue-950/30 dark:via-background dark:to-orange-950/30 border border-border/50 overflow-hidden">
        {/* Scale markers */}
        <div className="absolute inset-0 flex items-center justify-between px-1 text-[8px] text-muted-foreground/50">
          <span>Nose</span>
          <span>50%</span>
          <span>Tail</span>
        </div>

        {/* CG marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 transition-all duration-300"
          style={{ left: `${cgLeft}%` }}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center rounded bg-blue-500 px-1 py-0.5 text-[8px] font-bold text-white leading-none whitespace-nowrap">
              CG {cgLabel}
            </span>
          </div>
        </div>

        {/* CP marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 transition-all duration-300"
          style={{ left: `${cpLeft}%` }}
        >
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center rounded bg-red-500 px-1 py-0.5 text-[8px] font-bold text-white leading-none whitespace-nowrap">
              CP {cpLabel}
            </span>
          </div>
        </div>

        {/* Stability gap shading */}
        {isStable && (
          <div
            className="absolute top-0 bottom-0 bg-emerald-400/20 z-0"
            style={{
              left: `${Math.min(cgLeft, cpLeft)}%`,
              width: `${Math.abs(cpLeft - cgLeft)}%`,
            }}
          />
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          CG→CP: {(totalLength * Math.abs(cpFraction - cgFraction) * 1000).toFixed(0)} mm
        </span>
        <span className={`font-mono font-medium ${isStable ? "text-emerald-600" : "text-red-500"}`}>
          SM: {marginCalibers.toFixed(2)} cal
        </span>
      </div>
    </div>
  );
}

// ── Warning Badge ────────────────────────────────────────────────

function WarningBadge({ type }: { type: "error" | "warning" | "info" }) {
  const variants = {
    error: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800" as const,
    warning: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" as const,
    info: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800" as const,
  };

  const labels = {
    error: "Error",
    warning: "Warning",
    info: "Info",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${variants[type]}`}>
      {type === "error" ? <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> :
       type === "warning" ? <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> :
       <Info className="h-2.5 w-2.5 mr-0.5" />}
      {labels[type]}
    </span>
  );
}

// ── Warnings List ────────────────────────────────────────────────

function WarningsList({ warnings }: { warnings: EngineeringWarning[] }) {
  if (warnings.length === 0) return null;

  const errors = warnings.filter((w) => w.type === "error");
  const warningList = warnings.filter((w) => w.type === "warning");
  const infos = warnings.filter((w) => w.type === "info");

  return (
    <div className="space-y-2">
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50/80 p-3 dark:border-red-800 dark:bg-red-950/20">
          {errors.map((w) => (
            <div key={w.id} className="flex items-start gap-2 py-0.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-400">{w.message}</p>
            </div>
          ))}
        </div>
      )}

      {warningList.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-800 dark:bg-amber-950/20">
          {warningList.map((w) => (
            <div key={w.id} className="flex items-start gap-2 py-0.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">{w.message}</p>
            </div>
          ))}
        </div>
      )}

      {infos.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-3 dark:border-blue-800 dark:bg-blue-950/20">
          {infos.map((w) => (
            <div key={w.id} className="flex items-start gap-2 py-0.5">
              <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-400">{w.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Engineering Summary Card ─────────────────────────────────────

function EngineeringSummaryCard({ summaries }: { summaries: EngineeringSummary[] }) {
  if (summaries.length === 0) return null;

  return (
    <div className="space-y-2">
      {summaries.map((s) => (
        <div
          key={s.id}
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
            s.type === "positive"
              ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20"
              : s.type === "concern"
              ? "border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20"
              : "border-border/60 bg-muted/30"
          }`}
        >
          {s.type === "positive" ? (
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
          ) : s.type === "concern" ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
          ) : (
            <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          )}
          <div>
            <p className="text-xs leading-relaxed">{s.message}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{s.category}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Recommendations List ─────────────────────────────────────────

function RecommendationsList({ recommendations }: { recommendations: StabilityRecommendation[] }) {
  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-2">
      {recommendations.map((r) => (
        <div
          key={r.id}
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
            r.type === "positive"
              ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20"
              : r.type === "critical"
              ? "border-red-200 bg-red-50/60 dark:border-red-800 dark:bg-red-950/20"
              : "border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20"
          }`}
        >
          {r.type === "positive" ? (
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
          ) : r.type === "critical" ? (
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
          ) : (
            <Lightbulb className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium">{r.message}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{r.detail}</p>
            {r.action && (
              <div className="mt-1 flex items-center gap-1">
                <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                  {r.action}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Stability Explainer ──────────────────────────────────────────

function StabilityExplainer() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-t border-border/40">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <BookOpen className="h-4 w-4 text-blue-500" />
        <span className="text-xs font-medium flex-1">How Stability Works</span>
        <ChevronRight
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {/* What is CG */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                1
              </span>
              <span className="text-xs font-semibold">What is Center of Gravity (CG)?</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              The CG is the point where the rocket's entire weight is concentrated.
              Think of it as the <strong>balance point</strong> — if you could balance
              the rocket on your finger, that's the CG.
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              <strong>Where it should be:</strong> For stable flight, the CG should be
              near the front of the rocket (typically 40-55% from the nose tip).
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              <strong>What affects it:</strong> Heavy components near the tail (nozzle,
              fins, water) pull CG aft. Heavy nose components pull CG forward.
            </p>
          </div>

          {/* What is CP */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-700 dark:bg-red-900/50 dark:text-red-400">
                2
              </span>
              <span className="text-xs font-semibold">What is Center of Pressure (CP)?</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              The CP is the point where all aerodynamic forces (drag, lift) effectively act.
              Think of it as the <strong>wind balance point</strong> — where the wind
              pushes on the rocket.
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              <strong>Where it should be:</strong> The CP should be <strong>behind</strong> the CG
              (closer to the tail). If a gust of wind tilts the nose, the aerodynamic
              forces behind the CG will push the nose back in line.
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              <strong>What affects it:</strong> Fins strongly affect CP position — larger
              fins move CP aft, improving stability. The nose cone also contributes.
            </p>
          </div>

          {/* Why Stability Matters */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                3
              </span>
              <span className="text-xs font-semibold">Why Does Stability Matter?</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong>If CG is ahead of CP:</strong> The rocket is stable. When disturbed
              (by wind or a slight angle), aerodynamic forces automatically correct the
              flight path. The rocket flies straight.
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              <strong>If CG is behind CP:</strong> The rocket is unstable. Any small
              disturbance causes the rocket to tumble or spin uncontrollably. The rocket
              will not fly straight.
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              A good rule of thumb: aim for a <strong>stability margin of 1-2 body diameters</strong>.
              More than 3 may cause weathercocking (turning into the wind). Less than 0.5
              risks instability.
            </p>
          </div>

          {/* What is a Caliber */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-700 dark:bg-purple-900/50 dark:text-purple-400">
                4
              </span>
              <span className="text-xs font-semibold">What is a Caliber?</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              A <strong>caliber</strong> is a unit of measurement equal to the rocket's
              body diameter. If your rocket has a 65 mm body tube, 1 caliber = 65 mm.
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              <strong>Stability Margin (calibers) = (CP - CG) / Body Diameter</strong>
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              This normalized unit makes stability comparable across rockets of different
              sizes. A 2-inch diameter rocket with 2 calibers margin has the same
              stability as a 4-inch diameter rocket with 2 calibers margin.
            </p>
          </div>

          {/* Method Note */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-2 dark:border-blue-800 dark:bg-blue-950/20">
            <p className="text-[10px] text-blue-700 dark:text-blue-400 leading-relaxed">
              <strong>Note:</strong> These calculations use a simplified Barrowman
              approximation and component-based CG estimation. They provide useful
              engineering guidance but should be verified with actual swing tests
              before flight.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Unit System Toggle ──────────────────────────────────────────

function UnitToggle({
  unitSystem,
  onToggle,
}: {
  unitSystem: UnitSystem;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-1">
      <button
        onClick={onToggle}
        className={`flex-1 rounded-md px-3 py-1 text-xs font-medium transition-all ${
          unitSystem === "metric"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Metric
      </button>
      <button
        onClick={onToggle}
        className={`flex-1 rounded-md px-3 py-1 text-xs font-medium transition-all ${
          unitSystem === "imperial"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Imperial
      </button>
    </div>
  );
}

// ── Export Functions ─────────────────────────────────────────────

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  });
}

function generateExportText(
  designName: string,
  engineering: EngineeringProperties,
  unitSystem: UnitSystem
): string {
  const { geometry, mass, warnings, summary, cg, cp, stability } = engineering;
  const units = unitSystem === "metric" ? "Metric" : "Imperial";
  const lines: string[] = [
    `SOAR Studio — Engineering Properties`,
    `Design: ${designName}`,
    `Units: ${units}`,
    `Generated: ${new Date().toLocaleString()}`,
    "",
    "── Geometry ──",
    `  Overall Length: ${displayLengthShort(geometry.totalLength, unitSystem)}`,
    `  Body Length: ${displayLengthShort(geometry.bodyLength, unitSystem)}`,
    `  Nose Length: ${displayLengthShort(geometry.noseLength, unitSystem)}`,
    `  Maximum Diameter: ${displayLengthShort(geometry.maximumDiameter, unitSystem)}`,
    `  Cross-Sectional Area: ${toEngineeringDisplay("", geometry.crossSectionalArea, unitSystem, "area").label}`,
    `  Estimated Internal Volume: ${toEngineeringDisplay("", geometry.estimatedInternalVolume, unitSystem, "volume").label}`,
    `  Bottle Volume: ${geometry.bottleVolumeLiters.toFixed(2)} L`,
    `  Aspect Ratio: ${displayAspectRatio(geometry.aspectRatio)}`,
    "",
    "── Mass ──",
    `  Dry Mass: ${displayMassShort(mass.dryMass, unitSystem)}`,
    `  Water Mass: ${displayMassShort(mass.waterMass, unitSystem)}`,
    `  Total Launch Mass: ${displayMassShort(mass.totalMass, unitSystem)}`,
    `  Water Fill: ${displayPercentage(engineering.waterFillPercentage)}`,
    "",
    "── Stability ──",
    `  CG from Nose: ${displayLengthShort(cg.cgFromNose, unitSystem)}`,
    `  CG from Tail: ${displayLengthShort(cg.cgFromTail, unitSystem)}`,
    `  CP from Nose: ${displayLengthShort(cp.cpFromNose, unitSystem)}`,
    `  CP from Tail: ${displayLengthShort(cp.cpFromTail, unitSystem)}`,
    `  Stability Margin: ${stability.marginCalibers.toFixed(2)} calibers`,
    `  Rating: ${stability.rating}`,
    "",
    "── Propulsion ──",
    `  Water Volume: ${toEngineeringDisplay("", engineering.waterVolume, unitSystem, "volume").label}`,
    `  Initial Pressure: ${displayPressureShort(engineering.initialPressure, unitSystem)}`,
    `  Nozzle Diameter: ${displayLengthShort(engineering.nozzleDiameter, unitSystem)}`,
    "",
    "── Aerodynamics ──",
    `  Drag Coefficient: ${engineering.dragCoefficient.toFixed(3)}`,
    `  Launch Angle: ${engineering.launchAngleDeg.toFixed(0)}°`,
    `  Frontal Area: ${toEngineeringDisplay("", geometry.frontalArea, unitSystem, "area").label}`,
    "",
    "── Warnings ──",
  ];

  if (warnings.length === 0) {
    lines.push("  None");
  } else {
    warnings.forEach((w) => {
      lines.push(`  [${w.type.toUpperCase()}] ${w.message}`);
    });
  }

  lines.push("", "── Engineering Observations ──");
  if (summary.length === 0) {
    lines.push("  None");
  } else {
    summary.forEach((s) => {
      lines.push(`  [${s.type.toUpperCase()}] ${s.message}`);
    });
  }

  return lines.join("\n");
}

function generateExportJSON(
  designName: string,
  engineering: EngineeringProperties,
  unitSystem: UnitSystem
): string {
  const obj = {
    designName,
    unitSystem,
    generatedAt: new Date().toISOString(),
    properties: {
      geometry: {
        totalLength: engineering.geometry.totalLength,
        bodyDiameter: engineering.geometry.bodyDiameter,
        noseLength: engineering.geometry.noseLength,
        bodyLength: engineering.geometry.bodyLength,
        bottleLength: engineering.geometry.bottleLength,
        maximumDiameter: engineering.geometry.maximumDiameter,
        crossSectionalArea: engineering.geometry.crossSectionalArea,
        estimatedInternalVolume: engineering.geometry.estimatedInternalVolume,
        bottleVolumeLiters: engineering.geometry.bottleVolumeLiters,
        aspectRatio: engineering.geometry.aspectRatio,
        frontalArea: engineering.geometry.frontalArea,
      },
      mass: {
        dryMass: engineering.mass.dryMass,
        waterMass: engineering.mass.waterMass,
        totalMass: engineering.mass.totalMass,
        waterMassPercentage: engineering.mass.waterMassPercentage,
        dryMassPercentage: engineering.mass.dryMassPercentage,
      },
      stability: {
        cgFromNose: engineering.cg.cgFromNose,
        cgFromTail: engineering.cg.cgFromTail,
        cgPercentLength: engineering.cg.cgPercentLength,
        cpFromNose: engineering.cp.cpFromNose,
        cpFromTail: engineering.cp.cpFromTail,
        cpPercentLength: engineering.cp.cpPercentLength,
        stabilityMarginCalibers: engineering.stability.marginCalibers,
        stabilityRating: engineering.stability.rating,
        isStable: engineering.stability.isStable,
      },
      propulsion: {
        waterVolume: engineering.waterVolume,
        waterFillPercentage: engineering.waterFillPercentage,
        initialPressure: engineering.initialPressure,
        nozzleDiameter: engineering.nozzleDiameter,
        nozzleArea: engineering.nozzleArea,
      },
      aerodynamics: {
        dragCoefficient: engineering.dragCoefficient,
        launchAngleDeg: engineering.launchAngleDeg,
        launchAngleRad: engineering.launchAngleRad,
      },
    },
    warnings: engineering.warnings.map((w) => ({
      id: w.id,
      type: w.type,
      message: w.message,
      category: w.category,
      component: w.component,
    })),
    summary: engineering.summary.map((s) => ({
      id: s.id,
      type: s.type,
      message: s.message,
      category: s.category,
    })),
  };

  return JSON.stringify(obj, null, 2);
}

// ── Main Component ───────────────────────────────────────────────

export default function RocketLiveCalculations() {
  const { state, engineering, dispatch, unitSystem, warnings } = useRocketDesigner();
  const design = state.current;
  const { geometry, mass, waterFillPercentage, initialPressure, summary, nozzleDiameter, cg, cp, stability, stabilityRecommendations } = engineering;
  const [copied, setCopied] = useState(false);
  const [exportedJson, setExportedJson] = useState(false);

  const hasErrors = warnings.some((w) => w.type === "error");

  const toggleUnits = useCallback(() => {
    dispatch({
      type: "SET_UNIT_SYSTEM",
      payload: unitSystem === "metric" ? "imperial" : "metric",
    });
  }, [dispatch, unitSystem]);

  const handleCopy = useCallback(() => {
    const text = generateExportText(design.name, engineering, unitSystem);
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [design.name, engineering, unitSystem]);

  const handleExportJSON = useCallback(() => {
    const json = generateExportJSON(design.name, engineering, unitSystem);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${design.name.replace(/\s+/g, "_")}_engineering.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportedJson(true);
    setTimeout(() => setExportedJson(false), 2000);
  }, [design.name, engineering, unitSystem]);

  const errorCount = warnings.filter((w) => w.type === "error").length;
  const warningCount = warnings.filter((w) => w.type === "warning").length;

  const stabilityRatingColors: Record<string, string> = {
    excellent: "text-emerald-500",
    good: "text-green-500",
    marginal: "text-amber-500",
    poor: "text-orange-500",
    unstable: "text-red-500",
  };

  const criticalRecommendations = stabilityRecommendations.filter((r) => r.type === "critical");
  const suggestionRecommendations = stabilityRecommendations.filter((r) => r.type === "suggestion");
  const positiveRecommendations = stabilityRecommendations.filter((r) => r.type === "positive");

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4 text-orange-500" />
            Engineering Properties
          </CardTitle>
          <div className="flex items-center gap-1">
            {(errorCount > 0 || warningCount > 0) && (
              <div className="flex gap-1">
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                    {errorCount} error{errorCount > 1 ? "s" : ""}
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                    {warningCount} warning{warningCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Live engineering calculations — updated as you design
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {/* Unit Toggle + Actions */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <div className="flex-1">
            <UnitToggle unitSystem={unitSystem} onToggle={toggleUnits} />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[10px]"
            onClick={handleCopy}
            title="Copy properties to clipboard"
          >
            {copied ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            <span className="ml-1 hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[10px]"
            onClick={handleExportJSON}
            title="Export engineering data as JSON"
          >
            {exportedJson ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <FileJson className="h-3 w-3" />}
            <span className="ml-1 hidden sm:inline">{exportedJson ? "Exported!" : "JSON"}</span>
          </Button>
        </div>

        <Separator className="mb-1" />

        {/* ════ STABILITY SECTION (v2.4) ════ */}
        <CollapsibleSection
          title="Stability"
          icon={<TrendingUp className="h-3.5 w-3.5 text-indigo-500" />}
          defaultOpen={true}
          badge={<StabilityRatingBadge rating={stability.rating} />}
        >
          {/* Stability Rating Card */}
          <div className={`rounded-lg border p-3 ${
            stability.rating === "excellent" || stability.rating === "good"
              ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20"
              : stability.rating === "unstable"
              ? "border-red-200 bg-red-50/60 dark:border-red-800 dark:bg-red-950/20"
              : "border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold">Stability Margin</span>
              <span className={`text-sm font-mono font-bold ${stabilityRatingColors[stability.rating] || "text-foreground"}`}>
                {stability.rating === "unstable" ? "-" : ""}{Math.abs(stability.marginCalibers).toFixed(2)} cal
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {stability.ratingDescription}
            </p>

            {/* Confidence note */}
            <div className="mt-2 rounded bg-muted/50 px-2 py-1.5">
              <p className="text-[9px] text-muted-foreground leading-relaxed">
                ⓘ {stability.confidenceNote}
              </p>
            </div>
          </div>

          {/* CG / CP Marker Bar */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
              CG &amp; CP Positions
            </p>
            <StabilityMarkerBar
              cgFraction={cg.cgFromNose / (cg.cgFromNose + cg.cgFromTail)}
              cpFraction={cp.cpFromNose / (cp.cpFromNose + cp.cpFromTail)}
              totalLength={cg.cgFromNose + cg.cgFromTail}
              marginCalibers={stability.marginCalibers}
              isStable={stability.isStable}
            />
          </div>

          {/* CG Details */}
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Center of Gravity (CG)
            </p>
            <MetricRow
              label="From Nose"
              value={displayLengthShort(cg.cgFromNose, unitSystem)}
              icon={<RulerIcon className="h-3 w-3 text-blue-400" />}
              highlight
            />
            <MetricRow
              label="From Tail"
              value={displayLengthShort(cg.cgFromTail, unitSystem)}
            />
            <MetricRow
              label="Position (% of total length)"
              value={`${cg.cgPercentLength.toFixed(0)}%`}
            />
            <MetricRow
              label="Position (% of body length)"
              value={`${cg.cgPercentBody.toFixed(0)}%`}
            />
            <div className="pt-1">
              <details className="group">
                <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  Component breakdown ▼
                </summary>
                <div className="mt-1 space-y-1">
                  {cg.components.filter(c => c.mass > 0.0001).map((comp) => (
                    <MetricRow
                      key={comp.name}
                      label={comp.name}
                      value={`${comp.percentage.toFixed(1)}% — ${displayLengthShort(comp.position, unitSystem)}`}
                    />
                  ))}
                </div>
              </details>
            </div>
          </div>

          <Separator className="my-1" />

          {/* CP Details */}
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Center of Pressure (CP)
            </p>
            <MetricRow
              label="From Nose"
              value={displayLengthShort(cp.cpFromNose, unitSystem)}
              icon={<RulerIcon className="h-3 w-3 text-red-400" />}
              highlight
            />
            <MetricRow
              label="From Tail"
              value={displayLengthShort(cp.cpFromTail, unitSystem)}
            />
            <MetricRow
              label="Position (% of length)"
              value={`${cp.cpPercentLength.toFixed(0)}%`}
            />
            <MetricRow
              label="Method"
              value="Barrowman (simplified)"
              color="text-muted-foreground"
            />
          </div>

          <Separator className="my-1" />

          {/* CG-CP Separation */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
              Separation
            </p>
            <MetricRow
              label="CG-CP Separation"
              value={displayLengthShort(Math.abs(cg.cgFromNose - cp.cpFromNose), unitSystem)}
              highlight
              color={stability.isStable ? "text-emerald-500" : "text-red-500"}
            />
            <MetricRow
              label="Margin (calibers)"
              value={`${stability.marginCalibers.toFixed(2)} cal`}
              color={
                stability.marginCalibers >= 1
                  ? "text-emerald-500"
                  : stability.marginCalibers >= 0.5
                  ? "text-amber-500"
                  : "text-red-500"
              }
            />
            <MetricRow
              label="Status"
              value={stability.isStable ? "CG ahead of CP ✓" : "CG behind CP ✗"}
              color={stability.isStable ? "text-emerald-500" : "text-red-500"}
            />
          </div>
        </CollapsibleSection>

        {/* ════ GEOMETRY SECTION ════ */}
        <CollapsibleSection
          title="Geometry"
          icon={<RulerIcon className="h-3.5 w-3.5 text-blue-500" />}
          defaultOpen={true}
        >
          <MetricRow
            label="Overall Length"
            value={displayLengthShort(geometry.totalLength, unitSystem)}
            highlight
          />
          <MetricRow
            label="Body Length"
            value={displayLengthShort(geometry.bodyLength, unitSystem)}
          />
          <MetricRow
            label="Nose Length"
            value={displayLengthShort(geometry.noseLength, unitSystem)}
          />
          <MetricRow
            label="Maximum Diameter"
            value={displayLengthShort(geometry.maximumDiameter, unitSystem)}
            highlight
          />
          <MetricRow
            label="Cross-Sectional Area"
            value={toEngineeringDisplay("", geometry.crossSectionalArea, unitSystem, "area").label}
          />
          <MetricRow
            label="Estimated Internal Volume"
            value={toEngineeringDisplay("", geometry.estimatedInternalVolume, unitSystem, "volume").label}
          />
          <MetricRow
            label="Bottle Volume"
            value={`${geometry.bottleVolumeLiters.toFixed(2)} L`}
          />
          <MetricRow
            label="Aspect Ratio (L/D)"
            value={displayAspectRatio(geometry.aspectRatio)}
            highlight
            color={
              geometry.aspectRatio > 15
                ? "text-amber-500"
                : geometry.aspectRatio < 5
                ? "text-amber-500"
                : "text-foreground"
            }
          />
          <MetricRow
            label="Frontal Area"
            value={toEngineeringDisplay("", geometry.frontalArea, unitSystem, "area").label}
          />
        </CollapsibleSection>

        {/* ════ MASS SECTION ════ */}
        <CollapsibleSection
          title="Mass"
          icon={<Weight className="h-3.5 w-3.5 text-orange-500" />}
          defaultOpen={true}
          badge={
            <span className="text-[10px] text-muted-foreground font-mono">
              {displayMassShort(mass.totalMass, unitSystem)}
            </span>
          }
        >
          <MetricRow
            label="Dry Mass"
            value={displayMassShort(mass.dryMass, unitSystem)}
            icon={<Weight className="h-3 w-3" />}
          />
          <MetricRow
            label="Water Mass"
            value={displayMassShort(mass.waterMass, unitSystem)}
            icon={<Droplets className="h-3 w-3 text-blue-500" />}
          />
          <MetricRow
            label="Total Launch Mass"
            value={displayMassShort(mass.totalMass, unitSystem)}
            highlight
          />
          <MetricRow
            label="Water Fill"
            value={displayPercentage(waterFillPercentage)}
            color={
              waterFillPercentage >= 25 && waterFillPercentage <= 40
                ? "text-emerald-500"
                : waterFillPercentage > 60
                ? "text-amber-500"
                : "text-foreground"
            }
          />

          <div className="pt-2">
            <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Mass Distribution
            </p>
            <MassBreakdownBar
              dryMass={mass.dryMass}
              waterMass={mass.waterMass}
              totalMass={mass.totalMass}
              unitSystem={unitSystem}
            />
          </div>
        </CollapsibleSection>

        {/* ════ PROPULSION SECTION ════ */}
        <CollapsibleSection
          title="Propulsion"
          icon={<Droplets className="h-3.5 w-3.5 text-blue-500" />}
          defaultOpen={false}
        >
          <MetricRow
            label="Water Volume"
            value={toEngineeringDisplay("", engineering.waterVolume, unitSystem, "volume").label}
          />
          <MetricRow
            label="Initial Pressure"
            value={displayPressureShort(initialPressure, unitSystem)}
            highlight
          />
          <MetricRow
            label="Nozzle Diameter"
            value={displayLengthShort(nozzleDiameter, unitSystem)}
          />
          <MetricRow
            label="Nozzle Area"
            value={toEngineeringDisplay("", engineering.nozzleArea, unitSystem, "area").label}
          />
        </CollapsibleSection>

        {/* ════ AERODYNAMICS SECTION ════ */}
        <CollapsibleSection
          title="Aerodynamics"
          icon={<Gauge className="h-3.5 w-3.5 text-purple-500" />}
          defaultOpen={false}
        >
          <MetricRow
            label="Drag Coefficient (Cd)"
            value={engineering.dragCoefficient.toFixed(3)}
          />
          <MetricRow
            label="Launch Angle"
            value={`${engineering.launchAngleDeg.toFixed(0)}°`}
          />
          <MetricRow
            label="Frontal Area"
            value={toEngineeringDisplay("", geometry.frontalArea, unitSystem, "area").label}
          />
        </CollapsibleSection>

        {/* ════ GENERAL SECTION ════ */}
        <CollapsibleSection
          title="General"
          icon={<Target className="h-3.5 w-3.5 text-muted-foreground" />}
          defaultOpen={false}
        >
          <MetricRow
            label="Design Version"
            value={`v${design.version}`}
          />
          <MetricRow
            label="Last Modified"
            value={new Date(design.modifiedAt).toLocaleDateString()}
          />
          <MetricRow
            label="Component Count"
            value="6"
          />
        </CollapsibleSection>

        <Separator className="my-1" />

        {/* ════ STABILITY RECOMMENDATIONS (v2.4) ════ */}
        {stabilityRecommendations.length > 0 && (
          <div className="px-4 pb-3">
            <CollapsibleSection
              title="Stability Recommendations"
              icon={<Lightbulb className="h-3.5 w-3.5 text-amber-500" />}
              defaultOpen={criticalRecommendations.length > 0}
              badge={
                criticalRecommendations.length > 0 ? (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-[9px] font-bold text-red-700 dark:bg-red-900/50 dark:text-red-400">
                    {criticalRecommendations.length}
                  </span>
                ) : suggestionRecommendations.length > 0 ? (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-[9px] font-bold text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                    {suggestionRecommendations.length}
                  </span>
                ) : undefined
              }
            >
              <RecommendationsList recommendations={stabilityRecommendations} />
            </CollapsibleSection>
          </div>
        )}

        {/* ════ WARNINGS ════ */}
        {(errorCount > 0 || warningCount > 0) && (
          <div className="px-4 pb-3">
            <CollapsibleSection
              title="Engineering Warnings"
              icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
              defaultOpen={true}
              badge={
                (errorCount > 0 || warningCount > 0) ? (
                  <span className="flex gap-1">
                    {errorCount > 0 && (
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-[9px] font-bold text-red-700 dark:bg-red-900/50 dark:text-red-400">
                        {errorCount}
                      </span>
                    )}
                    {warningCount > 0 && (
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-[9px] font-bold text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                        {warningCount}
                      </span>
                    )}
                  </span>
                ) : undefined
              }
            >
              <WarningsList warnings={engineering.warnings} />
            </CollapsibleSection>
          </div>
        )}

        {/* ════ ENGINEERING SUMMARY ════ */}
        {summary.length > 0 && !hasErrors && (
          <div className="px-4 pb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <CheckCircle className="h-3 w-3" />
              Engineering Observations
            </p>
            <EngineeringSummaryCard summaries={summary} />
          </div>
        )}

        {/* ════ STABILITY EXPLAINER (v2.4) ════ */}
        <StabilityExplainer />
      </CardContent>
    </Card>
  );
}
