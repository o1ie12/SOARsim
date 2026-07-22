/**
 * SOARSim Rocket Designer - Live Calculations Display
 *
 * Shows automatically recalculated properties whenever values change.
 */

"use client";

import React from "react";
import { useRocketDesigner } from "./rocket-designer-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calculator,
  Weight,
  Ruler,
  Droplets,
  Gauge,
  Target,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";

// ── Metric Card ──────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  color?: string;
}

function MetricCard({ label, value, unit, icon, color = "text-foreground" }: MetricCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3">
      <div className="rounded-md bg-muted p-2">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={`text-sm font-semibold tabular-nums ${color}`}>
          {value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
        </p>
      </div>
    </div>
  );
}

// ── Warnings List ────────────────────────────────────────────────

function WarningsList() {
  const { warnings } = useRocketDesigner();

  if (warnings.length === 0) return null;

  const errors = warnings.filter((w) => w.type === "error");
  const warningList = warnings.filter((w) => w.type === "warning");
  const infos = warnings.filter((w) => w.type === "info");

  return (
    <div className="space-y-2">
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
          {errors.map((w) => (
            <div key={w.id} className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-400">{w.message}</p>
            </div>
          ))}
        </div>
      )}

      {warningList.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
          {warningList.map((w) => (
            <div key={w.id} className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">{w.message}</p>
            </div>
          ))}
        </div>
      )}

      {infos.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
          {infos.map((w) => (
            <div key={w.id} className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-400">{w.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────

export default function RocketLiveCalculations() {
  const { calculations } = useRocketDesigner();

  const hasErrors = false; // Will be updated by warnings

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-orange-500" />
          Live Calculations
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Automatically updated as you modify parameters
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mass Properties */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Mass Properties
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              label="Total Mass"
              value={(calculations.totalMass * 1000).toFixed(0)}
              unit="g"
              icon={<Weight className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              label="Dry Mass"
              value={(calculations.dryMass * 1000).toFixed(0)}
              unit="g"
              icon={<Weight className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              label="Water Mass"
              value={(calculations.waterMass * 1000).toFixed(0)}
              unit="g"
              icon={<Droplets className="h-4 w-4 text-blue-500" />}
            />
            <MetricCard
              label="Water Fill"
              value={calculations.waterFillPercentage.toFixed(0)}
              unit="%"
              icon={<Droplets className="h-4 w-4 text-blue-500" />}
              color={
                calculations.waterFillPercentage >= 25 && calculations.waterFillPercentage <= 40
                  ? "text-emerald-500"
                  : calculations.waterFillPercentage > 60
                  ? "text-amber-500"
                  : "text-foreground"
              }
            />
          </div>
        </div>

        <Separator />

        {/* Geometry */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Geometry
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              label="Total Length"
              value={(calculations.totalLength * 1000).toFixed(0)}
              unit="mm"
              icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              label="Body Diameter"
              value={(calculations.bodyDiameter * 1000).toFixed(0)}
              unit="mm"
              icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              label="Cross-Section Area"
              value={(calculations.crossSectionalArea * 10000).toFixed(1)}
              unit="cm²"
              icon={<Target className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              label="Aspect Ratio"
              value={calculations.aspectRatio.toFixed(1)}
              unit="L/D"
              icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
              color={
                calculations.aspectRatio > 10
                  ? "text-amber-500"
                  : "text-foreground"
              }
            />
          </div>
        </div>

        <Separator />

        {/* Stability */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Stability
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              label="Center of Gravity"
              value={(calculations.centerOfGravity * 1000).toFixed(0)}
              unit="mm from tail"
              icon={<Gauge className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              label="Stability Margin"
              value={calculations.stabilityMargin.toFixed(1)}
              unit="cal"
              icon={<Gauge className="h-4 w-4 text-muted-foreground" />}
              color="text-muted-foreground"
            />
          </div>
        </div>

        <Separator />

        {/* Warnings */}
        <WarningsList />
      </CardContent>
    </Card>
  );
}
