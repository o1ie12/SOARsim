import Link from "next/link";

const FEATURES = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
    title: "Physics Engine",
    description: "Euler integration with variable mass, quadratic drag, and isothermal expansion for accurate water rocket simulation.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "Real-Time Charts",
    description: "Visualize altitude, velocity, acceleration, thrust, and pressure with interactive Recharts analysis.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "Validation Framework",
    description: "Compare simulation predictions against real flight data with automated accuracy scoring and error analysis.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: "Engineering Reports",
    description: "Generate professional reports with executive summary, physics assumptions, performance metrics, and limitations.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
    title: "Rocket Library",
    description: "Save, organize, and compare rocket designs with tags, favorites, and import/export functionality.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
      </svg>
    ),
    title: "Comparison Tools",
    description: "Side-by-side rocket design comparison with automated best-in-class identification across key metrics.",
  },
];

const SPECS = [
  { label: "Integration Method", value: "Euler (1st Order)" },
  { label: "Drag Model", value: "Quadratic (Cd·A·½ρv²)" },
  { label: "Propulsion Model", value: "Isothermal Expansion" },
  { label: "Time Step", value: "0.01s (configurable)" },
  { label: "Frontend", value: "Next.js 16 + React 19" },
  { label: "Backend", value: "FastAPI + NumPy" },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-lg font-bold tracking-tight">SOAR Studio</span>
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              v2.3
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/simulate" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Simulation
            </Link>
            <Link href="/designer" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Rocket Designer
            </Link>
            <Link href="/workspace" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Workspace
            </Link>
            <Link href="/validate" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Validation
            </Link>
            <Link href="/analyze" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Reports
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/simulate"
              className="inline-flex h-9 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-all hover:bg-foreground/90"
            >
              Get Started
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-1 items-center justify-center px-6 pt-24 pb-16">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Open Source · MIT License · Production Ready
          </div>

          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl md:text-7xl">
            SOAR Studio
          </h1>

          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Physics-Based Rocket Flight Simulator
          </p>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground/80 sm:text-base">
            Design rockets, simulate flights, and analyze trajectories with real-time physics.
            An open-source engineering platform for educational rocketry — from concept to flight report.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/simulate"
              className="group relative inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-8 text-sm font-semibold text-background transition-all hover:bg-foreground/90 hover:gap-3"
            >
              Start Simulation
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/workspace"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-background px-8 text-sm font-semibold transition-all hover:bg-muted"
            >
              Open Workspace
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-border/40 bg-muted/30 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Engineering Platform</h2>
            <p className="mt-3 text-muted-foreground">
              Everything you need to design, simulate, validate, and report on rocket flights.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-border/60 bg-background p-6 transition-shadow hover:shadow-md">
                <div className="mb-4 inline-flex rounded-lg bg-muted p-2.5 text-foreground">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
            <p className="mt-3 text-muted-foreground">
              From design to flight report in four steps.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { step: "01", title: "Design", desc: "Configure rocket geometry, propulsion parameters, and launch conditions." },
              { step: "02", title: "Simulate", desc: "Run physics-based flight simulation with real-time trajectory computation." },
              { step: "03", title: "Analyze", desc: "Review performance metrics, charts, and engineering data." },
              { step: "04", title: "Report", desc: "Generate professional engineering reports and export results." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background text-lg font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Specs */}
      <section className="border-t border-border/40 bg-muted/30 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Technical Specifications</h2>
            <p className="mt-3 text-muted-foreground">
              Built with modern web technologies and rigorous physics.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SPECS.map((spec) => (
              <div key={spec.label} className="flex items-center justify-between rounded-lg border border-border/60 bg-background p-4">
                <span className="text-sm text-muted-foreground">{spec.label}</span>
                <span className="text-sm font-mono font-medium">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Open Source</h2>
          <p className="mt-4 text-muted-foreground">
            SOAR Studio is free and open-source under the MIT license. Contributions are welcome.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/o1ie12/SOARsim"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-background px-8 text-sm font-semibold transition-all hover:bg-muted"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              View on GitHub
            </a>
            <Link
              href="/simulate"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-8 text-sm font-semibold text-background transition-all hover:bg-foreground/90"
            >
              Try Now — No Setup Required
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            <span className="text-sm font-semibold">SOAR Studio v2.3</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="https://github.com/o1ie12/SOARsim" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
            <Link href="/simulate" className="hover:text-foreground transition-colors">Simulate</Link>
            <Link href="/workspace" className="hover:text-foreground transition-colors">Workspace</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Built with Next.js, FastAPI, and a lot of thrust.
          </p>
        </div>
      </footer>
    </div>
  );
}