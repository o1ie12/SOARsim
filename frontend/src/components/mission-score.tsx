/**
 * SOAR Studio — Flight Score Component (v2.5)
 *
 * Displays the engineering flight score with:
 *   - Overall score (0-100) with letter grade (A-F)
 *   - Sub-score progress bars
 *   - Deterministic explanations
 *   - Summary text
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  CheckCircle,
  AlertTriangle,
  Info,
  TrendingUp,
} from "lucide-react";
import type { FlightScoreResult, ScoreExplanation } from "@/lib/analysis";
import { getGradeColor } from "@/lib/analysis";

// ── Score Ring ───────────────────────────────────────────────────

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const color = getGradeColor(grade);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ color: score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${color}`}>{grade}</span>
        <span className="text-[10px] text-muted-foreground">
          {score}/100
        </span>
      </div>
    </div>
  );
}

// ── Sub-Score Bar ────────────────────────────────────────────────

function SubScoreBar({
  name,
  score,
  weight,
  label,
}: {
  name: string;
  score: number;
  weight: number;
  label: string;
}) {
  const scoreColor =
    score >= 80 ? "bg-emerald-500" :
    score >= 60 ? "bg-amber-500" :
    "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-medium">{name}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono font-bold tabular-nums">{score}</span>
          <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">
            {weight}%
          </Badge>
        </div>
      </div>
      <Progress
        value={score}
        className="h-1.5"
        indicatorClassName={scoreColor}
      />
    </div>
  );
}

// ── Explanation Card ─────────────────────────────────────────────

function ExplanationCard({ explanation }: { explanation: ScoreExplanation }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
        explanation.type === "positive"
          ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20"
          : explanation.type === "negative"
          ? "border-red-200 bg-red-50/60 dark:border-red-800 dark:bg-red-950/20"
          : "border-border/60 bg-muted/30"
      }`}
    >
      {explanation.type === "positive" ? (
        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
      ) : explanation.type === "negative" ? (
        <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
      ) : (
        <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      )}
      <div>
        <p className="text-[11px] leading-relaxed">{explanation.message}</p>
        <p className="text-[9px] text-muted-foreground mt-0.5">{explanation.name}</p>
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
      <CardHeader className="pb-3">
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

      <CardContent className="space-y-4">
        {/* Score ring + summary */}
        <div className="flex items-center gap-6">
          <ScoreRing score={score.overall} grade={score.grade} />
          <div className="flex-1 space-y-2">
            <p className="text-xs font-medium flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              {score.summary}
            </p>
            <div className="space-y-1.5">
              {score.subScores.map((sub) => (
                <SubScoreBar key={sub.name} {...sub} />
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Explanations */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Score Breakdown
          </p>
          {score.explanations.map((exp) => (
            <ExplanationCard key={exp.name} explanation={exp} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
