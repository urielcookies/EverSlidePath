import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/guide')({
  component: GuidePage,
})

function GuidePage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between px-6 border-b border-slate-800/60"
        style={{ background: 'rgba(2,6,23,0.92)', backdropFilter: 'blur(12px)' }}
      >
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
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

        <Link
          to="/about"
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          About
        </Link>
        <Link
          to="/viewer"
          search={undefined as never}
          className="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium text-[#020617] transition-all hover:brightness-110"
          style={{ background: '#22d3ee' }}
        >
          Open Viewer
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-8 px-6 text-center">
        <div
          className="mb-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[10px] font-semibold tracking-widest uppercase"
          style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)', color: '#22d3ee' }}
        >
          Documentation
        </div>
        <h1 className="mx-auto mb-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
          How to Use EverSlidePath
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-400">
          A complete walkthrough of the pathology viewer — from loading slides to submitting annotated cases.
        </p>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 pb-16 space-y-0 divide-y divide-slate-800/60">

        {/* Section 1: Overview */}
        <section className="py-10">
          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-[10px] font-mono text-slate-600 tracking-widest">01</span>
            <h2 className="text-xl font-semibold text-slate-100">Viewer Overview</h2>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-3 text-slate-400 mb-6">
            <li className="flex gap-3"><Bullet /><span><strong className="text-slate-300">TopBar</strong> — slide metadata (stain, objective, resolution), sync status, share link, and navigation</span></li>
            <li className="flex gap-3"><Bullet /><span><strong className="text-slate-300">Left Sidebar</strong> — Study Browser for loading slides, annotation tools, and AI analysis controls</span></li>
            <li className="flex gap-3"><Bullet /><span><strong className="text-slate-300">WSI Canvas</strong> — the main whole-slide image viewport with pan, zoom, and overlay rendering</span></li>
            <li className="flex gap-3"><Bullet /><span><strong className="text-slate-300">Right Sidebar</strong> — Analysis, Report, and Case tabs for quantitative data and exports</span></li>
          </ul>
          <figure className="overflow-hidden rounded-xl border border-slate-800/60">
            <img
              src="/guide/guide-06-analysis-panel.jpeg"
              alt="Full viewer showing all four UI zones: TopBar, Left Sidebar, WSI Canvas, Right Sidebar"
              className="w-full h-auto block"
              loading="lazy"
            />
          </figure>
        </section>

        {/* Section 2: Loading Slides */}
        <SideSection
          label="02"
          title="Loading Slides"
          screenshot="/guide/guide-01-overview.png"
          screenshotAlt="Study Browser panel showing slide list and URL input"
          flip
        >
          <p className="text-slate-400 leading-relaxed mb-4">
            The Study Browser in the left sidebar gives you three ways to open a slide:
          </p>
          <ul className="space-y-3 text-slate-400">
            <li className="flex gap-3"><Bullet /><span><strong className="text-slate-300">My Slides</strong> — uploads you've added via the URL/DZI input or linked slides</span></li>
            <li className="flex gap-3"><Bullet /><span><strong className="text-slate-300">Public Library</strong> — curated reference slides available to all users</span></li>
            <li className="flex gap-3"><Bullet /><span><strong className="text-slate-300">URL / DZI input</strong> — paste any publicly accessible DZI manifest URL to load a remote slide instantly</span></li>
          </ul>
        </SideSection>

        {/* Section 3: Annotation Tools */}
        <SideSection
          label="03"
          title="Annotation Tools"
          screenshot="/guide/guide-02-annotation-tools.png"
          screenshotAlt="Annotation toolbar with shape and color controls"
        >
          <p className="text-slate-400 leading-relaxed mb-4">
            Enable <Mono>Annotation Mode</Mono> from the left panel to unlock the full toolset:
          </p>
          <ul className="space-y-3 text-slate-400 mb-4">
            <li className="flex gap-3"><Bullet /><span><strong className="text-slate-300">Shape picker</strong> — Circle, Square, Pin, Freehand, or Polygon</span></li>
            <li className="flex gap-3"><Bullet /><span><strong className="text-slate-300">Color swatches</strong> — assign a color to distinguish annotation categories visually</span></li>
            <li className="flex gap-3"><Bullet /><span><strong className="text-slate-300">Tissue labels</strong> — Tumor, Stroma, Immune, Vessel, Necrosis, or a custom name</span></li>
          </ul>
          <p className="text-slate-500 text-sm">Click or drag on the canvas to place annotations after selecting a shape.</p>
        </SideSection>

        {/* Section 4: AI Analysis */}
        <section className="py-10">
          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-[10px] font-mono text-slate-600 tracking-widest">04</span>
            <h2 className="text-xl font-semibold text-slate-100">AI Analysis</h2>
          </div>
          <div className="max-w-2xl space-y-4">
            <p className="text-slate-400 leading-relaxed">
              The <Mono>Run AI Analysis</Mono> button (left panel, below annotation tools) sends the current
              viewport region to the detection model. Once complete, probability heatmaps overlay the canvas.
            </p>
            <p className="text-slate-400 leading-relaxed">
              Use the <strong className="text-slate-300">probability threshold slider</strong> to filter
              detections by confidence — drag right to show only high-confidence regions. The model detects
              mitotic figures, tumor cell clusters, and stromal boundaries depending on the stain protocol.
            </p>
            <div
              className="rounded-lg border border-slate-800/60 px-4 py-3"
              style={{ background: 'rgba(34,211,238,0.04)' }}
            >
              <p className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-widest mb-1">Tip</p>
              <p className="text-xs text-slate-400">
                AI analysis runs on the current viewport region only. Pan to a new area and run again to analyse the full slide progressively.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Channel Mixer */}
        <SideSection
          label="05"
          title="Channel Mixer"
          screenshot="/guide/guide-03-channel-mixer.png"
          screenshotAlt="Channel Mixer panel with DAPI, FITC, TRITC sliders"
        >
          <p className="text-slate-400 leading-relaxed mb-4">
            For fluorescence slides (e.g. DAPI/FITC/TRITC stained), the Channel Mixer panel lets you
            independently control each channel:
          </p>
          <ul className="space-y-3 text-slate-400">
            <li className="flex gap-3"><Bullet /><span><strong className="text-slate-300">Toggle on/off</strong> — isolate individual fluorescence channels</span></li>
            <li className="flex gap-3"><Bullet /><span><strong className="text-slate-300">Wavelength</strong> — adjust the excitation wavelength per channel</span></li>
            <li className="flex gap-3"><Bullet /><span><strong className="text-slate-300">Gamma</strong> — fine-tune brightness/contrast to bring out specific structures</span></li>
          </ul>
          <p className="text-slate-500 text-sm mt-4">All changes apply in real-time on the canvas.</p>
        </SideSection>

        {/* Section 6: Analysis & Report Panels */}
        <section className="py-10">
          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-[10px] font-mono text-slate-600 tracking-widest">06</span>
            <h2 className="text-xl font-semibold text-slate-100">Analysis & Report Panels</h2>
          </div>
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 leading-relaxed mb-4">The right sidebar contains two tabs:</p>
              <ul className="space-y-3 text-slate-400">
                <li className="flex gap-3"><Bullet /><span>
                  <strong className="text-slate-300">Analysis tab</strong> — slide metadata (scanner, resolution, stain), quantitative breakdown of annotated regions, recent annotation list, and per-region statistics
                </span></li>
                <li className="flex gap-3"><Bullet /><span>
                  <strong className="text-slate-300">Report tab</strong> — session summary, <Mono>Export CSV</Mono> for annotation data, and <Mono>Export JSON</Mono> for full metadata including slide parameters
                </span></li>
              </ul>
            </div>
            <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-3">
              <figure className="overflow-hidden rounded-xl border border-slate-800/60">
                <img src="/guide/guide-04-study-browser.png" alt="Analysis tab showing slide metadata" className="w-full h-auto block" loading="lazy" />
                <figcaption className="px-3 py-2 text-[10px] font-mono text-slate-600 border-t border-slate-800/60">Analysis tab — slide metadata</figcaption>
              </figure>
              <figure className="overflow-hidden rounded-xl border border-slate-800/60">
                <img src="/guide/guide-05-left-panel.png" alt="Report tab showing session summary and export options" className="w-full h-auto block" loading="lazy" />
                <figcaption className="px-3 py-2 text-[10px] font-mono text-slate-600 border-t border-slate-800/60">Report tab — export options</figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* Section 7: Educational Mode */}
        <section className="py-10">
          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-[10px] font-mono text-slate-600 tracking-widest">07</span>
            <h2 className="text-xl font-semibold text-slate-100">Educational Mode</h2>
          </div>
          <p className="text-slate-400 leading-relaxed mb-5 max-w-2xl">
            EverSlidePath includes a structured case-based learning mode for courses and labs.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-800/60 p-5" style={{ background: 'rgba(15,23,42,0.6)' }}>
              <p className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-widest mb-3">Students</p>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li className="flex gap-2.5"><Bullet /><span>Join a class at <Link to="/join" search={undefined as never} className="text-cyan-400 hover:underline">/join</Link> using your class code</span></li>
                <li className="flex gap-2.5"><Bullet /><span>Open assigned cases from your <Link to="/dashboard" className="text-cyan-400 hover:underline">/dashboard</Link></span></li>
                <li className="flex gap-2.5"><Bullet /><span>Annotate the slide and submit when finished</span></li>
                <li className="flex gap-2.5"><Bullet /><span>After submission, annotations lock and the ground-truth overlay becomes available for self-review</span></li>
              </ul>
            </div>

            <div className="rounded-lg border border-slate-800/60 p-5" style={{ background: 'rgba(15,23,42,0.6)' }}>
              <p className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-widest mb-3">Instructors</p>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li className="flex gap-2.5"><Bullet /><span>Create cases and add ground-truth annotations at <Link to="/instructor" className="text-cyan-400 hover:underline">/instructor</Link></span></li>
                <li className="flex gap-2.5"><Bullet /><span>Build courses and assign case sets to student groups</span></li>
                <li className="flex gap-2.5"><Bullet /><span>Track submission and annotation progress per student in the instructor dashboard</span></li>
                <li className="flex gap-2.5"><Bullet /><span>Diagnosis and ground truth are revealed to students only after submission</span></li>
              </ul>
            </div>

            <div
              className="sm:col-span-2 rounded-lg border border-slate-800/60 px-5 py-4"
              style={{ background: 'rgba(15,23,42,0.6)' }}
            >
              <p className="text-[11px] font-mono text-cyan-400/70 uppercase tracking-widest mb-1">Submit Flow</p>
              <p className="text-sm text-slate-400">
                When a student clicks <strong className="text-slate-300">Submit Case</strong>, all annotations lock
                (no further edits), the instructor's diagnosis is revealed, and the ground-truth annotation overlay
                becomes available so the student can compare their work against the expert's.
              </p>
            </div>
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 px-6 py-8">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-slate-600 font-mono">EverSlidePath</span>
          <div className="flex items-center gap-6">
            <Link to="/viewer" search={undefined as never} className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono">
              Open Viewer
            </Link>
            <Link to="/join" search={undefined as never} className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono">
              Join Class
            </Link>
            <Link to="/login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SideSection({
  label,
  title,
  screenshot,
  screenshotAlt,
  children,
  flip = false,
  cropTall = false,
}: {
  label: string
  title: string
  screenshot: string
  screenshotAlt: string
  children: React.ReactNode
  flip?: boolean
  cropTall?: boolean
}) {
  return (
    <section className="py-10">
      <div className="flex items-baseline gap-3 mb-5">
        <span className="text-[10px] font-mono text-slate-600 tracking-widest">{label}</span>
        <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
      </div>
      <div className={`flex flex-col lg:flex-row gap-8 lg:gap-12 items-start ${flip ? 'lg:flex-row-reverse' : ''}`}>
        {/* Text */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
        {/* Screenshot */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0">
          <figure className="overflow-hidden rounded-xl border border-slate-800/60">
            <img
              src={screenshot}
              alt={screenshotAlt}
              className={`w-full block ${cropTall ? 'max-h-80 object-cover object-top' : 'h-auto'}`}
              loading="lazy"
            />
            <figcaption className="px-3 py-2 text-[10px] font-mono text-slate-600 border-t border-slate-800/60 leading-snug">
              {screenshotAlt}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="mx-0.5 rounded px-1 py-px text-[11px] font-mono text-cyan-400/80" style={{ background: 'rgba(34,211,238,0.08)' }}>
      {children}
    </code>
  )
}

function Bullet() {
  return (
    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500/40" />
  )
}
