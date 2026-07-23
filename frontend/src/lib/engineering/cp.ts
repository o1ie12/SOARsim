/**
 * SOAR Studio — Center of Pressure Calculation
 *
 * Implements a simplified Barrowman-based approximation for the
 * Center of Pressure (CP) location.
 *
 * ── Methodology ──────────────────────────────────────────────────
 *
 * The Center of Pressure is the point where aerodynamic forces sum to zero.
 * We estimate CP using a simplified version of the Barrowman method,
 * computing normal force coefficients for each component.
 *
 *   CP_total = Σ(CNᵢ × xᵢ) / Σ(CNᵢ)
 *
 *   where CNᵢ  = normal force coefficient of component i
 *         xᵢ   = distance from nose tip (m)
 *
 * Component contributions:
 *
 *   Nose Cone:  CN_nose = 2 × (baseRadius/bodyRadius)²
 *               CP_nose at a fraction of nose length from tip
 *
 *   Body Tube:  CN_body = 0 (negligible at subsonic speeds)
 *               Small contribution from body after nose
 *
 *   Fins:       CN_fins = depending on fin geometry
 *               CP_fins at fin aerodynamic center
 *
 * ── Assumptions ──────────────────────────────────────────────────
 *
 * - Subsonic flow (Mach < 0.3)
 * - Small angles of attack
 * - Negligible body lift contribution
 * - No interference effects between components
 * - Simplified fin geometry (trapezoidal)
 * - Body tube diameter << fin span
 *
 * ── Limitations ──────────────────────────────────────────────────
 *
 * - Not valid for transonic or supersonic speeds
 * - Does not account for body-fin interference
 * - Simplifies nose CP for non-conical shapes
 * - Does not account for angle-of-attack effects
 * - Approximation only — real CP should be verified with flight testing
 *
 * Architecture allows future replacement with more advanced methods
 * (e.g., Panel methods, CFD-informed corrections).
 */

import type { RocketDesignState } from "@/lib/rocket-designer-types";
import { calculateGeometry, type GeometryProperties } from "./geometry";

// ── CP Properties ────────────────────────────────────────────────

export interface CPProperties {
  /** Center of Pressure — distance from nose tip (m) */
  cpFromNose: number;
  /** Center of Pressure — distance from tail (m) */
  cpFromTail: number;
  /** CP as percentage of total rocket length */
  cpPercentLength: number;
  /** Nose cone contribution */
  noseContribution: CpContribution;
  /** Body tube contribution */
  bodyContribution: CpContribution;
  /** Fin contribution */
  finContribution: CpContribution;
  /** Total normal force coefficient */
  totalCN: number;
  /** Component breakdown */
  components: CpComponent[];
  /** Method description for confidence reporting */
  method: string;
}

export interface CpContribution {
  cn: number;      // Normal force coefficient
  cp: number;      // CP position from nose (m)
  weight: number;  // CN × CP (weighted position)
}

export interface CpComponent {
  name: string;
  cn: number;
  cp: number; // m from nose
  percentage: number; // % of total CN
}

// ── Nose Cone CP Factor ─────────────────────────────────────────

function noseCpFactor(type: string): number {
  // Fraction of nose length from tip where CP acts
  switch (type) {
    case "conical":
      return 0.666; // 2/3 from tip
    case "ogive":
      return 0.533; // Tangent ogive approximation
    case "parabolic":
      return 0.500; // Half
    case "elliptical":
      return 0.450; // Closer to tip for ellipticals
    default:
      return 0.500;
  }
}

// ── CP Calculation ──────────────────────────────────────────────

