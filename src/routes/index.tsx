import { createFileRoute } from '@tanstack/react-router'
import { getSlideMetadata, type SlideMetadata } from '../server/slideMetadata'
import LeftSidebar from '../components/Sidebar/LeftSidebar'
import RightSidebar from '../components/Sidebar/RightSidebar'
import PathologyViewer from '../components/Viewer/PathologyViewer'
import { toggleLeftSidebar } from '../store/pathologyStore'

export const Route = createFileRoute('/')({
  loader: async () => {
    const metadata = getSlideMetadata('slide-001')
    return { metadata }
  },
  component: ViewerPage,
})

function TopBar({ metadata }: { metadata: SlideMetadata | null }) {
  return (
    <header
      className="flex h-9 flex-shrink-0 items-center gap-3 border-b border-slate-800/60 px-4"
      style={{ background: 'rgba(15, 23, 42, 0.98)' }}
    >
      {/* Logo + wordmark */}
      <div className="flex items-center gap-2 pr-4 border-r border-slate-700/50">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-cyan-500/20 border border-cyan-500/40">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="3" stroke="#22d3ee" strokeWidth="1.2" />
            <circle cx="5" cy="5" r="1" fill="#22d3ee" />
          </svg>
        </div>
        <span className="text-xs font-semibold tracking-wide text-slate-200">PathShare</span>
      </div>

      {/* Breadcrumb */}
      {metadata && (
        <>
          <span className="text-xs text-slate-500">/</span>
          <span className="text-xs font-medium text-slate-300 font-mono">{metadata.name}</span>
          <span className="text-xs text-slate-500">/</span>
          <span className="text-xs text-slate-500">{metadata.tissueType}</span>
        </>
      )}

      {/* Scan chips */}
      {metadata && (
        <div className="ml-auto flex items-center gap-2">
          <Chip label={metadata.objectiveLens} />
          <Chip label={`${metadata.micronsPerPixel} µm/px`} />
          <Chip label={metadata.stainProtocol} accent />
          <ConnectionDot />
        </div>
      )}

      {/* Sidebar toggle button */}
      <button
        onClick={toggleLeftSidebar}
        className="ml-2 flex h-6 w-6 items-center justify-center rounded hover:bg-slate-700/60 transition-colors"
        title="Toggle left sidebar"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#64748b" strokeWidth="1.5">
          <rect x="1" y="2" width="12" height="10" rx="1.5" />
          <line x1="5" y1="2" x2="5" y2="12" />
        </svg>
      </button>
    </header>
  )
}

function Chip({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <span
      className="rounded px-1.5 py-px text-[10px] font-mono font-medium"
      style={
        accent
          ? {
              background: 'rgba(34, 211, 238, 0.1)',
              color: '#22d3ee',
              border: '1px solid rgba(34, 211, 238, 0.2)',
            }
          : {
              background: 'rgba(30, 41, 59, 0.8)',
              color: '#94a3b8',
              border: '1px solid rgba(148, 163, 184, 0.12)',
            }
      }
    >
      {label}
    </span>
  )
}

function ConnectionDot() {
  return (
    <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700/50">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-[10px] text-slate-500">Live</span>
    </div>
  )
}

function ViewerPage() {
  const { metadata } = Route.useLoaderData()

  return (
    <div className="flex h-screen flex-col bg-[#020617] overflow-hidden">
      <TopBar metadata={metadata} />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <PathologyViewer />
        <RightSidebar metadata={metadata} />
      </div>
    </div>
  )
}
