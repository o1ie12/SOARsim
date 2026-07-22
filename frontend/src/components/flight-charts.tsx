"use client";

import type { TrajectoryPoint } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface FlightChartsProps {
  trajectory: TrajectoryPoint[];
}

const CHART_COLORS = {
  altitude: "#06b6d4",
  velocity: "#f97316",
  acceleration: "#ec4899",
  thrust: "#8b5cf6",
  mass: "#10b981",
  pressure: "#f59e0b",
  water: "#3b82f6",
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

export default function FlightCharts({ trajectory }: FlightChartsProps) {
  const step = Math.max(1, Math.floor(trajectory.length / 500));
  const chartData = trajectory.filter((_, i) => i % step === 0);

  const speedData = chartData.map((p) => ({
    ...p,
    speed: Math.sqrt(p.vx * p.vx + p.vy * p.vy),
  }));

  const accelData = chartData.map((p) => ({
    ...p,
    accel: Math.sqrt(p.ax * p.ax + p.ay * p.ay),
  }));

  return (
    <Tabs defaultValue="altitude" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="altitude">Altitude</TabsTrigger>
        <TabsTrigger value="velocity">Velocity</TabsTrigger>
        <TabsTrigger value="propulsion">Propulsion</TabsTrigger>
        <TabsTrigger value="dynamics">Dynamics</TabsTrigger>
      </TabsList>

      {/* Tab 1: Altitude */}
      <TabsContent value="altitude" className="mt-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Altitude vs Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(1)}s`}
                    label={{ value: "Time (s)", position: "bottom", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(0)}m`}
                    width={50}
                    label={{ value: "Altitude (m)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="y" name="Altitude" stroke={CHART_COLORS.altitude} strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={500} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab 2: Velocity */}
      <TabsContent value="velocity" className="mt-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Velocity vs Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={speedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(1)}s`}
                    label={{ value: "Time (s)", position: "bottom", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(0)}m/s`}
                    width={55}
                    label={{ value: "Velocity (m/s)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="speed" name="Speed" stroke={CHART_COLORS.velocity} strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={500} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab 3: Propulsion */}
      <TabsContent value="propulsion" className="mt-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Propulsion Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(1)}s`}
                    label={{ value: "Time (s)", position: "bottom", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
                  />
                  <YAxis
                    yAxisId="thrust"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(0)}N`}
                    width={50}
                    label={{ value: "Thrust (N)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: CHART_COLORS.thrust } }}
                  />
                  <YAxis
                    yAxisId="pressure"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${(v / 100000).toFixed(1)}bar`}
                    width={60}
                    label={{ value: "Pressure (bar)", angle: 90, position: "insideRight", style: { fontSize: 11, fill: CHART_COLORS.pressure } }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line yAxisId="thrust" type="monotone" dataKey="thrust" name="Thrust (N)" stroke={CHART_COLORS.thrust} strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={500} />
                  <Line yAxisId="pressure" type="monotone" dataKey="pressure" name="Pressure (Pa)" stroke={CHART_COLORS.pressure} strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={500} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <div className="mt-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Water Remaining vs Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${v.toFixed(1)}s`}
                      label={{ value: "Time (s)", position: "bottom", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                      width={50}
                      label={{ value: "Water (%)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: CHART_COLORS.water } }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="waterRemaining" name="Water Remaining" stroke={CHART_COLORS.water} strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={500} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Tab 4: Dynamics */}
      <TabsContent value="dynamics" className="mt-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Acceleration &amp; Mass</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accelData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(1)}s`}
                    label={{ value: "Time (s)", position: "bottom", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
                  />
                  <YAxis
                    yAxisId="accel"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(0)}m/s²`}
                    width={55}
                    label={{ value: "Accel (m/s²)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: CHART_COLORS.acceleration } }}
                  />
                  <YAxis
                    yAxisId="mass"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(2)}kg`}
                    width={55}
                    label={{ value: "Mass (kg)", angle: 90, position: "insideRight", style: { fontSize: 11, fill: CHART_COLORS.mass } }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line yAxisId="accel" type="monotone" dataKey="accel" name="Acceleration (m/s²)" stroke={CHART_COLORS.acceleration} strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={500} />
                  <Line yAxisId="mass" type="monotone" dataKey="mass" name="Mass (kg)" stroke={CHART_COLORS.mass} strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={500} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
