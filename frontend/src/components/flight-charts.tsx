/**
 * SOAR Studio — Flight Charts Component (v2.5)
 *
 * Interactive trajectory charts with:
 *   - 8 chart types: Altitude, Velocity, Acceleration, Thrust, Mass,
 *     Dynamic Pressure, Mach Number, Trajectory (x vs y)
 *   - Flight event markers overlaid on every chart
 *   - Hover to inspect any point
 *   - Auto-scaling and responsive
 */

"use client";

import { useMemo, useState } from "react";
import type { TrajectoryPoint } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { ChartMarker } from "@/lib/analysis";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  ReferenceDot,
  Label,
} from "recharts";

interface FlightChartsProps {
  trajectory: TrajectoryPoint[];
  markers?: ChartMarker[];
  onMarkerClick?: (type: string) => void;
}

const CHART_COLORS = {
  altitude: "#06b6d4",
  velocity: "#f97316",
  acceleration: "#ec4899",
  thrust: "#8b5cf6",
  mass: "#10b981",
  pressure: "#f59e0b",
  water: "#3b82f6",
  dynamicPressure: "#14b8a6",
  mach: "#6366f1",
  trajectory: "#22c55e",
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
      <p className="mb-1 text-xs text-muted-foreground">
        Time: <span className="font-mono font-medium">{label?.toFixed(3)}s</span>
      </p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}:{" "}
          <span className="font-mono font-medium">
            {entry.value.toFixed(2)}
          </span>
        </p>
      ))}
    </div>
  );
}

// ── Event Markers Layer ──────────────────────────────────────────

function EventMarkers({
  markers,
  data,
  dataKey,
  onMarkerClick,
}: {
  markers?: ChartMarker[];
  data: any[];
  dataKey: string;
  onMarkerClick?: (type: string) => void;
}) {
  if (!markers || markers.length === 0) return null;

  return (
    <>
      {markers.map((marker) => {
        // Find the data point closest to this marker time
        const point = data.reduce((prev, curr) =>
          Math.abs(curr.time - marker.time) < Math.abs(prev.time - marker.time)
            ? curr
            : prev
        );

        return (
          <g key={marker.type}>
            <ReferenceLine
              x={marker.time}
              stroke={marker.color}
              strokeDasharray="3 3"
              strokeOpacity={0.6}
              label={
                <Label
                  value={marker.label}
                  position="top"
                  fontSize={9}
                  fill={marker.color}
                />
              }
            />
            <ReferenceDot
              x={marker.time}
              y={point[dataKey]}
              r={4}
              fill={marker.color}
              stroke="white"
              strokeWidth={1.5}
            />
          </g>
        );
      })}
    </>
  );
}

// ── Main Charts Component ────────────────────────────────────────

