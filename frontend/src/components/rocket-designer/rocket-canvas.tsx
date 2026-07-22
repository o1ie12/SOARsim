/**
 * SOARSim Rocket Designer — Rocket Canvas
 *
 * Renders a clean 2D side-view SVG rocket from the current model.
 * Auto-scales to fit the viewport. No interactive drag handles.
 *
 * The SVG is always generated from the rocket model — one source of truth.
 */

"use client";

import { useRef, useMemo } from "react";
import { useRocketDesigner } from "./rocket-designer-context";

// ── Colours ──────────────────────────────────────────────────────

const COLORS = {
  noseCone: { fill: "#f97316", stroke: "#c2410c" },
  bodyTube: { fill: "#e5e7eb", stroke: "#9ca3af" },
  bottle: { fill: "#93c5fd", stroke: "#3b82f6" },
  fins: { fill: "#6b7280", stroke: "#374151" },
  nozzle: { fill: "#1f2937", stroke: "#111827" },
  recovery: { fill: "#6ee7b7", stroke: "#059669" },
  centerline: "#d1d5db",
  grid: "#f3f4f6",
};

// ── Layout constants ─────────────────────────────────────────────

const PADDING = 48;
const LABEL_HEIGHT = 28;

// ── Component ────────────────────────────────────────────────────

