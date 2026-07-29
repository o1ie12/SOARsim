/**
 * SOAR Studio v2.7 — Engineering Properties Panel (Redesigned)
 *
 * Tabbed interface:
 *   Overview  |  Stability  |  Geometry  |  Mass  |  Reports
 *
 * Rocket Health summary card at the top shows:
 *   - Overall Stability
 *   - Warning Count
 *   - Engineering Status
 */

"use client";

import React, { useCallback, useState, useMemo } from "react";
import { useRocketDesigner } from "./rocket-designer-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Calculator,
  Weight,
  Droplets,
  Gauge,
  Target,
  AlertTriangle,
  CheckCircle,
  Info,
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
import type { EngineeringWarning } from "@/lib/engineering/warnings";

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
        highlight ? "bg-muted/50 ring-1 ring-border/30" : ""
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className={`text-xs font-mono font-medium tabular-nums shrink-0 ml-2 ${color || "text-foreground"}`}>
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
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-blue-500 transition-all duration-300" style={{ width: `${waterPct}%` }} />
        <div className="bg-orange-500 transition-all duration-300" style={{ width: `${dryPct}%` }} />
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Water</span>
          <span className="font-mono font-medium">{displayMassShort(waterMass, unitSystem)}</span>
          <span className="text-muted-foreground">({waterPct.toFixed(0)}%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          <span className="text-muted-foreground">Dry</span>
          <span className="font-mono font-medium">{displayMassShort(dryMass, unitSystem)}</span>
          <span className="text-muted-foreground">({dryPct.toFixed(0)}%)</span>
        </div>
      </div>
    </div>
  );
}

// ── Stability Rating Badge ───────────────────────────────────────

