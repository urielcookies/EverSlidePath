import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between px-6 border-b border-slate-800/60"
        style={{ background: 'rgba(2,6,23,0.92)', backdropFilter: 'blur(12px)' }}
      >
        <Link to="/" className="flex items-center gap-2.5">
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
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Home
          </Link>
          <Link
            to="/viewer"
            className="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium text-[#020617] transition-all hover:brightness-110"
            style={{ background: '#22d3ee' }}
          >
            Open Viewer →
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-24">
        {/* Page header */}
        <div className="mb-16">
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold tracking-widest uppercase"
            style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)', color: '#22d3ee' }}
          >
            About
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            EverSlidePath
          </h1>
          <p className="mt-4 text-lg text-slate-400 leading-relaxed">
            An open educational pathology platform built for the next generation
            of pathologists.
          </p>
        </div>

        {/* Mission */}
        <Section label="Mission">
          <p className="text-slate-400 leading-relaxed">
            Pathology education has a tooling problem. Medical students spend
            weeks rotating through glass slide libraries, residents rely on
            static image atlases, and most digital pathology software is locked
            behind institutional licenses. EverSlidePath is an attempt to close
            that gap — a free, open, browser-based whole-slide viewer with AI
            detection built in from the start.
          </p>
          <p className="mt-4 text-slate-400 leading-relaxed">
            The goal is simple: let anyone with a browser open a real pathology
            case, annotate it, run AI-assisted analysis, and learn — without
            creating an account, installing software, or waiting for IT
            approval.
          </p>
        </Section>

        {/* The Platform */}
        <Section label="The Platform">
          <p className="mb-6 text-slate-400 leading-relaxed">
            EverSlidePath is built around four tightly integrated components:
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <PlatformCard
              title="WSI Viewer"
              description="OpenSeadragon-powered tile renderer with smooth pan/zoom, multi-resolution pyramid support, and a fullscreen study mode."
            />
            <PlatformCard
              title="AI Inference"
              description="TensorFlow.js StarDist model for nuclear instance segmentation — runs fully client-side in the browser, no server required."
            />
            <PlatformCard
              title="Annotation System"
              description="Shape drawing, per-slide tissue labels, adjustable thresholds, and per-annotation metadata for structured learning."
            />
            <PlatformCard
              title="Cloud Sync"
              description="Annotations are auto-saved to Cloudflare D1 with a debounced sync loop. Slide metadata is indexed via D1 for fast lookups."
            />
          </div>
        </Section>

        {/* Technology */}
        <Section label="Technology">
          <p className="mb-5 text-slate-400 leading-relaxed">
            The stack is chosen for performance at the edge and zero cold-start
            latency in the browser:
          </p>
          <ul className="space-y-3">
            {[
              {
                name: 'OpenSeadragon',
                desc: 'Battle-tested whole-slide image viewer with DZI tile support and smooth interpolation.',
              },
              {
                name: 'TensorFlow.js + StarDist',
                desc: 'Client-side nuclear instance segmentation. The model is loaded once and cached in the browser.',
              },
              {
                name: 'Cloudflare Workers + D1',
                desc: 'Edge-deployed API with SQLite (D1) for annotation persistence and slide metadata indexing.',
              },
              {
                name: 'TanStack Start + React 19',
                desc: 'File-based routing, type-safe server functions, and RSC-ready architecture.',
              },
              {
                name: 'Tailwind CSS',
                desc: 'Utility-first styling with a custom dark navy/cyan design language.',
              },
            ].map((item) => (
              <li
                key={item.name}
                className="flex gap-3 rounded-lg p-4"
                style={{
                  background: 'rgba(15,23,42,0.7)',
                  border: '1px solid rgba(148,163,184,0.08)',
                }}
              >
                <span
                  className="mt-0.5 flex-shrink-0 text-[10px] font-bold font-mono"
                  style={{ color: '#22d3ee' }}
                >
                  ▸
                </span>
                <div>
                  <span className="text-sm font-semibold text-slate-200">{item.name}</span>
                  <span className="text-slate-500"> — </span>
                  <span className="text-sm text-slate-400">{item.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* Get In Touch */}
        <Section label="Get In Touch">
          <p className="text-slate-400 leading-relaxed">
            EverSlidePath is open source. Feedback, bug reports, and pull
            requests are welcome via GitHub.
          </p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors hover:border-slate-500"
            style={{
              background: 'rgba(15,23,42,0.8)',
              border: '1px solid rgba(148,163,184,0.15)',
              color: '#94a3b8',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            View on GitHub
          </a>
        </Section>
      </main>

      {/* Footer */}
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
          <Link to="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Home
          </Link>
        </div>
      </footer>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <div className="mb-5 flex items-center gap-3">
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: '#22d3ee' }}
        >
          {label}
        </span>
        <div className="flex-1 border-t" style={{ borderColor: 'rgba(34,211,238,0.15)' }} />
      </div>
      {children}
    </section>
  )
}

function PlatformCard({ title, description }: { title: string; description: string }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'rgba(15,23,42,0.7)',
        border: '1px solid rgba(148,163,184,0.08)',
      }}
    >
      <h3 className="mb-1.5 text-sm font-semibold text-slate-100">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  )
}
