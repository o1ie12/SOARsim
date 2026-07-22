"""
Statistical error metrics for SOARSim v0.3 validation.

Provides standard engineering metrics for comparing predicted vs actual
values. All functions operate on scalar values (single-point comparisons)
or arrays (trajectory-level comparisons).

These are pure functions with no side effects — easy to test, easy to
reuse, and independent of any data model.
"""

from __future__ import annotations

import math
from typing import Optional


def absolute_error(predicted: float, actual: float) -> float:
    """Compute absolute error: |predicted - actual|.

    Args:
        predicted: The simulated/predicted value.
        actual: The measured/actual value.

    Returns:
        Non-negative absolute difference.
    """
    return abs(predicted - actual)


def percent_error(predicted: float, actual: float) -> Optional[float]:
    """Compute percent error: ((predicted - actual) / actual) × 100.

    Returns None if actual is zero (undefined). A positive value means
    the simulation overestimates; negative means it underestimates.

    Args:
        predicted: The simulated/predicted value.
        actual: The measured/actual value.

    Returns:
        Percent error as a percentage, or None if actual is zero.
    """
    if actual == 0:
        return None
    return ((predicted - actual) / actual) * 100.0


def rmse(predicted: list[float], actual: list[float]) -> Optional[float]:
    """Compute Root Mean Square Error between two value lists.

    RMSE = sqrt( (1/n) * Σ(predicted_i - actual_i)² )

    Useful for comparing trajectory data or multiple launch results.
    Returns None if lists are empty or mismatched.

    Args:
        predicted: List of simulated values.
        actual: List of measured values (same length).

    Returns:
        RMSE value, or None if computation is undefined.
    """
    if len(predicted) != len(actual) or len(predicted) == 0:
        return None

    n = len(predicted)
    sum_sq = sum((p - a) ** 2 for p, a in zip(predicted, actual))
    return math.sqrt(sum_sq / n)


def mean_absolute_error(predicted: list[float], actual: list[float]) -> Optional[float]:
    """Compute Mean Absolute Error between two value lists.

    MAE = (1/n) * Σ|predicted_i - actual_i|

    Less sensitive to outliers than RMSE.

    Args:
        predicted: List of simulated values.
        actual: List of measured values (same length).

    Returns:
        MAE value, or None if computation is undefined.
    """
    if len(predicted) != len(actual) or len(predicted) == 0:
        return None

    n = len(predicted)
    sum_abs = sum(abs(p - a) for p, a in zip(predicted, actual))
    return sum_abs / n


def max_difference(predicted: list[float], actual: list[float]) -> Optional[float]:
    """Compute the maximum absolute difference between two value lists.

    Identifies the worst-case error across all compared points.

    Args:
        predicted: List of simulated values.
        actual: List of measured values (same length).

    Returns:
        Maximum absolute difference, or None if computation is undefined.
    """
    if len(predicted) != len(actual) or len(predicted) == 0:
        return None

    return max(abs(p - a) for p, a in zip(predicted, actual))


def accuracy_score(predicted: float, actual: float, tolerance_pct: float = 10.0) -> float:
    """Compute a 0-1 accuracy score based on percent error.

    Returns 1.0 if predicted matches actual exactly.
    Returns 0.0 if percent error exceeds tolerance_pct.

    Args:
        predicted: The simulated/predicted value.
        actual: The measured/actual value.
        tolerance_pct: Maximum percent error for a score of 0.

    Returns:
        Accuracy score between 0 and 1.
    """
    pe = percent_error(predicted, actual)
    if pe is None:
        return 0.0

    # Clamp to [0, 1]: 1 - (|percent_error| / tolerance), minimum 0
    return max(0.0, 1.0 - (abs(pe) / tolerance_pct))


def overall_accuracy(
    predicted_altitude: float,
    actual_altitude: float,
    predicted_flight_time: float,
    actual_flight_time: float,
    predicted_velocity: float,
    actual_velocity: float,
) -> float:
    """Compute overall simulation accuracy as a weighted average.

    Weights:
        - Altitude: 40% (primary metric for rocketry)
        - Flight time: 30% (directly measurable, high confidence)
        - Velocity: 30% (derived, moderate confidence)

    Args:
        predicted_altitude: Simulated maximum altitude (m).
        actual_altitude: Measured maximum altitude (m).
        predicted_flight_time: Simulated flight time (s).
        actual_flight_time: Measured flight time (s).
        predicted_velocity: Simulated max velocity (m/s).
        actual_velocity: Measured max velocity (m/s).

    Returns:
        Overall accuracy score between 0 and 1.
    """
    alt_score = accuracy_score(predicted_altitude, actual_altitude)
    time_score = accuracy_score(predicted_flight_time, actual_flight_time)
    vel_score = accuracy_score(predicted_velocity, actual_velocity)

    return 0.4 * alt_score + 0.3 * time_score + 0.3 * vel_score