export function calculateCP(
  design: RocketDesignState,
  geometry: GeometryProperties,
): CPProperties {
  const bodyRadius = geometry.bodyDiameter / 2;
  const bodyDiameter = geometry.bodyDiameter;

  // Normal force coefficients and CP locations
  let totalWeightedCN = 0;
  let totalCN = 0;
  let yPos = 0;

  // ── 1. Nose Cone ─────────────────────────────────────────────
  // CN_nose = 2 * (noseBaseRadius / bodyRadius)^2
  // For a conical nose. We scale for other shapes.
  const noseBaseRadius = design.noseCone.geometry.baseRadius;
  // Prevent division by zero
  const radiusRatio = bodyRadius > 0 ? noseBaseRadius / bodyRadius : 1;
  const cnNose = 2 * radiusRatio * radiusRatio;

  // Scale factor for nose shape — Barrowman derived for conical,
  // we apply a shape factor for others
  const shapeFactor = noseCpFactor(design.noseCone.geometry.type) / 0.666;
  const cnNoseAdjusted = cnNose * shapeFactor;

  const cpNose = yPos + geometry.noseLength * noseCpFactor(design.noseCone.geometry.type);

  totalWeightedCN += cnNoseAdjusted * cpNose;
  totalCN += cnNoseAdjusted;

  yPos += geometry.noseLength;

  // ── 2. Body Tube ─────────────────────────────────────────────
  // Body contribution is small at subsonic speeds.
  // For a tube of constant diameter: CN_body ≈ 0
  // but we include a small contribution for completeness.
  const cnBody = 0.02; // Minor body contribution (assumption)
  const cpBody = yPos + geometry.bodyLength * 0.5; // CP at body center

  totalWeightedCN += cnBody * cpBody;
  totalCN += cnBody;

  yPos += geometry.bodyLength;

  // ── 3. Fins ─────────────────────────────────────────────────
  // Simplified Barrowman for trapezoidal fins:
  //
  // CN_fins = (1 + tau) * 4 * n * (s/d)^2 / 6
  //
  // where  tau   = finTipChord / finRootChord
  //        n     = number of fins
  //        s     = fin span (height from body surface to tip)
  //        d     = body diameter
  //
  // CP_fins = finRootPosition + finRootChord * (AR * tau) / (6 * (1 + tau))
  //   where AR = aspect ratio = 2 * s^2 / finArea

  const finCount = design.fins.geometry.count;
  const finHeight = design.fins.geometry.height; // span from body surface
  const finRootChord = design.fins.geometry.span;
  const finTipChord = design.fins.geometry.tipSpan;

  let cnFins = 0;
  let cpFins = 0;

  if (finCount > 0 && bodyDiameter > 0) {
    const tau = finRootChord > 0 ? finTipChord / finRootChord : 0;
    const sOverD = finHeight / bodyDiameter;

    // Interference factor for fin-body interaction
    const interference = 1 + bodyRadius / (bodyRadius + finHeight);

    // Normal force coefficient for fins
    // Using simplified Barrowman: CN_fins per fin pair = 4*n*(s/d)^2
    cnFins = interference * finCount * sOverD * sOverD;

    // Fin CP location — aerodynamic center of fin planform
    // For trapezoidal fins, CP ≈ 1/3 of mean chord from leading edge at root
    const meanChord = (finRootChord + finTipChord) / 2;
    const finSweep = design.fins.geometry.sweep;

    // CP of fin measured from fin leading edge at root
    const finAeroCenter = (finRootChord * (finRootChord + 2 * finTipChord)) / (3 * (finRootChord + finTipChord));
    // Approximate: CP from fin leading edge ≈ (span/3)*(1 + tau)/(1 + tau + tau^2) + sweep
    const finCpFromLE = meanChord * 0.35 + finSweep * 0.2;

    // Position of fin from nose tip: total length - nozzle length - recovery length - bottle length - body length + offset
    const totalLength = geometry.totalLength;
    const nozzleLen = design.nozzle.geometry.length;
    const recoveryLen = design.recovery.geometry.compartmentLength;

    // Fin position from tail
    const finPosFromTail = design.fins.geometry.position;

    // Distance from nose tip
    cpFins = totalLength - nozzleLen - recoveryLen - geometry.bottleLength - finPosFromTail - finCpFromLE;
  }

  totalWeightedCN += cnFins * cpFins;
  totalCN += cnFins;

  // ── Overall CP ──────────────────────────────────────────────
  const cpFromNose = totalCN > 0 ? totalWeightedCN / totalCN : geometry.totalLength * 0.5;
  const cpFromTail = geometry.totalLength - cpFromNose;
  const cpPercentLength = geometry.totalLength > 0
    ? (cpFromNose / geometry.totalLength) * 100
    : 0;

  // Component breakdown
  const totalNorm = totalCN > 0 ? totalCN : 1;

  return {
    cpFromNose,
    cpFromTail,
    cpPercentLength,
    noseContribution: { cn: cnNoseAdjusted, cp: cpNose, weight: cnNoseAdjusted * cpNose },
    bodyContribution: { cn: cnBody, cp: cpBody, weight: cnBody * cpBody },
    finContribution: { cn: cnFins, cp: cpFins, weight: cnFins * cpFins },
    totalCN,
    components: [
      { name: "Nose Cone", cn: cnNoseAdjusted, cp: cpNose, percentage: (cnNoseAdjusted / totalNorm) * 100 },
      { name: "Body Tube", cn: cnBody, cp: cpBody, percentage: (cnBody / totalNorm) * 100 },
      { name: "Fins", cn: cnFins, cp: cpFins, percentage: (cnFins / totalNorm) * 100 },
    ],
    method: "Simplified Barrowman approximation (subsonic, small AoA)",
  };
}

// ── Quick CP (for context — uses internal geometry calls) ───────

export function calculateCPFromDesign(design: RocketDesignState): CPProperties {
  const geometry = calculateGeometry(design);
  return calculateCP(design, geometry);
}
