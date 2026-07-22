"""
Statistics module for SOARSim v2.0.

Provides statistical functions for analyzing simulation results,
including descriptive statistics, confidence intervals, and
probability distributions.
"""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class DescriptiveStats:
    """Descriptive statistics for a dataset."""
    count: int
    mean: float
    std: float
    variance: float
    min: float
    max: float
    median: float
    q25: float  # 25th percentile
    q75: float  # 75th percentile
    iqr: float  # Interquartile range
    skewness: float
    kurtosis: float


@dataclass(frozen=True)
class ConfidenceInterval:
    """Confidence interval for a statistic."""
    mean: float
    lower: float
    upper: float
    confidence_level: float


@dataclass(frozen=True)
class Histogram:
    """Binned histogram data."""
    bins: list[float]  # Bin edges
    counts: list[int]  # Count in each bin
    density: list[float]  # Probability density per bin


def compute_descriptive(values: list[float]) -> DescriptiveStats:
    """Compute descriptive statistics for a list of values.

    Args:
        values: List of numeric values.

    Returns:
        DescriptiveStats with all computed statistics.
    """
    n = len(values)
    if n == 0:
        return DescriptiveStats(
            count=0, mean=0, std=0, variance=0, min=0, max=0,
            median=0, q25=0, q75=0, iqr=0, skewness=0, kurtosis=0,
        )

    sorted_vals = sorted(values)
    mean = sum(values) / n
    variance = sum((v - mean) ** 2 for v in values) / n if n > 1 else 0.0
    std = math.sqrt(variance)

    # Percentiles using linear interpolation
    def _percentile(pct: float) -> float:
        idx = pct * (n - 1)
        lo = int(idx)
        hi = min(lo + 1, n - 1)
        frac = idx - lo
        return sorted_vals[lo] + frac * (sorted_vals[hi] - sorted_vals[lo])

    median = _percentile(0.5)
    q25 = _percentile(0.25)
    q75 = _percentile(0.75)
    iqr = q75 - q25

    # Skewness and kurtosis (excess)
    skewness = 0.0
    kurtosis = 0.0
    if n > 2 and std > 0:
        skewness = sum(((v - mean) / std) ** 3 for v in values) / n
    if n > 3 and std > 0:
        kurtosis = sum(((v - mean) / std) ** 4 for v in values) / n - 3.0

    return DescriptiveStats(
        count=n,
        mean=mean,
        std=std,
        variance=variance,
        min=sorted_vals[0],
        max=sorted_vals[-1],
        median=median,
        q25=q25,
        q75=q75,
        iqr=iqr,
        skewness=skewness,
        kurtosis=kurtosis,
    )


def compute_confidence_interval(
    values: list[float],
    confidence_level: float = 0.95,
) -> ConfidenceInterval:
    """Compute a confidence interval for the mean using the t-distribution.

    Args:
        values: List of numeric values.
        confidence_level: Confidence level (0, 1). Default 0.95.

    Returns:
        ConfidenceInterval with mean, lower, and upper bounds.
    """
    n = len(values)
    if n == 0:
        return ConfidenceInterval(mean=0, lower=0, upper=0, confidence_level=confidence_level)
    if n == 1:
        return ConfidenceInterval(mean=values[0], lower=values[0], upper=values[0], confidence_level=confidence_level)

    mean = sum(values) / n
    variance = sum((v - mean) ** 2 for v in values) / (n - 1)
    std_error = math.sqrt(variance / n)

    # t-critical values (approximation for common confidence levels)
    # For large n, t approaches z (normal distribution)
    t_critical = _t_critical(n - 1, confidence_level)

    margin = t_critical * std_error
    return ConfidenceInterval(
        mean=mean,
        lower=mean - margin,
        upper=mean + margin,
        confidence_level=confidence_level,
    )


def _t_critical(df: int, confidence: float) -> float:
    """Approximate t-critical value using the normal approximation.

    For small samples, this is an approximation. For production use,
    a proper t-table or scipy.stats would be more accurate.
    """
    # z-values for common confidence levels
    alpha = 1.0 - confidence
    z_approx = {
        0.90: 1.645,
        0.95: 1.960,
        0.99: 2.576,
    }

    z = z_approx.get(confidence, 1.960)

    # Adjust for small degrees of freedom using Cornish-Fisher expansion
    if df <= 0:
        return z
    if df >= 30:
        return z

    # Simple approximation: t ≈ z * (1 + (z² + 1)/(4*df))
    return z * (1.0 + (z * z + 1.0) / (4.0 * df))


def compute_histogram(
    values: list[float],
    n_bins: int = 20,
) -> Histogram:
    """Compute a histogram for a list of values.

    Args:
        values: List of numeric values.
        n_bins: Number of bins.

    Returns:
        Histogram with bin edges, counts, and densities.
    """
    if not values:
        return Histogram(bins=[], counts=[], density=[])

    min_val = min(values)
    max_val = max(values)

    if min_val == max_val:
        return Histogram(bins=[min_val, max_val], counts=[len(values)], density=[1.0])

    bin_width = (max_val - min_val) / n_bins
    bins = [min_val + i * bin_width for i in range(n_bins + 1)]
    counts = [0] * n_bins

    for v in values:
        idx = int((v - min_val) / bin_width)
        idx = min(idx, n_bins - 1)
        counts[idx] += 1

    # Convert to density
    total = len(values) * bin_width
    density = [c / total for c in counts]

    return Histogram(bins=bins, counts=counts, density=density)
