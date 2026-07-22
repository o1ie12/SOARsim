"""
Water rocket propulsion model for SOARSim v0.2.

Implements a physically meaningful water rocket simulation using:

Physics:
    - Compressed air expands isothermally to expel water
    - Thrust is produced by the water jet exiting the nozzle
    - Mass decreases as water is expelled
    - Internal pressure drops as air volume expands

Assumptions (educational simplifications):
    - Isothermal expansion (no temperature drop during expansion)
    - Incompressible water (valid at typical rocket pressures)
    - Quasi-steady flow (instantaneous equilibrium)
    - No cavitation or two-phase flow effects
    - Perfect nozzle efficiency (no friction losses in nozzle)
    - Nozzle exit pressure equals atmospheric pressure (optimal expansion)

Version: 0.2.0
"""

import math
from dataclasses import dataclass

from app.physics.propulsion.base import PropulsionSystem, PropulsionState

# Physical constants
ATMOSPHERIC_PRESSURE: float = 101325.0  # Pa (sea level standard)
WATER_DENSITY: float = 998.0  # kg/m^3 at 20°C


@dataclass(frozen=True)
class WaterRocketConfig:
    """Configuration for a water rocket propulsion system.

    Contains ONLY propulsion-relevant parameters.
    Aerodynamic parameters live in RocketConfig in the physics engine.

    Attributes:
        dry_mass: Mass of the rocket without propellant (kg).
        bottle_volume: Total internal volume of the pressure vessel (m^3).
        water_volume: Volume of water propellant (m^3).
        initial_pressure: Initial gauge pressure of compressed air (Pa).
        nozzle_diameter: Internal diameter of the nozzle throat (m).
    """

    dry_mass: float
    bottle_volume: float
    water_volume: float
    initial_pressure: float
    nozzle_diameter: float

    def __post_init__(self) -> None:
        if self.dry_mass <= 0:
            raise ValueError(f"Dry mass must be positive, got {self.dry_mass} kg")
        if self.bottle_volume <= 0:
            raise ValueError(f"Bottle volume must be positive, got {self.bottle_volume} m³")
        if self.water_volume < 0:
            raise ValueError(f"Water volume must be non-negative, got {self.water_volume} m³")
        if self.water_volume >= self.bottle_volume:
            raise ValueError(
                f"Water volume ({self.water_volume} m³) must be less than "
                f"bottle volume ({self.bottle_volume} m³)"
            )
        if self.initial_pressure < 0:
            raise ValueError(f"Initial pressure must be non-negative, got {self.initial_pressure} Pa")
        if self.nozzle_diameter <= 0:
            raise ValueError(f"Nozzle diameter must be positive, got {self.nozzle_diameter} m")