export default function RocketCanvas() {
  const { state, calculations, warnings } = useRocketDesigner();
  const design = state.current;
  const svgRef = useRef<SVGSVGElement>(null);

  const hasErrors = warnings.some((w) => w.type === "error");

  // ── Compute SVG layout ────────────────────────────────────────

  const layout = useMemo(() => {
    const noseLen = design.noseCone.geometry.length;
    const bodyLen = design.bodyTube.geometry.length;
    const bottleLen = design.bottle.geometry.length;
    const recoveryLen = design.recovery.geometry.compartmentLength;
    const nozzleLen = design.nozzle.geometry.length;

    const totalMeters = noseLen + bodyLen + bottleLen + recoveryLen + nozzleLen;
    const bodyDiam = design.bodyTube.geometry.outerDiameter;
    const bottleDiam = design.bottle.geometry.diameter;
    const nozzleExit = design.nozzle.geometry.exitDiameter;
    const finH = design.fins.geometry.height;

    // Choose scale so the whole rocket fits in ~480px height
    const maxDim = Math.max(totalMeters, bodyDiam + finH * 2);
    const scale = Math.min(460 / maxDim, 1000);
    const svgW = 520;
    const svgH = totalMeters * scale + PADDING * 2 + LABEL_HEIGHT;

    const centerX = svgW / 2;

    // Y positions (top to bottom)
    let y = PADDING;
    const noseTop = y;
    const noseBot = y + noseLen * scale;
    y = noseBot;
    const bodyTop = y;
    const bodyBot = y + bodyLen * scale;
    y = bodyBot;
    const bottleTop = y;
    const bottleBot = y + bottleLen * scale;
    y = bottleBot;
    const recoveryTop = y;
    const recoveryBot = y + recoveryLen * scale;
    y = recoveryBot;
    const nozzleTop = y;
    const nozzleBot = y + nozzleLen * scale;

    const halfBody = (bodyDiam * scale) / 2;
    const halfBottle = (bottleDiam * scale) / 2;
    const halfNozzle = (nozzleExit * scale) / 2;
    const finHpx = finH * scale;
    const finSpanPx = design.fins.geometry.span * scale;
    const finTipPx = design.fins.geometry.tipSpan * scale;
    const finSweepPx = design.fins.geometry.sweep * scale;

    return {
      centerX, svgW, svgH,
      noseTop, noseBot, bodyTop, bodyBot,
      bottleTop, bottleBot, recoveryTop, recoveryBot,
      nozzleTop, nozzleBot,
      halfBody, halfBottle, halfNozzle,
      finHpx, finSpanPx, finTipPx, finSweepPx,
      bodyDiam, totalMeters, scale,
    };
  }, [design]);

  const { centerX, svgW, svgH, noseTop, noseBot, bodyTop, bodyBot,
    bottleTop, bottleBot, recoveryTop, recoveryBot, nozzleTop, nozzleBot,
    halfBody, halfBottle, halfNozzle, finHpx, finSpanPx, finTipPx, finSweepPx,
    bodyDiam, totalMeters, scale } = layout;

  const dimMm = (m: number) => `${(m * 1000).toFixed(0)}mm`;

  return (
    <div className="flex flex-col items-center">
      <svg
        ref={svgRef}
        width="100%"
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        preserveAspectRatio="xMidYMid meet"
        className={`rounded-lg border ${hasErrors ? "border-red-300" : "border-border"} bg-card`}
        role="img"
        aria-label="Rocket visualization"
      >
        {/* Background grid */}
        <defs>
          <pattern id="rgrid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke={COLORS.grid} strokeWidth="0.5" />
          </pattern>
          <linearGradient id="bottleGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d1d5db" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#e5e7eb" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d1d5db" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#rgrid)" />

        {/* Centre-line */}
        <line
          x1={centerX} y1={noseTop - 12}
          x2={centerX} y2={nozzleBot + 12}
          stroke={COLORS.centerline}
          strokeWidth={1}
          strokeDasharray="4,4"
        />

        {/* ── Nose Cone ─────────────────────────────────────────── */}
        <path
          d={`M ${centerX - halfBody} ${noseBot}
              Q ${centerX} ${noseTop * 0.7 + noseBot * 0.3} ${centerX} ${noseTop}
              Q ${centerX} ${noseTop * 0.7 + noseBot * 0.3} ${centerX + halfBody} ${noseBot}
              Z`}
          fill={COLORS.noseCone.fill}
          stroke={COLORS.noseCone.stroke}
          strokeWidth={1.5}
        />

        {/* ── Body Tube ─────────────────────────────────────────── */}
        <rect
          x={centerX - halfBody}
          y={bodyTop}
          width={halfBody * 2}
          height={bodyBot - bodyTop}
          fill="url(#bodyGrad)"
          stroke={COLORS.bodyTube.stroke}
          strokeWidth={1.5}
          rx={1}
        />

        {/* ── Bottle ────────────────────────────────────────────── */}
        <rect
          x={centerX - halfBottle}
          y={bottleTop}
          width={halfBottle * 2}
          height={bottleBot - bottleTop}
          fill="url(#bottleGrad)"
          stroke={COLORS.bottle.stroke}
          strokeWidth={1.5}
          rx={3}
        />

        {/* Bottle neck taper */}
        <path
          d={`M ${centerX - halfBottle} ${bottleTop}
              L ${centerX - halfBody * 0.6} ${bottleTop - 6}
              L ${centerX + halfBody * 0.6} ${bottleTop - 6}
              L ${centerX + halfBottle} ${bottleTop}
              Z`}
          fill="#60a5fa"
          stroke={COLORS.bottle.stroke}
          strokeWidth={1}
          opacity={0.7}
        />

        {/* ── Recovery Compartment ──────────────────────────────── */}
        <rect
          x={centerX - halfBody + 3}
          y={recoveryTop}
          width={halfBody * 2 - 6}
          height={recoveryBot - recoveryTop}
          fill={COLORS.recovery.fill}
          stroke={COLORS.recovery.stroke}
          strokeWidth={1}
          rx={1}
          opacity={0.55}
        />

        {/* ── Nozzle ────────────────────────────────────────────── */}
        <path
          d={`M ${centerX - halfBottle * 0.8} ${nozzleTop}
              L ${centerX - halfNozzle} ${nozzleBot}
              L ${centerX + halfNozzle} ${nozzleBot}
              L ${centerX + halfBottle * 0.8} ${nozzleTop}
              Z`}
          fill={COLORS.nozzle.fill}
          stroke={COLORS.nozzle.stroke}
          strokeWidth={1.5}
        />

        {/* Nozzle opening */}
        <ellipse
          cx={centerX}
          cy={nozzleBot}
          rx={halfNozzle}
          ry={3}
          fill="#111827"
          stroke={COLORS.nozzle.stroke}
          strokeWidth={1}
        />

        {/* ── Fins ──────────────────────────────────────────────── */}
        {design.fins.visible && (
          <g opacity={0.85}>
            {/* Left fin */}
            <path
              d={`M ${centerX - halfBody} ${bodyBot - finSweepPx}
                  L ${centerX - halfBody - finHpx} ${bodyBot}
                  L ${centerX - halfBody - finHpx} ${bodyBot - finTipPx}
                  L ${centerX - halfBody} ${bodyBot - finSweepPx - finSpanPx}
                  Z`}
              fill={COLORS.fins.fill}
              stroke={COLORS.fins.stroke}
              strokeWidth={1.5}
            />
            {/* Right fin */}
            <path
              d={`M ${centerX + halfBody} ${bodyBot - finSweepPx}
                  L ${centerX + halfBody + finHpx} ${bodyBot}
                  L ${centerX + halfBody + finHpx} ${bodyBot - finTipPx}
                  L ${centerX + halfBody} ${bodyBot - finSweepPx - finSpanPx}
                  Z`}
              fill={COLORS.fins.fill}
              stroke={COLORS.fins.stroke}
              strokeWidth={1.5}
            />
          </g>
        )}

        {/* ── Dimension annotations ─────────────────────────────── */}
        <text
          x={centerX}
          y={noseTop - 8}
          textAnchor="middle"
          fontSize={11}
          fill="#6b7280"
          fontFamily="monospace"
        >
          Total: {dimMm(totalMeters)} · ⌀{dimMm(bodyDiam)}
        </text>
      </svg>

      {/* Dimension labels below */}
      <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium">Nose: {dimMm(design.noseCone.geometry.length)}</span>
        <span className="font-medium">Body: {dimMm(design.bodyTube.geometry.length)}</span>
        <span className="font-medium">Bottle: {dimMm(design.bottle.geometry.length)}</span>
        <span className="font-medium">Dry: {(calculations.dryMass * 1000).toFixed(0)}g</span>
        <span className="font-medium">Total: {(calculations.totalMass * 1000).toFixed(0)}g</span>
      </div>
    </div>
  );
}
