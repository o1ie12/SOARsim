# SOARSim 🚀

**Comprehensive Engineering Analysis Platform for Rocket Design**

SOARSim is a web-based engineering platform for designing rockets, simulating flights, analyzing trajectories, and visualizing propulsion physics in real time. It supports water rockets, solid rocket motors, and custom thrust profiles with advanced analysis capabilities including Monte Carlo uncertainty quantification, parameter sweeps, and design of experiments.

![SOARSim Screenshot](https://placehold.co/800x450/1a1a2e/ffffff?text=SOARSim+Dashboard+Screenshot)
*Screenshot placeholder — replace with an actual screenshot of the SOARSim interface.*

---

## Features

### 🎯 Simulation & Physics
- **Water Rocket Propulsion** — Isothermal expansion model with accurate thrust, mass flow, and pressure dynamics
- **Solid Motor Propulsion** — Commercial Estes motors (A8 through F15) with built-in thrust curves
- **Custom Thrust Curves** — CSV import for user-defined thrust profiles
- **RK4 / RK45 Solvers** — Advanced numerical integration replacing Euler as the default
- **ISA Standard Atmosphere** — Altitude-dependent density, temperature, and pressure model
- **Wind Model** — Constant, layered, and altitude-varying wind profiles
- **Advanced Aerodynamics** — Mach-dependent drag, multiple nose cone types, fin drag

### 📊 Analysis & Visualization
- **Parameter Sweeps** — Vary one parameter across multiple simulations with automatic comparison plots
- **Monte Carlo Analysis** — Run hundreds of simulations with random perturbations to quantify uncertainty
- **Design of Experiments** — Full factorial experiments testing every parameter combination
- **Engineering Dashboard** — Dynamic pressure, Mach number, energy, and impulse visualization
- **Real-time Trajectory Visualization** — Interactive charts powered by Recharts

### 🛠️ Engineering Workspace
- **Rocket Designer** — Visual rocket builder with parametric design
- **Validation Framework** — Compare simulation predictions against real flight data
- **Project Management** — Save, organize, and compare rocket designs
- **Engineering Reports** — Generate professional reports with executive summaries

---

## Screenshots

| Simulation Studio | Engineering Dashboard |
|:---:|:---:|
| ![Simulation Studio](https://placehold.co/400x250/16213e/ffffff?text=Simulation+Studio) | ![Dashboard](https://placehold.co/400x250/0f3460/ffffff?text=Engineering+Dashboard) |
| **Analysis Hub** | **Rocket Designer** |
| ![Analysis](https://placehold.co/400x250/1a1a2e/ffffff?text=Analysis+Hub) | ![Designer](https://placehold.co/400x250/16213e/ffffff?text=Rocket+Designer) |

*Screenshot placeholders — replace with actual screenshots from the application.*

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| **UI Components** | shadcn/ui, Recharts, Lucide Icons |
| **Backend** | FastAPI, Python 3.12+, Pydantic |
| **Physics Engine** | NumPy, RK4/RK45 integrators, ISA atmosphere model |
| **Testing** | pytest (backend, 148+ tests), Vitest (frontend) |
| **Dev Tools** | ESLint, uvicorn, PostCSS |

---

## Architecture Overview

SOARSim follows a modern two-tier architecture with a Python/FastAPI backend and a Next.js/React frontend.

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │   Pages  │  │Components│  │     Workspace         │  │
│  │  (5 routes)│ │ (20+ UI) │  │  (Design Manager)    │  │
│  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘  │
│       └──────────────┼──────────────────┘               │
│                      │ REST API (HTTP)                   │
├──────────────────────┼──────────────────────────────────┤
│               Backend (FastAPI)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │  Routes  │  │  Models  │  │  Analysis Engine      │  │
│  │ (4 routers)│ │(Pydantic)│  │  (Sweep/MC/DoE)     │  │
│  └────┬─────┘  └──────────┘  └──────────┬───────────┘  │
│       │                                  │              │
│  ┌────┴──────────────────────────────────┴──────────┐   │
│  │              Physics Engine                       │   │
│  │  ┌─────────┐ ┌──────────┐ ┌────────────────┐    │   │
│  │  │Solvers  │ │Atmosphere│ │  Propulsion     │    │   │
│  │  │(RK4/Euler││(ISA Model)│ │┌─────┬───────┐│    │   │
│  │  └─────────┘ └──────────┘ ││Water│ Solid ││    │   │
│  │                           ││Motor│ Motors ││    │   │
│  │  ┌─────────┐ ┌──────────┐ │└─────┴───────┘│    │   │
│  │  │Aerody-  │ │  Wind    │ │┌─────────────┐│    │   │
│  │  │namics   │ │  Model   │ ││Custom Thrust││    │   │
│  │  └─────────┘ └──────────┘ │└─────────────┘│    │   │
│  │                           └────────────────┘    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Backend Architecture

The backend is organized into modular domains:

- **`/app/api/routes.py`** — REST API endpoints (`POST /api/simulate`)
- **`/app/physics/`** — Physics engine:
  - `engine.py` — Core physics (drag, gravity, equations of motion)
  - `solvers.py` — Euler, RK4, and RK45 numerical integrators
  - `atmosphere.py` — ISA standard atmosphere model
  - `aerodynamics.py` — Mach-dependent drag, nose cone types, fin drag
  - `wind.py` — Constant, layered, and altitude-varying wind profiles
  - `propulsion/` — Water rocket, solid motors (Estes), custom thrust curves
- **`/app/analysis/`** — Analysis engine (sweeps, Monte Carlo, DoE, statistics)
- **`/app/schemas/`** — Pydantic models with camelCase API serialization
- **`/app/validation/`** — Flight data comparison and validation framework
- **`/app/workspace/`** — Project management, rocket library, reports

### Frontend Architecture

The frontend is organized by route and component:

- **`/src/app/`** — Next.js pages (landing, simulate, validate, analyze, workspace)
- **`/src/components/`** — React components:
  - `ui/` — shadcn/ui primitives (tabs, cards, sliders, buttons, etc.)
  - `simulation-form.tsx` — Rocket configuration form
  - `flight-charts.tsx` — Trajectory visualization with 4 chart tabs
  - `sweep-panel.tsx` — Parameter sweep UI
  - `monte-carlo-panel.tsx` — Monte Carlo analysis UI
  - `doe-panel.tsx` — Design of Experiments UI
  - `rocket-designer/` — Visual rocket builder with SVG renderer
- **`/src/lib/`** — API clients, utilities, geometry types

---

## Installation

### Prerequisites

- **Python** 3.11 or later
- **Node.js** 18 or later
- **npm** or **yarn**

### Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend
npm install
```

---

## Local Development

Start both services in separate terminals:

### 1. Start the Backend

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

The API docs are available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend runs at [http://localhost:3000](http://localhost:3000).

---

## API Reference

### POST /api/simulate

Run a single flight simulation with water rocket parameters.

**Request:**
```json
{
  "rocket": {
    "dragCoefficient": 0.45,
    "crossSectionalArea": 0.008
  },
  "propulsion": {
    "type": "water",
    "dryMass": 0.15,
    "bottleVolume": 0.002,
    "waterVolume": 0.0007,
    "initialPressure": 400000,
    "nozzleDiameter": 0.013
  },
  "launch": {
    "angle": 75
  }
}
```

**Response:**
```json
{
  "summary": {
    "maxAltitude": 42.5,
    "flightTime": 3.2,
    "maxVelocity": 28.1,
    "maxAcceleration": 385.2
  },
  "trajectory": [
    {
      "time": 0.0,
      "x": 0.0,
      "y": 0.0,
      "vx": 0.0,
      "vy": 0.0,
      "ax": 0.0,
      "ay": 0.0,
      "thrust": 0.0,
      "mass": 0.849,
      "pressure": 501325.0,
      "waterRemaining": 1.0
    }
  ]
}
```

### v2.0 Analysis Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/analysis/sweep` | Parameter sweep across multiple values |
| `POST /api/analysis/montecarlo` | Monte Carlo uncertainty analysis |
| `POST /api/analysis/experiments/full-factorial` | Full factorial Design of Experiments |
| `POST /api/analysis/statistics` | Compute descriptive statistics |
| `GET /api/analysis/sweep/parameters` | List available sweep parameters |

---

## Testing

```bash
# Backend (148+ tests)
cd backend && python -m pytest tests/ -v

# Frontend
cd frontend && npx vitest run

# Frontend type checking
cd frontend && npx tsc --noEmit
```

---

## Physics Model

### Water Rocket

The water rocket uses compressed air to expel water through a nozzle:

1. **Isothermal Expansion**: `P = P₀ × V_air₀ / V_air(t)`
2. **Exit Velocity**: `v_exit = √(2 × (P - P_atm) / ρ_water)`
3. **Thrust**: `F = 2 × A_nozzle × (P - P_atm)`
4. **Mass Flow**: `ṁ = ρ × A_nozzle × v_exit`

### Assumptions

- Isothermal expansion (no temperature drop)
- Incompressible water
- Quasi-steady flow
- Perfect nozzle efficiency
- Optimal expansion (exit pressure = atmospheric)

### Validated Behaviors

| Test | Result |
|------|--------|
| Higher pressure → higher altitude | ✅ |
| More water → longer burn | ✅ |
| Mass decreases during burn | ✅ |
| Pressure drops to atmospheric | ✅ |
| Water exhausts to zero | ✅ |
| Negative pressure rejected | ✅ |
| Water > bottle rejected | ✅ |

---

## Roadmap

### v2.1 — Q3 2026
- [ ] Multi-stage rocket support
- [ ] GPU-accelerated Monte Carlo (CUDA/WebGL)
- [ ] 3D trajectory visualization with Three.js
- [ ] User authentication and cloud saving
- [ ] API rate limiting and production hardening

### v2.2 — Q4 2026
- [ ] Real-time collaborative simulation sessions
- [ ] Advanced optimization (genetic algorithms, Bayesian optimization)
- [ ] Export to PDF/CSV with rich formatting
- [ ] Plugin system for custom propulsion models
- [ ] Mobile-responsive design overhaul

### v3.0 — 2027
- [ ] Orbital mechanics and launch trajectory planning
- [ ] Structural analysis (finite element integration)
- [ ] CFD integration for aerodynamic validation
- [ ] Community marketplace for rocket designs
- [ ] Desktop application (Tauri/Electron)

---

## Project Structure

```
SOARsim/
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── .gitignore
├── backend/
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── main.py              # FastAPI entry point
│   ├── app/
│   │   ├── api/             # REST routes
│   │   ├── physics/         # Physics engine
│   │   ├── analysis/        # Analysis engine (sweeps, MC, DoE)
│   │   ├── simulation/      # Simulators (v1, v2)
│   │   ├── validation/      # Flight data comparison
│   │   ├── workspace/       # Project management
│   │   └── schemas/         # Pydantic models
│   └── tests/               # pytest test suite
└── frontend/
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    ├── postcss.config.mjs
    ├── vitest.config.ts
    └── src/
        ├── app/             # Next.js pages
        ├── components/      # React components
        ├── lib/             # Utilities and API clients
        └── __tests__/       # Vitest tests
```

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

*Built with passion for rocketry, simulation, and open-source engineering. 🚀*
