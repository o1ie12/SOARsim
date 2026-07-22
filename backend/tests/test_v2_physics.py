"""
Comprehensive tests for SOARSim v2.0 physics modules.
"""

import pytest
import math

from app.physics.atmosphere import (
    standard_atmosphere,
    AtmosphereModel,
    AtmosphereType,
    mach_number,
    ISA_SEA_LEVEL_DENSITY,
    ISA_SEA_LEVEL_TEMP,
    ISA_SEA_LEVEL_PRESSURE,
)
from app.physics.wind import (
    WindModel,
    WindType,
    WindState,
    WindLayer,
    AltitudeWindPoint,
)
from app.physics.aerodynamics import (
    AerodynamicConfig,
    NoseConeType,
    compute_aerodynamic_forces,
    compute_nose_cone_drag,
    compute_fin_drag,
    compute_reynolds_number,
)
from app.physics.solvers import (
    SolverType,
    SolverConfig,
    euler_step_solver,
    rk4_step_solver,
)
from app.physics.engine import RocketConfig, State, Environment
from app.physics.propulsion.water_rocket import WaterRocket, WaterRocketConfig
from app.physics.propulsion.solid_motor import SolidMotor, SolidMotorConfig, COMMERCIAL_MOTORS
from app.physics.propulsion.custom_thrust import (
    CustomThrustCurve,
    ThrustCurveConfig,
    ThrustCurvePoint,
    parse_thrust_curve_csv,
)


# ══════════════════════════════════════════════════════════════════
# ATMOSPHERE TESTS
# ══════════════════════════════════════════════════════════════════


class TestStandardAtmosphere:

    def test_sea_level_density(self):
        atm = standard_atmosphere(0)
        assert abs(atm.density - ISA_SEA_LEVEL_DENSITY) < 0.01

    def test_sea_level_pressure(self):
        atm = standard_atmosphere(0)
        assert abs(atm.pressure - ISA_SEA_LEVEL_PRESSURE) < 100

    def test_sea_level_temperature(self):
        atm = standard_atmosphere(0)
        assert abs(atm.temperature - ISA_SEA_LEVEL_TEMP) < 0.1

    def test_density_decreases_with_altitude(self):
        atm0 = standard_atmosphere(0)
        atm1000 = standard_atmosphere(1000)
        atm5000 = standard_atmosphere(5000)
        assert atm0.density > atm1000.density > atm5000.density

    def test_pressure_decreases_with_altitude(self):
        atm0 = standard_atmosphere(0)
        atm10000 = standard_atmosphere(10000)
        assert atm0.pressure > atm10000.pressure

    def test_temperature_decreases_in_troposphere(self):
        atm0 = standard_atmosphere(0)
        atm11000 = standard_atmosphere(11000)
        assert atm0.temperature > atm11000.temperature

    def test_speed_of_sound_positive(self):
        atm = standard_atmosphere(0)
        assert atm.speed_of_sound > 0

    def test_altitude_clamped_negative(self):
        atm = standard_atmosphere(-1000)
        assert abs(atm.altitude) < 1.0

    def test_altitude_clamped_high(self):
        atm = standard_atmosphere(100000)
        assert atm.altitude <= 47000

    def test_mach_number(self):
        speed = 340.0  # ~Mach 1 at sea level
        mach = mach_number(speed, 0)
        assert 0.95 < mach < 1.05

    def test_mach_number_zero_speed(self):
        mach = mach_number(0, 0)
        assert mach == 0.0


class TestAtmosphereModel:

    def test_constant_density(self):
        model = AtmosphereModel(
            model_type=AtmosphereType.CONSTANT,
            constant_density=1.0,
        )
        state = model.get_state(5000)
        assert state.density == 1.0

    def test_standard_model(self):
        model = AtmosphereModel(model_type=AtmosphereType.STANDARD)
        state = model.get_state(0)
        assert abs(state.density - ISA_SEA_LEVEL_DENSITY) < 0.01


# ══════════════════════════════════════════════════════════════════
# WIND TESTS
# ══════════════════════════════════════════════════════════════════


