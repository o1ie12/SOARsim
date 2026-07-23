/**
 * SOAR Studio — Rocket SVG Renderer
 *
 * Renders a scalable 2D rocket using SVG.
 * Supports direct manipulation via drag handles.
 * v2.4: Overlays CG (blue) and CP (red) markers with stability margin line.
 */

"use client";

import React, { useState, useCallback, useRef } from "react";
import { useRocketDesigner } from "./rocket-designer-context";
import type { RocketDesignerAction, NoseConeGeometry } from "@/lib/rocket-designer-types";

// ── Scaling ──────────────────────────────────────────────────────

const SCALE = 800; // pixels per meter
const PADDING = 40;
const HANDLE_SIZE = 8;

// ── Component Colors ─────────────────────────────────────────────

const COLORS = {
  noseCone: "#f97316", // orange
  bodyTube: "#e5e7eb", // gray-200
  bottle: "#3b82f6", // blue
  fins: "#6b7280", // gray-500
  nozzle: "#1f2937", // gray-800
  recovery: "#10b981", // emerald
  handle: "#f97316", // orange
  handleHover: "#ea580c", // orange-600
  grid: "#f3f4f6", // gray-100
  background: "#ffffff",
  cgMarker: "#3b82f6", // blue
  cpMarker: "#ef4444", // red
  stabilityLine: "#f59e0b", // amber
};

// ── Drag Handle ──────────────────────────────────────────────────

interface DragHandleProps {
  cx: number;
  cy: number;
  label: string;
  onDragStart: (e: React.MouseEvent) => void;
}

function DragHandle({ cx, cy, label, onDragStart }: DragHandleProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={onDragStart}
      style={{ cursor: "ns-resize" }}
    >
      <circle
        cx={cx}
        cy={cy}
        r={HANDLE_SIZE}
        fill={hovered ? COLORS.handleHover : COLORS.handle}
        stroke="#ffffff"
        strokeWidth={2}
        opacity={0.9}
      />
      <text
        x={cx + HANDLE_SIZE + 4}
        y={cy + 4}
        fontSize={10}
        fill="#6b7280"
        fontFamily="monospace"
      >
        {label}
      </text>
    </g>
  );
}

// ── Stability Markers ────────────────────────────────────────────

function StabilityMarkers({
  cgY,
  cpY,
  centerX,
  isStable,
}: {
  cgY: number;
  cpY: number;
  centerX: number;
  isStable: boolean;
}) {
  const markerRadius = 5;
  const lineHeight = 60;

  return (
    <g>
      {/* Dashed line between CG and CP */}
      <line
        x1={centerX - 30}
        y1={cgY}
        x2={centerX - 30}
        y2={cpY}
        stroke={isStable ? "#22c55e" : COLORS.stabilityLine}
        strokeWidth={2}
        strokeDasharray="4,3"
        opacity={0.7}
      />

      {/* CG Marker (blue) */}
      <g>
        <line
          x1={centerX - 50}
          y1={cgY}
          x2={centerX + 50}
          y2={cgY}
          stroke={COLORS.cgMarker}
          strokeWidth={2.5}
          opacity={0.9}
        />
        <circle
          cx={centerX - 30}
          cy={cgY}
          r={markerRadius}
          fill={COLORS.cgMarker}
          stroke="#ffffff"
          strokeWidth={1.5}
        />
        <text
          x={centerX - 30}
          y={cgY - lineHeight}
          textAnchor="middle"
          fontSize={11}
          fontWeight="bold"
          fill={COLORS.cgMarker}
          fontFamily="monospace"
        >
          CG
        </text>
        <line
          x1={centerX - 30}
          y1={cgY - markerRadius - 2}
          x2={centerX - 30}
          y2={cgY - lineHeight + 14}
          stroke={COLORS.cgMarker}
          strokeWidth={1.5}
          strokeDasharray="3,2"
          opacity={0.6}
        />
      </g>

      {/* CP Marker (red) */}
      <g>
        <line
          x1={centerX - 50}
          y1={cpY}
          x2={centerX + 50}
          y2={cpY}
          stroke={COLORS.cpMarker}
          strokeWidth={2.5}
          opacity={0.9}
        />
        <circle
          cx={centerX + 30}
          cy={cpY}
          r={markerRadius}
          fill={COLORS.cpMarker}
          stroke="#ffffff"
          strokeWidth={1.5}
        />
        <text
          x={centerX + 30}
          y={cpY - lineHeight}
          textAnchor="middle"
          fontSize={11}
          fontWeight="bold"
          fill={COLORS.cpMarker}
          fontFamily="monospace"
        >
          CP
        </text>
        <line
          x1={centerX + 30}
          y1={cpY - markerRadius - 2}
          x2={centerX + 30}
          y2={cpY - lineHeight + 14}
          stroke={COLORS.cpMarker}
          strokeWidth={1.5}
          strokeDasharray="3,2"
          opacity={0.6}
        />
      </g>

      {/* Stability margin label */}
      {(cgY !== cpY) && (
        <text
          x={centerX - 30}
          y={(cgY + cpY) / 2}
          textAnchor="end"
          fontSize={9}
          fill={isStable ? "#22c55e" : COLORS.stabilityLine}
          fontFamily="monospace"
          transform={`translate(-8, 0)`}
          dominantBaseline="middle"
        >
          {isStable ? "↕" : "⚠"}
        </text>
      )}
    </g>
  );
}

