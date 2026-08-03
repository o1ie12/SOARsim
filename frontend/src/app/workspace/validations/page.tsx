"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BarChart3,
  Trash2,
  Loader2,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listValidations,
  deleteValidation,
  type ValidationRecord,
} from "@/lib/workspace-api";

export default function ValidationsPage() {
  const [validations, setValidations] = useState<ValidationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Actions states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchValidations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listValidations();
      setValidations(data.validations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load validations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchValidations();
  }, [fetchValidations]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this validation record?")) return;
    setActionLoading(`del-${id}`);
    try {
      await deleteValidation(id);
      setValidations((prev) => prev.filter((v) => v.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete validation.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Validation History</h1>
          <p className="text-sm text-muted-foreground">
            Review predictive accuracy assessments comparing physical test data against simulated models.
          </p>
        </div>
        <Link href="/validate">
          <Button className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
            <BarChart3 className="h-4 w-4" />
            Validation Studio
          </Button>
        </Link>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20 text-red-800 dark:text-red-400 text-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-red-500" />
          <div>
            <h5 className="font-semibold">Validation Error</h5>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          <p className="mt-3 text-sm text-muted-foreground">Loading validations...</p>
        </div>
      ) : validations.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">No validation records found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Upload real flight data and execute validations against predictions in the Validation Studio to populate this log.
            </p>
            <Link href="/validate" className="mt-4">
              <Button className="gap-1.5" size="sm">
                <BarChart3 className="h-4 w-4" />
                Go to Validation Studio
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {validations.map((val) => {
            const isDelLoading = actionLoading === `del-${val.id}`;
            const score = typeof val.summary?.score === "number" ? val.summary.score : null;

            return (
              <Card
                key={val.id}
                className="flex flex-col border-border/60 shadow-sm transition-all hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>Accuracy Report</span>
                      </div>
                      <CardTitle className="text-base font-bold text-foreground">
                        Flight Validation #{val.id.substring(0, 8)}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(val.id)}
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
                  {val.notes && val.notes.length > 0 ? (
                    <div className="space-y-1.5">
                      {val.notes.map((note, index) => (
                        <p key={index} className="text-xs text-muted-foreground line-clamp-2 italic bg-muted/40 p-2 rounded border border-border/30">
                          &ldquo;{note}&rdquo;
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No validation remarks.</p>
                  )}

                  {/* Summary performance score */}
                  {score !== null && (
                    <div className="flex items-center justify-between border-y border-border/40 py-3">
                      <span className="text-xs font-medium text-muted-foreground">Accuracy Score:</span>
                      <Badge className="font-mono text-xs bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800">
                        {score.toFixed(1)}% Match
                      </Badge>
                    </div>
                  )}

                  {/* Footer metadata */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(val.date).toLocaleDateString()}</span>
                    </div>
                    <Link href="/validate" className="flex items-center gap-0.5 text-orange-600 hover:text-orange-700">
                      <span>View details</span>
                      <ChevronRight className="h-3 w-3" />
                    </Link>
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
