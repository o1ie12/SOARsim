/**
 * SOARSim Rocket Designer — Interactive Rocket Canvas
 *
 * v2.2: Adds selection, drag handles, dimension labels, grid overlay,
 * zoom/pan. The SVG is always generated from the model (one source of truth).
 * Zoom and pan are local canvas state to avoid unnecessary re-renders.
 */

"use client";

import { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { useRocketDesigner } from "./rocket-designer-context";
import type { NoseConeGeometry, BodyTubeGeometry, BottleGeometry, FinGeometry, NozzleGeometry, RocketDesignState, RocketDesignerAction } from "@/lib/rocket-designer-types";

// ── Colours ──────────────────────────────────────────────────────

const COLORS = {
  noseCone: { fill: "#f97316", stroke: "#c2410c" },
  bodyTube: { fill: "#e5e7eb", stroke: "#9ca3af" },
  bottle: { fill: "#93c5fd", stroke: "#3b82f6" },
  fins: { fill: "#6b7280", stroke: "#374151" },
  nozzle: { fill: "#1f2937", stroke: "#111827" },
  recovery: { fill: "#6ee7b7", stroke: "#059669" },
  centerline: "#d1d5db",
  grid: "#e5e7eb",
  gridMajor: "#d1d5db",
  selection: "#f97316",
  selectionFill: "rgba(249, 115, 22, 0.08)",
  handle: "#f97316",
  handleHover: "#ea580c",
  label: "#6b7280",
  labelBg: "rgba(255,255,255,0.85)",
};

const BASE_VIEWPORT_W = 600;
const BASE_VIEWPORT_H = 700;
const PADDING = 48;
const HANDLE_SIZE = 7;

// ── Hit regions for selection ────────────────────────────────────

type ComponentId = "noseCone" | "bodyTube" | "bottle" | "fins" | "nozzle";

interface HitRegion {
  id: ComponentId;
  label: string;
  path: string;
}

// ── Canvas zoom state ────────────────────────────────────────────

interface CanvasView {
  zoom: number;
  panX: number;
  panY: number;
}

// ── Component ────────────────────────────────────────────────────

export default function RocketCanvas() {
  const { state, calculations, warnings, dispatch, selectedComponent, gridEnabled, snapToGrid, gridSpacing } = useRocketDesigner();
  const design = state.current;
  const svgRef = useRef<SVGSVGElement>(null);
  const [canvasView, setCanvasView] = useState<CanvasView>({ zoom: 1, panX: 0, panY: 0 });
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{
    component: ComponentId;
    property: string;
    startY: number;
    startValue: number;
    unit: number; // pixels per meter at current scale
  } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const hasErrors = warnings.some((w) => w.type === "error");

  // ── Compute rocket SVG layout (model → pixels) ─────────────────

  const layout = useMemo(() => {
    const noseLen = design.noseCone.geometry.length;
    const bodyLen = design.bodyTube.geometry.length;
    const bottleLen = design.bottle.geometry.length;
    const recoveryLen = design.recovery.geometry.compartmentLength;
    const nozzleLen = design.nozzle.geometry.length;
    const totalMeters = noseLen + bodyLen + bottleLen + recoveryLen + nozzleLen;
    const bodyDiam = design.bodyTube.geometry.outerDiameter;
    const bottleDiam = design.bottle.geometry.diameter;
    const maxDim = Math.max(totalMeters, bodyDiam + design.fins.geometry.height * 2);
    const scale = Math.min(500 / maxDim, 1200);

    const cx = 300;
    let y = PADDING;
    const noseT = y; const noseB = y + noseLen * scale; y = noseB;
    const bodyT = y; const bodyB = y + bodyLen * scale; y = bodyB;
    const bottleT = y; const bottleB = y + bottleLen * scale; y = bottleB;
    const recovT = y; const recovB = y + recoveryLen * scale; y = recovB;
    const nozzleT = y; const nozzleB = y + nozzleLen * scale;

    return {
      cx, noseT, noseB, bodyT, bodyB, bottleT, bottleB, recovT, recovB, nozzleT, nozzleB,
      hb: (bodyDiam * scale) / 2,
      hbl: (bottleDiam * scale) / 2,
      hnz: (design.nozzle.geometry.exitDiameter * scale) / 2,
      fh: design.fins.geometry.height * scale,
      fs: design.fins.geometry.span * scale,
      ft: design.fins.geometry.tipSpan * scale,
      fw: design.fins.geometry.sweep * scale,
      hblTop: (bodyDiam * scale * 0.6) / 2,
      scale, totalMeters, bodyDiam,
      halfBodyOuter: (design.bodyTube.geometry.outerDiameter * scale) / 2,
    };
  }, [design]);

  const { cx, noseT, noseB, bodyT, bodyB, bottleT, bottleB, recovT, recovB, nozzleT, nozzleB,
    hb, hbl, hnz, fh, fs, ft, fw, scale, totalMeters, bodyDiam } = layout;

  const dim = (m: number) => `${(m * 1000).toFixed(0)}`;

  // ── Hit regions for click-to-select ───────────────────────────

  const hitRegions: HitRegion[] = useMemo(() => [
    { id: "noseCone", label: "Nose Cone", path: `M ${cx - hb} ${noseB} Q ${cx} ${noseT * 0.7 + noseB * 0.3} ${cx} ${noseT} Q ${cx} ${noseT * 0.7 + noseB * 0.3} ${cx + hb} ${noseB} Z` },
    { id: "bodyTube", label: "Body Tube", path: `M ${cx - hb} ${bodyT} L ${cx + hb} ${bodyT} L ${cx + hb} ${bodyB} L ${cx - hb} ${bodyB} Z` },
    { id: "bottle", label: "Bottle", path: `M ${cx - hbl} ${bottleT} L ${cx + hbl} ${bottleT} L ${cx + hbl} ${bottleB} L ${cx - hbl} ${bottleB} Z` },
    { id: "fins", label: "Fins", path: `M ${cx - hb} ${bodyB - fw} L ${cx - hb - fh} ${bodyB} L ${cx - hb - fh} ${bodyB - ft} L ${cx - hb} ${bodyB - fw - fs} Z` },
    { id: "nozzle", label: "Nozzle", path: `M ${cx - hbl * 0.8} ${nozzleT} L ${cx - hnz} ${nozzleB} L ${cx + hnz} ${nozzleB} L ${cx + hbl * 0.8} ${nozzleT} Z` },
  ], [cx, hb, noseT, noseB, bodyT, bodyB, bottleT, bottleB, fw, fh, ft, fs, hbl, hnz, nozzleT, nozzleB]);

  // ── Selection click handler ───────────────────────────────────

  const handleSvgClick = useCallback((e: React.MouseEvent) => {
    if (dragging) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM()?.inverse();
    if (!ctm) return;
    const svgPt = pt.matrixTransform(ctm);
    // Transform by zoom/pan for hit testing
    const x = (svgPt.x - canvasView.panX) / canvasView.zoom;
    const y = (svgPt.y - canvasView.panY) / canvasView.zoom;

    // Hit test each region using simple point-in-bounding-box
    let hit: string | null = null;
    for (let i = hitRegions.length - 1; i >= 0; i--) {
      const r = hitRegions[i];
      // Parse path to extract approximate bounding box from path commands
      const points = r.path.match(/[\d.-]+/g)?.map(Number) ?? [];
      if (points.length >= 4) {
        const minX = Math.min(...points.filter((_, i) => i % 2 === 0));
        const maxX = Math.max(...points.filter((_, i) => i % 2 === 0));
        const minY = Math.min(...points.filter((_, i) => i % 2 === 1));
        const maxY = Math.max(...points.filter((_, i) => i % 2 === 1));
        // Expand hit box slightly for easier clicking
        if (x >= minX - 4 && x <= maxX + 4 && y >= minY - 4 && y <= maxY + 4) {
          hit = r.id;
          break;
        }
      }
    }
    dispatch({ type: "SELECT_COMPONENT", payload: hit });
    // Clicking empty space deselects
  }, [dragging, hitRegions, dispatch, canvasView]);

  // ── Drag handle definition ────────────────────────────────────

  interface DragHandleDef {
    id: string;
    component: ComponentId;
    property: string;
    cx: number;
    cy: number;
    label: string;
    cursor: string;
  }

  const handles: DragHandleDef[] = useMemo(() => [
    { id: "nose-length", component: "noseCone", property: "length", cx: cx + hb + 22, cy: (noseT + noseB) / 2, label: dim(design.noseCone.geometry.length), cursor: "ns-resize" },
    { id: "body-length", component: "bodyTube", property: "length", cx: cx + hb + 22, cy: (bodyT + bodyB) / 2, label: dim(design.bodyTube.geometry.length), cursor: "ns-resize" },
    { id: "body-diam", component: "bodyTube", property: "outerDiameter", cx: cx + hb + 22, cy: bodyT + 8, label: `⌀${dim(bodyDiam)}`, cursor: "ew-resize" },
    { id: "bottle-length", component: "bottle", property: "length", cx: cx + hbl + 22, cy: (bottleT + bottleB) / 2, label: dim(design.bottle.geometry.length), cursor: "ns-resize" },
    { id: "bottle-diam", component: "bottle", property: "diameter", cx: cx + hbl + 22, cy: bottleT + 8, label: `⌀${dim(design.bottle.geometry.diameter)}`, cursor: "ew-resize" },
    { id: "fin-height", component: "fins", property: "height", cx: cx - hb - fh - 22, cy: (bodyB + bodyB - fw) / 2, label: dim(design.fins.geometry.height), cursor: "ew-resize" },
    { id: "fin-span", component: "fins", property: "span", cx: cx - hb - fh - 22, cy: bodyB - fw - fs / 2, label: dim(design.fins.geometry.span), cursor: "ns-resize" },
    { id: "nozzle-diam", component: "nozzle", property: "throatDiameter", cx: cx + hbl + 22, cy: nozzleB + 16, label: `⌀${dim(design.nozzle.geometry.throatDiameter)}`, cursor: "ew-resize" },
  ], [cx, hb, hbl, hnz, noseT, noseB, bodyT, bodyB, bottleT, bottleB, nozzleT, nozzleB,
    fh, fs, ft, fw, bodyDiam, design.noseCone.geometry.length, design.bodyTube.geometry.length,
    design.bodyTube.geometry.outerDiameter, design.bottle.geometry.length, design.bottle.geometry.diameter,
    design.fins.geometry.height, design.fins.geometry.span, design.nozzle.geometry.throatDiameter]);

  // ── Drag start ────────────────────────────────────────────────

  const handleDragStart = useCallback((def: DragHandleDef) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentValue = getPropertyValue(design, def.component, def.property);
    setDragging({
      component: def.component,
      property: def.property,
      startY: e.clientY,
      startValue: currentValue,
      unit: scale,
    });
  }, [design, scale]);

  // ── Mouse move (drag or pan) ──────────────────────────────────

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      const deltaY = -(e.clientY - dragging.startY);
      const deltaMeters = deltaY / scale;
      let newValue = dragging.startValue + deltaMeters;
      newValue = Math.max(0.003, Math.min(0.5, Math.round(newValue * 1000) / 1000));

      if (snapToGrid) {
        const gridM = gridSpacing / scale;
        newValue = Math.round(newValue / gridM) * gridM;
      }

      dispatchProperty(dispatch, dragging.component, dragging.property, newValue);
      return;
    }
    if (isPanning) {
      setCanvasView((v) => ({
        ...v,
        panX: v.panX + (e.clientX - panStart.x),
        panY: v.panY + (e.clientY - panStart.y),
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [dragging, isPanning, panStart, scale, snapToGrid, gridSpacing, dispatch]);

  const handleMouseUp = useCallback(() => {
    if (dragging) setDragging(null);
    if (isPanning) setIsPanning(false);
  }, [dragging, isPanning]);

  // ── Wheel zoom ────────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setCanvasView((v) => ({
      ...v,
      zoom: Math.min(5, Math.max(0.2, v.zoom * delta)),
    }));
  }, []);

  // ── Middle-mouse / space+drag pan ─────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.altKey) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  // ── Expose zoom controls to parent ────────────────────────────

  const zoomIn = useCallback(() => setCanvasView((v) => ({ ...v, zoom: Math.min(5, v.zoom * 1.25) })), []);
  const zoomOut = useCallback(() => setCanvasView((v) => ({ ...v, zoom: Math.max(0.2, v.zoom * 0.8) })), []);
  const resetView = useCallback(() => setCanvasView({ zoom: 1, panX: 0, panY: 0 }), []);

  // Store zoom controls on the module for parent access
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__rocketCanvasControls = { zoomIn, zoomOut, resetView };
    return () => { delete (window as unknown as Record<string, unknown>).__rocketCanvasControls; };
  }, [zoomIn, zoomOut, resetView]);

  // ── Render ────────────────────────────────────────────────────

  const isSelected = (id: string) => selectedComponent === id;
  const selColor = COLORS.selection;

  return (
    <div className="relative select-none" style={{ width: "100%", height: "100%" }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${BASE_VIEWPORT_W} ${BASE_VIEWPORT_H}`}
        preserveAspectRatio="xMidYMid meet"
        className={`rounded-lg border ${hasErrors ? "border-red-300" : "border-border"} bg-card`}
        onClick={handleSvgClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? "grabbing" : dragging ? "grabbing" : "default" }}
        role="img"
        aria-label="Rocket visualization — click to select components"
      >
        <g transform={`translate(${canvasView.panX}, ${canvasView.panY}) scale(${canvasView.zoom})`}>
          {/* ── Grid ──────────────────────────────────────────── */}
          {gridEnabled && <EngineeringGrid cx={cx} viewH={BASE_VIEWPORT_H} spacing={gridSpacing} />}

          {/* ── Centre-line ─────────────────────────────────────── */}
          <line x1={cx} y1={noseT - 16} x2={cx} y2={nozzleB + 16} stroke={COLORS.centerline} strokeWidth={1} strokeDasharray="4,4" />

          {/* ── Selection hit targets (invisible) ─────────────── */}
          {hitRegions.map((r) => (
            <path key={`hit-${r.id}`} d={r.path} fill="transparent" stroke="none" style={{ pointerEvents: "none" }} />
          ))}

          {/* ── Nose Cone ───────────────────────────────────────── */}
          <path d={`M ${cx - hb} ${noseB} Q ${cx} ${noseT * 0.7 + noseB * 0.3} ${cx} ${noseT} Q ${cx} ${noseT * 0.7 + noseB * 0.3} ${cx + hb} ${noseB} Z`}
            fill={isSelected("noseCone") ? COLORS.selectionFill : COLORS.noseCone.fill}
            stroke={isSelected("noseCone") ? selColor : COLORS.noseCone.stroke}
            strokeWidth={isSelected("noseCone") ? 2.5 : 1.5} />

          {/* ── Body Tube ───────────────────────────────────────── */}
          <rect x={cx - hb} y={bodyT} width={hb * 2} height={bodyB - bodyT}
            fill={isSelected("bodyTube") ? COLORS.selectionFill : "url(#bodyGrad)"}
            stroke={isSelected("bodyTube") ? selColor : COLORS.bodyTube.stroke}
            strokeWidth={isSelected("bodyTube") ? 2.5 : 1.5} rx={1} />

          {/* ── Bottle ──────────────────────────────────────────── */}
          <rect x={cx - hbl} y={bottleT} width={hbl * 2} height={bottleB - bottleT}
            fill={isSelected("bottle") ? COLORS.selectionFill : "url(#bottleGrad)"}
            stroke={isSelected("bottle") ? selColor : COLORS.bottle.stroke}
            strokeWidth={isSelected("bottle") ? 2.5 : 1.5} rx={3} />

          {/* Bottle neck */}
          <path d={`M ${cx - hbl} ${bottleT} L ${cx - hb * 0.6} ${bottleT - 6} L ${cx + hb * 0.6} ${bottleT - 6} L ${cx + hbl} ${bottleT} Z`}
            fill="#60a5fa" stroke={COLORS.bottle.stroke} strokeWidth={1} opacity={0.7} />

          {/* ── Recovery ────────────────────────────────────────── */}
          <rect x={cx - hb + 3} y={recovT} width={hb * 2 - 6} height={recovB - recovT}
            fill={COLORS.recovery.fill} stroke={COLORS.recovery.stroke} strokeWidth={1} rx={1} opacity={0.4} />

          {/* ── Nozzle ──────────────────────────────────────────── */}
          <path d={`M ${cx - hbl * 0.8} ${nozzleT} L ${cx - hnz} ${nozzleB} L ${cx + hnz} ${nozzleB} L ${cx + hbl * 0.8} ${nozzleT} Z`}
            fill={isSelected("nozzle") ? "#374151" : COLORS.nozzle.fill}
            stroke={isSelected("nozzle") ? selColor : COLORS.nozzle.stroke}
            strokeWidth={isSelected("nozzle") ? 2.5 : 1.5} />
          <ellipse cx={cx} cy={nozzleB} rx={hnz} ry={3} fill="#111827" stroke={COLORS.nozzle.stroke} strokeWidth={1} />

          {/* ── Fins ────────────────────────────────────────────── */}
          {design.fins.visible && (
            <g opacity={0.85}>
              <path d={`M ${cx - hb} ${bodyB - fw} L ${cx - hb - fh} ${bodyB} L ${cx - hb - fh} ${bodyB - ft} L ${cx - hb} ${bodyB - fw - fs} Z`}
                fill={isSelected("fins") ? "#9ca3af" : COLORS.fins.fill}
                stroke={isSelected("fins") ? selColor : COLORS.fins.stroke}
                strokeWidth={isSelected("fins") ? 2.5 : 1.5} />
              <path d={`M ${cx + hb} ${bodyB - fw} L ${cx + hb + fh} ${bodyB} L ${cx + hb + fh} ${bodyB - ft} L ${cx + hb} ${bodyB - fw - fs} Z`}
                fill={isSelected("fins") ? "#9ca3af" : COLORS.fins.fill}
                stroke={isSelected("fins") ? selColor : COLORS.fins.stroke}
                strokeWidth={isSelected("fins") ? 2.5 : 1.5} />
            </g>
          )}

          {/* ── Dimension labels on canvas ─────────────────────── */}
          <DimensionLabel x={cx} y={noseT - 10} text={`Total: ${dim(totalMeters)}mm · ⌀${dim(bodyDiam)}mm`} align="middle" />
          <DimensionLabel x={cx + hb + 16} y={(noseT + noseB) / 2 + 4} text={`${dim(design.noseCone.geometry.length)}mm`} align="start" />
          <DimensionLabel x={cx - hb - fh - 16} y={bodyB - fw - fs / 2} text={`Span ${dim(design.fins.geometry.span)}mm`} align="end" />

          {/* ── Drag Handles (only visible when a component is selected) ── */}
          {selectedComponent && handles.filter((h) => h.component === selectedComponent).map((h) => (
            <g key={h.id} onMouseDown={handleDragStart(h)} style={{ cursor: h.cursor }}>
              <circle cx={h.cx} cy={h.cy} r={HANDLE_SIZE}
                fill={hoveredHandle === h.id ? COLORS.handleHover : COLORS.handle}
                stroke="#fff" strokeWidth={2} opacity={0.9}
                onMouseEnter={() => setHoveredHandle(h.id)}
                onMouseLeave={() => setHoveredHandle(null)} />
              <text x={h.cx + HANDLE_SIZE + 4} y={h.cy + 4} fontSize={9} fill={COLORS.label} fontFamily="monospace">{h.label}</text>
            </g>
          ))}
        </g>

        {/* SVG defs */}
        <defs>
          <pattern id="eng-grid" width={gridSpacing} height={gridSpacing} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSpacing} 0 L 0 0 0 ${gridSpacing}`} fill="none" stroke={COLORS.grid} strokeWidth="0.5" />
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
      </svg>
    </div>
  );
}