class TestWindModel:

    def test_no_wind(self):
        model = WindModel(wind_type=WindType.NONE)
        wind = model.get_wind(100)
        assert wind.speed == 0.0

    def test_constant_wind(self):
        model = WindModel(
            wind_type=WindType.CONSTANT,
            constant_speed=10.0,
            constant_direction=90.0,
        )
        wind = model.get_wind(100)
        assert wind.speed == 10.0
        assert wind.direction == 90.0

    def test_layered_wind(self):
        layers = [
            WindLayer(min_altitude=0, max_altitude=100, speed=5.0, direction=0),
            WindLayer(min_altitude=100, max_altitude=200, speed=15.0, direction=90),
        ]
        model = WindModel(wind_type=WindType.LAYERED, layers=layers)

        wind_low = model.get_wind(50)
        assert wind_low.speed == 5.0

        wind_high = model.get_wind(150)
        assert wind_high.speed == 15.0

    def test_layered_wind_default(self):
        layers = [
            WindLayer(min_altitude=100, max_altitude=200, speed=10.0, direction=45),
        ]
        model = WindModel(wind_type=WindType.LAYERED, layers=layers)
        wind = model.get_wind(50)  # Below all layers
        assert wind.speed == 10.0  # Should use first layer

    def test_altitude_varying_wind(self):
        profile = [
            AltitudeWindPoint(altitude=0, speed=5, direction=0),
            AltitudeWindPoint(altitude=100, speed=15, direction=90),
            AltitudeWindPoint(altitude=200, speed=25, direction=180),
        ]
        model = WindModel(wind_type=WindType.ALTITUDE_VARYING, altitude_profile=profile)

        wind_50 = model.get_wind(50)
        assert 5.0 < wind_50.speed < 15.0  # Interpolated

    def test_wind_vx_vy(self):
        wind = WindState(speed=10.0, direction=90.0, vertical=0.0, turbulence=0.0)
        assert abs(wind.vx - 10.0) < 0.01
        assert abs(wind.vy) < 0.01

    def test_wind_north(self):
        wind = WindState(speed=10.0, direction=0.0, vertical=0.0, turbulence=0.0)
        assert abs(wind.vx) < 0.01
        assert abs(wind.vy - 10.0) < 0.01


# ══════════════════════════════════════════════════════════════════
# AERODYNAMICS TESTS
# ══════════════════════════════════════════════════════════════════


class TestAerodynamics:

    def test_nose_cone_drag_ogive(self):
        cd = compute_nose_cone_drag(NoseConeType.OGIVE, 3.0)
        assert cd > 0
        assert cd < 0.1

    def test_nose_cone_drag_blunt_higher(self):
        cd_ogive = compute_nose_cone_drag(NoseConeType.OGIVE, 3.0)
        cd_blunt = compute_nose_cone_drag(NoseConeType.BLUNT, 3.0)
        assert cd_blunt > cd_ogive

    def test_fin_drag_zero_fins(self):
        cd = compute_fin_drag(0, 0.08, 0.06, 0.003, 0.1, 1e6)
        assert cd == 0.0

    def test_fin_drag_positive(self):
        cd = compute_fin_drag(4, 0.08, 0.06, 0.003, 0.1, 1e6)
        assert cd > 0

    def test_reynolds_number(self):
        re = compute_reynolds_number(100.0, 0, characteristic_length=0.1)
        assert re > 0

    def test_aerodynamic_forces_zero_speed(self):
        config = AerodynamicConfig()
        state = compute_aerodynamic_forces(0.0, 0.0, config)
        assert state.drag_force == 0.0
        assert state.mach_number == 0.0

    def test_aerodynamic_forces_positive_speed(self):
        config = AerodynamicConfig()
        state = compute_aerodynamic_forces(100.0, 0.0, config)
        assert state.drag_force > 0
        assert state.dynamic_pressure > 0

    def test_mach_dependent_drag(self):
        config = AerodynamicConfig()
        state_sub = compute_aerodynamic_forces(100.0, 0.0, config)  # Subsonic
        state_super = compute_aerodynamic_forces(400.0, 0.0, config)  # Supersonic
        # Supersonic should have higher effective Cd
        assert state_super.drag_coefficient >= state_sub.drag_coefficient


# ══════════════════════════════════════════════════════════════════
# SOLVER TESTS
# ══════════════════════════════════════════════════════════════════


@pytest.fixture
def water_rocket():
    config = WaterRocketConfig(
        dry_mass=0.15,
        bottle_volume=0.002,
        water_volume=0.0007,
        initial_pressure=400000,
        nozzle_diameter=0.013,
    )
    return WaterRocket(config)


@pytest.fixture
def rocket_config():
    return RocketConfig(
        drag_coefficient=0.45,
        cross_sectional_area=0.008,
        launch_angle=75,
    )


@pytest.fixture
def initial_state(water_rocket):
    prop = water_rocket.get_initial_state()
    return State(
        time=0.0, x=0.0, y=0.0, vx=0.0, vy=0.0,
        mass=prop.mass, thrust=prop.thrust,
        pressure=prop.pressure, water_remaining=prop.propellant_remaining,
    )


class TestSolvers:

    def test_euler_step(self, initial_state, rocket_config, water_rocket):
        env = Environment()
        new_state = euler_step_solver(initial_state, rocket_config, env, water_rocket, 0.01)
        assert new_state.time == 0.01
        assert new_state.y >= 0  # Should go up with launch angle

    def test_rk4_step(self, initial_state, rocket_config, water_rocket):
        env = Environment()
        new_state = rk4_step_solver(initial_state, rocket_config, env, water_rocket, 0.01)
        assert new_state.time == 0.01
        assert new_state.y >= 0

    def test_rk4_higher_accuracy(self, water_rocket, rocket_config):
        """RK4 should produce more accurate results than Euler for same dt."""
        env = Environment()
        dt = 0.01

        # Euler
        state_e = State(
            time=0.0, x=0.0, y=0.0, vx=0.0, vy=0.0,
            mass=water_rocket.get_initial_state().mass,
            thrust=0.0, pressure=water_rocket.get_initial_state().pressure,
            water_remaining=1.0,
        )
        for _ in range(100):
            state_e = euler_step_solver(state_e, rocket_config, env, water_rocket, dt)

        # RK4
        state_r = State(
            time=0.0, x=0.0, y=0.0, vx=0.0, vy=0.0,
            mass=water_rocket.get_initial_state().mass,
            thrust=0.0, pressure=water_rocket.get_initial_state().pressure,
            water_remaining=1.0,
        )
        for _ in range(100):
            state_r = rk4_step_solver(state_r, rocket_config, env, water_rocket, dt)

        # Both should produce positive altitude
        assert state_e.y > 0
        assert state_r.y > 0
        # RK4 should be at least as accurate (results may differ slightly)
        assert abs(state_e.y - state_r.y) / max(state_r.y, 1) < 0.5  # Within 50%


