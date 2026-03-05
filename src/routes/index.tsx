import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between px-6 border-b border-slate-800/60"
        style={{ background: 'rgba(2,6,23,0.92)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/20 border border-cyan-500/40">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="4.5" stroke="#22d3ee" strokeWidth="1.4" />
              <circle cx="7" cy="7" r="1.5" fill="#22d3ee" />
              <circle cx="7" cy="2.5" r="0.8" fill="#22d3ee" opacity="0.5" />
              <circle cx="7" cy="11.5" r="0.8" fill="#22d3ee" opacity="0.5" />
              <circle cx="2.5" cy="7" r="0.8" fill="#22d3ee" opacity="0.5" />
              <circle cx="11.5" cy="7" r="0.8" fill="#22d3ee" opacity="0.5" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-wide text-slate-100">EverSlidePath</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/about"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            About
          </Link>
          <Link
            to="/viewer"
            className="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium text-[#020617] transition-all hover:brightness-110"
            style={{ background: '#22d3ee' }}
          >
            Open Viewer
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-14 text-center"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(34,211,238,0.07) 0%, transparent 70%), #020617',
        }}
      >
        {/* Badge */}
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[10px] font-semibold tracking-widest uppercase"
          style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)', color: '#22d3ee' }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: '#22d3ee' }}
          />
          Educational Pathology Platform
        </div>

        <h1 className="mx-auto mb-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          Learn Pathology{' '}
          <span style={{ color: '#22d3ee' }}>Through Real Cases</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
          Interactive whole-slide imaging, AI-assisted detection, and
          expert-annotated cases — purpose-built for medical students and
          residents.
        </p>

        <div className="flex flex-col items-center gap-3">
          <Link
            to="/viewer"
            className="inline-flex items-center gap-2 rounded-lg px-7 py-3.5 text-base font-semibold text-[#020617] transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: '#22d3ee', boxShadow: '0 0 28px rgba(34,211,238,0.25)' }}
          >
            Open the Viewer →
          </Link>
          <span className="text-xs text-slate-600">No signup required</span>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-40">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="1.5">
            <path d="M3 6l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* Feature Strip */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Platform Features
          </h2>
          <p className="mb-12 text-center text-2xl font-bold text-white">
            Everything you need to study pathology
          </p>

          <div className="grid gap-5 sm:grid-cols-3">
            <FeatureCard
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="2" width="16" height="16" rx="2" stroke="#22d3ee" strokeWidth="1.4" />
                  <circle cx="10" cy="10" r="4" stroke="#22d3ee" strokeWidth="1.4" />
                  <circle cx="10" cy="10" r="1.5" fill="#22d3ee" />
                  <path d="M10 2v2M10 16v2M2 10h2M16 10h2" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              }
              title="Interactive Viewer"
              description="Pan and zoom whole-slide images with hardware-accelerated rendering. Multi-channel controls for fluorescence slides."
            />
            <FeatureCard
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="7.5" stroke="#22d3ee" strokeWidth="1.4" />
                  <circle cx="7" cy="8" r="1.2" fill="#22d3ee" />
                  <circle cx="13" cy="8" r="1.2" fill="#22d3ee" />
                  <circle cx="10" cy="12.5" r="1.2" fill="#22d3ee" />
                  <path d="M7 8l3 4.5L13 8" stroke="#22d3ee" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
                </svg>
              }
              title="AI Nuclear Detection"
              description="TensorFlow.js StarDist model runs entirely in your browser — no server round-trips, instant inference on any tissue region."
            />
            <FeatureCard
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14M3 10h10M3 15h7" stroke="#22d3ee" strokeWidth="1.4" strokeLinecap="round" />
                  <circle cx="16" cy="14" r="3" stroke="#22d3ee" strokeWidth="1.2" />
                  <path d="M15 14h2M16 13v2" stroke="#22d3ee" strokeWidth="1" strokeLinecap="round" />
                </svg>
              }
              title="Annotate & Learn"
              description="Draw shapes, label tissue regions — tumor, stroma, vessels, immune cells — and sync annotations to the cloud automatically."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        className="px-6 py-24"
        style={{ background: 'rgba(15,23,42,0.6)' }}
      >
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-cyan-400">
            How It Works
          </h2>
          <p className="mb-14 text-center text-2xl font-bold text-white">
            Three steps to deeper understanding
          </p>

          <div className="relative grid gap-10 sm:grid-cols-3">
            {/* Connector line */}
            <div
              className="absolute top-6 left-[16.67%] right-[16.67%] hidden h-px sm:block"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.3), transparent)' }}
            />

            <Step
              number="01"
              title="Open a Case"
              description="Browse the Study Browser and select a whole-slide image case to examine."
            />
            <Step
              number="02"
              title="Annotate Your Findings"
              description="Label tumor, stroma, vessels, and immune cells with the built-in annotation tools."
            />
            <Step
              number="03"
              title="Run AI Analysis"
              description="Trigger StarDist nuclear detection and compare your annotations with automated results."
            />
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Who It's For
          </h2>
          <p className="mb-12 text-center text-2xl font-bold text-white">
            Built for pathology learners at every stage
          </p>

          <div className="grid gap-5 sm:grid-cols-3">
            <PersonaCard
              emoji="🔬"
              role="Medical Students"
              description="Build diagnostic pattern recognition on real H&E and IHC cases before your pathology rotation."
            />
            <PersonaCard
              emoji="🏥"
              role="Pathology Residents"
              description="Practice systematic slide review and AI-assisted workflows before stepping up to the microscope."
            />
            <PersonaCard
              emoji="📚"
              role="Educators"
              description="Share expertly annotated cases with students and track their annotation progress in real time."
            />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section
        className="px-6 py-28 text-center"
        style={{
          background: 'radial-gradient(ellipse 70% 80% at 50% 100%, rgba(34,211,238,0.06) 0%, transparent 70%), rgba(15,23,42,0.5)',
        }}
      >
        <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
          Ready to explore pathology?
        </h2>
        <p className="mb-8 text-slate-400">
          Jump straight in — no account, no setup.
        </p>
        <Link
          to="/viewer"
          className="inline-flex items-center gap-2 rounded-lg px-8 py-4 text-base font-semibold text-[#020617] transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ background: '#22d3ee', boxShadow: '0 0 36px rgba(34,211,238,0.2)' }}
        >
          Start Learning Now →
        </Link>
        <p className="mt-5 text-xs text-slate-600">
          Built on OpenSeadragon + TensorFlow.js
        </p>
      </section>

      {/* Page Footer */}
      <footer className="border-t border-slate-800/60 px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-cyan-500/20 border border-cyan-500/40">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <circle cx="5" cy="5" r="3" stroke="#22d3ee" strokeWidth="1.2" />
                <circle cx="5" cy="5" r="1" fill="#22d3ee" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-slate-400">EverSlidePath</span>
          </div>
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} EverSlidePath. All rights reserved.
          </p>
          <Link to="/about" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            About
          </Link>
        </div>
      </footer>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div
      className="rounded-xl p-6 transition-colors hover:border-cyan-500/30"
      style={{
        background: 'rgba(15,23,42,0.8)',
        border: '1px solid rgba(148,163,184,0.1)',
      }}
    >
      <div
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)' }}
      >
        {icon}
      </div>
      <h3 className="mb-2 text-sm font-semibold text-slate-100">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  )
}

function Step({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="relative flex flex-col items-center text-center">
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold"
        style={{
          background: 'rgba(34,211,238,0.1)',
          border: '1px solid rgba(34,211,238,0.3)',
          color: '#22d3ee',
        }}
      >
        {number}
      </div>
      <h3 className="mb-2 text-sm font-semibold text-slate-100">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  )
}

function PersonaCard({
  emoji,
  role,
  description,
}: {
  emoji: string
  role: string
  description: string
}) {
  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: 'rgba(15,23,42,0.8)',
        border: '1px solid rgba(148,163,184,0.1)',
      }}
    >
      <div className="mb-3 text-2xl">{emoji}</div>
      <h3 className="mb-2 text-sm font-semibold text-slate-100">{role}</h3>
      <p className="text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  )
}
