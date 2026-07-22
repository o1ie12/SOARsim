# Contributing to SOARSim

Thank you for your interest in contributing to SOARSim! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/SOARSim.git
   cd SOARSim
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/o1ie12/SOARsim.git
   ```

## Development Setup

### Prerequisites

- Python 3.12+
- Node.js 18+
- npm or yarn

### Backend (Python / FastAPI)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (Next.js / React)

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:3000` and the backend at `http://127.0.0.1:8000`.

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates. When filing a bug report, include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs. actual behavior
- Your environment (OS, Python version, Node version)
- Any relevant logs or screenshots

### Suggesting Features

Feature requests are welcome. Please open an issue with:

- A clear description of the feature
- The motivation / use case
- Any design ideas you have

### Pull Requests

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the coding standards below

3. **Write or update tests** for your changes

4. **Run the test suite** to ensure nothing is broken:
   ```bash
   # Backend tests
   cd backend && python -m pytest tests/ -v

   # Frontend tests
   cd frontend && npx vitest run

   # Frontend type checking
   cd frontend && npx tsc --noEmit
   ```

5. **Commit your changes** with a clear message:
   ```bash
   git commit -m "Add: brief description of the change"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request** against `main`

## Pull Request Process

1. Fill out the PR template completely
2. Ensure all CI checks pass
3. Request a review from a maintainer
4. Address review feedback promptly
5. Once approved, a maintainer will merge your PR

## Coding Standards

### Python (Backend)

- Follow PEP 8 style guidelines
- Use type hints for function signatures
- Write docstrings for public functions and classes
- Keep functions focused and under ~50 lines
- Use meaningful variable and function names

### TypeScript / React (Frontend)

- Follow the existing code style (ESLint is configured)
- Use functional components with hooks
- Prefer named exports over default exports (unless required by framework)
- Keep components focused and reusable
- Use TypeScript interfaces for prop types

### General

- One logical change per commit
- Write descriptive commit messages
- Update documentation when changing APIs or adding features
- Add tests for new functionality

## Commit Message Convention

We use a simple prefix convention:

| Prefix | Description |
|--------|-------------|
| `Add:` | New feature or file |
| `Fix:` | Bug fix |
| `Update:` | Enhancement to existing feature |
| `Refactor:` | Code restructuring without behavior change |
| `Docs:` | Documentation changes |
| `Test:` | Adding or updating tests |
| `Chore:` | Maintenance tasks |

Example:
```
Add: Monte Carlo uncertainty analysis with configurable distributions
```

## Questions?

If you have questions about contributing, feel free to open a GitHub Discussion or reach out to the maintainers.

Thank you for contributing to SOARSim! 🚀