export default function FlightCharts({
  trajectory,
  markers = [],
  onMarkerClick,
}: FlightChartsProps) {
  const step = Math.max(1, Math.floor(trajectory.length / 600));
  const chartData = useMemo(
    () => trajectory.filter((_, i) => i % step === 0),
    [trajectory, step]
  );

  // Derived data arrays
  const speedData = useMemo(
    () =>
      chartData.map((p) => ({
        ...p,
        speed: Math.sqrt(p.vx * p.vx + p.vy * p.vy),
        vx: p.vx,
        vy: p.vy,
      })),
    [chartData]
  );

  const accelData = useMemo(
    () =>
      chartData.map((p) => ({
        ...p,
        accel: Math.sqrt(p.ax * p.ax + p.ay * p.ay),
      })),
    [chartData]
  );

  const machData = useMemo(
    () =>
      chartData.map((p) => ({
        ...p,
        mach: p.machNumber ?? Math.sqrt(p.vx * p.vx + p.vy * p.vy) / 340,
      })),
    [chartData]
  );

  const qData = useMemo(
    () =>
      chartData.map((p) => ({
        ...p,
        q: p.dynamicPressure ?? 0.5 * 1.225 * (p.vx * p.vx + p.vy * p.vy),
        qKPa: (p.dynamicPressure ?? 0.5 * 1.225 * (p.vx * p.vx + p.vy * p.vy)) / 1000,
      })),
    [chartData]
  );

  const trajectoryData = useMemo(
    () =>
      chartData
        .filter((p) => p.y > 0.1 && p.x !== undefined)
        .map((p) => ({
          ...p,
          distance: Math.abs(p.x),
        })),
    [chartData]
  );

  // Marker event names for badge
  const markerBadge =
    markers.length > 0 ? (
      <Badge variant="outline" className="text-[10px] font-mono">
        {markers.length} events
      </Badge>
    ) : null;

  const defaultChartMargins = { top: 20, right: 20, left: 0, bottom: 5 };

  return (
    <Tabs defaultValue="altitude" className="w-full">
      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
        <TabsTrigger value="altitude">Altitude</TabsTrigger>
        <TabsTrigger value="velocity">Velocity</TabsTrigger>
        <TabsTrigger value="acceleration">Acceleration</TabsTrigger>
        <TabsTrigger value="thrust">Thrust</TabsTrigger>
        <TabsTrigger value="mass">Mass</TabsTrigger>
        <TabsTrigger value="pressure">Dynamic P</TabsTrigger>
        <TabsTrigger value="mach">Mach</TabsTrigger>
        <TabsTrigger value="trajectory">Trajectory</TabsTrigger>
      </TabsList>

      {/* ════ 1. ALTITUDE ════ */}
      <TabsContent value="altitude" className="mt-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Altitude vs Time</span>
              {markerBadge}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={defaultChartMargins}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(1)}s`}
                    label={{ value: "Time (s)", position: "bottom", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(0)}m`} width={50}
                    label={{ value: "Altitude (m)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="y" name="Altitude" stroke={CHART_COLORS.altitude} strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={500} />
                  <EventMarkers markers={markers} data={chartData} dataKey="y" onMarkerClick={onMarkerClick} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ════ 2. VELOCITY ════ */}
      <TabsContent value="velocity" className="mt-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Velocity vs Time</span>
              {markerBadge}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={speedData} margin={defaultChartMargins}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(1)}s`}
                    label={{ value: "Time (s)", position: "bottom", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(0)}m/s`} width={55}
                    label={{ value: "Velocity (m/s)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="speed" name="Total Speed" stroke={CHART_COLORS.velocity} strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={500} />
                  <Line type="monotone" dataKey="vy" name="Vertical Velocity" stroke="#06b6d4" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} animationDuration={500} opacity={0.6} />
                  <Line type="monotone" dataKey="vx" name="Horizontal Velocity" stroke="#10b981" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} animationDuration={500} opacity={0.6} />
                  <EventMarkers markers={markers} data={speedData} dataKey="speed" onMarkerClick={onMarkerClick} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ════ 3. ACCELERATION ════ */}
      <TabsContent value="acceleration" className="mt-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Acceleration vs Time</span>
              {markerBadge}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accelData} margin={defaultChartMargins}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(1)}s`}
                    label={{ value: "Time (s)", position: "bottom", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(0)}m/s²`} width={55}
                    label={{ value: "Accel (m/s²)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="accel" name="Acceleration" stroke={CHART_COLORS.acceleration} strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={500} />
                  <EventMarkers markers={markers} data={accelData} dataKey="accel" onMarkerClick={onMarkerClick} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ════ 4. THRUST ════ */}
      <TabsContent value="thrust" className="mt-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Thrust vs Time</span>
              {markerBadge}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={defaultChartMargins}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(1)}s`}
                    label={{ value: "Time (s)", position: "bottom", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(0)}N`} width={50}
                    label={{ value: "Thrust (N)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="thrust" name="Thrust" stroke={CHART_COLORS.thrust} strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={500} />
                  <EventMarkers markers={markers} data={chartData} dataKey="thrust" onMarkerClick={onMarkerClick} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ════ 5. MASS ════ */}
      <TabsContent value="mass" className="mt-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Mass &amp; Water vs Time</span>
              {markerBadge}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={defaultChartMargins}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(1)}s`}
                    label={{ value: "Time (s)", position: "bottom", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                  <YAxis yAxisId="mass" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(2)}kg`} width={55}
                    label={{ value: "Mass (kg)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: CHART_COLORS.mass } }} />
                  <YAxis yAxisId="water" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} width={50}
                    label={{ value: "Water (%)", angle: 90, position: "insideRight", style: { fontSize: 11, fill: CHART_COLORS.water } }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line yAxisId="mass" type="monotone" dataKey="mass" name="Total Mass" stroke={CHART_COLORS.mass} strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={500} />
                  <Line yAxisId="water" type="monotone" dataKey="waterRemaining" name="Water Remaining" stroke={CHART_COLORS.water} strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={500} />
                  <EventMarkers markers={markers} data={chartData} dataKey="mass" onMarkerClick={onMarkerClick} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ════ 6. DYNAMIC PRESSURE ════ */}
      <TabsContent value="pressure" className="mt-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Dynamic Pressure vs Time</span>
              {markerBadge}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={qData} margin={defaultChartMargins}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(1)}s`}
                    label={{ value: "Time (s)", position: "bottom", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(1)}kPa`} width={55}
                    label={{ value: "Dynamic P (kPa)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="qKPa" name="Dynamic Pressure" stroke={CHART_COLORS.dynamicPressure} strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={500} />
                  <EventMarkers markers={markers} data={qData} dataKey="qKPa" onMarkerClick={onMarkerClick} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ════ 7. MACH ════ */}
      <TabsContent value="mach" className="mt-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Mach Number vs Time</span>
              {markerBadge}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={machData} margin={defaultChartMargins}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(1)}s`}
                    label={{ value: "Time (s)", position: "bottom", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `M${v.toFixed(2)}`} width={55}
                    label={{ value: "Mach", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="mach" name="Mach Number" stroke={CHART_COLORS.mach} strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={500} />
                  <ReferenceLine y={0.3} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5}
                    label={<Label value="Compressibility threshold" position="right" fontSize={9} fill="#f59e0b" />} />
                  <EventMarkers markers={markers} data={machData} dataKey="mach" onMarkerClick={onMarkerClick} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ════ 8. TRAJECTORY (x vs y) ════ */}
      <TabsContent value="trajectory" className="mt-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Flight Trajectory (Downrange vs Altitude)</span>
              {markerBadge}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trajectoryData} margin={defaultChartMargins}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="distance" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(0)}m`} width={50}
                    label={{ value: "Downrange (m)", position: "bottom", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(0)}m`} width={50}
                    label={{ value: "Altitude (m)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="y" name="Altitude" stroke={CHART_COLORS.trajectory} strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={500} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
