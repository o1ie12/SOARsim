"""
Comparison engine for SOARSim v0.3 validation.

Compares simulation results against real flight data and generates
deterministic engineering notes. All analysis is purely algorithmic —
no AI, no randomness, no external services.

Design decisions:
    - ComparisonResult is a frozen dataclass for immutability.
    - generate_engineering_notes() uses rule-based heuristics.
    - The engine consumes SimulationSummary (from the simulator) and
      FlightData (from real launches) without coupling to either module.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from app.validation.flight_data import FlightData
from app.validation.metrics import (
    absolute_error,
    percent_error,
    overall_accuracy,
)


@dataclass(frozen=True)
class MetricComparison:
    """Comparison result for a single metric.

    Attributes:
        metric_name: Human-readable name of the metric.
        predicted: Simulated value.
        actual: Measured value.
        abs_error: Absolute error (predicted - actual).
        pct_error: Percent error (positive = overestimate).
        unit: Unit string for display.
    """

    metric_name: str
    predicted: float
    actual: float
    abs_error: float
    pct_error: Optional[float]
    unit: str


@dataclass(frozen=True)
class ComparisonResult:
    """Full comparison result between a simulation and a real flight.

    Attributes:
        flight_id: ID of the flight data record compared.
        metrics: Individual metric comparisons.
        overall_accuracy: Weighted accuracy score (0-1).
        notes: Deterministic engineering notes.
    """

    flight_id: str
    metrics: list[MetricComparison]
    overall_accuracy: float
    notes: list[str]


def compare_flights(
    predicted_altitude: float,
    predicted_flight_time: float,
    predicted_velocity: float,
    flight: FlightData,
) -> ComparisonResult:
    """Compare simulation predictions against real flight data.

    Only compares metrics that are available in both the prediction
    and the flight data. Missing actual values are skipped.

    Args:
        predicted_altitude: Simulated maximum altitude (m).
        predicted_flight_time: Simulated flight time (s).
        predicted_velocity: Simulated max velocity (m/s).
        flight: Real flight data to compare against.

    Returns:
        ComparisonResult with per-metric analysis and notes.
    """
    metrics: list[MetricComparison] = []

    # Compare altitude
    if flight.max_altitude is not None:
        ae = absolute_error(predicted_altitude, flight.max_altitude)
        pe = percent_error(predicted_altitude, flight.max_altitude)
        metrics.append(
            MetricComparison(
                metric_name="Maximum Altitude",
                predicted=predicted_altitude,
                actual=flight.max_altitude,
                abs_error=ae,
                pct_error=pe,
                unit="m",
            )
        )

    # Compare flight time
    if flight.flight_time is not None:
        ae = absolute_error(predicted_flight_time, flight.flight_time)
        pe = percent_error(predicted_flight_time, flight.flight_time)
        metrics.append(
            MetricComparison(
                metric_name="Flight Time",
                predicted=predicted_flight_time,
                actual=flight.flight_time,
                abs_error=ae,
                pct_error=pe,
                unit="s",
            )
        )

    # Compare velocity
    if flight.max_velocity is not None:
        ae = absolute_error(predicted_velocity, flight.max_velocity)
        pe = percent_error(predicted_velocity, flight.max_velocity)
        metrics.append(
            MetricComparison(
                metric_name="Maximum Velocity",
                predicted=predicted_velocity,
                actual=flight.max_velocity,
                abs_error=ae,
                pct_error=pe,
                unit="m/s",
            )
        )

    # Compute overall accuracy
    oa = 0.0
    if flight.max_altitude is not None and flight.flight_time is not None and flight.max_velocity is not None:
        oa = overall_accuracy(
            predicted_altitude, flight.max_altitude,
            predicted_flight_time, flight.flight_time,
            predicted_velocity, flight.max_velocity,
        )
    elif flight.max_altitude is not None:
        # Fallback: accuracy based on altitude alone
        oa = 1.0 - min(abs(percent_error(predicted_altitude, flight.max_altitude) or 0) / 100.0, 1.0)

    # Generate engineering notes
    notes = generate_engineering_notes(metrics, flight)

    return ComparisonResult(
        flight_id=flight.id,
        metrics=metrics,
        overall_accuracy=oa,
        notes=notes,
    )


def generate_engineering_notes(
    metrics: list[MetricComparison],
    flight: FlightData,
) -> list[str]:
    """Generate deterministic engineering notes from comparison results.

    Uses rule-based heuristics — no AI, no randomness.
    Each note is a specific, actionable observation.

    Args:
        metrics: Per-metric comparison results.
        flight: The original flight data.

    Returns:
        List of engineering note strings.
    """
    notes: list[str] = []

    for m in metrics:
        if m.pct_error is None:
            continue

        pct = m.pct_error
        abs_pct = abs(pct)

        # Altitude-specific notes
        if m.metric_name == "Maximum Altitude":
            if abs_pct < 2.0:
                notes.append(
                    f"Altitude prediction is excellent ({pct:+.1f}% error). "
                    f"Model is well-calibrated for this configuration."
                )
            elif abs_pct < 5.0:
                direction = "underestimates" if pct < 0 else "overestimates"
                notes.append(
                    f"The simulator {direction} altitude by {abs_pct:.1f}%. "
                    f"This is within acceptable engineering tolerance."
                )
            elif abs_pct < 15.0:
                direction = "underestimates" if pct < 0 else "overestimates"
                notes.append(
                    f"The simulator {direction} altitude by {abs_pct:.1f}%. "
                    f"Consider adjusting drag coefficient or initial pressure."
                )
            else:
                direction = "significantly underestimates" if pct < 0 else "significantly overestimates"
                notes.append(
                    f"The simulator {direction} altitude by {abs_pct:.1f}%. "
                    f"Review model assumptions for this launch configuration."
                )

        # Flight time notes
        if m.metric_name == "Flight Time":
            if abs_pct < 3.0:
                notes.append(
                    f"Flight time prediction is accurate ({pct:+.1f}% error)."
                )
            elif abs_pct < 10.0:
                direction = "too short" if pct < 0 else "too long"
                notes.append(
                    f"Predicted flight time is {abs_pct:.1f}% {direction}. "
                    f"This may indicate thrust or mass modeling issues."
                )
            else:
                direction = "too short" if pct < 0 else "too long"
                notes.append(
                    f"Flight time prediction is significantly {direction} ({abs_pct:.1f}%). "
                    f"Propulsion model may need recalibration."
                )

        # Velocity notes
        if m.metric_name == "Maximum Velocity":
            if abs_pct < 3.0:
                notes.append(
                    f"Velocity prediction is accurate ({pct:+.1f}% error)."
                )
            elif abs_pct < 10.0:
                direction = "underestimates" if pct < 0 else "overestimates"
                notes.append(
                    f"The simulator {direction} velocity by {abs_pct:.1f}%. "
                    f"Nozzle or pressure model may need adjustment."
                )
            else:
                direction = "underestimates" if pct < 0 else "overestimates"
                notes.append(
                    f"Velocity prediction is off by {abs_pct:.1f}% ({direction}). "
                    f"Review propulsion physics assumptions."
                )

    # General notes based on overall pattern
    if len(metrics) >= 2:
        pct_errors = [m.pct_error for m in metrics if m.pct_error is not None]
        if pct_errors:
            all_overestimate = all(e > 0 for e in pct_errors)
            all_underestimate = all(e < 0 for e in pct_errors)

            if all_overestimate:
                notes.append(
                    "The simulation consistently overestimates flight parameters. "
                    "Drag coefficient may be too low for this rocket."
                )
            elif all_underestimate:
                notes.append(
                    "The simulation consistently underestimates flight parameters. "
                    "Drag coefficient may be too high, or initial pressure "
                    "may be higher than recorded."
                )

    # Pressure-related notes
    if flight.pressure is not None and flight.pressure <= 0:
        notes.append(
            "Recorded pressure is zero or negative. "
            "This will result in no thrust prediction. "
            "Verify pressure measurement."
        )

    # Water volume notes
    if flight.water_volume is not None and flight.pressure is not None:
        if flight.water_volume > 0 and flight.pressure > 0:
            # Check if fill ratio is reasonable
            # Assume 2L bottle for now (could be made configurable)
            bottle_volume = 0.002  # m³
            fill_ratio = flight.water_volume / bottle_volume if bottle_volume > 0 else 0
            if fill_ratio > 0.5:
                notes.append(
                    f"Water fill ratio is {fill_ratio*100:.0f}%. "
                    f"Optimal is typically 25-40%. "
                    f"High fill ratios reduce air expansion and thrust duration."
                )
            elif fill_ratio < 0.1:
                notes.append(
                    f"Water fill ratio is {fill_ratio*100:.0f}%. "
                    f"This is very low and will produce minimal thrust."
                )

    # Mass-related notes
    if flight.rocket_mass is not None and flight.rocket_mass > 5.0:
        notes.append(
            f"Rocket mass ({flight.rocket_mass:.1f} kg) is unusually high for "
            f"a water rocket. Typical range is 0.1-1.0 kg. "
            f"Verify mass measurement."
        )

    # If no specific notes generated, add a general one
    if not notes:
        if metrics:
            avg_pct = sum(
                abs(m.pct_error) for m in metrics if m.pct_error is not None
            ) / max(1, sum(1 for m in metrics if m.pct_error is not None))
            if avg_pct < 5.0:
                notes.append("Overall prediction accuracy is good across all measured metrics.")
            elif avg_pct < 15.0:
                notes.append("Predictions are within moderate engineering tolerance.")
            else:
                notes.append("Significant deviations detected. Model calibration recommended.")
        else:
            notes.append("Insufficient measured data for detailed analysis. Record altitude, flight time, and velocity for comprehensive validation.")

    return notes
