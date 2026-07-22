"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  History,
  Trash2,
  Rocket,
  Clock,
  ArrowUp,
  Zap,
  ExternalLink,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import type { FlightDataRecord, SimulateRequest } from "@/lib/api";
import { deleteFlight } from "@/lib/api";

interface FlightHistoryProps {
  flights: FlightDataRecord[];
  onSelect: (flight: FlightDataRecord) => void;
  onDelete: (flightId: string) => void;
  onRefresh: () => void;
  selectedFlightId?: string;
  onValidate: (flight: FlightDataRecord, simulation: SimulateRequest) => void;
  loading: boolean;
}

const DEFAULT_SIMULATION: SimulateRequest = {
  rocket: { dragCoefficient: 0.45, crossSectionalArea: 0.008 },
  propulsion: {
    type: "water",
    dryMass: 0.15,
    bottleVolume: 0.002,
    waterVolume: 0.0007,
    initialPressure: 400000,
    nozzleDiameter: 0.013,
  },
  launch: { angle: 75 },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FlightHistory({
  flights,
  onSelect,
  onDelete,
  onRefresh,
  selectedFlightId,
  onValidate,
  loading,
}: FlightHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (flightId: string) => {
    setDeletingId(flightId);
    try {
      await deleteFlight(flightId);
      onDelete(flightId);
    } catch (e) {
      console.error("Failed to delete flight:", e);
    } finally {
      setDeletingId(null);
    }
  };

  if (flights.length === 0) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <History className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            No flights recorded yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Upload flight data to start building your history
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Flight History ({flights.length} flights)
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {flights.map((flight) => (
          <Card
            key={flight.id}
            className={`relative overflow-hidden border-border/60 shadow-sm transition-all hover:shadow-md ${
              selectedFlightId === flight.id
                ? "ring-2 ring-orange-500"
                : ""
            }`}
          >
            <CardContent className="p-5">
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="font-medium">
                    {flight.notes || `Flight ${flight.id}`}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(flight.date)}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {flight.source}
                </span>
              </div>

              {/* Metrics */}
              <div className="mb-4 grid grid-cols-2 gap-3">
                {flight.maxAltitude !== undefined && (
                  <div className="flex items-center gap-2">
                    <ArrowUp className="h-3.5 w-3.5 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Altitude</p>
                      <p className="font-mono text-sm font-medium">
                        {flight.maxAltitude.toFixed(1)} m
                      </p>
                    </div>
                  </div>
                )}
                {flight.flightTime !== undefined && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="font-mono text-sm font-medium">
                        {flight.flightTime.toFixed(2)} s
                      </p>
                    </div>
                  </div>
                )}
                {flight.maxVelocity !== undefined && (
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-rose-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Velocity</p>
                      <p className="font-mono text-sm font-medium">
                        {flight.maxVelocity.toFixed(1)} m/s
                      </p>
                    </div>
                  </div>
                )}
                {flight.launchAngle !== undefined && (
                  <div className="flex items-center gap-2">
                    <Rocket className="h-3.5 w-3.5 text-violet-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Angle</p>
                      <p className="font-mono text-sm font-medium">
                        {flight.launchAngle.toFixed(0)}°
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelect(flight)}
                  className="flex-1 gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Select
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onValidate(flight, DEFAULT_SIMULATION)}
                  disabled={loading}
                  className="flex-1 gap-1"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Validate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(flight.id)}
                  disabled={deletingId === flight.id}
                  className="text-muted-foreground hover:text-destructive"
                >
                  {deletingId === flight.id ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </CardContent>

            {/* Source accent bar */}
            <div
              className={`h-1 w-full ${
                flight.source === "csv"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500"
                  : flight.source === "sensor"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                  : "bg-gradient-to-r from-orange-500 to-amber-500"
              }`}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
