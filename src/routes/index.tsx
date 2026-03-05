import { useEffect, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getSlideMetadata, type SlideMetadata } from '../server/slideMetadata'
import { getAnnotationsFn, saveAnnotationsFn } from '../server/annotationFunctions'
import LeftSidebar from '../components/Sidebar/LeftSidebar'
import RightSidebar from '../components/Sidebar/RightSidebar'
import PathologyViewer from '../components/Viewer/PathologyViewer'
import {
  toggleLeftSidebar,
  usePathologyStore,
  loadAnnotations,
  setSyncStatus,
  setLastSavedAt,
  pathologyStore,
} from '../store/pathologyStore'

const SLIDE_ID = 'slide-001'
const SAVE_DEBOUNCE_MS = 1500

export const Route = createFileRoute('/')({
  loader: async () => {
    const metadata = getSlideMetadata(SLIDE_ID)
    const annotations = await getAnnotationsFn({ data: SLIDE_ID })
    return { metadata, annotations }
  },
  component: ViewerPage,
})

// ─── TopBar ───────────────────────────────────────────────────────────────────
function SyncStatus() {
  const syncStatus = usePathologyStore((s) => s.syncStatus)
  const lastSavedAt = usePathologyStore((s) => s.lastSavedAt)

  const timeAgo = lastSavedAt
    ? (() => {
        const secs = Math.round((Date.now() - lastSavedAt) / 1000)
        if (secs < 5) return 'just now'
        if (secs < 60) return `${secs}s ago`
        return `${Math.round(secs / 60)}m ago`
      })()
    : null

  return (
    <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700/50">
      {syncStatus === 'saving' && (
        <>
          <svg
            className="animate-spin"
            width="12" height="12" viewBox="0 0 12 12"
            fill="none" stroke="#64748b" strokeWidth="1.5"
          >
            <circle cx="6" cy="6" r="4.5" strokeOpacity="0.2" />
            <path d="M6 1.5a4.5 4.5 0 0 1 4.5 4.5" />
          </svg>
          <span className="text-[10px] text-slate-500 font-mono">Saving…</span>
        </>
      )}
      {syncStatus === 'saved' && (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" fill="rgba(52,211,153,0.15)" stroke="#34d399" strokeWidth="1" />
            <path d="M4 6l1.5 1.5L8 4.5" stroke="#34d399" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] text-slate-500 font-mono">
            {timeAgo ?? 'Saved'}
          </span>
        </>
      )}
      {syncStatus === 'error' && (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" fill="rgba(248,113,113,0.15)" stroke="#f87171" strokeWidth="1" />
            <path d="M6 4v2.5M6 8h.01" stroke="#f87171" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span className="text-[10px] text-red-400 font-mono">Sync error</span>
        </>
      )}
      {syncStatus === 'idle' && (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#475569" strokeWidth="1.2">
            <path d="M2 7.5C2 5.8 3.3 4.5 5 4.5h.5M10 7.5C10 5.8 8.7 4.5 7 4.5h-.5M5.5 4.5V3M6.5 4.5V3M4 7.5h4" />
          </svg>
          <span className="text-[10px] text-slate-600 font-mono">Cloud</span>
        </>
      )}
    </div>
  )
}

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

      {/* Scan chips + sync status */}
      {metadata && (
        <div className="ml-auto flex items-center gap-2">
          <Chip label={metadata.objectiveLens} />
          <Chip label={`${metadata.micronsPerPixel} µm/px`} />
          <Chip label={metadata.stainProtocol} accent />
          <SyncStatus />
        </div>
      )}

      {/* Sidebar toggle */}
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
          ? { background: 'rgba(34,211,238,0.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }
          : { background: 'rgba(30,41,59,0.8)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.12)' }
      }
    >
      {label}
    </span>
  )
}

// ─── ViewerPage ───────────────────────────────────────────────────────────────
function ViewerPage() {
  const { metadata, annotations: loaderAnnotations } = Route.useLoaderData()
  const annotations = usePathologyStore((s) => s.annotations)
  const aiInferenceTime = usePathologyStore((s) => s.aiInferenceTime)
  const aiThreshold = usePathologyStore((s) => s.aiThreshold)

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Prevents the first load-from-DB from triggering an immediate save
  const hasInitialized = useRef(false)

  // Pre-populate store from DB on mount
  useEffect(() => {
    if (loaderAnnotations.length > 0) {
      loadAnnotations(loaderAnnotations)
    }
    // Small delay so the initial loadAnnotations doesn't trip the save effect
    const t = setTimeout(() => { hasInitialized.current = true }, 100)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save whenever annotations change
  useEffect(() => {
    if (!hasInitialized.current) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

    setSyncStatus('saving')

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const sessionMeta = aiInferenceTime != null
          ? { threshold: aiThreshold, inferenceMs: aiInferenceTime }
          : null

        // Read current annotations directly from store (not stale closure)
        const current = pathologyStore.state.annotations
        await saveAnnotationsFn({
          data: { slideId: SLIDE_ID, annotations: current, sessionMeta },
        })
        setSyncStatus('saved')
        setLastSavedAt(Date.now())
        toast.success('Saved to cloud', { duration: 2000 })
      } catch {
        setSyncStatus('error')
        toast.error('Sync failed — data saved locally')
      }
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [annotations]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen flex-col bg-[#020617] overflow-hidden">
      <TopBar metadata={metadata} />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <PathologyViewer tilesUrl={metadata.tilesUrl} />
        <RightSidebar metadata={metadata} />
      </div>
    </div>
  )
}