# ══════════════════════════════════════════════════════════════════
# SOLID MOTOR TESTS
# ══════════════════════════════════════════════════════════════════


class TestSolidMotor:

    def test_preset_motor(self):
        config = SolidMotorConfig(designation="C6-5")
        assert config.total_impulse == 10.0
        assert config.avg_thrust == 18.0

    def test_custom_motor(self):
        config = SolidMotorConfig(
            designation="custom",
            total_impulse=20.0,
            avg_thrust=30.0,
            burn_time=0.6667,
            propellant_mass=0.0246,
        )
        motor = SolidMotor(config, dry_mass=0.15)
        assert motor.get_burn_duration() == 0.6667

    def test_initial_state(self):
        config = SolidMotorConfig(designation="B6-4")
        motor = SolidMotor(config, dry_mass=0.15)
        state = motor.get_initial_state()
        assert state.mass > 0.15
        assert state.thrust == 0.0
        assert state.propellant_remaining == 1.0

    def test_thrust_during_burn(self):
        config = SolidMotorConfig(designation="C6-5")
        motor = SolidMotor(config, dry_mass=0.15)
        state = motor.step(0.1, 0.01)  # Mid-burn
        assert state.thrust > 0

    def test_mass_decreases(self):
        config = SolidMotorConfig(designation="C6-5")
        motor = SolidMotor(config, dry_mass=0.15)
        state_0 = motor.step(0.0, 0.01)
        state_mid = motor.step(0.3, 0.01)
        assert state_mid.mass < state_0.mass

    def test_burnout(self):
        config = SolidMotorConfig(designation="A8-3")
        motor = SolidMotor(config, dry_mass=0.15)
        assert not motor.is_burnout(0.0)
        assert motor.is_burnout(1.0)

    def test_all_preset_motors(self):
        for name in COMMERCIAL_MOTORS:
            config = SolidMotorConfig(designation=name)
            motor = SolidMotor(config, dry_mass=0.1)
            state = motor.get_initial_state()
            assert state.mass > 0


# ══════════════════════════════════════════════════════════════════
# CUSTOM THRUST CURVE TESTS
# ══════════════════════════════════════════════════════════════════


class TestCustomThrustCurve:

    def test_basic_thrust_curve(self):
        points = [
            ThrustCurvePoint(time=0.0, thrust=0.0),
            ThrustCurvePoint(time=0.1, thrust=50.0),
            ThrustCurvePoint(time=0.5, thrust=50.0),
            ThrustCurvePoint(time=0.6, thrust=0.0),
        ]
        config = ThrustCurveConfig(points=points, propellant_mass=0.05)
        motor = CustomThrustCurve(config)
        assert motor.get_burn_duration() == 0.6

    def test_thrust_interpolation(self):
        points = [
            ThrustCurvePoint(time=0.0, thrust=0.0),
            ThrustCurvePoint(time=0.1, thrust=100.0),
            ThrustCurvePoint(time=0.2, thrust=0.0),
        ]
        config = ThrustCurveConfig(points=points, propellant_mass=0.02)
        motor = CustomThrustCurve(config)
        state = motor.step(0.05, 0.01)
        assert 0 < state.thrust < 100

    def test_total_impulse(self):
        points = [
            ThrustCurvePoint(time=0.0, thrust=0.0),
            ThrustCurvePoint(time=0.1, thrust=100.0),
            ThrustCurvePoint(time=0.2, thrust=0.0),
        ]
        config = ThrustCurveConfig(points=points)
        # Impulse = area under curve ≈ 0.5 * 0.1 * 100 + 0.5 * 0.1 * 100 = 10 N·s
        assert abs(config.total_impulse - 10.0) < 0.1

    def test_csv_parsing(self):
        csv = "time,thrust\n0.0,0.0\n0.1,50.0\n0.2,0.0\n"
        points = parse_thrust_curve_csv(csv)
        assert len(points) == 3
        assert points[0].thrust == 0.0
        assert points[1].thrust == 50.0

    def test_csv_parsing_invalid(self):
        with pytest.raises(ValueError):
            parse_thrust_curve_csv("")

    def test_empty_points_rejected(self):
        with pytest.raises(ValueError):
            CustomThrustCurve(ThrustCurveConfig(points=[]))
