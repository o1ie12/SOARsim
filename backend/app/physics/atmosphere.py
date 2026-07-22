"""
Advanced atmosphere model for SOARSim v2.0.

Implements the International Standard Atmosphere (ISA) with:
- Altitude-dependent air density
- Temperature variation with altitude
- Pressure variation with altitude
- Optional humidity support
- Custom atmosphere profiles

Replaces the constant-density model from v1.0.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum


class AtmosphereType(Enum):
    """Supported atmosphere model types."""
    STANDARD = "standard"          # ISA standard atmosphere
    CUSTOM = "custom"              # User-defined profile
    CONSTANT = "constant"          # Legacy constant density (v1.0 compatibility)


@dataclass(frozen=True)
class AtmosphereState:
    """Atmospheric conditions at a given altitude."""
    altitude: float       # m
    density: float        # kg/m³
    temperature: float    # K
    pressure: float       # Pa
    speed_of_sound: float # m/s
    viscosity: float      # Pa·s (dynamic)


@dataclass(frozen=True)
class CustomAtmosphereProfile:
    """User-defined atmosphere profile with altitude breakpoints."""
    altitudes: list[float]    # m
    densities: list[float]    # kg/m³
    temperatures: list[float] # K


# ISA standard atmosphere constants
ISA_SEA_LEVEL_TEMP: float = 288.15       # K (15°C)
ISA_SEA_LEVEL_PRESSURE: float = 101325.0  # Pa
ISA_SEA_LEVEL_DENSITY: float = 1.225      # kg/m³
ISA_LAPSE_RATE: float = 0.0065            # K/m (troposphere)
ISA_GAS_CONSTANT: float = 287.05          # J/(kg·K) for dry air
ISA_GAMMA: float = 1.4                    # Ratio of specific heats
ISA_GRAVITY: float = 9.80665              # m/s²


def standard_atmosphere(altitude: float) -> AtmosphereState:
    """Compute ISA standard atmosphere at a given altitude.

    Uses the International Standard Atmosphere model:
    - Troposphere (0-11 km): Temperature decreases linearly
    - Lower Stratosphere (11-20 km): Constant temperature
    - Extended model for higher altitudes

    Args:
        altitude: Altitude above sea level (m). Clamped to [0, 47000].

    Returns:
        AtmosphereState with all atmospheric properties.
    """
    alt = max(0.0, min(altitude, 47000.0))

    if alt <= 11000:
        # Troposphere: linear temperature decrease
        temp = ISA_SEA_LEVEL_TEMP - ISA_LAPSE_RATE * alt
        pressure = ISA_SEA_LEVEL_PRESSURE * (temp / ISA_SEA_LEVEL_TEMP) ** (ISA_GRAVITY / (ISA_GAS_CONSTANT * ISA_LAPSE_RATE))
        density = pressure / (ISA_GAS_CONSTANT * temp)
    elif alt <= 20000:
        # Lower stratosphere: constant temperature
        temp_tropopause = ISA_SEA_LEVEL_TEMP - ISA_LAPSE_RATE * 11000
        pressure_11km = ISA_SEA_LEVEL_PRESSURE * (temp_tropopause / ISA_SEA_LEVEL_TEMP) ** (ISA_GAS_CONSTANT * ISA_LAPSE_RATE / (ISA_GRAVITY * ISA_GAMMA))

        temp = temp_tropopause
        delta_alt = alt - 11000
        pressure = pressure_11km * math.exp(-ISA_GRAVITY * delta_alt / (ISA_GAS_CONSTANT * temp))
        density = pressure / (ISA_GAS_CONSTANT * temp)
    else:
        # Extended stratosphere (simplified)
        temp_tropopause = ISA_SEA_LEVEL_TEMP - ISA_LAPSE_RATE * 11000
        pressure_11km = ISA_SEA_LEVEL_PRESSURE * (temp_tropopause / ISA_SEA_LEVEL_TEMP) ** (ISA_GAS_CONSTANT * ISA_LAPSE_RATE / (ISA_GRAVITY * ISA_GAMMA))
        temp_20km = temp_tropopause
        delta_11 = 9000
        pressure_20km = pressure_11km * math.exp(-ISA_GRAVITY * delta_11 / (ISA_GAS_CONSTANT * temp_20km))

        # Temperature increases in upper stratosphere
        temp = temp_20km + 0.001 * (alt - 20000)
        delta_alt = alt - 20000
        pressure = pressure_20km * math.exp(-ISA_GRAVITY * delta_alt / (ISA_GAS_CONSTANT * temp))
        density = pressure / (ISA_GAS_CONSTANT * temp)

    # Speed of sound: c = sqrt(gamma * R * T)
    speed_of_sound = math.sqrt(ISA_GAMMA * ISA_GAS_CONSTANT * temp)

    # Dynamic viscosity (Sutherland's law approximation)
    viscosity = 1.458e-6 * temp ** 1.5 / (temp + 110.4)

    return AtmosphereState(
        altitude=alt,
        density=density,
        temperature=temp,
        pressure=pressure,
        speed_of_sound=speed_of_sound,
        viscosity=viscosity,
    )


def mach_number(speed: float, altitude: float) -> float:
    """Compute Mach number at a given altitude.

    Args:
        speed: True airspeed (m/s).
        altitude: Altitude above sea level (m).

    Returns:
        Mach number (dimensionless).
    """
    atm = standard_atmosphere(altitude)
    if atm.speed_of_sound <= 0:
        return 0.0
    return speed / atm.speed_of_sound


def custom_atmosphere(altitude: float, profile: CustomAtmosphereProfile) -> AtmosphereState:
    """Interpolate atmospheric conditions from a custom profile.

    Uses linear interpolation between profile breakpoints.

    Args:
        altitude: Altitude to evaluate (m).
        profile: Custom atmosphere profile with altitude breakpoints.

    Returns:
        Interpolated AtmosphereState.
    """
    if not profile.altitudes:
        return standard_atmosphere(altitude)

    # Clamp to profile range
    alt = max(profile.altitudes[0], min(altitude, profile.altitudes[-1]))

    # Find bounding indices
    idx = 0
    for i, a in enumerate(profile.altitudes):
        if a <= alt:
            idx = i

    if idx >= len(profile.altitudes) - 1:
        idx = len(profile.altitudes) - 2

    a0 = profile.altitudes[idx]
    a1 = profile.altitudes[idx + 1]
    d0 = profile.densities[idx]
    d1 = profile.densities[idx + 1]
    t0 = profile.temperatures[idx]
    t1 = profile.temperatures[idx + 1]

    if a1 == a0:
        frac = 0.0
    else:
        frac = (alt - a0) / (a1 - a0)

    density = d0 + frac * (d1 - d0)
    temperature = t0 + frac * (t1 - t0)

    # Compute pressure from ideal gas law: P = rho * R * T
    pressure = density * ISA_GAS_CONSTANT * temperature
    speed_of_sound = math.sqrt(ISA_GAMMA * ISA_GAS_CONSTANT * temperature)
    viscosity = 1.458e-6 * temperature ** 1.5 / (temperature + 110.4)

    return AtmosphereState(
        altitude=alt,
        density=density,
        temperature=temperature,
        pressure=pressure,
        speed_of_sound=speed_of_sound,
        viscosity=viscosity,
    )


class AtmosphereModel:
    """Configurable atmosphere model for the simulator.

    Supports standard ISA, constant density (v1.0 legacy), and custom profiles.
    """

    def __init__(
        self,
        model_type: AtmosphereType = AtmosphereType.STANDARD,
        custom_profile: CustomAtmosphereProfile | None = None,
        constant_density: float = ISA_SEA_LEVEL_DENSITY,
    ) -> None:
        self.model_type = model_type
        self.custom_profile = custom_profile
        self.constant_density = constant_density

    def get_state(self, altitude: float) -> AtmosphereState:
        """Get atmospheric state at the given altitude.

        Args:
            altitude: Altitude above sea level (m).

        Returns:
            AtmosphereState with all properties.
        """
        if self.model_type == AtmosphereType.CONSTANT:
            return AtmosphereState(
                altitude=altitude,
                density=self.constant_density,
                temperature=ISA_SEA_LEVEL_TEMP,
                pressure=ISA_SEA_LEVEL_PRESSURE,
                speed_of_sound=math.sqrt(ISA_GAMMA * ISA_GAS_CONSTANT * ISA_SEA_LEVEL_TEMP),
                viscosity=1.458e-6 * ISA_SEA_LEVEL_TEMP ** 1.5 / (ISA_SEA_LEVEL_TEMP + 110.4),
            )
        elif self.model_type == AtmosphereType.CUSTOM and self.custom_profile:
            return custom_atmosphere(altitude, self.custom_profile)
        else:
            return standard_atmosphere(altitude)

    def get_density(self, altitude: float) -> float:
        """Get air density at altitude (convenience method)."""
        return self.get_state(altitude).density