// ── Engineering Grid ───────────────────────────────────────────

function EngineeringGrid({ cx, viewH, spacing }: { cx: number; viewH: number; spacing: number }) {
  const lines: React.ReactNode[] = [];
  const gridW = 600;
  for (let x = 0; x <= gridW; x += spacing) {
    lines.push(<line key={`gv${x}`} x1={cx + x} y1={0} x2={cx + x} y2={viewH} stroke={x % (spacing * 5) === 0 ? COLORS.gridMajor : COLORS.grid} strokeWidth={x % (spacing * 5) === 0 ? 1 : 0.5} />);
    if (x > 0) {
      lines.push(<line key={`gv${-x}`} x1={cx - x} y1={0} x2={cx - x} y2={viewH} stroke={x % (spacing * 5) === 0 ? COLORS.gridMajor : COLORS.grid} strokeWidth={x % (spacing * 5) === 0 ? 1 : 0.5} />);
    }
  }
  for (let y = 0; y <= viewH; y += spacing) {
    lines.push(<line key={`gh${y}`} x1={0} y1={y} x2={gridW} y2={y} stroke={y % (spacing * 5) === 0 ? COLORS.gridMajor : COLORS.grid} strokeWidth={y % (spacing * 5) === 0 ? 1 : 0.5} />);
  }
  return <g opacity={0.5}>{lines}</g>;
}

