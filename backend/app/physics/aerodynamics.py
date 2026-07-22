"""
Advanced aerodynamics module for SOARSim v2.0.

Expands the drag model from v1.0 with:
- Mach-dependent drag coefficient
- Variable drag tables
- Nose cone drag contribution
- Fin drag approximation
- Reynolds number effects

Does NOT implement CFD. Uses empirical correlations and standard approximations.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum


class NoseConeType(Enum):
    """Nose cone geometry types with associated drag coefficients."""
    CONE = "cone"                    # Conical nose cone
    OGIVE = "ogive"                  # Tangent ogive
    VON_KARMAN = "von_karman"        # Von Kármán (minimum drag)
    PARABOLIC = "parabolic"          # Parabolic
    HEMISPHERE = "hemisphere"        # Hemisphere
    BLUNT = "blunt"                  # Blunt/flat nose


# Base drag coefficients for nose cone types (subsonic)
NOSE_CONE_CD: dict[NoseConeType, float] = {
    NoseConeType.CONE: 0.02,
    NoseConeType.OGIVE: 0.012,
    NoseConeType.VON_KARMAN: 0.008,
    NoseConeType.PARABOLIC: 0.015,
    NoseConeType.HEMISPHERE: 0.04,
    NoseConeType.BLUNT: 0.10,
}


@dataclass
class AerodynamicConfig:
    """Configuration for advanced aerodynamic model.

    Attributes:
        base_drag_coefficient: Base Cd at subsonic speeds (dimensionless).
        cross_sectional_area: Reference area (m²).
        nose_cone_type: Type of nose cone geometry.
        nose_cone_length: Length of nose cone (m).
        body_diameter: Rocket body diameter (m).
        body_length: Length of rocket body (m).
        num_fins: Number of fins (0 = no fins, typical: 3-4).
        fin_chord: Fin chord length (m).
        fin_span: Fin span (m).
        fin_thickness: Fin thickness (m).
        mach_drag_table: Optional table of (Mach, Cd) pairs.
        reference_area: Optional override for reference area (m²).
    """
    base_drag_coefficient: float = 0.45
    cross_sectional_area: float = 0.008
    nose_cone_type: NoseConeType = NoseConeType.OGIVE
    nose_cone_length: float = 0.15
    body_diameter: float = 0.10
    body_length: float = 0.50
    num_fins: int = 4
    fin_chord: float = 0.08
    fin_span: float = 0.06
    fin_thickness: float = 0.003
    mach_drag_table: list[tuple[float, float]] | None = None
    reference_area: float | None = None

    @property
    def effective_area(self) -> float:
        """Reference area for drag calculations."""
        if self.reference_area is not None:
            return self.reference_area
        return self.cross_sectional_area


@dataclass
class AerodynamicState:
    """Computed aerodynamic forces and coefficients."""
    drag_coefficient: float      # Effective Cd at current conditions
    drag_force: float            # Drag force (N)
    mach_number: float           # Mach number
    reynolds_number: float       # Reynolds number
    dynamic_pressure: float      # q = 0.5 * rho * v² (Pa)
    nose_cone_cd: float          # Contribution from nose cone
    body_cd: float               # Contribution from body
    fin_cd: float                # Contribution from fins
    wave_drag_cd: float          # Wave drag (transonic/supersonic)


def _mach_drag_multiplier(mach: float, table: list[tuple[float, float]] | None) -> float:
    """Look up Mach-dependent drag multiplier from a table.

    Uses linear interpolation between table entries.
    Returns 1.0 if no table is provided.
    """
    if not table or len(table) < 2:
        # Default transonic drag rise approximation
        if mach < 0.8:
            return 1.0
        elif mach < 1.2:
            # Transonic drag rise
            return 1.0 + 0.5 * ((mach - 0.8) / 0.4) ** 2
        else:
            # Supersonic drag (simplified)
            return 1.2 + 0.1 * (mach - 1.2)

    # Sort table by Mach
    sorted_table = sorted(table, key=lambda x: x[0])

    if mach <= sorted_table[0][0]:
        return sorted_table[0][1]
    if mach >= sorted_table[-1][0]:
        return sorted_table[-1][1]

    # Linear interpolation
    for i in range(len(sorted_table) - 1):
        m0, c0 = sorted_table[i]
        m1, c1 = sorted_table[i + 1]
        if m0 <= mach <= m1:
            if m1 == m0:
                return c0
            frac = (mach - m0) / (m1 - m0)
            return c0 + frac * (c1 - c0)

    return 1.0


def compute_nose_cone_drag(
    nose_cone_type: NoseConeType,
    fineness_ratio: float,
) -> float:
    """Compute nose cone drag contribution.

    Args:
        nose_cone_type: Type of nose cone.
        fineness_ratio: Nose cone length / diameter ratio.

    Returns:
        Nose cone drag coefficient contribution.
    """
    base_cd = NOSE_CONE_CD[nose_cone_type]

    # Fineness ratio correction
    # Higher fineness ratio = lower drag (up to a point)
    if fineness_ratio < 2.0:
        correction = 2.0 / max(fineness_ratio, 0.5)
    elif fineness_ratio > 8.0:
        correction = 0.8  # Diminishing returns
    else:
        correction = 1.0

    return base_cd * correction


def compute_fin_drag(
    num_fins: int,
    fin_chord: float,
    fin_span: float,
    fin_thickness: float,
    body_diameter: float,
    reynolds_number: float,
) -> float:
    """Compute fin drag contribution.

    Uses simplified fin drag model based on exposed fin area
    and skin friction.

    Args:
        num_fins: Number of fins.
        fin_chord: Mean chord length (m).
        fin_span: Span length (m).
        fin_thickness: Fin thickness (m).
        body_diameter: Rocket body diameter (m).
        reynolds_number: Reynolds number based on body diameter.

    Returns:
        Fin drag coefficient contribution.
    """
    if num_fins == 0 or fin_chord <= 0 or fin_span <= 0:
        return 0.0

    # Exposed fin area per fin (assuming center-clamped)
    body_radius = body_diameter / 2.0
    exposed_span = max(fin_span - body_radius, 0.01)
    exposed_area_per_fin = fin_chord * exposed_span
    total_fin_area = num_fins * exposed_area_per_fin

    # Wetted area for skin friction
    wetted_area = num_fins * 2.0 * fin_chord * exposed_span  # Both sides

    # Skin friction coefficient (turbulent flat plate)
    if reynolds_number > 0:
        cf = 0.074 / (reynolds_number ** 0.2)
    else:
        cf = 0.005

    # Form drag from fin thickness
    form_drag = 2.0 * (fin_thickness / fin_chord) ** 2

    # Total fin drag coefficient
    reference_area = math.pi * (body_diameter / 2.0) ** 2
    cd_fin = (cf * wetted_area / reference_area) + form_drag * (total_fin_area / reference_area)

    return cd_fin


def compute_body_drag(
    body_length: float,
    body_diameter: float,
    reynolds_number: float,
) -> float:
    """Compute rocket body drag contribution.

    Based on skin friction drag for a cylindrical body.

    Args:
        body_length: Rocket body length (m).
        body_diameter: Rocket body diameter (m).
        reynolds_number: Reynolds number.

    Returns:
        Body drag coefficient contribution.
    """
    if body_length <= 0 or body_diameter <= 0:
        return 0.0

    # Fineness ratio
    fineness = body_length / body_diameter

    # Skin friction coefficient (turbulent)
    if reynolds_number > 0:
        cf = 0.074 / (reynolds_number ** 0.2)
    else:
        cf = 0.005

    # Wetted area / reference area
    wetted_area = math.pi * body_diameter * body_length
    ref_area = math.pi * (body_diameter / 2.0) ** 2
    area_ratio = wetted_area / ref_area

    # Pressure drag (base drag)
    base_drag = 0.12 + 0.13 / max(fineness, 1.0)

    return cf * area_ratio + base_drag


def compute_reynolds_number(
    speed: float,
    altitude: float,
    viscosity: float = 1.81e-5,
    characteristic_length: float = 0.1,
) -> float:
    """Compute Reynolds number.

    Args:
        speed: Airspeed (m/s).
        altitude: Altitude (m) for density lookup.
        viscosity: Dynamic viscosity (Pa·s). Default: sea-level value.
        characteristic_length: Reference length (m). Default: body diameter.

    Returns:
        Reynolds number (dimensionless).
    """
    from app.physics.atmosphere import standard_atmosphere

    atm = standard_atmosphere(altitude)
    if atm.viscosity > 0:
        viscosity = atm.viscosity

    if viscosity <= 0:
        return 0.0

    return atm.density * speed * characteristic_length / viscosity


def compute_aerodynamic_forces(
    speed: float,
    altitude: float,
    config: AerodynamicConfig,
) -> AerodynamicState:
    """Compute all aerodynamic forces and coefficients.

    Args:
        speed: True airspeed (m/s).
        altitude: Altitude above sea level (m).
        config: Aerodynamic configuration.

    Returns:
        AerodynamicState with all computed values.
    """
    from app.physics.atmosphere import standard_atmosphere

    atm = standard_atmosphere(altitude)
    mach = speed / atm.speed_of_sound if atm.speed_of_sound > 0 else 0.0

    # Reynolds number
    re = compute_reynolds_number(speed, altitude, atm.viscosity, config.body_diameter)

    # Dynamic pressure
    q = 0.5 * atm.density * speed ** 2

    # Component drag contributions
    fineness_ratio = config.nose_cone_length / max(config.body_diameter, 0.01)
    nose_cd = compute_nose_cone_drag(config.nose_cone_type, fineness_ratio)
    body_cd = compute_body_drag(config.body_length, config.body_diameter, re)
    fin_cd = compute_fin_drag(
        config.num_fins, config.fin_chord, config.fin_span,
        config.fin_thickness, config.body_diameter, re,
    )

    # Wave drag (transonic/supersonic)
    wave_cd = 0.0
    if mach > 0.8:
        wave_cd = config.base_drag_coefficient * 0.3 * max((mach - 0.8), 0.0)

    # Mach multiplier
    mach_mult = _mach_drag_multiplier(mach, config.mach_drag_table)

    # Total effective Cd
    base_cd = config.base_drag_coefficient
    effective_cd = (base_cd + nose_cd + body_cd + fin_cd + wave_cd) * mach_mult

    # Drag force
    drag_force = q * effective_cd * config.effective_area

    return AerodynamicState(
        drag_coefficient=effective_cd,
        drag_force=drag_force,
        mach_number=mach,
        reynolds_number=re,
        dynamic_pressure=q,
        nose_cone_cd=nose_cd,
        body_cd=body_cd,
        fin_cd=fin_cd,
        wave_drag_cd=wave_cd,
    )