function StabilityRatingBadge({ rating }: { rating: string }) {
  const config: Record<string, { label: string; color: string }> = {
    excellent: { label: "Excellent", color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800" },
    good: { label: "Good", color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800" },
    marginal: { label: "Marginal", color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" },
    poor: { label: "Poor", color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800" },
    unstable: { label: "Unstable", color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800" },
  };
  const c = config[rating] || config.unstable;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${c.color}`}>
      <ShieldAlert className="h-2.5 w-2.5" />
      {c.label}
    </span>
  );
}

// ── Stability Marker Bar ─────────────────────────────────────────

function StabilityMarkerBar({
  cgFraction, cpFraction, totalLength, marginCalibers, isStable,
}: {
  cgFraction: number; cpFraction: number; totalLength: number; marginCalibers: number; isStable: boolean;
}) {
  const cgLeft = Math.max(2, Math.min(98, cgFraction * 100));
  const cpLeft = Math.max(2, Math.min(98, cpFraction * 100));
  return (
    <div className="space-y-1.5">
      <div className="relative h-5 w-full rounded-md bg-gradient-to-r from-blue-100 via-white to-orange-100 dark:from-blue-950/30 dark:via-background dark:to-orange-950/30 border border-border/50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-between px-1 text-[8px] text-muted-foreground/50">
          <span>Nose</span><span>50%</span><span>Tail</span>
        </div>
        <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 transition-all duration-300" style={{ left: `${cgLeft}%` }}>
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center rounded bg-blue-500 px-1 py-0.5 text-[7px] font-bold text-white leading-none">CG</span>
          </div>
        </div>
        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 transition-all duration-300" style={{ left: `${cpLeft}%` }}>
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center rounded bg-red-500 px-1 py-0.5 text-[7px] font-bold text-white leading-none">CP</span>
          </div>
        </div>
        {isStable && (
          <div className="absolute top-0 bottom-0 bg-emerald-400/20 z-0"
            style={{ left: `${Math.min(cgLeft, cpLeft)}%`, width: `${Math.abs(cpLeft - cgLeft)}%` }} />
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>CG→CP: {(totalLength * Math.abs(cpFraction - cgFraction) * 1000).toFixed(0)} mm</span>
        <span className={`font-mono font-medium ${isStable ? "text-emerald-600" : "text-red-500"}`}>
          SM: {marginCalibers.toFixed(2)} cal
        </span>
      </div>
    </div>
  );
}

// ── Unit Toggle ──────────────────────────────────────────────────

function UnitToggle({ unitSystem, onToggle }: { unitSystem: UnitSystem; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-0.5">
      <button onClick={onToggle}
        className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-all ${
          unitSystem === "metric" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}>Metric</button>
      <button onClick={onToggle}
        className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-all ${
          unitSystem === "imperial" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}>Imperial</button>
    </div>
  );
}

// ── Export functions ─────────────────────────────────────────────

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

// ── Main Component ───────────────────────────────────────────────

export default function RocketLiveCalculations() {
  const { state, engineering, dispatch, unitSystem, warnings } = useRocketDesigner();
  const design = state.current;
  const { geometry, mass, waterFillPercentage, initialPressure, summary, nozzleDiameter, cg, cp, stability, stabilityRecommendations } = engineering;

  const [copied, setCopied] = useState(false);
  const [exportedJson, setExportedJson] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const errorCount = warnings.filter((w) => w.type === "error").length;
  const warningCount = warnings.filter((w) => w.type === "warning").length;

  const toggleUnits = useCallback(() => {
    dispatch({ type: "SET_UNIT_SYSTEM", payload: unitSystem === "metric" ? "imperial" : "metric" });
  }, [dispatch, unitSystem]);

  const handleCopy = useCallback(() => {
    copyToClipboard(`SOAR Studio — ${design.name}\nStability: ${stability.rating} (${stability.marginCalibers.toFixed(2)} cal)\nLength: ${displayLengthShort(geometry.totalLength, unitSystem)}\nMass: ${displayMassShort(mass.totalMass, unitSystem)}\nCG: ${displayLengthShort(cg.cgFromNose, unitSystem)} from nose\nCP: ${displayLengthShort(cp.cpFromNose, unitSystem)} from nose`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [design.name, stability, geometry, mass, cg, cp, unitSystem]);

  // --- Rocket Health Status ---
  const healthStatus = useMemo(() => {
    if (errorCount > 0) return { label: "Needs Attention", color: "text-red-500", badge: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800", icon: AlertTriangle };
    if (warningCount > 0) return { label: "Minor Issues", color: "text-amber-500", badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800", icon: ShieldAlert };
    if (stability.rating === "excellent" || stability.rating === "good") return { label: "Ready to Fly", color: "text-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800", icon: CheckCircle };
    return { label: "Marginal", color: "text-amber-500", badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800", icon: Info };
  }, [errorCount, warningCount, stability.rating]);

  const HealthIcon = healthStatus.icon;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calculator className="h-4 w-4 text-orange-500" />
            Engineering Properties
          </CardTitle>
          <div className="flex items-center gap-2">
            <UnitToggle unitSystem={unitSystem} onToggle={toggleUnits} />
            <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={handleCopy} title="Copy summary">
              {copied ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 space-y-3">
        {/* ═══ Rocket Health Card ═══ */}
        <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
          errorCount > 0 ? "border-red-200 bg-red-50/60 dark:border-red-800 dark:bg-red-950/20" :
          warningCount > 0 ? "border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20" :
          "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20"
        }`}>
          <HealthIcon className={`h-5 w-5 ${healthStatus.color}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">{healthStatus.label}</span>
              {stability.rating && (
                <StabilityRatingBadge rating={stability.rating} />
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[9px] text-muted-foreground">
                {errorCount > 0 ? `${errorCount} error(s)` : warningCount > 0 ? `${warningCount} warning(s)` : "All systems nominal"}
              </span>
              {stabilityRecommendations.length > 0 && (
                <span className="text-[9px] text-muted-foreground">
                  · {stabilityRecommendations.length} recommendation(s)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ═══ Tabbed Content ═══ */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 h-8">
            <TabsTrigger value="overview" className="text-[9px] px-1 py-0">Overview</TabsTrigger>
            <TabsTrigger value="stability" className="text-[9px] px-1 py-0">Stability</TabsTrigger>
            <TabsTrigger value="geometry" className="text-[9px] px-1 py-0">Geometry</TabsTrigger>
            <TabsTrigger value="mass" className="text-[9px] px-1 py-0">Mass</TabsTrigger>
            <TabsTrigger value="reports" className="text-[9px] px-1 py-0">Reports</TabsTrigger>
          </TabsList>

          {/* ═══ OVERVIEW TAB ═══ */}
          <TabsContent value="overview" className="mt-2 space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Key Metrics</p>
            <MetricRow label="Overall Length" value={displayLengthShort(geometry.totalLength, unitSystem)} highlight />
            <MetricRow label="Maximum Diameter" value={displayLengthShort(geometry.maximumDiameter, unitSystem)} />
            <MetricRow label="Total Mass" value={displayMassShort(mass.totalMass, unitSystem)} />
            <MetricRow label="Stability Margin" value={`${stability.marginCalibers.toFixed(2)} cal`}
              color={stability.marginCalibers >= 1 ? "text-emerald-500" : stability.marginCalibers >= 0.5 ? "text-amber-500" : "text-red-500"} />
            <MetricRow label="Aspect Ratio" value={displayAspectRatio(geometry.aspectRatio)} />
            <MetricRow label="Water Fill" value={displayPercentage(waterFillPercentage)} />

            {/* Warnings (critical always visible) */}
            {warnings.filter(w => w.type === "error").length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50/80 p-2 dark:border-red-800 dark:bg-red-950/20 mt-2">
                {warnings.filter(w => w.type === "error").map((w) => (
                  <div key={w.id} className="flex items-start gap-1.5 py-0.5">
                    <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-red-700 dark:text-red-400">{w.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Observations (collapsed by default) */}
            {summary.length > 0 && errorCount === 0 && (
              <details className="group mt-2">
                <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  Engineering Observations ({summary.length})
                </summary>
                <div className="mt-1 space-y-1">
                  {summary.map((s) => (
                    <div key={s.id} className={`flex items-start gap-1.5 rounded px-2 py-1 ${
                      s.type === "positive" ? "text-emerald-600" : s.type === "concern" ? "text-amber-600" : "text-muted-foreground"
                    }`}>
                      <span className="text-[9px] font-bold shrink-0">{s.type === "positive" ? "✓" : s.type === "concern" ? "!" : "ℹ"}</span>
                      <p className="text-[10px]">{s.message}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Sustainability tip */}
            {stabilityRecommendations.length > 0 && (
              <details className="group mt-2">
                <summary className="text-[10px] text-amber-600 cursor-pointer hover:text-amber-700 transition-colors">
                  Recommendations ({stabilityRecommendations.length})
                </summary>
                <div className="mt-1 space-y-1">
                  {stabilityRecommendations.slice(0, 3).map((r) => (
                    <div key={r.id} className="flex items-start gap-1.5 px-2 py-1">
                      <Lightbulb className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-medium">{r.message}</p>
                        <p className="text-[9px] text-muted-foreground">{r.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </TabsContent>

          {/* ═══ STABILITY TAB ═══ */}
          <TabsContent value="stability" className="mt-2 space-y-2">
            <div className={`rounded-lg border p-2.5 ${
              stability.rating === "excellent" || stability.rating === "good"
                ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20"
                : stability.rating === "unstable"
                ? "border-red-200 bg-red-50/60 dark:border-red-800 dark:bg-red-950/20"
                : "border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20"
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">Stability Margin</span>
                <span className="text-sm font-mono font-bold">{Math.abs(stability.marginCalibers).toFixed(2)} cal</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{stability.ratingDescription}</p>
              <p className="text-[9px] text-muted-foreground mt-1 italic">{stability.confidenceNote}</p>
            </div>

            <StabilityMarkerBar
              cgFraction={cg.cgFromNose / (cg.cgFromNose + cg.cgFromTail)}
              cpFraction={cp.cpFromNose / (cp.cpFromNose + cp.cpFromTail)}
              totalLength={cg.cgFromNose + cg.cgFromTail}
              marginCalibers={stability.marginCalibers}
              isStable={stability.isStable}
            />

            <p className="text-[10px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">CG</p>
            <MetricRow label="From Nose" value={displayLengthShort(cg.cgFromNose, unitSystem)} highlight />
            <MetricRow label="From Tail" value={displayLengthShort(cg.cgFromTail, unitSystem)} />
            <MetricRow label="Position" value={`${cg.cgPercentLength.toFixed(0)}% of length`} />

            <Separator className="my-1" />

            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">CP</p>
            <MetricRow label="From Nose" value={displayLengthShort(cp.cpFromNose, unitSystem)} highlight />
            <MetricRow label="From Tail" value={displayLengthShort(cp.cpFromTail, unitSystem)} />
            <MetricRow label="Position" value={`${cp.cpPercentLength.toFixed(0)}% of length`} />
            <MetricRow label="Method" value="Barrowman (simplified)" color="text-muted-foreground" />

            <Separator className="my-1" />

            <MetricRow label="CG-CP Separation" value={displayLengthShort(Math.abs(cg.cgFromNose - cp.cpFromNose), unitSystem)}
              highlight color={stability.isStable ? "text-emerald-500" : "text-red-500"} />
            <MetricRow label="Status" value={stability.isStable ? "CG ahead of CP ✓" : "CG behind CP ✗"}
              color={stability.isStable ? "text-emerald-500" : "text-red-500"} />

            {/* Explainers — collapsed */}
            <details className="group mt-2">
              <summary className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                <BookOpen className="h-3 w-3" />
                How Stability Works
              </summary>
              <div className="mt-2 space-y-2 text-[10px] text-muted-foreground leading-relaxed">
                <p><strong>CG</strong> = Center of Gravity — the balance point. Should be forward.</p>
                <p><strong>CP</strong> = Center of Pressure — where wind pushes. Should be behind CG.</p>
                <p><strong>Rule:</strong> CP should be 1-2 body diameters behind CG for stable flight.</p>
                <p className="italic">Simplified Barrowman approximation — verify with swing tests.</p>
              </div>
            </details>
          </TabsContent>

          {/* ═══ GEOMETRY TAB ═══ */}
          <TabsContent value="geometry" className="mt-2 space-y-2">
            <MetricRow label="Overall Length" value={displayLengthShort(geometry.totalLength, unitSystem)} highlight />
            <MetricRow label="Body Length" value={displayLengthShort(geometry.bodyLength, unitSystem)} />
            <MetricRow label="Nose Length" value={displayLengthShort(geometry.noseLength, unitSystem)} />
            <MetricRow label="Maximum Diameter" value={displayLengthShort(geometry.maximumDiameter, unitSystem)} highlight />
            <MetricRow label="Cross-Sectional Area" value={toEngineeringDisplay("", geometry.crossSectionalArea, unitSystem, "area").label} />
            <MetricRow label="Internal Volume" value={toEngineeringDisplay("", geometry.estimatedInternalVolume, unitSystem, "volume").label} />
            <MetricRow label="Bottle Volume" value={`${geometry.bottleVolumeLiters.toFixed(2)} L`} />
            <MetricRow label="Aspect Ratio (L/D)" value={displayAspectRatio(geometry.aspectRatio)}
              color={geometry.aspectRatio > 15 || geometry.aspectRatio < 5 ? "text-amber-500" : "text-foreground"} />
            <MetricRow label="Frontal Area" value={toEngineeringDisplay("", geometry.frontalArea, unitSystem, "area").label} />
          </TabsContent>

          {/* ═══ MASS TAB ═══ */}
          <TabsContent value="mass" className="mt-2 space-y-2">
            <MetricRow label="Dry Mass" value={displayMassShort(mass.dryMass, unitSystem)} icon={<Weight className="h-3 w-3" />} />
            <MetricRow label="Water Mass" value={displayMassShort(mass.waterMass, unitSystem)} icon={<Droplets className="h-3 w-3 text-blue-500" />} />
            <MetricRow label="Total Launch Mass" value={displayMassShort(mass.totalMass, unitSystem)} highlight />
            <MetricRow label="Water Fill" value={displayPercentage(waterFillPercentage)}
              color={waterFillPercentage >= 25 && waterFillPercentage <= 40 ? "text-emerald-500" : waterFillPercentage > 60 ? "text-amber-500" : "text-foreground"} />

            <div className="pt-1">
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Mass Distribution</p>
              <MassBreakdownBar dryMass={mass.dryMass} waterMass={mass.waterMass} totalMass={mass.totalMass} unitSystem={unitSystem} />
            </div>
          </TabsContent>

          {/* ═══ REPORTS TAB ═══ */}
          <TabsContent value="reports" className="mt-2 space-y-2">
            <p className="text-[10px] text-muted-foreground">
              Export engineering data for use in reports and documentation.
            </p>

            <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8" onClick={handleCopy}>
              <Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy Properties"}
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8"
              onClick={() => {
                const obj = {
                  designName: design.name,
                  unitSystem,
                  geometry: {
                    totalLength: geometry.totalLength, bodyDiameter: geometry.bodyDiameter,
                    noseLength: geometry.noseLength, aspectRatio: geometry.aspectRatio,
                  },
                  mass: { dryMass: mass.dryMass, waterMass: mass.waterMass, totalMass: mass.totalMass },
                  stability: {
                    cgFromNose: cg.cgFromNose, cpFromNose: cp.cpFromNose,
                    marginCalibers: stability.marginCalibers, rating: stability.rating,
                  },
                  warnings: warnings.map(w => ({ type: w.type, message: w.message })),
                };
                const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${design.name.replace(/\s+/g, "_")}_engineering.json`;
                a.click();
                URL.revokeObjectURL(url);
                setExportedJson(true);
                setTimeout(() => setExportedJson(false), 2000);
              }}
            >
              <FileJson className="h-3.5 w-3.5" /> {exportedJson ? "Exported!" : "Export JSON"}
            </Button>

            <Separator className="my-1" />

            <p className="text-[9px] text-muted-foreground">
              Report generation with PDF export coming in a future release.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
