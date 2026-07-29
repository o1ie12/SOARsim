/**
 * SOAR Studio v2.7 — Flight Score Component (Redesigned)
 *
 * Clean, spacious layout with:
 *   - Large circular score (no overlapping text)
 *   - Large centered grade letter
 *   - Sub-score breakdown bars below
 *   - Overall recommendation at bottom
 *   - Semantic colors: green=success, orange=warning, red=critical
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trophy, TrendingUp } from "lucide-react";
import type { FlightScoreResult } from "@/lib/analysis";
import { getGradeColor } from "@/lib/analysis";

// ── Score Ring ───────────────────────────────────────────────────

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const ringColor =
    score >= 80 ? "#10b981" :
    score >= 60 ? "#f59e0b" :
    score >= 40 ? "#f97316" :
    "#ef4444";

  return (
    <div className="relative flex items-center justify-center">
      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60" cy="60" r="54"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
        />
        <circle
          cx="60" cy="60" r="54"
          fill="none"
          stroke={ringColor}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold leading-none tracking-tight ${getGradeColor(grade)}`}>
          {grade}
        </span>
        <span className="mt-1 text-[11px] font-medium text-muted-foreground">
          {score}/100
        </span>
      </div>
    </div>
  );
}

// ── Sub-Score Row ────────────────────────────────────────────────

function SubScoreRow({
  name,
  score,
  weight,
}: {
  name: string;
  score: number;
  weight: number;
}) {
  const barColor =
    score >= 80 ? "bg-emerald-500" :
    score >= 60 ? "bg-amber-500" :
    score >= 40 ? "bg-orange-500" :
    "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{name}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold tabular-nums">{score}</span>
          <span className="text-[10px] text-muted-foreground">({weight}%)</span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ── Main Score Component ─────────────────────────────────────────

interface MissionScoreProps {
  score: FlightScoreResult;
}

export default function MissionScore({ score }: MissionScoreProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-amber-500" />
            Flight Score
          </CardTitle>
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold ${getGradeColor(score.grade)}`}
          >
            Grade {score.grade}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Score ring + summary — side by side with clear spacing */}
        <div className="flex items-center gap-6">
          <div className="shrink-0">
            <ScoreRing score={score.overall} grade={score.grade} />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <p className="text-sm font-medium leading-snug flex items-start gap-1.5">
              <TrendingUp className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
              <span>{score.summary}</span>
            </p>
            <div className="space-y-2.5">
              {score.subScores.map((sub) => (
                <SubScoreRow key={sub.name} name={sub.name} score={sub.score} weight={sub.weight} />
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Explanations — one per line, clean */}
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Score Breakdown
          </p>
          {score.explanations.map((exp) => (
            <div
              key={exp.name}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
                exp.type === "positive"
                  ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20"
                  : exp.type === "negative"
                  ? "border-red-200 bg-red-50/60 dark:border-red-800 dark:bg-red-950/20"
                  : "border-border/60 bg-muted/20"
              }`}
            >
              <span className={`shrink-0 text-xs font-bold ${
                exp.type === "positive" ? "text-emerald-600" :
                exp.type === "negative" ? "text-red-500" :
                "text-muted-foreground"
              }`}>
                {exp.type === "positive" ? "✓" : exp.type === "negative" ? "✗" : "ℹ"}
              </span>
              <div className="min-w-0">
                <p className="text-xs leading-relaxed">{exp.message}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{exp.name}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Overall recommendation */}
        <div className={`rounded-lg border px-4 py-3 text-center ${
          score.overall >= 80
            ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20"
            : score.overall >= 60
            ? "border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20"
            : "border-red-200 bg-red-50/60 dark:border-red-800 dark:bg-red-950/20"
        }`}>
          <p className={`text-xs font-semibold ${
            score.overall >= 80 ? "text-emerald-700 dark:text-emerald-400" :
            score.overall >= 60 ? "text-amber-700 dark:text-amber-400" :
            "text-red-700 dark:text-red-400"
          }`}>
            {score.overall >= 80 ? "Excellent design — ready for flight." :
             score.overall >= 60 ? "Good design — minor improvements recommended." :
             score.overall >= 40 ? "Fair design — several areas need attention." :
             "Poor design — significant redesign recommended before flight."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
