/**
 * SOAR Studio v2.6 — Optimization Assistant
 *
 * A deterministic, rule-based optimization engine that suggests
 * engineering improvements to rocket designs based on user goals.
 *
 * All suggestions are generated from hard-coded rules.
 * No AI, no machine learning, no statistical models.
 *
 * Users can request suggestions for:
 *   - Increasing altitude
 *   - Improving stability
 *   - Reducing mass
 *   - Extending flight time
 *   - Reducing drag
 *   - General optimization
 */

import type { RocketDesignState } from "@/lib/rocket-designer-types";
import { calculateEngineeringProperties } from "@/lib/engineering/properties";
import type { SimulationData } from "./compare";

// ── Types ────────────────────────────────────────────────────────

export type OptimizationGoal =
  | "increase_altitude"
  | "improve_stability"
  | "reduce_mass"
  | "extend_flight_time"
  | "reduce_drag"
  | "general";

export interface OptimizationSuggestion {
  id: string;
  goal: OptimizationGoal;
  priority: "high" | "medium" | "low";
  component: string;
  property: string;
  action: "increase" | "decrease" | "adjust";
  currentValue: string;
  suggestedValue: string;
  rationale: string;
  expectedBenefit: string;
}

export interface OptimizationResult {
  rocketId: string;
  rocketName: string;
  goal: OptimizationGoal;
  suggestions: OptimizationSuggestion[];
  summary: string;
}

// ── Goal Labels ──────────────────────────────────────────────────

export const GOAL_LABELS: Record<OptimizationGoal, string> = {
  increase_altitude: "Increase Altitude",
  improve_stability: "Improve Stability",
  reduce_mass: "Reduce Mass",
  extend_flight_time: "Extend Flight Time",
  reduce_drag: "Reduce Drag",
  general: "General Optimization",
};

// ── Optimization Rules ───────────────────────────────────────────

