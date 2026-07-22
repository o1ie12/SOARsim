"use client";

import { useState } from "react";
import Link from "next/link";
import { FlaskConical, GitCompareArrows, Dice5, BarChart3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SweepPanel from "@/components/sweep-panel";
import MonteCarloPanel from "@/components/monte-carlo-panel";
import DoEPanel from "@/components/doe-panel";

export default function AnalyzePage() {
  const [activeTab, setActiveTab] = useState("sweep");

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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FlaskConical className="h-3.5 w-3.5" />
            Engineering Analysis
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Engineering Analysis
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Analyze rocket designs with parameter sweeps, uncertainty quantification, and design of experiments.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sweep" className="gap-2">
              <GitCompareArrows className="h-4 w-4" />
              Parameter Sweep
            </TabsTrigger>
            <TabsTrigger value="montecarlo" className="gap-2">
              <Dice5 className="h-4 w-4" />
              Monte Carlo
            </TabsTrigger>
            <TabsTrigger value="doe" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Design of Experiments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sweep" className="mt-6">
            <SweepPanel />
          </TabsContent>

          <TabsContent value="montecarlo" className="mt-6">
            <MonteCarloPanel />
          </TabsContent>

          <TabsContent value="doe" className="mt-6">
            <DoEPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
