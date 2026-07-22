"""
Tests for SOARSim v0.2 water rocket propulsion system.

Tests cover:
- Water rocket configuration validation
- Water rocket propulsion physics
- Physics engine with variable mass
- Edge cases and validation
"""

import pytest
from app.physics.engine import (
    Environment,
    RocketConfig,
    State,
    compute_acceleration,
    compute_drag_force,
    euler_step,
)
from app.physics.propulsion.water_rocket import (
    ATMOSPHERIC_PRESSURE,
    WATER_DENSITY,
    WaterRocket,
    WaterRocketConfig,
)


# ── Water Rocket Config Validation Tests ───────────────────────────


class TestWaterRocketConfigValidation:
    """Test that WaterRocketConfig rejects invalid inputs."""

    def _make_config(self, **overrides):
        defaults = dict(
            dry_mass=0.15,
            bottle_volume=0.002,
            water_volume=0.0007,
            initial_pressure=400000,
            nozzle_diameter=0.013,
        )
        defaults.update(overrides)
        return WaterRocketConfig(**defaults)

    def test_valid_config_accepted(self):
        config = self._make_config()
        assert config.dry_mass == 0.15

    def test_negative_dry_mass_rejected(self):
        with pytest.raises(ValueError, match="Dry mass must be positive"):
            self._make_config(dry_mass=-0.15)

    def test_zero_dry_mass_rejected(self):
        with pytest.raises(ValueError, match="Dry mass must be positive"):
            self._make_config(dry_mass=0)

    def test_negative_bottle_volume_rejected(self):
        with pytest.raises(ValueError, match="Bottle volume must be positive"):
            self._make_config(bottle_volume=-0.002)

    def test_negative_water_volume_rejected(self):
        with pytest.raises(ValueError, match="Water volume must be non-negative"):
            self._make_config(water_volume=-0.001)

    def test_water_exceeds_bottle_rejected(self):
        with pytest.raises(ValueError, match="must be less than"):
            self._make_config(water_volume=0.002)

    def test_negative_pressure_rejected(self):
        with pytest.raises(ValueError, match="Initial pressure must be non-negative"):
            self._make_config(initial_pressure=-100000)

    def test_zero_nozzle_rejected(self):
        with pytest.raises(ValueError, match="Nozzle diameter must be positive"):
            self._make_config(nozzle_diameter=0)

    def test_negative_nozzle_rejected(self):
        with pytest.raises(ValueError, match="Nozzle diameter must be positive"):
            self._make_config(nozzle_diameter=-0.01)


# ── Water Rocket Propulsion Tests ──────────────────────────────────


