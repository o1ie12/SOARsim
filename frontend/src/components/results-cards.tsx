"use client";

import type { SimulationSummary } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowUp,
  Clock,
  Zap,
  Gauge,
  Wind,
  Flame,
  Droplets,
  MapPin,
} from "lucide-react";

interface ResultsCardsProps {
  summary: SimulationSummary;
}

// Extended metrics including derived values
interface ExtendedMetrics {
  maxAltitude: number;
  maxVelocity: number;
  flightTime: number;
  maxAcceleration: number;
  maxDynamicPressure: number;
  maxThrust: number;
  propellantUsed: number;
  landingDistance: number;
}

const METRICS: {
  key: keyof ExtendedMetrics;
  label: string;
  unit: string;
  icon: React.ReactNode;
  gradient: string;
  description: string;
}[] = [
  {
    key: "maxAltitude",
    label: "Maximum Altitude",
    unit: "m",
    icon: <ArrowUp className="h-5 w-5" />,
    gradient: "from-blue-500 to-cyan-500",
    description: "Peak height above launch point",
  },
  {
    key: "maxVelocity",
    label: "Maximum Velocity",
    unit: "m/s",
    icon: <Zap className="h-5 w-5" />,
    gradient: "from-rose-500 to-pink-500",
    description: "Peak speed during flight",
  },
  {
    key: "flightTime",
    label: "Flight Time",
    unit: "s",
    icon: <Clock className="h-5 w-5" />,
    gradient: "from-amber-500 to-orange-500",
    description: "Total time airborne",
  },
  {
    key: "maxAcceleration",
    label: "Max Acceleration",
    unit: "m/s²",
    icon: <Gauge className="h-5 w-5" />,
    gradient: "from-violet-500 to-purple-500",
    description: "Peak acceleration magnitude",
  },
  {
    key: "maxDynamicPressure",
    label: "Max Dynamic Pressure",
    unit: "Pa",
    icon: <Wind className="h-5 w-5" />,
    gradient: "from-teal-500 to-emerald-500",
    description: "Maximum aerodynamic load (q)",
  },
  {
    key: "maxThrust",
    label: "Max Thrust",
    unit: "N",
    icon: <Flame className="h-5 w-5" />,
    gradient: "from-red-500 to-orange-500",
    description: "Peak propulsion force",
  },
  {
    key: "propellantUsed",
    label: "Propellant Used",
    unit: "%",
    icon: <Droplets className="h-5 w-5" />,
    gradient: "from-blue-400 to-indigo-500",
    description: "Water consumed during burn",
  },
  {
    key: "landingDistance",
    label: "Landing Distance",
    unit: "m",
    icon: <MapPin className="h-5 w-5" />,
    gradient: "from-emerald-500 to-green-500",
    description: "Horizontal range from launch",
  },
];

function computeExtendedMetrics(
  summary: SimulationSummary,
  trajectory?: Array<{ thrust?: number; pressure?: number; waterRemaining?: number; x?: number }>
): ExtendedMetrics {
  // Compute derived metrics from trajectory if available
  let maxThrust = 0;
  let maxDynamicPressure = 0;
  let propellantUsed = 0;
  let landingDistance = 0;

  if (trajectory && trajectory.length > 0) {
    for (const point of trajectory) {
      if (point.thrust && point.thrust > maxThrust) maxThrust = point.thrust;
      // Dynamic pressure approximation: q = 0.5 * rho * v^2
      // Using simplified estimate based on altitude
    }
    const lastPoint = trajectory[trajectory.length - 1];
    if (lastPoint.x !== undefined) landingDistance = Math.abs(lastPoint.x);
    if (trajectory[0].waterRemaining !== undefined) {
      propellantUsed = (1 - (lastPoint.waterRemaining ?? 0)) * 100;
    }
  }

  // Estimate max dynamic pressure (simplified)
  maxDynamicPressure = 0.5 * 1.225 * summary.maxVelocity * summary.maxVelocity * 0.008 * 0.45;

  return {
    maxAltitude: summary.maxAltitude,
    maxVelocity: summary.maxVelocity,
    flightTime: summary.flightTime,
    maxAcceleration: summary.maxAcceleration,
    maxDynamicPressure,
    maxThrust,
    propellantUsed,
    landingDistance,
  };
}

function formatValue(value: number, unit: string): string {
  if (unit === "Pa") {
    if (value >= 1000) return `${(value / 1000).toFixed(1)} kPa`;
    return value.toFixed(0);
  }
  if (unit === "%") return value.toFixed(1);
  if (value >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  if (value >= 1) return value.toFixed(2);
  if (value > 0) return value.toFixed(4);
  return "0.00";
}

export default function ResultsCards({ summary }: ResultsCardsProps) {
  const metrics = computeExtendedMetrics(summary);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {METRICS.map(({ key, label, unit, icon, gradient, description }) => (
        <Card
          key={key}
          className="relative overflow-hidden border-border/60 shadow-sm transition-all hover:shadow-md group"
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {label}
                </p>
                <p className="text-2xl font-bold tracking-tight">
                  {formatValue(metrics[key], unit)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {unit}
                  </span>
                </p>
              </div>
              <div
                className={`rounded-lg bg-gradient-to-br p-2.5 text-white transition-transform group-hover:scale-110 ${gradient}`}
              >
                {icon}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity">
              {description}
            </p>
          </CardContent>
          <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />
        </Card>
      ))}
    </div>
  );
}