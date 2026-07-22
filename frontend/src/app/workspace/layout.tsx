"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Rocket,
  History,
  BarChart3,
  GitCompareArrows,
  FileText,
  FolderOpen,
  Search,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { globalSearch, type RocketDesign, type SimulationRecord, type Report } from "@/lib/workspace-api";

const NAV_ITEMS = [
  { href: "/workspace", label: "Dashboard", icon: LayoutDashboard },
  { href: "/designer", label: "Rocket Designer", icon: Rocket },
  { href: "/simulate", label: "Simulation", icon: History },
  { href: "/workspace/rockets", label: "Rocket Library", icon: FolderOpen },
  { href: "/workspace/simulations", label: "Simulation History", icon: GitCompareArrows },
  { href: "/workspace/validations", label: "Validation History", icon: BarChart3 },
  { href: "/workspace/reports", label: "Reports", icon: FileText },
];

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    rockets: RocketDesign[];
    simulations: SimulationRecord[];
    reports: Report[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const results = await globalSearch(q);
      setSearchResults(results);
    } catch {
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-border/40 bg-background/95 backdrop-blur-xl">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-border/40 px-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-lg font-bold tracking-tight">SOARSim</span>
          </Link>
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            v2.0
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/workspace" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-orange-500/10 text-orange-600"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Quick links */}
          <div className="mt-8 border-t border-border/40 pt-4">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Actions
            </p>
            <Link
              href="/simulate"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              <Rocket className="h-4 w-4" />
              New Simulation
            </Link>
            <Link
              href="/validate"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              <BarChart3 className="h-4 w-4" />
              Upload Flight Data
            </Link>
          </div>
        </nav>

        {/* Search trigger */}
        <div className="border-t border-border/40 p-3">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex w-full items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            <Search className="h-4 w-4" />
            Search workspace...
            <kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-xs">
              ⌘K
            </kbd>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="ml-64 flex-1">
        {/* Top bar with search */}
        {showSearch && (
          <div className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-xl">
            <div className="mx-auto max-w-5xl px-6 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search rockets, simulations, reports..."
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
                  autoFocus
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-orange-500" />
                  </div>
                )}
              </div>

              {/* Search results dropdown */}
              {searchResults && (
                <div className="mt-2 rounded-lg border border-border bg-card shadow-lg">
                  {searchResults.rockets.length > 0 && (
                    <div className="p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Rockets
                      </p>
                      {searchResults.rockets.slice(0, 5).map((r) => (
                        <Link
                          key={r.id}
                          href={`/workspace/rockets?selected=${r.id}`}
                          onClick={() => setShowSearch(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                        >
                          <Rocket className="h-4 w-4 text-orange-500" />
                          <div>
                            <p className="font-medium">{r.name}</p>
                            <p className="text-xs text-muted-foreground">{r.description || "No description"}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  {searchResults.simulations.length > 0 && (
                    <div className="border-t border-border p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Simulations
                      </p>
                      {searchResults.simulations.slice(0, 5).map((s) => (
                        <Link
                          key={s.id}
                          href="/workspace/simulations"
                          onClick={() => setShowSearch(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                        >
                          <History className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="font-medium">{s.rocketName}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.maxAltitude.toFixed(1)}m · {s.flightTime.toFixed(2)}s
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  {searchResults.reports.length > 0 && (
                    <div className="border-t border-border p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Reports
                      </p>
                      {searchResults.reports.slice(0, 5).map((r) => (
                        <Link
                          key={r.id}
                          href={`/workspace/reports?selected=${r.id}`}
                          onClick={() => setShowSearch(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                        >
                          <FileText className="h-4 w-4 text-emerald-500" />
                          <div>
                            <p className="font-medium">{r.title}</p>
                            <p className="text-xs text-muted-foreground">{r.rocketName}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  {searchResults.rockets.length === 0 &&
                    searchResults.simulations.length === 0 &&
                    searchResults.reports.length === 0 && (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        No results found for &ldquo;{searchQuery}&rdquo;
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)] p-6">{children}</main>
      </div>
    </div>
  );
}
