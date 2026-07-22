"use client";

import type { ValidateResponse } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  Cell,
  ReferenceLine,
} from "recharts";

interface ValidationChartsProps {
  result: ValidateResponse;
}

const CHART_COLORS = {
  predicted: "#06b6d4",
  actual: "#f97316",
  error: "#ef4444",
  good: "#10b981",
  warn: "#f59e0b",
  bad: "#ef4444",
};

interface ComparisonData {
  name: string;
  predicted: number;
  actual: number;
  error: number;
  errorPct: number;
}

function getComparisonData(result: ValidateResponse): ComparisonData[] {
  return result.metrics.map((m) => ({
    name: m.metricName.replace("Maximum ", "").replace(" ", "\n"),
    predicted: m.predicted,
    actual: m.actual,
    error: m.absError,
    errorPct: m.pctError ?? 0,
  }));
}

function getScatterData(result: ValidateResponse): { x: number; y: number; label: string }[] {
  return result.metrics.map((m) => ({
    x: m.actual,
    y: m.predicted,
    label: m.metricName,
  }));
}

function ErrorTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
      <p className="mb-1 text-xs font-medium">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toFixed(2)}
        </p>
      ))}
    </div>
  );
}

export default function ValidationCharts({ result }: ValidationChartsProps) {
  const comparisonData = getComparisonData(result);
  const scatterData = getScatterData(result);

  // Perfect prediction line (y=x) for scatter plot
  const maxValue = Math.max(
    ...result.metrics.map((m) => Math.max(m.predicted, m.actual))
  );

  return (
    <Tabs defaultValue="comparison" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="comparison">Bar Comparison</TabsTrigger>
        <TabsTrigger value="scatter">Scatter Plot</TabsTrigger>
        <TabsTrigger value="errors">Error Analysis</TabsTrigger>
      </TabsList>

      {/* Tab 1: Bar Comparison */}
      <TabsContent value="comparison" className="mt-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Predicted vs Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  barGap={4}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.5}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ErrorTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="predicted"
                    name="Predicted"
                    fill={CHART_COLORS.predicted}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="actual"
                    name="Actual"
                    fill={CHART_COLORS.actual}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab 2: Scatter Plot */}
      <TabsContent value="scatter" className="mt-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Predicted vs Actual Scatter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.5}
                  />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Actual"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    label={{
                      value: "Actual",
                      position: "bottom",
                      style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Predicted"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    label={{
                      value: "Predicted",
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
                          <p className="mb-1 text-xs font-medium">{data.label}</p>
                          <p className="text-xs text-cyan-500">
                            Predicted: {data.y.toFixed(2)}
                          </p>
                          <p className="text-xs text-orange-500">
                            Actual: {data.x.toFixed(2)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  {/* Perfect prediction line (y=x) */}
                  <ReferenceLine
                    segment={[
                      { x: 0 as const, y: 0 as const },
                      { x: maxValue * 1.1, y: maxValue * 1.1 },
                    ]}
                    stroke={CHART_COLORS.good}
                    strokeDasharray="5 5"
                    strokeWidth={2}
                  />
                  <Scatter
                    data={scatterData}
                    fill={CHART_COLORS.predicted}
                    name="Metrics"
                  >
                    {scatterData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          i === 0
                            ? CHART_COLORS.predicted
                            : i === 1
                            ? CHART_COLORS.actual
                            : CHART_COLORS.error
                        }
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-cyan-500" />
                Altitude
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                Flight Time
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                Velocity
              </div>
              <div className="flex items-center gap-2">
                <div className="h-px w-4 border-t-2 border-dashed border-emerald-500" />
                Perfect Prediction
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab 3: Error Analysis */}
      <TabsContent value="errors" className="mt-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Error Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.5}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    label={{
                      value: "Error %",
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
                          <p className="mb-1 text-xs font-medium">{data.name}</p>
                          <p className="text-xs">
                            Error: {data.errorPct > 0 ? "+" : ""}
                            {data.errorPct.toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Abs Error: {data.error.toFixed(2)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                  <Bar dataKey="errorPct" name="Percent Error" radius={[4, 4, 0, 0]}>
                    {comparisonData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          Math.abs(entry.errorPct) < 5
                            ? CHART_COLORS.good
                            : Math.abs(entry.errorPct) < 15
                            ? CHART_COLORS.warn
                            : CHART_COLORS.bad
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                &lt;5% Error
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                5-15% Error
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                &gt;15% Error
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
