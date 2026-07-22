"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Rocket,
  History,
  FileText,
  BarChart3,
  GitCompareArrows,
  FlaskConical,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboard, type DashboardData } from "@/lib/workspace-api";

export default function WorkspacePage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getDashboard();
        if (!cancelled) setDashboard(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <SkeletonSection />
        <SkeletonSection />
        <SkeletonSection />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24">
        <BarChart3 className="h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          Could not load dashboard
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
        >
          Retry
        </button>
      </div>
    );
  }

  const stats = dashboard?.stats;
  const rockets = dashboard?.recentRockets ?? [];
  const simulations = dashboard?.recentSimulations ?? [];
  const reports = dashboard?.recentReports ?? [];

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your engineering dashboard — recent activity and quick actions.
        </p>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Rocket className="h-5 w-5" />}
            label="Rocket Designs"
            value={stats.totalRockets}
            gradient="from-blue-500 to-cyan-500"
            href="/workspace/rockets"
          />
          <StatCard
            icon={<History className="h-5 w-5" />}
            label="Simulations"
            value={stats.totalSimulations}
            gradient="from-amber-500 to-orange-500"
            href="/workspace/simulations"
          />
          <StatCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Validations"
            value={stats.totalValidations}
            gradient="from-violet-500 to-purple-500"
            href="/workspace/validations"
          />
          <StatCard
            icon={<FileText className="h-5 w-5" />}
            label="Reports"
            value={stats.totalReports}
            gradient="from-emerald-500 to-green-500"
            href="/workspace/reports"
          />
        </div>
      )}

      {/* Recent Rockets */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Rockets
          </h2>
          <Link
            href="/workspace/rockets"
            className="flex items-center gap-1 text-xs font-medium text-orange-600 transition-colors hover:text-orange-700"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {rockets.length === 0 ? (
          <EmptyState
            icon={<Rocket className="h-8 w-8" />}
            message="No rocket designs yet"
            action={{ label: "Create Rocket", href: "/workspace/rockets" }}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rockets.map((r) => (
              <Link key={r.id} href={`/workspace/rockets?selected=${r.id}`}>
                <Card className="border-border/60 shadow-sm transition-all hover:shadow-md hover:border-orange-500/30 cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-2">
                          <Rocket className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.description || "No description"}
                          </p>
                        </div>
                      </div>
                    </div>
                    {r.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {r.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Simulations */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Simulations
          </h2>
          <Link
            href="/workspace/simulations"
            className="flex items-center gap-1 text-xs font-medium text-orange-600 transition-colors hover:text-orange-700"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {simulations.length === 0 ? (
          <EmptyState
            icon={<History className="h-8 w-8" />}
            message="No simulations yet"
            action={{ label: "New Simulation", href: "/simulate" }}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {simulations.map((s) => (
              <Link key={s.id} href="/workspace/simulations">
                <Card className="border-border/60 shadow-sm transition-all hover:shadow-md hover:border-orange-500/30 cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-2">
                          <History className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{s.rocketName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(s.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Altitude</span>
                        <p className="font-mono font-medium">
                          {s.maxAltitude.toFixed(1)} m
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Flight</span>
                        <p className="font-mono font-medium">
                          {s.flightTime.toFixed(2)} s
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Reports */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Reports
          </h2>
          <Link
            href="/workspace/reports"
            className="flex items-center gap-1 text-xs font-medium text-orange-600 transition-colors hover:text-orange-700"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {reports.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            message="No reports generated yet"
            action={{ label: "Run Simulation", href: "/simulate" }}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((r) => (
              <Link key={r.id} href={`/workspace/reports?selected=${r.id}`}>
                <Card className="border-border/60 shadow-sm transition-all hover:shadow-md hover:border-orange-500/30 cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-gradient-to-br from-emerald-500/10 to-green-500/10 p-2">
                        <FileText className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.rocketName} · {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            icon={<Rocket className="h-5 w-5" />}
            label="New Simulation"
            description="Run a flight simulation"
            href="/simulate"
            gradient="from-amber-500 to-orange-500"
          />
          <QuickActionCard
            icon={<Plus className="h-5 w-5" />}
            label="Design Rocket"
            description="Create a new rocket design"
            href="/workspace/rockets"
            gradient="from-blue-500 to-cyan-500"
          />
          <QuickActionCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Upload Flight Data"
            description="Validate against real data"
            href="/validate"
            gradient="from-violet-500 to-purple-500"
          />
          <QuickActionCard
            icon={<FlaskConical className="h-5 w-5" />}
            label="Engineering Analysis"
            description="Sweeps, MC, DoE"
            href="/analyze"
            gradient="from-teal-500 to-emerald-500"
          />
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  gradient,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  gradient: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="border-border/60 shadow-sm transition-all hover:shadow-md hover:border-orange-500/30 cursor-pointer h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {label}
              </p>
              <p className="text-3xl font-bold tracking-tight">{value}</p>
            </div>
            <div
              className={`rounded-lg bg-gradient-to-br p-2.5 text-white ${gradient}`}
            >
              {icon}
            </div>
          </div>
          <div className={`mt-3 h-1 w-full rounded-full bg-gradient-to-r ${gradient} opacity-30`} />
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickActionCard({
  icon,
  label,
  description,
  href,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
  gradient: string;
}) {
  return (
    <Link href={href}>
      <Card className="border-border/60 shadow-sm transition-all hover:shadow-md hover:border-orange-500/30 cursor-pointer h-full group">
        <CardContent className="p-5">
          <div
            className={`mb-3 inline-flex rounded-lg bg-gradient-to-br p-2.5 text-white transition-transform group-hover:scale-110 ${gradient}`}
          >
            {icon}
          </div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({
  icon,
  message,
  action,
}: {
  icon: React.ReactNode;
  message: string;
  action?: { label: string; href: string };
}) {
  return (
    <Card className="border-dashed border-border/60">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="mb-3 text-muted-foreground/40">{icon}</div>
        <p className="text-sm text-muted-foreground">{message}</p>
        {action && (
          <Link
            href={action.href}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background transition-colors hover:bg-foreground/90"
          >
            <Plus className="h-3 w-3" />
            {action.label}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function SkeletonSection() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