// ── Dimension Label ────────────────────────────────────────────

function DimensionLabel({ x, y, text, align }: { x: number; y: number; text: string; align: "start" | "middle" | "end" }) {
  return (
    <g>
      <rect x={align === "end" ? x - text.length * 5 - 6 : align === "middle" ? x - text.length * 4 : x - 4}
        y={y - 7} width={text.length * 8 + 8} height={14} rx={3} fill={COLORS.labelBg} />
      <text x={x} y={y + 3} textAnchor={align} fontSize={9} fill={COLORS.label} fontFamily="monospace" fontWeight={500}>{text}</text>
    </g>
  );
}

// ── Property getter from design ─────────────────────────────────

function getPropertyValue(design: RocketDesignState, component: ComponentId, property: string): number {
  const comp = design[component];
  if (!comp || !("geometry" in comp)) return 0;
  const g = comp.geometry as unknown as Record<string, number>;
  return g[property] ?? 0;
}

// ── Property dispatcher ─────────────────────────────────────────

function dispatchProperty(
  dispatch: React.Dispatch<RocketDesignerAction>,
  component: ComponentId,
  property: string,
  value: number,
) {
  // Dispatch the appropriate action based on component
  if (component === "noseCone") dispatch({ type: "SET_NOSE_CONE", payload: { [property]: value } });
  else if (component === "bodyTube" && property === "outerDiameter") {
    dispatch({ type: "SET_BODY_TUBE", payload: { outerDiameter: value, innerDiameter: Math.max(0.001, value - 0.003) } });
  } else if (component === "bodyTube") dispatch({ type: "SET_BODY_TUBE", payload: { [property]: value } });
  else if (component === "bottle") dispatch({ type: "SET_BOTTLE", payload: { [property]: value } });
  else if (component === "fins") dispatch({ type: "SET_FINS", payload: { [property]: value } });
  else if (component === "nozzle") {
    // Nozzle diameter change also updates exit diameter
    if (property === "throatDiameter" || property === "exitDiameter") {
      dispatch({ type: "SET_NOZZLE", payload: { throatDiameter: value, exitDiameter: value } });
    } else {
      dispatch({ type: "SET_NOZZLE", payload: { [property]: value } });
    }
  }
}
