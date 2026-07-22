"""
Base propulsion system interface for SOARSim.

Defines the abstract contract that all propulsion models must implement.
This enables modular, interchangeable propulsion systems (water rocket,
solid motors, hybrid, custom thrust curves, etc.).

Design decisions:
    - PropulsionState is a frozen dataclass for immutability and clarity.
    - PropulsionSystem is an ABC so future implementations are enforced.
    - step() returns both thrust and updated mass, since variable-mass
      propulsion is physically realistic and common.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class PropulsionState:
    """Snapshot of the propulsion system at a given simulation time.

    Attributes:
        time: Current simulation time (s).
        thrust: Current thrust force (N). Zero after burnout.
        mass: Current total rocket mass (kg). Decreases as propellant is consumed.
        pressure: Internal pressure (Pa). Useful for water rockets; zero for solid motors.
        propellant_remaining: Fraction of propellant remaining (0.0 = empty, 1.0 = full).
    """

    time: float
    thrust: float
    mass: float
    pressure: float
    propellant_remaining: float


class PropulsionSystem(ABC):
    """Abstract base class for all propulsion systems.

    Any propulsion model (water rocket, solid motor, hybrid, etc.)
    must implement these methods. The simulator depends only on this
    interface — it never knows the specific propulsion type.

    Subclasses must store their own configuration at init time.
    """

    @abstractmethod
    def get_initial_state(self) -> PropulsionState:
        """Return the initial propulsion state at t=0.

        Returns:
            PropulsionState with initial thrust=0, full propellant, etc.
        """

    @abstractmethod
    def step(self, time: float, dt: float) -> PropulsionState:
        """Compute the propulsion state at a given time.

        This method is called every simulation timestep. It should:
        - Compute current thrust based on internal physics
        - Compute current mass based on propellant consumed
        - Compute current pressure (if applicable)
        - Return a complete PropulsionState snapshot

        Args:
            time: Current simulation time (s).
            dt: Time step size (s), useful for some models.

        Returns:
            PropulsionState at the given time.
        """

    @abstractmethod
    def is_burnout(self, time: float) -> bool:
        """Check whether the propulsion system has exhausted its propellant.

        Args:
            time: Current simulation time (s).

        Returns:
            True if propellant is depleted, False otherwise.
        """

    @abstractmethod
    def get_burn_duration(self) -> float:
        """Return the total burn duration of the propulsion system.

        Returns:
            Total burn time (s). For water rockets, this is computed
            from fluid dynamics. For solid motors, it's a fixed parameter.
        """
