"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Rocket,
  Search,
  Plus,
  Star,
  Trash2,
  Copy,
  Loader2,
  RefreshCw,
  Tag as TagIcon,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listRockets,
  createRocket,
  deleteRocket,
  duplicateRocket,
  toggleFavorite,
  type RocketDesign,
} from "@/lib/workspace-api";

function RocketsInner() {
  const searchParams = useSearchParams();
  const selectedParam = searchParams.get("selected");

  const [rockets, setRockets] = useState<RocketDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [uniqueTags, setUniqueTags] = useState<string[]>([]);

  // Actions states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRockets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listRockets({
        query: searchQuery || undefined,
        tags: selectedTag || undefined,
        favorites: favoritesOnly || undefined,
      });
      setRockets(data.rockets);

      // Collect all unique tags
      const tagsSet = new Set<string>();
      data.rockets.forEach((r) => r.tags.forEach((t) => tagsSet.add(t)));
      setUniqueTags(Array.from(tagsSet));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rockets.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedTag, favoritesOnly]);

  useEffect(() => {
    fetchRockets();
  }, [fetchRockets]);

  const handleCreateDefault = async () => {
    setActionLoading("create");
    try {
      await createRocket({
        name: `Custom Rocket ${rockets.length + 1}`,
        description: "Created from the Rocket Library",
        tags: ["custom"],
        dragCoefficient: 0.45,
        crossSectionalArea: 0.008,
        dryMass: 0.15,
        bottleVolume: 0.002,
        waterVolume: 0.0007,
        initialPressure: 400000,
        nozzleDiameter: 0.013,
        launchAngle: 75,
      });
      fetchRockets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create rocket.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    setActionLoading(`fav-${id}`);
    try {
      await toggleFavorite(id);
      setRockets((prev) =>
        prev.map((r) => {
          if (r.id === id) {
            const isFav = (r as any).is_favorite ?? r.isFavorite;
            return { ...r, is_favorite: !isFav, isFavorite: !isFav };
          }
          return r;
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to toggle favorite.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (id: string, currentName: string) => {
    setActionLoading(`dup-${id}`);
    try {
      await duplicateRocket(id, `${currentName} (Copy)`);
      fetchRockets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to duplicate rocket.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rocket design?")) return;
    setActionLoading(`del-${id}`);
    try {
      await deleteRocket(id);
      setRockets((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete rocket.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rocket Library</h1>
          <p className="text-sm text-muted-foreground">
            Manage your custom water rocket designs, geometries, and physical attributes.
          </p>
        </div>
        <Button
          onClick={handleCreateDefault}
          disabled={actionLoading !== null}
          className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
        >
          {actionLoading === "create" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          New Rocket
        </Button>
      </div>

      {/* Filters and Search Bar */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by rocket name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={favoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className="gap-1.5"
            >
              <Star className={`h-4 w-4 ${favoritesOnly ? "fill-white" : ""}`} />
              Favorites Only
            </Button>

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

            {(searchQuery || selectedTag || favoritesOnly) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTag(null);
                  setFavoritesOnly(false);
                }}
                className="text-xs text-muted-foreground"
              >
                Clear Filters
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={fetchRockets} disabled={loading}>
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
            <h5 className="font-semibold">Library Error</h5>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          <p className="mt-3 text-sm text-muted-foreground">Loading rocket library...</p>
        </div>
      ) : rockets.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Rocket className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">No rockets found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Try modifying your search or add a new rocket design to your collection.
            </p>
            <Button onClick={handleCreateDefault} className="mt-4 gap-1.5" size="sm">
              <Plus className="h-4 w-4" />
              Create First Rocket
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rockets.map((rocket) => {
            const isHighlighted = selectedParam === rocket.id;
            const isFavLoading = actionLoading === `fav-${rocket.id}`;
            const isDupLoading = actionLoading === `dup-${rocket.id}`;
            const isDelLoading = actionLoading === `del-${rocket.id}`;

            const isFavorite = (rocket as any).is_favorite ?? rocket.isFavorite;
            const dryMass = (rocket as any).dry_mass ?? rocket.dryMass;
            const bottleVolume = (rocket as any).bottle_volume ?? rocket.bottleVolume;
            const waterVolume = (rocket as any).water_volume ?? rocket.waterVolume;
            const initialPressure = (rocket as any).initial_pressure ?? rocket.initialPressure;
            const modifiedAt = (rocket as any).modified_at ?? rocket.modifiedAt;
            const createdAt = (rocket as any).created_at ?? rocket.createdAt;

            return (
              <Card
                key={rocket.id}
                className={`flex flex-col border-border/60 shadow-sm transition-all hover:shadow-md ${
                  isHighlighted ? "ring-2 ring-orange-500" : ""
                }`}
              >
                <CardHeader className="pb-3 flex-row items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold flex items-center gap-1.5">
                      <Rocket className="h-4 w-4 text-orange-500" />
                      {rocket.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {rocket.description || "No description provided."}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-yellow-500"
                    onClick={() => handleToggleFavorite(rocket.id)}
                    disabled={isFavLoading}
                  >
                    <Star
                      className={`h-4 w-4 ${
                        isFavorite ? "fill-yellow-400 text-yellow-400" : ""
                      } ${isFavLoading ? "animate-spin" : ""}`}
                    />
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  {/* Physical parameters */}
                  <div className="grid grid-cols-2 gap-2 text-xs border-y border-border/40 py-3 font-mono">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Dry Mass</span>
                      <span className="font-bold">{(dryMass * 1000).toFixed(0)}g</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Bottle Volume</span>
                      <span className="font-bold">{(bottleVolume * 1000).toFixed(1)} L</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Water Volume</span>
                      <span className="font-bold">{(waterVolume * 1000).toFixed(1)} L</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Pressure</span>
                      <span className="font-bold">{(initialPressure / 100000).toFixed(1)} bar</span>
                    </div>
                  </div>

                  {/* Metadata: Tags and Modified Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      {rocket.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0">
                          <TagIcon className="h-2 w-2 mr-1 text-muted-foreground" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(modifiedAt || createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-3 flex gap-2 border-t border-border/30">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicate(rocket.id, rocket.name)}
                      disabled={isDupLoading}
                      className="flex-1 gap-1 text-xs"
                    >
                      {isDupLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Duplicate
                    </Button>
                    <Link href="/designer" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1 text-xs">
                        Open
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rocket.id)}
                      disabled={isDelLoading}
                      className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      {isDelLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
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

export default function RocketsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          <p className="mt-3 text-sm text-muted-foreground">Loading rocket library...</p>
        </div>
      }
    >
      <RocketsInner />
    </Suspense>
  );
}