export function generateOptimizations(
  design: RocketDesignState,
  goal: OptimizationGoal,
  simulation: SimulationData | null,
): OptimizationResult {
  const eng = calculateEngineeringProperties(design);
  const suggestions: OptimizationSuggestion[] = [];
  let counter = 0;

  const nextId = () => `opt_${goal}_${++counter}`;

  // Helper to format dimension
  const mm = (m: number) => `${(m * 1000).toFixed(0)} mm`;
  const g = (kg: number) => `${(kg * 1000).toFixed(0)} g`;

  switch (goal) {
    // ── INCREASE ALTITUDE ──────────────────────────────────────
    case "increase_altitude":
      // Water fill
      if (eng.waterFillPercentage < 20 || eng.waterFillPercentage > 50) {
        suggestions.push({
          id: nextId(), goal, priority: "high",
          component: "Propulsion", property: "Water Fill",
          action: "adjust",
          currentValue: `${eng.waterFillPercentage.toFixed(0)}%`,
          suggestedValue: "30-40%",
          rationale: "Water fill is outside the optimal range of 30-40% for maximum altitude.",
          expectedBenefit: "Up to 20% altitude improvement from better thrust-to-water ratio.",
        });
      }

      // Pressure
      const pressureBar = eng.initialPressure / 100000;
      if (pressureBar < 4) {
        suggestions.push({
          id: nextId(), goal, priority: "high",
          component: "Propulsion", property: "Initial Pressure",
          action: "increase",
          currentValue: `${pressureBar.toFixed(1)} bar`,
          suggestedValue: "5.0-7.0 bar",
          rationale: "Higher pressure increases exhaust velocity and total impulse.",
          expectedBenefit: "Significant altitude increase (10-30%) from higher expansion ratio.",
        });
      } else if (pressureBar > 8) {
        suggestions.push({
          id: nextId(), goal, priority: "medium",
          component: "Propulsion", property: "Initial Pressure",
          action: "decrease",
          currentValue: `${pressureBar.toFixed(1)} bar`,
          suggestedValue: "5.0-7.0 bar",
          rationale: "Excessive pressure may cause structural failure and adds unnecessary mass.",
          expectedBenefit: "Improved safety and reduced structural mass.",
        });
      }

      // Mass
      if (eng.mass.dryMass > 0.2) {
        suggestions.push({
          id: nextId(), goal, priority: "medium",
          component: "Structure", property: "Dry Mass",
          action: "decrease",
          currentValue: g(eng.mass.dryMass),
          suggestedValue: g(eng.mass.dryMass * 0.8),
          rationale: "Reducing dry mass by 20% improves acceleration and altitude for the same impulse.",
          expectedBenefit: "Reducing dry mass by 20% yields approximately 10-15% higher altitude.",
        });
      }

      // Launch angle
      if (design.launchAngle < 60 || design.launchAngle > 85) {
        suggestions.push({
          id: nextId(), goal, priority: "high",
          component: "Launch", property: "Angle",
          action: "adjust",
          currentValue: `${design.launchAngle.toFixed(0)}°`,
          suggestedValue: "70-80°",
          rationale: "Steep launch angles (70-80°) maximize altitude by directing thrust upward.",
          expectedBenefit: "Up to 25% altitude improvement from optimal launch angle.",
        });
      }

      // Drag coefficient
      if (design.dragCoefficient > 0.5) {
        suggestions.push({
          id: nextId(), goal, priority: "high",
          component: "Aerodynamics", property: "Drag Coefficient",
          action: "decrease",
          currentValue: `${design.dragCoefficient.toFixed(2)}`,
          suggestedValue: `<0.40`,
          rationale: "High drag reduces maximum velocity and altitude during coast phase.",
          expectedBenefit: "Lower drag by 0.1 yields roughly 5-10% higher apogee.",
        });
      }

      // Bottle volume
      if (eng.geometry.bottleVolumeLiters < 1.5) {
        suggestions.push({
          id: nextId(), goal, priority: "low",
          component: "Bottle", property: "Volume",
          action: "increase",
          currentValue: `${eng.geometry.bottleVolumeLiters.toFixed(1)} L`,
          suggestedValue: "2.0 L",
          rationale: "Larger bottle holds more propellant for longer thrust duration.",
          expectedBenefit: "Modest altitude gain from longer burn time.",
        });
      }
      break;

    // ── IMPROVE STABILITY ──────────────────────────────────────
    case "improve_stability":
      if (eng.stability.marginCalibers < 1.0) {
        // Check fin size
        if (design.fins.geometry.height < 0.08) {
          suggestions.push({
            id: nextId(), goal, priority: "high",
            component: "Fins", property: "Height",
            action: "increase",
            currentValue: mm(design.fins.geometry.height),
            suggestedValue: mm(Math.max(0.1, design.fins.geometry.height * 1.3)),
            rationale: "Larger fins move the Center of Pressure aft, increasing the stability margin.",
            expectedBenefit: "Adding 30% more fin span can add 0.3-0.5 calibers of stability margin.",
          });
        }

        // Check nose mass
        if (design.noseCone.mass < 0.03) {
          suggestions.push({
            id: nextId(), goal, priority: "medium",
            component: "Nose Cone", property: "Mass",
            action: "increase",
            currentValue: g(design.noseCone.mass),
            suggestedValue: g(design.noseCone.mass * 1.5),
            rationale: "Adding mass forward moves the CG forward, improving static stability.",
            expectedBenefit: "Heavier nose by 50% moves CG forward by ~5-10% of body length.",
          });
        }

        // Check body length
        const aspectRatio = eng.geometry.aspectRatio;
        if (aspectRatio < 5) {
          suggestions.push({
            id: nextId(), goal, priority: "medium",
            component: "Body Tube", property: "Length",
            action: "increase",
            currentValue: mm(eng.geometry.bodyLength),
            suggestedValue: mm(eng.geometry.bodyLength * 1.2),
            rationale: "Longer body increases the moment arm between CG and CP.",
            expectedBenefit: "20% longer body improves stability margin by approximately 0.2-0.4 calibers.",
          });
        }

        // Check nozzle mass
        if (design.nozzle.mass > 0.01) {
          suggestions.push({
            id: nextId(), goal, priority: "low",
            component: "Nozzle", property: "Mass",
            action: "decrease",
            currentValue: g(design.nozzle.mass),
            suggestedValue: g(design.nozzle.mass * 0.7),
            rationale: "Heavy tail components move CG aft, reducing stability margin.",
            expectedBenefit: "Lighter tail improves margin by 0.1-0.2 calibers.",
          });
        }
      } else {
        // Already stable — congratulate
        suggestions.push({
          id: nextId(), goal, priority: "low",
          component: "General", property: "Stability",
          action: "adjust",
          currentValue: `${eng.stability.marginCalibers.toFixed(2)} cal`,
          suggestedValue: "No change needed",
          rationale: `Stability margin of ${eng.stability.marginCalibers.toFixed(2)} calibers is within the recommended range.`,
          expectedBenefit: "Rocket should fly stably.",
        });
      }
      break;

    // ── REDUCE MASS ────────────────────────────────────────────
    case "reduce_mass":
      const components = [
        { name: "Nose Cone", mass: design.noseCone.mass, component: "Nose Cone" },
        { name: "Body Tube", mass: design.bodyTube.mass, component: "Body Tube" },
        { name: "Fins", mass: design.fins.mass, component: "Fins" },
        { name: "Bottle", mass: design.bottle.mass, component: "Bottle" },
        { name: "Nozzle", mass: design.nozzle.mass, component: "Nozzle" },
        { name: "Recovery", mass: design.recovery.mass, component: "Recovery" },
      ].sort((a, b) => b.mass - a.mass);

      // Suggest reducing the heaviest component
      const heaviest = components[0];
      if (heaviest.mass / eng.mass.dryMass > 0.3) {
        suggestions.push({
          id: nextId(), goal, priority: "high",
          component: heaviest.component, property: "Mass",
          action: "decrease",
          currentValue: g(heaviest.mass),
          suggestedValue: g(heaviest.mass * 0.7),
          rationale: `${heaviest.component} contributes ${((heaviest.mass / eng.mass.dryMass) * 100).toFixed(0)}% of dry mass. Reducing it yields the largest mass savings.`,
          expectedBenefit: "30% mass reduction on heaviest component saves significant dry mass.",
        });
      }

      if (eng.waterFillPercentage > 50) {
        suggestions.push({
          id: nextId(), goal, priority: "high",
          component: "Propulsion", property: "Water Fill",
          action: "decrease",
          currentValue: `${eng.waterFillPercentage.toFixed(0)}%`,
          suggestedValue: "30-40%",
          rationale: "Excess water adds dead weight without contributing to thrust after expulsion.",
          expectedBenefit: "Lower water fill reduces launch mass by 10-30%.",
        });
      }

      // Suggest lighter materials
      if (design.bodyTube.material.density > 1000) {
        suggestions.push({
          id: nextId(), goal, priority: "medium",
          component: "Body Tube", property: "Material",
          action: "adjust",
          currentValue: design.bodyTube.material.name,
          suggestedValue: "Cardboard or Balsa Wood",
          rationale: "Current body material has high density. Lighter materials reduce dry mass.",
          expectedBenefit: "Switching to cardboard could halve body tube mass.",
        });
      }
      break;

    // ── EXTEND FLIGHT TIME ─────────────────────────────────────
    case "extend_flight_time":
      if (eng.waterFillPercentage < 20) {
        suggestions.push({
          id: nextId(), goal, priority: "high",
          component: "Propulsion", property: "Water Fill",
          action: "increase",
          currentValue: `${eng.waterFillPercentage.toFixed(0)}%`,
          suggestedValue: "35-50%",
          rationale: "More water extends the thrust phase duration.",
          expectedBenefit: "Longer burn time = longer total flight time.",
        });
      }

      if (design.launchAngle < 80) {
        suggestions.push({
          id: nextId(), goal, priority: "medium",
          component: "Launch", property: "Angle",
          action: "increase",
          currentValue: `${design.launchAngle.toFixed(0)}°`,
          suggestedValue: "85-90°",
          rationale: "Vertical or near-vertical launch maximizes time in the air.",
          expectedBenefit: "Steeper launch = longer flight time.",
        });
      }
      break;

    // ── REDUCE DRAG ────────────────────────────────────────────
    case "reduce_drag":
      if (design.dragCoefficient > 0.4) {
        suggestions.push({
          id: nextId(), goal, priority: "high",
          component: "Aerodynamics", property: "Drag Coefficient",
          action: "decrease",
          currentValue: `${design.dragCoefficient.toFixed(2)}`,
          suggestedValue: `<0.35`,
          rationale: "Streamlining the nose cone and reducing protrusions lowers drag.",
          expectedBenefit: "Drag reduction from 0.45 to 0.35 can increase altitude by 10-15%.",
        });
      }

      if (eng.geometry.frontalArea > 0.01) {
        suggestions.push({
          id: nextId(), goal, priority: "medium",
          component: "Body Tube", property: "Diameter",
          action: "decrease",
          currentValue: mm(eng.geometry.bodyDiameter),
          suggestedValue: mm(eng.geometry.bodyDiameter * 0.9),
          rationale: "Smaller body diameter reduces frontal area and profile drag.",
          expectedBenefit: "10% diameter reduction = 19% less frontal area drag.",
        });
      }

      // Fin size
      if (design.fins.geometry.height > 0.06 && eng.stability.marginCalibers > 2.0) {
        suggestions.push({
          id: nextId(), goal, priority: "medium",
          component: "Fins", property: "Height",
          action: "decrease",
          currentValue: mm(design.fins.geometry.height),
          suggestedValue: mm(design.fins.geometry.height * 0.8),
          rationale: "Fins generate significant drag. Since stability margin is generous, fins can be reduced.",
          expectedBenefit: "Smaller fins reduce skin friction drag while maintaining stability.",
        });
      }
      break;

    // ── GENERAL OPTIMIZATION ───────────────────────────────────
    case "general":
      // Check basic parameters and report top 3 issues
      const issues: Array<{ priority: "high" | "medium" | "low"; message: string }> = [];

      if (eng.waterFillPercentage < 20 || eng.waterFillPercentage > 50) {
        issues.push({ priority: "high", message: `Water fill is ${eng.waterFillPercentage.toFixed(0)}%. Optimal range is 30-40%.` });
      }

      const pBar = eng.initialPressure / 100000;
      if (pBar < 4) {
        issues.push({ priority: "high", message: `Pressure (${pBar.toFixed(1)} bar) is low. Consider 5-7 bar.` });
      } else if (pBar > 8) {
        issues.push({ priority: "high", message: `Pressure (${pBar.toFixed(1)} bar) is high. Stay below 8 bar.` });
      }

      if (eng.stability.marginCalibers < 0.5) {
        issues.push({ priority: "high", message: `Stability margin (${eng.stability.marginCalibers.toFixed(2)} cal) is critically low. Increase fin size or forward mass.` });
      } else if (eng.stability.marginCalibers < 1.0) {
        issues.push({ priority: "medium", message: `Stability margin (${eng.stability.marginCalibers.toFixed(2)} cal) is marginal. Target 1.0-2.5 calibers.` });
      }

      if (design.dragCoefficient > 0.6) {
        issues.push({ priority: "medium", message: `Drag coefficient (${design.dragCoefficient.toFixed(2)}) is high. Streamline the design.` });
      }

      if (eng.mass.dryMass / eng.mass.totalMass > 0.5) {
        issues.push({ priority: "low", message: `Dry mass fraction is ${((eng.mass.dryMass / eng.mass.totalMass) * 100).toFixed(0)}%. Consider lighter materials.` });
      }

      if (design.launchAngle < 60 || design.launchAngle > 85) {
        issues.push({ priority: "medium", message: `Launch angle (${design.launchAngle.toFixed(0)}°) is suboptimal for altitude. 70-80° is typical.` });
      }

      // Convert top issues to suggestions
      const topIssues = issues.slice(0, 5);
      for (const issue of topIssues) {
        suggestions.push({
          id: nextId(), goal, priority: issue.priority,
          component: "General", property: "Design",
          action: "adjust",
          currentValue: "Current configuration",
          suggestedValue: "See recommendation",
          rationale: issue.message,
          expectedBenefit: "Addressing this will improve overall performance.",
        });
      }

      if (suggestions.length === 0) {
        suggestions.push({
          id: nextId(), goal, priority: "low",
          component: "General", property: "Design",
          action: "adjust",
          currentValue: "All parameters nominal",
          suggestedValue: "No changes needed",
          rationale: "All key parameters are within typical ranges for a water rocket.",
          expectedBenefit: "Current design is well-balanced.",
        });
      }
      break;
  }

  // Generate summary
  const highCount = suggestions.filter((s) => s.priority === "high").length;
  const mediumCount = suggestions.filter((s) => s.priority === "medium").length;
  const lowCount = suggestions.filter((s) => s.priority === "low").length;

  const summary = suggestions.length === 0
    ? `No optimization suggestions for ${GOAL_LABELS[goal].toLowerCase()}.`
    : `${suggestions.length} suggestion${suggestions.length > 1 ? "s" : ""} found ` +
      `(${highCount} high, ${mediumCount} medium, ${lowCount} low priority).`;

  return { rocketId: design.id, rocketName: design.name, goal, suggestions, summary };
}