class WaterRocket(PropulsionSystem):
    """Water rocket propulsion system.

    Key equations:
        - Nozzle area: A_n = π * d² / 4
        - Air volume: V_air = V_bottle - V_water(t)
        - Pressure (isothermal): P = P0 * V_air_0 / V_air
        - Exit velocity: v_exit = sqrt(2 * (P - P_atm) / rho_water)
        - Mass flow rate: m_dot = rho_water * A_n * v_exit
        - Volume flow rate: V_dot = m_dot / rho_water = A_n * v_exit
        - Thrust: F = m_dot * v_exit = 2 * A_n * (P - P_atm)

    Performance: Pre-computes a lookup table of state vs time during
    init so that step() is O(1) via binary search.
    """

    def __init__(self, config: WaterRocketConfig) -> None:
        self.config = config
        self._nozzle_area = math.pi * (config.nozzle_diameter / 2) ** 2
        self._air_volume_initial = config.bottle_volume - config.water_volume
        self._total_mass_initial = config.dry_mass + WATER_DENSITY * config.water_volume

        # Pre-compute burn duration and state lookup table
        self._burn_duration: float = 0.0
        self._state_lookup: list[tuple[float, float, float]] = []  # (time, water_m3, pressure_Pa)
        self._build_lookup()

    def _build_lookup(self) -> None:
        """Pre-compute time → (water_remaining, pressure) lookup table.

        Uses volume flow rate (V_dot = m_dot / rho) to correctly
        convert mass flow to volume consumed.
        """
        dt = 0.0001  # 0.1 ms resolution for accuracy
        water = self.config.water_volume  # m³
        t = 0.0
        self._state_lookup = [(0.0, water, self._initial_pressure())]

        while water > 1e-9:
            pressure = self._pressure_from_water(water)
            if pressure <= ATMOSPHERIC_PRESSURE:
                break

            m_dot = self._mass_flow_rate(pressure)
            if m_dot <= 0:
                break

            # Convert mass flow to volume flow: V_dot = m_dot / rho
            volume_flow = m_dot / WATER_DENSITY  # m³/s
            water -= volume_flow * dt
            t += dt
            water = max(water, 0.0)

            self._state_lookup.append((t, water, self._pressure_from_water(water)))

            if t > 30.0:
                break

        self._burn_duration = t

    def _initial_pressure(self) -> float:
        return self.config.initial_pressure + ATMOSPHERIC_PRESSURE

    def _pressure_from_water(self, water_remaining: float) -> float:
        """Compute pressure from remaining water using isothermal expansion."""
        air_volume = self.config.bottle_volume - water_remaining
        if air_volume <= 0:
            return ATMOSPHERIC_PRESSURE
        pressure = self._initial_pressure() * self._air_volume_initial / air_volume
        return max(pressure, ATMOSPHERIC_PRESSURE)

    def _mass_flow_rate(self, pressure: float) -> float:
        """Compute mass flow rate: m_dot = rho * A_n * sqrt(2 * dP / rho)."""
        gauge = pressure - ATMOSPHERIC_PRESSURE
        if gauge <= 0:
            return 0.0
        v_exit = math.sqrt(2.0 * gauge / WATER_DENSITY)
        return WATER_DENSITY * self._nozzle_area * v_exit

    def _thrust_from_pressure(self, pressure: float) -> float:
        """Compute thrust: F = 2 * A_n * (P - P_atm)."""
        gauge = pressure - ATMOSPHERIC_PRESSURE
        if gauge <= 0:
            return 0.0
        return 2.0 * self._nozzle_area * gauge

    def _lookup_state(self, time: float) -> tuple[float, float]:
        """Binary search the lookup table for water and pressure at time t."""
        if time <= 0:
            return self.config.water_volume, self._initial_pressure()
        if time >= self._burn_duration:
            return 0.0, ATMOSPHERIC_PRESSURE

        lo, hi = 0, len(self._state_lookup) - 1
        while lo < hi - 1:
            mid = (lo + hi) // 2
            if self._state_lookup[mid][0] <= time:
                lo = mid
            else:
                hi = mid

        t0, w0, p0 = self._state_lookup[lo]
        t1, w1, p1 = self._state_lookup[hi]
        if t1 == t0:
            return w0, p0
        frac = (time - t0) / (t1 - t0)
        water = w0 + frac * (w1 - w0)
        pressure = p0 + frac * (p1 - p0)
        return max(water, 0.0), max(pressure, ATMOSPHERIC_PRESSURE)

    def get_initial_state(self) -> PropulsionState:
        return PropulsionState(
            time=0.0,
            thrust=0.0,
            mass=self._total_mass_initial,
            pressure=self._initial_pressure(),
            propellant_remaining=1.0,
        )

    def step(self, time: float, dt: float) -> PropulsionState:
        if time >= self._burn_duration or self._burn_duration <= 0:
            return PropulsionState(
                time=time,
                thrust=0.0,
                mass=self.config.dry_mass,
                pressure=ATMOSPHERIC_PRESSURE,
                propellant_remaining=0.0,
            )

        water, pressure = self._lookup_state(time)
        thrust = self._thrust_from_pressure(pressure)
        mass = self.config.dry_mass + WATER_DENSITY * water
        frac = water / self.config.water_volume if self.config.water_volume > 0 else 0.0

        return PropulsionState(
            time=time,
            thrust=thrust,
            mass=mass,
            pressure=pressure,
            propellant_remaining=frac,
        )

    def is_burnout(self, time: float) -> bool:
        return time >= self._burn_duration

    def get_burn_duration(self) -> float:
        return self._burn_duration
