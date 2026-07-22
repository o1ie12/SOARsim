"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Rocket,
  Upload,
  CheckCircle,
  BarChart3,
  History,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import FlightUploadForm from "@/components/flight-upload-form";
import ValidationDashboard from "@/components/validation-dashboard";
import ValidationCharts from "@/components/validation-charts";
import FlightHistory from "@/components/flight-history";
import {
  createFlight,
  listFlights,
  validateSimulation,
  type CreateFlightRequest,
  type FlightDataRecord,
  type ValidateResponse,
  type SimulateRequest,
} from "@/lib/api";

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

export default function ValidatePage() {
  const [flights, setFlights] = useState<FlightDataRecord[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<FlightDataRecord | null>(null);
  const [validationResult, setValidationResult] = useState<ValidateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("upload");

  const fetchFlights = useCallback(async () => {
    try {
      const response = await listFlights();
      setFlights(response.flights);
    } catch (e) {
      console.error("Failed to load flights:", e);
    }
  }, []);

  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  const handleUploadFlight = async (data: CreateFlightRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await createFlight(data);
      setFlights((prev) => [response.flight, ...prev]);
      setSelectedFlight(response.flight);
      setActiveTab("results");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to upload flight data.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (flight: FlightDataRecord, simulation: SimulateRequest) => {
    setLoading(true);
    setError(null);
    setSelectedFlight(flight);
    try {
      const result = await validateSimulation({
        simulation,
        flightId: flight.id,
      });
      setValidationResult(result);
      setActiveTab("results");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Validation failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFlight = (flight: FlightDataRecord) => {
    setSelectedFlight(flight);
    setValidationResult(null);
  };

  const handleDeleteFlight = (flightId: string) => {
    setFlights((prev) => prev.filter((f) => f.id !== flightId));
    if (selectedFlight?.id === flightId) {
      setSelectedFlight(null);
      setValidationResult(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            <span className="text-lg font-bold tracking-tight">SOARSim</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/simulate"
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Rocket className="h-4 w-4" />
              Simulate
            </Link>
            <Link
              href="/validate"
              className="flex items-center gap-2 text-sm font-medium text-foreground"
            >
              <BarChart3 className="h-4 w-4" />
              Validate
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Validation Studio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare simulation predictions against real flight data to validate model accuracy.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Flight
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Validation Results
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Flight History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-6">
            <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
              {/* Left — Upload form */}
              <FlightUploadForm
                onUpload={handleUploadFlight}
                loading={loading}
              />

              {/* Right — Quick validate if flight selected */}
              <div>
                {selectedFlight && (
                  <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">
                        Quick Validate
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Run simulation against selected flight data
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="rounded-lg border border-border bg-muted/50 p-4">
                          <p className="text-sm font-medium">
                            {selectedFlight.notes || "Flight " + selectedFlight.id}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(selectedFlight.date).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          onClick={() =>
                            handleValidate(selectedFlight, DEFAULT_SIMULATION)
                          }
                          disabled={loading}
                          className="w-full"
                        >
                          {loading ? "Validating..." : "Run Validation"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Flight list preview */}
                <Card className="mt-6 border-border/60 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">
                      Recent Flights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {flights.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No flights recorded yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {flights.slice(0, 5).map((flight) => (
                          <button
                            key={flight.id}
                            onClick={() => handleSelectFlight(flight)}
                            className={`w-full rounded-lg border p-3 text-left transition-colors ${
                              selectedFlight?.id === flight.id
                                ? "border-orange-500 bg-orange-500/10"
                                : "border-border hover:border-border/80 hover:bg-muted/50"
                            }`}
                          >
                            <p className="text-sm font-medium">
                              {flight.notes || `Flight ${flight.id}`}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {new Date(flight.date).toLocaleDateString()}
                              {flight.maxAltitude && (
                                <> · {flight.maxAltitude.toFixed(1)}m</>
                              )}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results" className="mt-6">
            {validationResult ? (
              <div className="space-y-6">
                <ValidationDashboard result={validationResult} />
                <ValidationCharts result={validationResult} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24">
                <BarChart3 className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-sm font-medium text-muted-foreground">
                  No validation results yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Upload flight data and run validation to see results
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <FlightHistory
              flights={flights}
              onSelect={handleSelectFlight}
              onDelete={handleDeleteFlight}
              onRefresh={fetchFlights}
              selectedFlightId={selectedFlight?.id}
              onValidate={handleValidate}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
