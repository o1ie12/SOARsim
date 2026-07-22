# Changelog

All notable changes to SOARSim will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-07-22

### Added

- **RK4 / RK45 Solvers** — Advanced numerical integration replacing Euler as the default
- **ISA Standard Atmosphere** — Altitude-dependent density, temperature, and pressure model
- **Wind Model** — Constant, layered, and altitude-varying wind profiles
- **Solid Motor Propulsion** — Commercial Estes motors (A8 through F15)
- **Custom Thrust Curves** — CSV import for user-defined thrust profiles
- **Advanced Aerodynamics** — Mach-dependent drag, nose cone types, fin drag
- **Parameter Sweeps** — Vary one parameter across multiple simulations with automatic comparison plots
- **Monte Carlo Uncertainty Analysis** — Run hundreds of simulations with random perturbations to quantify uncertainty
- **Design of Experiments** — Full factorial experiments testing every parameter combination
- **Optimization Engine** — Golden section search for finding optimal parameter values
- **Engineering Dashboard** — Dynamic pressure, Mach number, energy, and impulse visualization
- **Validation Framework** — Compare simulation predictions against real flight data
- **Workspace** — Save, organize, and compare rocket designs
- **Engineering Reports** — Generate professional reports with executive summary and metrics
- **148 Backend Tests** — Comprehensive test coverage across physics and analysis modules

### Changed

- Default solver upgraded from Euler to RK4 for improved accuracy
- Atmosphere model upgraded from constant density to ISA standard
- Landing page updated with new feature descriptions

### Fixed

- Improved numerical stability for high-thrust motor simulations

## [1.0.0] - 2026-01-01

### Added

- Initial release of SOARSim
- Water rocket physics engine (isothermal expansion model)
- Euler integration solver
- Quadratic drag model
- Real-time trajectory visualization with Recharts
- Interactive simulation configuration form
- Flight summary metrics (altitude, velocity, acceleration, flight time)
- FastAPI backend with REST API
- Next.js frontend with Tailwind CSS and shadcn/ui
- Engineering workspace with design management