// ── Main Renderer ────────────────────────────────────────────────

export default function RocketSVGRenderer() {
  const { state, dispatch, calculations, warnings, cg, cp, stability } = useRocketDesigner();
  const { current: design } = state;
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{
    property: string;
    startY: number;
    startValue: number;
  } | null>(null);

  // Calculate component positions (y = vertical, x = horizontal offset from center)
  const centerX = PADDING + 250;
  const centerY = PADDING;

  // Component dimensions in pixels
  const noseLengthPx = design.noseCone.geometry.length * SCALE;
  const bodyLengthPx = design.bodyTube.geometry.length * SCALE;
  const bottleLengthPx = design.bottle.geometry.length * SCALE;
  const recoveryLengthPx = design.recovery.geometry.compartmentLength * SCALE;
  const nozzleLengthPx = design.nozzle.geometry.length * SCALE;

  const bodyDiameterPx = design.bodyTube.geometry.outerDiameter * SCALE;
  const bottleDiameterPx = design.bottle.geometry.diameter * SCALE;
  const nozzleDiameterPx = design.nozzle.geometry.throatDiameter * SCALE;

  const finHeightPx = design.fins.geometry.height * SCALE;
  const finSpanPx = design.fins.geometry.span * SCALE;
  const finTipSpanPx = design.fins.geometry.tipSpan * SCALE;
  const finSweepPx = design.fins.geometry.sweep * SCALE;

  // Y positions (top to bottom)
  let y = centerY;

  const noseTop = y;
  const noseBottom = y + noseLengthPx;
  y = noseBottom;

  const bodyTop = y;
  const bodyBottom = y + bodyLengthPx;
  y = bodyBottom;

  const bottleTop = y;
  const bottleBottom = y + bottleLengthPx;
  y = bottleBottom;

  const recoveryTop = y;
  const recoveryBottom = y + recoveryLengthPx;
  y = recoveryBottom;

  const nozzleTop = y;
  const nozzleBottom = y + nozzleLengthPx;

  const totalHeightPx = nozzleBottom - noseTop + PADDING * 2;

  // CG and CP positions in pixels (from top of SVG = nose tip)
  // cgFromNose is distance from nose tip, cpFromNose is distance from nose tip
  const cgYPx = noseTop + cg.cgFromNose * SCALE;
  const cpYPx = noseTop + cp.cpFromNose * SCALE;

  // Error handling
  const hasErrors = warnings.some((w) => w.type === "error");

  // Drag handlers
  const handleDragStart = useCallback(
    (property: string, currentValue: number) => (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging({
        property,
        startY: e.clientY,
        startValue: currentValue,
      });
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;

      const deltaY = e.clientY - dragging.startY;
      const deltaMeters = -deltaY / SCALE; // negative because SVG y increases downward

      let newValue = dragging.startValue + deltaMeters;
      newValue = Math.max(0.01, Math.min(0.5, newValue)); // clamp

      // Round to 1mm
      newValue = Math.round(newValue * 1000) / 1000;

      // Determine which action to dispatch
      let action: RocketDesignerAction | null = null;

      switch (dragging.property) {
        case "noseLength":
          action = { type: "SET_NOSE_CONE", payload: { length: newValue } };
          break;
        case "bodyLength":
          action = { type: "SET_BODY_TUBE", payload: { length: newValue } };
          break;
        case "bodyDiameter":
          action = {
            type: "SET_BODY_TUBE",
            payload: {
              outerDiameter: newValue,
              innerDiameter: Math.max(0.001, newValue - 0.003),
            },
          };
          break;
        case "bottleLength":
          action = { type: "SET_BOTTLE", payload: { length: newValue } };
          break;
        case "bottleDiameter":
          action = { type: "SET_BOTTLE", payload: { diameter: newValue } };
          break;
        case "finHeight":
          action = { type: "SET_FINS", payload: { height: newValue } };
          break;
        case "nozzleDiameter":
          action = { type: "SET_NOZZLE", payload: { throatDiameter: newValue, exitDiameter: newValue } };
          break;
      }

      if (action) {
        dispatch(action);
      }
    },
    [dragging, dispatch]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Check if CG/CP are within visible bounds
  const showStabilityMarkers = cg.cgFromNose >= 0 && cp.cpFromNose >= 0 &&
    !isNaN(cgYPx) && !isNaN(cpYPx) &&
    cgYPx >= noseTop && cpYPx >= noseTop &&
    cgYPx <= nozzleBottom && cpYPx <= nozzleBottom;

  // Determine which labels to show
  const totalLengthMm = (calculations.totalLength * 1000).toFixed(0);
  const bodyDiamMm = (calculations.bodyDiameter * 1000).toFixed(0);
  const massG = (calculations.totalMass * 1000).toFixed(0);

  return (
    <div className="relative flex flex-col items-center">
      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width={600}
        height={Math.max(500, totalHeightPx)}
        viewBox={`0 0 600 ${Math.max(500, totalHeightPx)}`}
        className={`rounded-lg border ${hasErrors ? "border-red-300" : "border-border"} bg-white`}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={COLORS.grid} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Center line */}
        <line
          x1={centerX}
          y1={noseTop - 20}
          x2={centerX}
          y2={nozzleBottom + 20}
          stroke="#d1d5db"
          strokeWidth={1}
          strokeDasharray="4,4"
        />

        {/* Nose Cone */}
        <path
          d={`M ${centerX - bodyDiameterPx / 2} ${noseBottom}
              L ${centerX} ${noseTop}
              L ${centerX + bodyDiameterPx / 2} ${noseBottom}
              Z`}
          fill={COLORS.noseCone}
          stroke="#c2410c"
          strokeWidth={1.5}
          opacity={0.9}
        />

        {/* Body Tube */}
        <rect
          x={centerX - bodyDiameterPx / 2}
          y={bodyTop}
          width={bodyDiameterPx}
          height={bodyLengthPx}
          fill={COLORS.bodyTube}
          stroke="#9ca3af"
          strokeWidth={1.5}
          rx={2}
        />

        {/* Bottle */}
        <rect
          x={centerX - bottleDiameterPx / 2}
          y={bottleTop}
          width={bottleDiameterPx}
          height={bottleLengthPx}
          fill={COLORS.bottle}
          stroke="#2563eb"
          strokeWidth={1.5}
          rx={4}
          opacity={0.8}
        />

        {/* Recovery Compartment */}
        <rect
          x={centerX - bodyDiameterPx / 2 + 2}
          y={recoveryTop}
          width={bodyDiameterPx - 4}
          height={recoveryLengthPx}
          fill={COLORS.recovery}
          stroke="#059669"
          strokeWidth={1}
          rx={2}
          opacity={0.6}
        />

        {/* Nozzle */}
        <path
          d={`M ${centerX - bottleDiameterPx / 2} ${nozzleTop}
              L ${centerX - nozzleDiameterPx / 2} ${nozzleBottom}
              L ${centerX + nozzleDiameterPx / 2} ${nozzleBottom}
              L ${centerX + bottleDiameterPx / 2} ${nozzleTop}
              Z`}
          fill={COLORS.nozzle}
          stroke="#111827"
          strokeWidth={1.5}
        />

        {/* Fins */}
        {design.fins.visible && (
          <g>
            {/* Left fin */}
            <path
              d={`M ${centerX - bodyDiameterPx / 2} ${bodyBottom - finSweepPx}
                  L ${centerX - bodyDiameterPx / 2 - finHeightPx} ${bodyBottom}
                  L ${centerX - bodyDiameterPx / 2 - finHeightPx} ${bodyBottom - finTipSpanPx}
                  L ${centerX - bodyDiameterPx / 2} ${bodyBottom - finSweepPx - finSpanPx}
                  Z`}
              fill={COLORS.fins}
              stroke="#374151"
              strokeWidth={1.5}
              opacity={0.85}
            />
            {/* Right fin */}
            <path
              d={`M ${centerX + bodyDiameterPx / 2} ${bodyBottom - finSweepPx}
                  L ${centerX + bodyDiameterPx / 2 + finHeightPx} ${bodyBottom}
                  L ${centerX + bodyDiameterPx / 2 + finHeightPx} ${bodyBottom - finTipSpanPx}
                  L ${centerX + bodyDiameterPx / 2} ${bodyBottom - finSweepPx - finSpanPx}
                  Z`}
              fill={COLORS.fins}
              stroke="#374151"
              strokeWidth={1.5}
              opacity={0.85}
            />
          </g>
        )}

        {/* CG / CP Stability Markers */}
        {showStabilityMarkers && (
          <StabilityMarkers
            cgY={cgYPx}
            cpY={cpYPx}
            centerX={centerX}
            isStable={stability.isStable}
          />
        )}

        {/* Drag Handles */}
        <DragHandle
          cx={centerX + bodyDiameterPx / 2 + 20}
          cy={noseTop + noseLengthPx / 2}
          label={`${(design.noseCone.geometry.length * 1000).toFixed(0)}mm`}
          onDragStart={handleDragStart("noseLength", design.noseCone.geometry.length)}
        />
        <DragHandle
          cx={centerX + bodyDiameterPx / 2 + 20}
          cy={bodyTop + bodyLengthPx / 2}
          label={`${(design.bodyTube.geometry.length * 1000).toFixed(0)}mm`}
          onDragStart={handleDragStart("bodyLength", design.bodyTube.geometry.length)}
        />
        <DragHandle
          cx={centerX + Math.max(bodyDiameterPx, bottleDiameterPx) / 2 + 20}
          cy={bodyTop + 10}
          label={`⌀${(design.bodyTube.geometry.outerDiameter * 1000).toFixed(0)}mm`}
          onDragStart={handleDragStart("bodyDiameter", design.bodyTube.geometry.outerDiameter)}
        />
        <DragHandle
          cx={centerX + bottleDiameterPx / 2 + 20}
          cy={bottleTop + bottleLengthPx / 2}
          label={`${(design.bottle.geometry.length * 1000).toFixed(0)}mm`}
          onDragStart={handleDragStart("bottleLength", design.bottle.geometry.length)}
        />
        <DragHandle
          cx={centerX + bottleDiameterPx / 2 + 20}
          cy={bottleTop + 10}
          label={`⌀${(design.bottle.geometry.diameter * 1000).toFixed(0)}mm`}
          onDragStart={handleDragStart("bottleDiameter", design.bottle.geometry.diameter)}
        />
        <DragHandle
          cx={centerX - bodyDiameterPx / 2 - finHeightPx - 20}
          cy={bodyBottom - finSweepPx / 2}
          label={`${(design.fins.geometry.height * 1000).toFixed(0)}mm`}
          onDragStart={handleDragStart("finHeight", design.fins.geometry.height)}
        />
        <DragHandle
          cx={centerX}
          cy={nozzleBottom + 20}
          label={`⌀${(design.nozzle.geometry.throatDiameter * 1000).toFixed(1)}mm`}
          onDragStart={handleDragStart("nozzleDiameter", design.nozzle.geometry.throatDiameter)}
        />
      </svg>

      {/* Dimension Labels + Stability Status */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
        <span>Total: {totalLengthMm}mm</span>
        <span>Body: ⌀{bodyDiamMm}mm</span>
        <span>Mass: {massG}g</span>
        <span>Fineness: {calculations.aspectRatio.toFixed(1)}</span>
        <span>
          SM:{" "}
          <span
            className={`font-mono font-medium ${
              stability.marginCalibers >= 1 ? "text-emerald-500" :
              stability.marginCalibers >= 0.5 ? "text-amber-500" :
              "text-red-500"
            }`}
          >
            {stability.marginCalibers.toFixed(2)}
          </span>{" "}
          cal
        </span>
      </div>
    </div>
  );
}
