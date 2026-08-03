"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Trash2,
  Loader2,
  RefreshCw,
  Calendar,
  AlertTriangle,
  Eye,
  Download,
  X,
  Printer,
  Copy,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listReports,
  getReportMarkdown,
  deleteReport,
  type Report,
} from "@/lib/workspace-api";

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Preview State
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [previewMarkdown, setPreviewMarkdown] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Actions states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listReports();
      setReports(data.reports);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleOpenPreview = async (report: Report) => {
    setPreviewReport(report);
    setPreviewLoading(true);
    setPreviewMarkdown(null);
    try {
      const markdown = await getReportMarkdown(report.id);
      setPreviewMarkdown(markdown);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch report markdown.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewReport(null);
    setPreviewMarkdown(null);
  };

  const handleCopyMarkdown = () => {
    if (!previewMarkdown) return;
    navigator.clipboard.writeText(previewMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintHtml = (id: string) => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const cleanUrl = apiBaseUrl.startsWith("http") ? apiBaseUrl : `https://${apiBaseUrl}`;
    window.open(`${cleanUrl}/api/workspace/reports/${id}/html`, "_blank");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;
    setActionLoading(`del-${id}`);
    try {
      await deleteReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (previewReport?.id === id) {
        handleClosePreview();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete report.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-8rem)]">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Engineering Reports</h1>
          <p className="text-sm text-muted-foreground">
            Manage, review, export, or print generated engineering analysis flight reports.
          </p>
        </div>
        <Link href="/simulate">
          <Button className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
            <FileText className="h-4 w-4" />
            Generate New Report
          </Button>
        </Link>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20 text-red-800 dark:text-red-400 text-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-red-500" />
          <div>
            <h5 className="font-semibold">Reports Error</h5>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          <p className="mt-3 text-sm text-muted-foreground">Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">No reports generated yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Simulate a flight, then choose to &quot;Generate Report&quot; on the flight simulation results page to create an engineering file here.
            </p>
            <Link href="/simulate" className="mt-4">
              <Button className="gap-1.5" size="sm">
                <FileText className="h-4 w-4" />
                Go to Simulation Studio
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => {
            const isDelLoading = actionLoading === `del-${report.id}`;
            const rName = report.rocket_name ?? (report as any).rocketName;
            const rCreatedAt = report.created_at ?? (report as any).createdAt;

            return (
              <Card
                key={report.id}
                className="flex flex-col border-border/60 shadow-sm transition-all hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileText className="h-4 w-4 text-emerald-500" />
                        <span>Engineering Summary</span>
                      </div>
                      <CardTitle className="text-base font-bold text-foreground">
                        {report.title}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(report.id)}
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
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Rocket:</span>
                      <span className="font-semibold">{rName}</span>
                    </div>

                    {report.performanceMetrics?.maxAltitude !== undefined && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Apogee Altitude:</span>
                        <span className="font-mono font-bold">
                          {Number(report.performanceMetrics.maxAltitude).toFixed(1)} m
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 flex gap-2 border-t border-border/30">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPreview(report)}
                      className="flex-1 gap-1 text-xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintHtml(report.id)}
                      className="flex-1 gap-1 text-xs"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print / PDF
                    </Button>
                  </div>

                  {/* Footer metadata */}
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(rCreatedAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Preview Dialog Modal Overlay */}
      {previewReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[85vh] flex flex-col border-border/60 shadow-2xl bg-card">
            <CardHeader className="border-b border-border/40 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-500" />
                  {previewReport.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Rocket: {previewReport.rocket_name ?? (previewReport as any).rocketName} • Generated {new Date(previewReport.created_at ?? (previewReport as any).createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClosePreview}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap select-text">
              {previewLoading ? (
                <div className="flex flex-col items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  <p className="text-xs text-muted-foreground mt-2">Fetching markdown report...</p>
                </div>
              ) : previewMarkdown ? (
                previewMarkdown
              ) : (
                <p className="text-xs text-muted-foreground italic">No report contents loaded.</p>
              )}
            </CardContent>

            <div className="border-t border-border/40 p-4 bg-muted/20 flex gap-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyMarkdown}
                disabled={!previewMarkdown}
                className="gap-1.5"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy Markdown"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePrintHtml(previewReport.id)}
                className="gap-1.5"
              >
                <Printer className="h-4 w-4" />
                Print / HTML View
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleClosePreview}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Close Preview
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
