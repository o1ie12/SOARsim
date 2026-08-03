"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Trash2,
  Loader2,
  RefreshCw,
  Tag as TagIcon,
  Calendar,
  AlertTriangle,
  ArrowUp,
  Clock,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listSimulations,
  deleteSimulation,
  type SimulationRecord,
} from "@/lib/workspace-api";

export default function SimulationsPage() {
  const [simulations, setSimulations] = useState<SimulationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [uniqueTags, setUniqueTags] = useState<string[]>([]);

  // Actions states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSimulations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listSimulations({
        query: searchQuery || undefined,
        tags: selectedTag || undefined,
      });
      setSimulations(data.simulations);

      // Collect all unique tags
      const tagsSet = new Set<string>();
      data.simulations.forEach((s) => s.tags?.forEach((t) => tagsSet.add(t)));
      setUniqueTags(Array.from(tagsSet));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load simulations.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedTag]);

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this simulation record?")) return;
    setActionLoading(`del-${id}`);
    try {
      await deleteSimulation(id);
      setSimulations((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete simulation.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Simulation History</h1>
          <p className="text-sm text-muted-foreground">
            Review past flight simulations, environmental settings, and physics outcomes.
          </p>
        </div>
        <Link href="/simulate">
          <Button className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
            <History className="h-4 w-4" />
            New Simulation
          </Button>
        </Link>
      </div>

      {/* Filters and Search Bar */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by rocket name, notes, or parameters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {uniqueTags.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Tag:</span>
                <select
                  value={selectedTag || ""}
                  onChange={(e) => setSelectedTag(e.target.value || null)}
                  className="bg-background border border-border rounded-md px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="">All Tags</option>
                  {uniqueTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(searchQuery || selectedTag) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTag(null);
                }}
                className="text-xs text-muted-foreground"
              >
                Clear Filters
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={fetchSimulations} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20 text-red-800 dark:text-red-400 text-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-red-500" />
          <div>
            <h5 className="font-semibold">History Error</h5>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          <p className="mt-3 text-sm text-muted-foreground">Loading simulation history...</p>
        </div>
      ) : simulations.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <History className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">No simulation records found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Run rocket flight simulations first in order to save records into your workspace history.
            </p>
            <Link href="/simulate" className="mt-4">
              <Button className="gap-1.5" size="sm">
                <History className="h-4 w-4" />
                Run First Simulation
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {simulations.map((sim) => {
            const isDelLoading = actionLoading === `del-${sim.id}`;
            const physicsVer = sim.physics_version ?? sim.physicsVersion ?? "2.0";
            const rName = sim.rocket_name ?? sim.rocketName ?? "Untitled";
            const maxAlt = sim.max_altitude ?? sim.maxAltitude ?? 0.0;
            const flightTime = sim.flight_time ?? sim.flightTime ?? 0.0;
            const maxVel = sim.max_velocity ?? sim.maxVelocity ?? 0.0;

            return (
              <Card
                key={sim.id}
                className="flex flex-col border-border/60 shadow-sm transition-all hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <History className="h-4 w-4 text-blue-500" />
                        <span className="text-xs font-mono text-muted-foreground">v{physicsVer}</span>
                      </div>
                      <CardTitle className="text-base font-bold text-foreground">
                        {rName}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(sim.id)}
                      disabled={isDelLoading}
                      className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 w-8 p-0"
                    >
                      {isDelLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                  {/* Notes / Description */}
                  {sim.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2 italic bg-muted/40 p-2 rounded border border-border/30">
                      &ldquo;{sim.notes}&rdquo;
                    </p>
                  )}

                  {/* Summary performance stats */}
                  <div className="grid grid-cols-3 gap-2 border-y border-border/40 py-3 font-mono text-xs">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-blue-500 mb-0.5">
                        <ArrowUp className="h-3.5 w-3.5" />
                        <span className="text-[9px] uppercase font-bold tracking-tight text-muted-foreground">Apogee</span>
                      </div>
                      <span className="font-bold">{maxAlt.toFixed(1)} m</span>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-amber-500 mb-0.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-[9px] uppercase font-bold tracking-tight text-muted-foreground">Duration</span>
                      </div>
                      <span className="font-bold">{flightTime.toFixed(2)} s</span>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-rose-500 mb-0.5">
                        <Zap className="h-3.5 w-3.5" />
                        <span className="text-[9px] uppercase font-bold tracking-tight text-muted-foreground">Max Vel</span>
                      </div>
                      <span className="font-bold">{maxVel.toFixed(1)} m/s</span>
                    </div>
                  </div>

                  {/* Footer metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <div className="flex flex-wrap gap-1">
                      {sim.tags?.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">
                          <TagIcon className="h-2 w-2 mr-1 text-muted-foreground/80" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(sim.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