class TestWaterRocketPropulsion:
    """Test water rocket propulsion physics."""

    def _make_rocket(self, **overrides):
        defaults = dict(
            dry_mass=0.15,
            bottle_volume=0.002,
            water_volume=0.0007,
            initial_pressure=400000,
            nozzle_diameter=0.013,
        )
        defaults.update(overrides)
        return WaterRocket(WaterRocketConfig(**defaults))

    def test_initial_state(self):
        rocket = self._make_rocket()
        state = rocket.get_initial_state()
        expected_mass = 0.15 + WATER_DENSITY * 0.0007
        assert abs(state.mass - expected_mass) < 0.001
        assert state.thrust == 0.0
        assert state.propellant_remaining == 1.0

    def test_pressure_at_start(self):
        rocket = self._make_rocket()
        state = rocket.get_initial_state()
        expected = ATMOSPHERIC_PRESSURE + 400000
        assert abs(state.pressure - expected) < 1.0

    def test_thrust_increases_with_pressure(self):
        rocket_low = self._make_rocket(initial_pressure=200000)
        rocket_high = self._make_rocket(initial_pressure=600000)
        state_low = rocket_low.step(0.01, 0.001)
        state_high = rocket_high.step(0.01, 0.001)
        assert state_high.thrust > state_low.thrust

    def test_mass_decreases_over_time(self):
        rocket = self._make_rocket()
        state_t0 = rocket.step(0.0, 0.001)
        state_t1 = rocket.step(0.01, 0.001)
        state_t2 = rocket.step(0.02, 0.001)
        assert state_t0.mass > state_t1.mass > state_t2.mass

    def test_pressure_eventually_reaches_atmospheric(self):
        rocket = self._make_rocket()
        burn_duration = rocket.get_burn_duration()
        state_after = rocket.step(burn_duration + 0.1, 0.001)
        assert abs(state_after.pressure - ATMOSPHERIC_PRESSURE) < 1.0

    def test_burn_duration_positive(self):
        rocket = self._make_rocket()
        assert rocket.get_burn_duration() > 0

    def test_burn_duration_increases_with_water(self):
        rocket_less = self._make_rocket(water_volume=0.0004)
        rocket_more = self._make_rocket(water_volume=0.0010)
        assert rocket_more.get_burn_duration() > rocket_less.get_burn_duration()

    def test_no_water_no_thrust(self):
        rocket = self._make_rocket(water_volume=0.0)
        state = rocket.step(0.001, 0.001)
        assert state.thrust == 0.0

    def test_is_burnout(self):
        rocket = self._make_rocket()
        burn_time = rocket.get_burn_duration()
        assert not rocket.is_burnout(0.0)
        assert not rocket.is_burnout(burn_time / 2)
        assert rocket.is_burnout(burn_time + 0.1)

    def test_mass_at_burnout_equals_dry_mass(self):
        rocket = self._make_rocket()
        burn_time = rocket.get_burn_duration()
        state = rocket.step(burn_time + 0.1, 0.001)
        assert abs(state.mass - 0.15) < 0.001


# ── Physics Engine Tests with Variable Mass ────────────────────────


class TestPhysicsEngineVariableMass:
    """Test the physics engine with variable mass propulsion."""

    def _make_rocket(self, **overrides):
        defaults = dict(
            dry_mass=0.15,
            bottle_volume=0.002,
            water_volume=0.0007,
            initial_pressure=400000,
            nozzle_diameter=0.013,
        )
        defaults.update(overrides)
        return WaterRocket(WaterRocketConfig(**defaults))

    def test_drag_force_positive(self):
        force = compute_drag_force(10.0, 0.45, 0.008, 1.225)
        assert force > 0

    def test_drag_force_zero_speed(self):
        force = compute_drag_force(0.0, 0.45, 0.008, 1.225)
        assert force == 0.0

    def test_drag_force_increases_with_speed(self):
        f1 = compute_drag_force(5.0, 0.45, 0.008, 1.225)
        f2 = compute_drag_force(10.0, 0.45, 0.008, 1.225)
        assert abs(f2 / f1 - 4.0) < 0.01

    def test_acceleration_uses_variable_mass(self):
        rocket = self._make_rocket()
        prop_state = rocket.step(0.01, 0.001)
        config = RocketConfig(
            drag_coefficient=0.45,
            cross_sectional_area=0.008,
            launch_angle=75,
        )
        env = Environment()
        state = State(
            time=0.01, x=0.0, y=0.0, vx=0.0, vy=0.0,
            mass=prop_state.mass, thrust=prop_state.thrust,
            pressure=prop_state.pressure,
            water_remaining=prop_state.propellant_remaining,
        )
        ax, ay = compute_acceleration(state, config, env, prop_state)
        assert ay > 0

    def test_euler_step_updates_mass(self):
        rocket = self._make_rocket()
        config = RocketConfig(
            drag_coefficient=0.45,
            cross_sectional_area=0.008,
            launch_angle=75,
        )
        env = Environment()
        initial = State(
            time=0.0, x=0.0, y=0.0, vx=0.0, vy=0.0,
            mass=0.22, thrust=0.0, pressure=ATMOSPHERIC_PRESSURE,
            water_remaining=1.0,
        )
        new_state = euler_step(initial, config, env, rocket, 0.01)
        assert new_state.thrust > 0
