/**
 * SOAR Studio v2.6 — Design Comparison Studio
 *
 * Compare multiple rocket designs side-by-side across:
 *   - Engineering comparison table with best/worst highlighting
 *   - Side-by-side SVG rocket visualizations
 *   - Design Scorecard with adjustable weight sliders
 *   - Optimization Assistant with rule-based suggestions
 *   - Overlay simulation charts (when simulation data available)
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  GitCompareArrows,
  Plus,
  X,
  Trophy,
  Lightbulb,
  BarChart3,
  Rocket,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Info,
  Sliders,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  RefreshCw,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { createDefaultDesign } from "@/lib/rocket-geometry";
import type { RocketDesignState } from "@/lib/rocket-designer-types";
import { calculateEngineeringProperties } from "@/lib/engineering/properties";

import {
  compareDesigns,
  CATEGORY_LABELS,
  scoreDesign,
  createDefaultScorecardConfig,
  findBestDesign,
  generateOptimizations,
  GOAL_LABELS,
  getScorecardGrade,
  getScorecardGradeColor,
  type ComparisonCategory,
  type ScorecardConfig,
  type OptimizationGoal,
  type SimulationData,
} from "@/lib/comparison";

// ── Rocket Color Palette ─────────────────────────────────────────

const ROCKET_COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

// ── Main Page ────────────────────────────────────────────────────

export default function ComparePage() {
  // ── State ──
  const [rockets, setRockets] = useState<RocketDesignState[]>([]);
  const [simulations, setSimulations] = useState<Record<string, SimulationData>>({});
  const [activeTab, setActiveTab] = useState("table");
  const [scorecardConfig, setScorecardConfig] = useState<ScorecardConfig>(createDefaultScorecardConfig());
  const [optimizationGoal, setOptimizationGoal] = useState<OptimizationGoal>("general");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    geometry: true,
    mass: true,
    aerodynamics: true,
    stability: true,
    simulation: true,
    mission: true,
  });

  // ── Add / Remove Rockets ──
  const addRocket = useCallback(() => {
    if (rockets.length >= 8) return;
    const design = createDefaultDesign();
    design.name = `Rocket ${rockets.length + 1}`;
    design.id = `compare_${Date.now()}`;
    setRockets((prev) => [...prev, design]);
  }, [rockets.length]);

  const removeRocket = useCallback((id: string) => {
    setRockets((prev) => prev.filter((r) => r.id !== id));
    setSimulations((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const updateRocket = useCallback((id: string, updates: Partial<RocketDesignState>) => {
    setRockets((prev) => prev.map((r) => r.id === id ? { ...r, ...updates } : r));
  }, []);

  // ── Comparison Results ──
  const comparisonData = useMemo(() => {
    if (rockets.length < 2) return null;

    const designs = new Map(
      rockets.map((r) => [r.id, { design: r, simulation: simulations[r.id] }])
    );

    return compareDesigns(designs);
  }, [rockets, simulations]);

  // ── Scorecard Results ──
  const scorecardResults = useMemo(() => {
    return rockets.map((r) =>
      scoreDesign(r, simulations[r.id] ?? null, scorecardConfig)
    );
  }, [rockets, simulations, scorecardConfig]);

  const bestDesign = useMemo(() => findBestDesign(scorecardResults), [scorecardResults]);

  // ── Optimization Results ──
  const optimizationResults = useMemo(() => {
    return rockets.map((r) =>
      generateOptimizations(r, optimizationGoal, simulations[r.id] ?? null)
    );
  }, [rockets, optimizationGoal, simulations]);

  // ── Category toggle ──
  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  // ── Weight change handler ──
  const handleWeightChange = useCallback((objectiveId: string, weight: number) => {
    setScorecardConfig((prev) => ({
      ...prev,
      weights: { ...prev.weights, [objectiveId]: Math.round(weight) },
    }));
  }, []);

  // ── Reset weights ──
  const resetWeights = useCallback(() => {
    setScorecardConfig(createDefaultScorecardConfig());
  }, []);

  const canAdd = rockets.length < 8;

  // ── Category groups ──
  const categories: ComparisonCategory[] = ["geometry", "mass", "aerodynamics", "stability", "simulation"];

  return (
    <div className="flex flex-1 flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            <span className="text-base font-bold tracking-tight">SOAR Studio</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GitCompareArrows className="h-3.5 w-3.5" />
            Comparison Studio
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">v2.6</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 lg:px-8">
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Comparison Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare up to 8 rocket designs side-by-side. Identify the best design for your engineering goals.
          </p>
        </div>

        {/* Rocket Selection Bar */}
        <Card className="border-border/60 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Rockets ({rockets.length}/8):
              </span>
              {rockets.map((rocket, idx) => (
                <div
                  key={rocket.id}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-1.5"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: ROCKET_COLORS[idx % ROCKET_COLORS.length] }}
                  />
                  <input
                    type="text"
                    value={rocket.name}
                    onChange={(e) => updateRocket(rocket.id, { name: e.target.value })}
                    className="w-28 bg-transparent text-sm font-medium outline-none"
                  />
                  <button
                    onClick={() => removeRocket(rocket.id)}
                    className="text-muted-foreground hover:text-red-500 transition-colors"
                    aria-label={`Remove ${rocket.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {canAdd && (
                <button
                  onClick={addRocket}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-orange-500/50 hover:text-orange-600 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Rocket
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {rockets.length < 2 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24">
            <GitCompareArrows className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              Add at least 2 rockets to start comparing
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Click &quot;Add Rocket&quot; above to create designs for comparison
            </p>
            <Button onClick={addRocket} variant="default" className="mt-4 gap-1.5" size="sm">
              <Plus className="h-4 w-4" />
              Add First Rocket
            </Button>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full max-w-3xl grid-cols-4">
                <TabsTrigger value="table" className="gap-1.5 text-xs">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Comparison Table
                </TabsTrigger>
                <TabsTrigger value="scorecard" className="gap-1.5 text-xs">
                  <Trophy className="h-3.5 w-3.5" />
                  Scorecard
                </TabsTrigger>
                <TabsTrigger value="optimization" className="gap-1.5 text-xs">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Optimization
                </TabsTrigger>
                <TabsTrigger value="visual" className="gap-1.5 text-xs">
                  <Rocket className="h-3.5 w-3.5" />
                  Visual
                </TabsTrigger>
              </TabsList>

              {/* ═══ COMPARISON TABLE ═══ */}
              <TabsContent value="table">
                <div className="space-y-4">
                  {categories.map((cat) => {
                    const catMetrics = comparisonData?.metrics.filter((m) => m.category === cat) ?? [];
                    if (catMetrics.length === 0) return null;
                    const isExpanded = expandedCategories[cat];

                    return (
                      <Card key={cat} className="border-border/60 shadow-sm">
                        <CardHeader
                          className="cursor-pointer pb-3"
                          onClick={() => toggleCategory(cat)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-sm">
                                {CATEGORY_LABELS[cat]}
                              </CardTitle>
                              <Badge variant="outline" className="text-[10px]">
                                {catMetrics.length} metrics
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Category winner */}
                              {comparisonData?.winners[cat] && (
                                <Badge className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800">
                                  <Trophy className="h-2.5 w-2.5 mr-1" />
                                  Winner: {rockets.find((r) => r.id === comparisonData!.winners[cat])?.name ?? "Unknown"}
                                </Badge>
                              )}
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        {isExpanded && (
                          <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border/60">
                                  <th className="sticky left-0 bg-card px-4 py-2.5 text-left text-xs font-medium text-muted-foreground min-w-[140px]">
                                    Metric
                                  </th>
                                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                                    Unit
                                  </th>
                                  {rockets.map((r, idx) => (
                                    <th
                                      key={r.id}
                                      className="px-3 py-2.5 text-right text-xs font-medium min-w-[100px]"
                                      style={{ color: ROCKET_COLORS[idx % ROCKET_COLORS.length] }}
                                    >
                                      <div className="flex items-center justify-end gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ROCKET_COLORS[idx % ROCKET_COLORS.length] }} />
                                        {r.name}
                                      </div>
                                    </th>
                                  ))}
                                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground min-w-[60px]">
                                    Best
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {catMetrics.map((metric) => {
                                  const values = rockets.map((r) => metric.values[r.id] ?? 0);
                                  const bestVal = metric.bestRocketId ? metric.values[metric.bestRocketId] : null;
                                  const worstVal = metric.worstRocketId ? metric.values[metric.worstRocketId] : null;
                                  return (
                                    <tr key={metric.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                                      <td className="px-4 py-2.5 text-xs font-medium">
                                        {metric.label}
                                      </td>
                                      <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">
                                        {metric.unit}
                                      </td>
                                      {rockets.map((r) => {
                                        const val = metric.values[r.id] ?? 0;
                                        const isBest = r.id === metric.bestRocketId;
                                        const isWorst = r.id === metric.worstRocketId;
                                        return (
                                          <td
                                            key={r.id}
                                            className={`px-3 py-2.5 text-right text-xs font-mono tabular-nums ${
                                              isBest
                                                ? "text-emerald-600 font-bold"
                                                : isWorst
                                                ? "text-red-500"
                                                : ""
                                            }`}
                                          >
                                            <div className="flex items-center justify-end gap-1">
                                              {isBest && <ArrowUp className="h-3 w-3 text-emerald-500" />}
                                              {isWorst && <ArrowDown className="h-3 w-3 text-red-500" />}
                                              {formatMetricValue(val, metric.unit)}
                                            </div>
                                          </td>
                                        );
                                      })}
                                      <td className="px-3 py-2.5 text-right text-xs text-emerald-600 font-mono tabular-nums">
                                        {bestVal !== null ? formatMetricValue(bestVal, metric.unit) : "-"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}

                  {/* Overall Winner */}
                  {comparisonData?.overallWinner && (
                    <Alert className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20">
                      <Trophy className="h-4 w-4 text-emerald-500" />
                      <AlertTitle className="text-sm font-semibold">Overall Winner</AlertTitle>
                      <AlertDescription className="text-xs">
                        <strong>{rockets.find((r) => r.id === comparisonData.overallWinner)?.name ?? "Unknown"}</strong> wins in the most categories
                        ({categories.filter((c) => comparisonData.winners[c] === comparisonData.overallWinner).length} of {categories.length} categories).
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>

              {/* ═══ SCORECARD ═══ */}
              <TabsContent value="scorecard">
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Scorecard Results */}
                  <div className="lg:col-span-2 space-y-4">
                    {scorecardResults.map((result, idx) => (
                      <Card key={result.rocketId} className="border-border/60 shadow-sm">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: ROCKET_COLORS[idx % ROCKET_COLORS.length] }}
                              />
                              <CardTitle className="text-sm">{result.rocketName}</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-lg font-bold ${getScorecardGradeColor(result.grade)}`}>
                                {result.grade}
                              </span>
                              <Badge variant="outline" className="text-xs font-mono">
                                {result.overall}/100
                              </Badge>
                              {bestDesign?.rocketId === result.rocketId && (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 text-[9px]">
                                  <Trophy className="h-2.5 w-2.5 mr-1" />
                                  Best
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {result.objectives.map((obj) => (
                              <div key={obj.id} className="flex items-center gap-3">
                                <span className="w-28 text-[10px] text-muted-foreground shrink-0">
                                  {obj.label}
                                </span>
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${obj.score}%`,
                                      backgroundColor:
                                        obj.score >= 80 ? "#10b981" :
                                        obj.score >= 60 ? "#f59e0b" :
                                        obj.score >= 40 ? "#f97316" :
                                        "#ef4444",
                                    }}
                                  />
                                </div>
                                <span className="w-20 text-right text-[10px] font-mono text-muted-foreground">
                                  {obj.score} ({obj.weight}%)
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 space-y-1">
                            {result.objectives.map((obj) => (
                              <p key={obj.id} className="text-[10px] text-muted-foreground">
                                <span className="font-medium">{obj.label}:</span> {obj.explanation}
                              </p>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Weight Controls */}
                  <div>
                    <Card className="border-border/60 shadow-sm sticky top-20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Sliders className="h-4 w-4 text-amber-500" />
                            Score Weights
                          </CardTitle>
                          <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={resetWeights}>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Reset
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {scorecardConfig.objectives.map((obj) => (
                          <div key={obj.id}>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-medium text-muted-foreground">
                                {obj.label}
                              </label>
                              <span className="text-[10px] font-mono font-bold">
                                {scorecardConfig.weights[obj.id] ?? obj.defaultWeight}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              value={scorecardConfig.weights[obj.id] ?? obj.defaultWeight}
                              onChange={(e) => handleWeightChange(obj.id, parseInt(e.target.value))}
                              className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer
                                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5
                                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500
                                [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer"
                            />
                            <p className="text-[9px] text-muted-foreground mt-0.5">{obj.description}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* ═══ OPTIMIZATION ═══ */}
              <TabsContent value="optimization">
                <div className="space-y-4">
                  {/* Goal selector */}
                  <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-muted-foreground">
                          Optimization Goal:
                        </span>
                        <Select
                          value={optimizationGoal}
                          onValueChange={(v) => setOptimizationGoal(v as OptimizationGoal)}
                        >
                          <SelectTrigger className="w-52 h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(GOAL_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Results */}
                  {optimizationResults.map((result, idx) => (
                    <Card key={result.rocketId} className="border-border/60 shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: ROCKET_COLORS[idx % ROCKET_COLORS.length] }}
                            />
                            <CardTitle className="text-sm">{result.rocketName}</CardTitle>
                          </div>
                          <Badge variant="outline" className="text-[9px]">
                            {result.suggestions.length} suggestions
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{result.summary}</p>
                      </CardHeader>
                      <CardContent>
                        {result.suggestions.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-4 text-center">
                            No optimization suggestions for this goal.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {result.suggestions.map((s) => (
                              <div
                                key={s.id}
                                className={`rounded-lg border px-3 py-2.5 ${
                                  s.priority === "high"
                                    ? "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20"
                                    : s.priority === "medium"
                                    ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
                                    : "border-border/60 bg-muted/20"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold">
                                        {s.component}: {s.action} {s.property}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={`text-[8px] px-1 py-0 h-4 ${
                                          s.priority === "high" ? "border-orange-400 text-orange-600" :
                                          s.priority === "medium" ? "border-amber-400 text-amber-600" :
                                          "border-muted-foreground text-muted-foreground"
                                        }`}
                                      >
                                        {s.priority}
                                      </Badge>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                      <span className="font-medium">Current:</span> {s.currentValue}
                                      <span className="mx-1">→</span>
                                      <span className="font-medium">Suggested:</span> {s.suggestedValue}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      <span className="font-medium">Why:</span> {s.rationale}
                                    </p>
                                    <p className="text-[10px] text-emerald-600 mt-0.5">
                                      <span className="font-medium">Expected benefit:</span> {s.expectedBenefit}
                                    </p>
                                  </div>
                                  {s.priority === "high" ? (
                                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                                  ) : s.priority === "medium" ? (
                                    <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* ═══ VISUAL COMPARISON ═══ */}
              <TabsContent value="visual">
                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Rocket className="h-4 w-4 text-orange-500" />
                      Side-by-Side Rocket Visualization
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6" style={{
                      gridTemplateColumns: `repeat(${Math.min(rockets.length, 4)}, 1fr)`,
                    }}>
                      {rockets.map((rocket, idx) => {
                        const eng = (() => {
                          try {
                            return calculateEngineeringProperties(rocket);
                          } catch { return null; }
                        })();
                        return (
                          <div key={rocket.id} className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: ROCKET_COLORS[idx % ROCKET_COLORS.length] }}
                              />
                              <span className="text-xs font-semibold">{rocket.name}</span>
                            </div>
                            <RocketSVGThumbnail design={rocket} color={ROCKET_COLORS[idx % ROCKET_COLORS.length]} />
                            <div className="mt-2 space-y-0.5">
                              <p className="text-[9px] text-muted-foreground">
                                L: {(rocket.noseCone.geometry.length + rocket.bodyTube.geometry.length +
                                    rocket.bottle.geometry.length + rocket.recovery.geometry.compartmentLength +
                                    rocket.nozzle.geometry.length) * 1000}mm
                              </p>
                              {eng && (
                                <>
                                  <p className="text-[9px] text-muted-foreground">
                                    SM: {eng.stability.marginCalibers.toFixed(2)} cal
                                  </p>
                                  <p className="text-[9px] text-muted-foreground">
                                    Mass: {(eng.mass.totalMass * 1000).toFixed(0)}g
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Separator className="my-6" />
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">
                        Rocket SVGs show relative size and proportions. CG/CP markers not shown in thumbnail view.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}

// ── Rocket SVG Thumbnail ─────────────────────────────────────────

function RocketSVGThumbnail({ design, color }: { design: RocketDesignState; color: string }) {
  const SCALE = 300;
  const centerX = 60;
  const centerY = 15;

  const noseLen = design.noseCone.geometry.length * SCALE;
  const bodyLen = design.bodyTube.geometry.length * SCALE;
  const bottleLen = design.bottle.geometry.length * SCALE;
  const recoveryLen = design.recovery.geometry.compartmentLength * SCALE;
  const nozzleLen = design.nozzle.geometry.length * SCALE;
  const bodyDiam = design.bodyTube.geometry.outerDiameter * SCALE;
  const bottleDiam = design.bottle.geometry.diameter * SCALE;
  const nozzleDiam = design.nozzle.geometry.throatDiameter * SCALE;

  const totalHeight = noseLen + bodyLen + bottleLen + recoveryLen + nozzleLen + 30;
  const svgHeight = Math.max(200, totalHeight);

  let y = centerY;
  const noseTop = y;
  const noseBottom = y + noseLen;
  y = noseBottom;
  const bodyTop = y;
  const bodyBottom = y + bodyLen;
  y = bodyBottom;
  const bottleTop = y;
  const bottleBottom = y + bottleLen;
  y = bottleBottom;
  const recoveryTop = y;
  const recoveryBottom = y + recoveryLen;
  y = recoveryBottom;
  const nozzleTop = y;
  const nozzleBottom = y + nozzleLen;

  return (
    <svg width={120} height={Math.min(svgHeight, 300)} viewBox={`0 0 120 ${Math.min(svgHeight, 300)}`} className="mx-auto">
      {/* Centerline */}
      <line x1={centerX} y1={noseTop} x2={centerX} y2={nozzleBottom + 10} stroke="#e5e7eb" strokeWidth={0.5} strokeDasharray="2,2" />

      {/* Nose */}
      <path d={`M ${centerX - bodyDiam / 2} ${noseBottom} L ${centerX} ${noseTop} L ${centerX + bodyDiam / 2} ${noseBottom} Z`}
        fill={color} stroke="#c2410c" strokeWidth={0.8} opacity={0.85} />

      {/* Body */}
      <rect x={centerX - bodyDiam / 2} y={bodyTop} width={bodyDiam} height={bodyLen}
        fill="#e5e7eb" stroke="#9ca3af" strokeWidth={0.8} rx={1} />

      {/* Bottle */}
      <rect x={centerX - bottleDiam / 2} y={bottleTop} width={bottleDiam} height={bottleLen}
        fill={color} stroke="#2563eb" strokeWidth={0.8} rx={2} opacity={0.6} />

      {/* Recovery */}
      <rect x={centerX - bodyDiam / 2 + 1} y={recoveryTop} width={bodyDiam - 2} height={recoveryLen}
        fill="#10b981" stroke="#059669" strokeWidth={0.5} rx={1} opacity={0.5} />

      {/* Nozzle */}
      <path d={`M ${centerX - bottleDiam / 2} ${nozzleTop} L ${centerX - nozzleDiam / 2} ${nozzleBottom} L ${centerX + nozzleDiam / 2} ${nozzleBottom} L ${centerX + bottleDiam / 2} ${nozzleTop} Z`}
        fill="#1f2937" stroke="#111827" strokeWidth={0.8} />
    </svg>
  );
}

// ── Format Helpers ───────────────────────────────────────────────

function formatMetricValue(value: number, unit: string): string {
  if (unit === "cal" || unit === "calibers") return value.toFixed(2);
  if (unit === "m/s") return value.toFixed(1);
  if (unit === "m/s²") return value.toFixed(1);
  if (unit === "m") return value.toFixed(2);
  if (unit === "L" || unit === "l") return value.toFixed(2);
  if (unit === "kg") return value.toFixed(3);
  if (unit === "m²") return value.toFixed(4);
  if (unit === "") return value.toFixed(1);
  return value.toFixed(2);
}
