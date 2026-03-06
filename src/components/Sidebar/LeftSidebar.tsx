import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  usePathologyStore,
  setChannel,
  toggleLeftSidebar,
  setAnnotationMode,
  setAnnotationLabel,
  setAnnotationShape,
  setActiveColor,
  clearAnnotations,
  setDeleteMode,
  setAiRunning,
  setAiProgress,
  setAiThreshold,
  setAiInferenceTime,
  setAiError,
  addAnnotation,
  setActiveSlide,
  addUploadedSlide,
  setAnnotationCustomName,
  removeUploadedSlide,
  setLayerVisibility,
} from '../../store/pathologyStore'
import { ANNOTATION_LABELS } from '../../lib/annotationConfig'
import { analyzeCurrentView, isUsingFallback } from '../../lib/aiEngine'
import { deleteUploadedSlideFn, addLinkedSlideFn } from '../../server/slideMetadata'
import { deleteAllAnnotationsFn } from '../../server/annotationFunctions'
import { LIBRARY_SLIDES, type LibrarySlide } from '../../lib/slideLibrary'

function classifySlideUrl(url: string): string | null {
  if (url.endsWith('.dzi')) return url
  if (url.endsWith('info.json') || url.includes('/iiif/')) return url
  return null
}

const MOCK_SLIDES = [
  { id: 'slide-001', name: 'BRCA-2024-0042-A', date: '2024-11-14', protocol: 'IF-DAPI-HER2-KI67' },
  { id: 'slide-002', name: 'LUNG-2024-0118-B', date: '2024-11-20', protocol: 'H&E' },
  { id: 'slide-003', name: 'COLON-2024-0207-C', date: '2024-12-01', protocol: 'IHC-CDX2-CK20' },
]

const LAYERS = [
  { id: 'annotations', label: 'Annotation Layer' },
  { id: 'cells', label: 'Cell Segmentation' },
  { id: 'tissue', label: 'Tissue Boundary' },
]

const CHANNELS = [
  { key: 'dapi' as const, label: 'DAPI', color: '#4169ff', hueRotate: 240 },
  { key: 'fitc' as const, label: 'FITC', color: '#00ff88', hueRotate: 120 },
  { key: 'tritc' as const, label: 'TRITC', color: '#ff6b35', hueRotate: 20 },
]

function SectionHeader({
  label,
  open,
  onToggle,
}: {
  label: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between px-3 py-2 hover:bg-slate-800/50 transition-colors"
    >
      <span className="pv-label tracking-widest">{label}</span>
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="#64748b"
        strokeWidth="1.5"
        className="transition-transform duration-200"
        style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
      >
        <path d="M2 4l4 4 4-4" />
      </svg>
    </button>
  )
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke={visible ? '#94a3b8' : '#334155'}
      strokeWidth="1.3"
    >
      {visible ? (
        <>
          <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" />
          <circle cx="7" cy="7" r="1.8" />
        </>
      ) : (
        <>
          <path d="M1 7s2.5-4 6-4 6 4 6 4" />
          <path d="M2 2l10 10" />
        </>
      )}
    </svg>
  )
}

function CrosshairIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="7" cy="7" r="3" />
      <path d="M7 1v2M7 11v2M1 7h2M11 7h2" />
    </svg>
  )
}

export default function LeftSidebar() {
  const isOpen = usePathologyStore((s) => s.leftSidebarOpen)
  const activeSlideId = usePathologyStore((s) => s.activeSlideId)
  const channels = usePathologyStore((s) => s.channels)
  const annotationMode = usePathologyStore((s) => s.annotationMode)
  const annotationLabel = usePathologyStore((s) => s.annotationLabel)
  const annotationShape = usePathologyStore((s) => s.annotationShape)
  const activeColor = usePathologyStore((s) => s.activeColor)
  const annotationCustomName = usePathologyStore((s) => s.annotationCustomName)
  const annotations = usePathologyStore((s) => s.annotations)
  const deleteMode = usePathologyStore((s) => s.deleteMode)
  const aiRunning = usePathologyStore((s) => s.aiRunning)
  const aiThreshold = usePathologyStore((s) => s.aiThreshold)
  const aiInferenceTime = usePathologyStore((s) => s.aiInferenceTime)
  const aiError = usePathologyStore((s) => s.aiError)

  const [studyOpen, setStudyOpen] = useState(true)
  const [layerOpen, setLayerOpen] = useState(true)
  const [channelOpen, setChannelOpen] = useState(true)
  const [toolsOpen, setToolsOpen] = useState(true)
  const [aiOpen, setAiOpen] = useState(true)

  const uploadedSlideMetadata = usePathologyStore((s) => s.uploadedSlideMetadata)
  const uploadedSlides = Object.values(uploadedSlideMetadata).map((m) => ({
    id: m.id,
    name: m.name,
    date: m.scanDate,
    protocol: m.stainProtocol,
  }))

  const [linkUrl, setLinkUrl] = useState('')
  const [linkName, setLinkName] = useState('')
  const [linkStatus, setLinkStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [libraryOpen, setLibraryOpen] = useState(false)

  const handleLoadLibrarySlide = (slide: LibrarySlide) => {
    const alreadyLoaded = uploadedSlideMetadata[slide.id]
    if (alreadyLoaded) { setActiveSlide(slide.id); return }
    addUploadedSlide({
      id: slide.id,
      name: slide.name,
      scanDate: '—',
      objectiveLens: '—',
      micronsPerPixel: slide.mpp,
      dimensions: { width: slide.width, height: slide.height },
      stainProtocol: slide.stain,
      tissueType: '—',
      scanner: slide.scanner,
      fileSize: '—',
      tilesUrl: slide.source,
    })
    setActiveSlide(slide.id)
  }

  const handleLinkSlide = async () => {
    const url = linkUrl.trim()
    if (!url) return
    const name = linkName.trim() || url.split('/').pop()?.split('?')[0] || 'Linked Slide'
    const tilesUrl = classifySlideUrl(url)
    if (!tilesUrl) {
      setLinkStatus('error')
      setTimeout(() => setLinkStatus('idle'), 3000)
      return
    }
    setLinkStatus('saving')
    try {
      const { id } = await addLinkedSlideFn({ data: { name, url } })
      addUploadedSlide({
        id,
        name,
        scanDate: new Date().toISOString().slice(0, 10),
        objectiveLens: '—',
        micronsPerPixel: 0,
        dimensions: { width: 1000, height: 1000 },
        stainProtocol: 'Linked',
        tissueType: '—',
        scanner: '—',
        fileSize: '—',
        tilesUrl,
      })
      setActiveSlide(id)
      setLinkUrl('')
      setLinkName('')
      setLinkStatus('idle')
    } catch {
      setLinkStatus('error')
      setTimeout(() => setLinkStatus('idle'), 3000)
    }
  }

  const runAnalysis = async () => {
    if (aiRunning) return
    setAiError(null)
    setAiRunning(true)
    setAiProgress(0)
    setAiInferenceTime(null)
    try {
      const result = await analyzeCurrentView(aiThreshold, (pct) => setAiProgress(pct))
      if (result) {
        result.annotations.forEach((ann) => addAnnotation(ann))
        setAiInferenceTime(result.inferenceMs)
      } else {
        setAiError('Viewer not ready — open a slide first.')
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setAiRunning(false)
      setAiProgress(0)
    }
  }
  const [confirmClear, setConfirmClear] = useState(false)
  const layerVisibility = usePathologyStore((s) => s.layerVisibility)

  const handleClearAll = () => {
    if (confirmClear) {
      clearAnnotations()
      setConfirmClear(false)
      deleteAllAnnotationsFn({ data: activeSlideId }).catch(console.error)
    } else {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 2500)
    }
  }

  const [confirmDeleteSlideId, setConfirmDeleteSlideId] = useState<string | null>(null)

  const handleDeleteSlide = async (id: string) => {
    if (confirmDeleteSlideId === id) {
      removeUploadedSlide(id)
      setConfirmDeleteSlideId(null)
      deleteUploadedSlideFn({ data: { id } }).catch(console.error)
    } else {
      setConfirmDeleteSlideId(id)
      setTimeout(() => setConfirmDeleteSlideId(null), 2500)
    }
  }

  return (
    <motion.aside
      animate={{ width: isOpen ? 280 : 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="relative flex-shrink-0 overflow-hidden border-r border-slate-800/60"
      style={{ background: 'rgba(15, 23, 42, 0.95)' }}
    >
      <div className="flex h-full w-[280px] flex-col overflow-y-auto overflow-x-hidden">
        {/* Sidebar toggle tab */}
        <button
          onClick={toggleLeftSidebar}
          className="absolute -right-3 top-1/2 z-20 flex h-6 w-3 -translate-y-1/2 items-center justify-center rounded-r bg-slate-800 border border-slate-700/60 border-l-0 hover:bg-slate-700 transition-colors"
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <svg
            width="6"
            height="10"
            viewBox="0 0 6 10"
            fill="none"
            stroke="#64748b"
            strokeWidth="1.5"
            style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}
          >
            <path d="M4 1L1 5l3 4" />
          </svg>
        </button>

        {/* — STUDY BROWSER — */}
        <div className="border-b border-slate-800/60">
          <SectionHeader label="Study Browser" open={studyOpen} onToggle={() => setStudyOpen(!studyOpen)} />
          <AnimatePresence initial={false}>
            {studyOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <ul className="pb-1">
                  {MOCK_SLIDES.map((slide) => {
                    const isActive = slide.id === activeSlideId
                    return (
                      <li
                        key={slide.id}
                        onClick={() => setActiveSlide(slide.id)}
                        className={`mx-2 mb-0.5 cursor-pointer rounded px-2 py-2 transition-colors ${
                          isActive
                            ? 'border-l-2 border-cyan-400 bg-slate-800/60 pl-[6px]'
                            : 'border-l-2 border-transparent hover:bg-slate-800/30'
                        }`}
                      >
                        <p className="pv-value text-xs font-medium text-slate-200 truncate">
                          {slide.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="pv-label text-[10px]">{slide.date}</span>
                          <span
                            className="rounded px-1 py-px text-[9px] font-medium font-mono"
                            style={{
                              background: 'rgba(34, 211, 238, 0.12)',
                              color: '#22d3ee',
                              border: '1px solid rgba(34, 211, 238, 0.2)',
                            }}
                          >
                            {slide.protocol}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                  {uploadedSlides.map((slide) => {
                    const isActive = slide.id === activeSlideId
                    const confirmingDelete = confirmDeleteSlideId === slide.id
                    return (
                      <li
                        key={slide.id}
                        className={`mx-2 mb-0.5 rounded transition-colors ${
                          isActive
                            ? 'border-l-2 border-cyan-400 bg-slate-800/60'
                            : 'border-l-2 border-transparent hover:bg-slate-800/30'
                        }`}
                      >
                        <div
                          className={`flex items-start justify-between px-2 py-2 cursor-pointer ${isActive ? 'pl-[6px]' : ''}`}
                          onClick={() => setActiveSlide(slide.id)}
                        >
                          <div className="min-w-0">
                            <p className="pv-value text-xs font-medium text-slate-200 truncate">
                              {slide.name}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <span className="pv-label text-[10px]">{slide.date}</span>
                              <span
                                className="rounded px-1 py-px text-[9px] font-medium font-mono"
                                style={{
                                  background: 'rgba(34, 211, 238, 0.12)',
                                  color: '#22d3ee',
                                  border: '1px solid rgba(34, 211, 238, 0.2)',
                                }}
                              >
                                {slide.protocol}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteSlide(slide.id) }}
                            className={`ml-1 flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium transition-all border ${
                              confirmingDelete
                                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                : 'bg-transparent border-transparent text-slate-600 hover:text-red-400 hover:border-red-500/40'
                            }`}
                          >
                            {confirmingDelete ? 'Confirm?' : '✕'}
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>

                <div className="px-3 pb-2 space-y-1.5">
                  {/* URL link inputs */}
                  <input
                    type="text"
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    placeholder="Slide name (optional)"
                    className="w-full rounded border border-slate-700/50 bg-slate-800/60 px-2 py-1 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500/50 transition-colors"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder=".dzi or IIIF info.json URL…"
                      className="flex-1 min-w-0 rounded border border-slate-700/50 bg-slate-800/60 px-2 py-1 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500/50 transition-colors"
                    />
                    <button
                      onClick={handleLinkSlide}
                      disabled={!linkUrl.trim() || linkStatus === 'saving'}
                      className={`flex-shrink-0 rounded border px-2 py-1 text-[11px] font-medium transition-all ${
                        linkStatus === 'error'
                          ? 'bg-red-500/10 border-red-500/40 text-red-400'
                          : !linkUrl.trim() || linkStatus === 'saving'
                          ? 'bg-slate-800/40 border-slate-700/40 text-slate-600 cursor-not-allowed'
                          : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20'
                      }`}
                    >
                      {linkStatus === 'saving' ? '…' : linkStatus === 'error' ? 'Error' : 'Add'}
                    </button>
                  </div>

                  {/* Public Library toggle */}
                  <button
                    onClick={() => setLibraryOpen((o) => !o)}
                    className="flex w-full items-center justify-between rounded border border-slate-700/40 bg-slate-800/30 px-2 py-1 text-[10px] text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-colors"
                  >
                    <span className="tracking-widest uppercase">Public Library</span>
                    <svg
                      width="10" height="10" viewBox="0 0 10 10" fill="none"
                      stroke="currentColor" strokeWidth="1.5"
                      style={{ transform: libraryOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
                    >
                      <path d="M1 3l4 4 4-4" />
                    </svg>
                  </button>

                  <AnimatePresence initial={false}>
                    {libraryOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <ul className="space-y-0.5 pt-0.5">
                          {LIBRARY_SLIDES.map((slide) => {
                            const loaded = !!uploadedSlideMetadata[slide.id]
                            const isActive = activeSlideId === slide.id
                            return (
                              <li
                                key={slide.id}
                                className={`flex items-center justify-between rounded px-2 py-1.5 transition-colors ${
                                  isActive ? 'bg-slate-700/60' : 'hover:bg-slate-800/40'
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-[10px] font-medium text-slate-300">{slide.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span
                                      className="rounded px-1 py-px text-[9px] font-mono"
                                      style={{
                                        background: slide.stain === 'Fluorescence'
                                          ? 'rgba(167,139,250,0.12)'
                                          : 'rgba(34,211,238,0.10)',
                                        color: slide.stain === 'Fluorescence' ? '#a78bfa' : '#22d3ee',
                                        border: `1px solid ${slide.stain === 'Fluorescence' ? 'rgba(167,139,250,0.2)' : 'rgba(34,211,238,0.18)'}`,
                                      }}
                                    >
                                      {slide.stain}
                                    </span>
                                    <span className="pv-label text-[9px] truncate">{slide.scanner}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleLoadLibrarySlide(slide)}
                                  className={`ml-2 flex-shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-medium transition-all ${
                                    isActive
                                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                                      : loaded
                                      ? 'bg-slate-700/40 border-slate-600/40 text-slate-400 hover:text-cyan-400'
                                      : 'bg-slate-800/60 border-slate-700/40 text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30'
                                  }`}
                                >
                                  {isActive ? 'Active' : loaded ? 'Switch' : 'Load'}
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                        <p className="mt-1.5 px-1 text-[9px] text-slate-600 leading-tight">
                          Slides from OpenSlide test data · open access
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* — AI ANALYSIS — */}
        <div className="border-b border-slate-800/60">
          <SectionHeader label="AI Analysis" open={aiOpen} onToggle={() => setAiOpen(!aiOpen)} />
          <AnimatePresence initial={false}>
            {aiOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 pt-1 space-y-3">
                  {/* Run Analysis button */}
                  <button
                    onClick={runAnalysis}
                    disabled={aiRunning}
                    className={`w-full flex items-center justify-center gap-2 rounded px-3 py-2 text-[12px] font-semibold transition-all border ${
                      aiRunning
                        ? 'bg-slate-800/60 border-slate-700/40 text-slate-500 cursor-not-allowed'
                        : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/25 hover:border-cyan-500/60'
                    }`}
                    style={aiRunning ? undefined : { boxShadow: '0 0 16px rgba(34,211,238,0.15)' }}
                  >
                    {aiRunning ? (
                      <>
                        {/* Spinner */}
                        <svg
                          className="animate-spin"
                          width="13" height="13" viewBox="0 0 13 13"
                          fill="none" stroke="#64748b" strokeWidth="1.5"
                        >
                          <circle cx="6.5" cy="6.5" r="5" strokeOpacity="0.25" />
                          <path d="M6.5 1.5a5 5 0 0 1 5 5" />
                        </svg>
                        Analyzing…
                      </>
                    ) : (
                      <>
                        {/* Play / nucleus icon */}
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
                          <circle cx="6.5" cy="6.5" r="5.5" />
                          <circle cx="6.5" cy="6.5" r="2" />
                        </svg>
                        Run AI Analysis
                      </>
                    )}
                  </button>

                  {/* Probability threshold slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="pv-label text-[10px]">Probability Threshold</span>
                      <span className="font-mono text-[11px] text-slate-300">{aiThreshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={0.9}
                      step={0.05}
                      value={aiThreshold}
                      onChange={(e) => setAiThreshold(Number(e.target.value))}
                      disabled={aiRunning}
                      className="w-full h-1 appearance-none rounded-full outline-none cursor-pointer disabled:opacity-40"
                      style={{
                        background: `linear-gradient(to right, #22d3ee ${((aiThreshold - 0.1) / 0.8) * 100}%, #1e293b ${((aiThreshold - 0.1) / 0.8) * 100}%)`,
                      }}
                    />
                    <div className="flex justify-between">
                      <span className="pv-label text-[9px]">More detections</span>
                      <span className="pv-label text-[9px]">Fewer / precise</span>
                    </div>
                  </div>

                  {/* Inference result badges */}
                  <AnimatePresence>
                    {aiInferenceTime !== null && !aiRunning && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-between rounded bg-slate-800/50 border border-slate-700/40 px-2 py-1.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                          <span className="font-mono text-[10px] text-emerald-400">
                            {aiInferenceTime}ms
                          </span>
                        </div>
                        {isUsingFallback() && (
                          <span
                            className="rounded px-1.5 py-px text-[9px] font-mono"
                            style={{
                              background: 'rgba(251,191,36,0.12)',
                              color: '#fbbf24',
                              border: '1px solid rgba(251,191,36,0.25)',
                            }}
                          >
                            Fallback detection
                          </span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error state */}
                  <AnimatePresence>
                    {aiError && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[10px] text-red-400 leading-snug"
                      >
                        {aiError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* — PRECISION TOOLS — */}
        <div className="border-b border-slate-800/60">
          <SectionHeader label="Precision Tools" open={toolsOpen} onToggle={() => setToolsOpen(!toolsOpen)} />
          <AnimatePresence initial={false}>
            {toolsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 pt-1 space-y-3">
                  {/* Annotation mode toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {annotationMode && (
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                      )}
                      <span className="pv-label">Annotation Mode</span>
                    </div>
                    <button
                      onClick={() => setAnnotationMode(!annotationMode)}
                      className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium transition-all border ${
                        annotationMode
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                          : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                      style={annotationMode ? { boxShadow: '0 0 10px rgba(34,211,238,0.2)' } : undefined}
                    >
                      <CrosshairIcon />
                      {annotationMode ? 'Active' : 'Enable'}
                    </button>
                  </div>

                  {/* Delete mode toggle */}
                  <div className="flex items-center justify-between">
                    <span className="pv-label">Delete Mode</span>
                    <button
                      onClick={() => {
                        const next = !deleteMode
                        setDeleteMode(next)
                        if (next) setAnnotationMode(false)
                      }}
                      className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium transition-all border ${
                        deleteMode
                          ? 'bg-red-500/15 border-red-500/40 text-red-400'
                          : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                      style={deleteMode ? { boxShadow: '0 0 10px rgba(248,113,113,0.2)' } : undefined}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <path d="M1 3h10M4 3V2h4v1M5 6v3M7 6v3M2 3l1 7h6l1-7" />
                      </svg>
                      {deleteMode ? 'Active' : 'Enable'}
                    </button>
                  </div>

                  {/* Shape picker */}
                  <div className="space-y-1.5">
                    <span className="pv-label text-[10px]">Shape</span>
                    <div className="grid grid-cols-5 gap-1">
                      {(
                        [
                          { id: 'circle' as const,   icon: <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" /> },
                          { id: 'square' as const,   icon: <rect x="2" y="2" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" /> },
                          { id: 'pin' as const,      icon: <><circle cx="7" cy="5" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M7 8v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></> },
                          { id: 'freehand' as const, icon: <path d="M2 11 Q4 3 7 7 Q10 11 12 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /> },
                          { id: 'polygon' as const,  icon: <polygon points="7,2 12,6 10,12 4,12 2,6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /> },
                        ]
                      ).map(({ id, icon }) => {
                        const active = annotationShape === id
                        return (
                          <button
                            key={id}
                            onClick={() => setAnnotationShape(id)}
                            title={id.charAt(0).toUpperCase() + id.slice(1)}
                            className="flex flex-col items-center gap-1 rounded py-1.5 text-[9px] font-medium transition-all border capitalize"
                            style={{
                              background: active ? 'rgba(34,211,238,0.12)' : 'rgba(30,41,59,0.6)',
                              borderColor: active ? 'rgba(34,211,238,0.5)' : 'rgba(51,65,85,0.5)',
                              color: active ? '#22d3ee' : '#64748b',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">{icon}</svg>
                            {id}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Color picker */}
                  <div className="space-y-1.5">
                    <span className="pv-label text-[10px]">Color</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {['#f87171','#4ade80','#60a5fa','#fbbf24','#a78bfa','#f97316','#22d3ee','#94a3b8'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setActiveColor(c)}
                          className="h-5 w-5 rounded-full transition-all"
                          style={{
                            background: c,
                            outline: activeColor === c ? `2px solid ${c}` : '2px solid transparent',
                            outlineOffset: '2px',
                            boxShadow: activeColor === c ? `0 0 8px ${c}88` : 'none',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Label picker (classification — decoupled from color) */}
                  <div className="space-y-1.5">
                    <span className="pv-label text-[10px]">Label</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {ANNOTATION_LABELS.map(({ label }) => {
                        const isActive = annotationLabel === label
                        return (
                          <button
                            key={label}
                            onClick={() => setAnnotationLabel(label)}
                            className="rounded px-2 py-0.5 text-[10px] font-medium transition-all border"
                            style={{
                              background: isActive ? 'rgba(34,211,238,0.1)' : 'rgba(30,41,59,0.6)',
                              borderColor: isActive ? 'rgba(34,211,238,0.4)' : 'rgba(51,65,85,0.5)',
                              color: isActive ? '#22d3ee' : '#64748b',
                            }}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Custom annotation name */}
                  <div className="space-y-1.5">
                    <span className="pv-label text-[10px]">Custom Name <span className="text-slate-600">(optional)</span></span>
                    <input
                      type="text"
                      value={annotationCustomName}
                      onChange={(e) => setAnnotationCustomName(e.target.value)}
                      placeholder="e.g. Ki67+, Mitosis…"
                      maxLength={64}
                      className="w-full rounded border border-slate-700/50 bg-slate-800/60 px-2 py-1 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:ring-0 transition-colors"
                    />
                  </div>

                  {/* Count + Clear row */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-slate-500">
                      <span className="text-slate-300">{annotations.length}</span> placed
                    </span>
                    <AnimatePresence mode="wait">
                      {annotations.length > 0 && (
                        <motion.button
                          key={confirmClear ? 'confirm' : 'clear'}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.12 }}
                          onClick={handleClearAll}
                          className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors border ${
                            confirmClear
                              ? 'bg-red-500/20 border-red-500/50 text-red-400'
                              : 'bg-slate-800/60 border-slate-700/50 text-slate-500 hover:text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {confirmClear ? 'Confirm clear?' : 'Clear all'}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* — LAYER CONTROL — */}
        <div className="border-b border-slate-800/60">
          <SectionHeader label="Layer Control" open={layerOpen} onToggle={() => setLayerOpen(!layerOpen)} />
          <AnimatePresence initial={false}>
            {layerOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <ul className="px-2 pb-2">
                  {LAYERS.map((layer) => (
                    <li
                      key={layer.id}
                      className="flex items-center gap-2 rounded px-1 py-1.5 hover:bg-slate-800/30 cursor-pointer"
                      onClick={() =>
                        setLayerVisibility(
                          layer.id as keyof typeof layerVisibility,
                          !layerVisibility[layer.id as keyof typeof layerVisibility],
                        )
                      }
                    >
                      <EyeIcon visible={layerVisibility[layer.id]} />
                      <span
                        className="text-xs"
                        style={{ color: layerVisibility[layer.id] ? '#cbd5e1' : '#475569' }}
                      >
                        {layer.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* — CHANNEL MIXER — */}
        <div className="border-b border-slate-800/60">
          <SectionHeader label="Channel Mixer" open={channelOpen} onToggle={() => setChannelOpen(!channelOpen)} />
          <AnimatePresence initial={false}>
            {channelOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 px-3 pb-3 pt-1">
                  {CHANNELS.map((ch) => {
                    const state = channels[ch.key]
                    return (
                      <div key={ch.key} className="space-y-1.5">
                        {/* Channel header row */}
                        <div className="flex items-center gap-2">
                          <label
                            className="ch-toggle"
                            style={{ '--accent-color': ch.color } as React.CSSProperties}
                          >
                            <input
                              type="checkbox"
                              checked={state.visible}
                              onChange={(e) => setChannel(ch.key, { visible: e.target.checked })}
                            />
                            <span className="slider" />
                          </label>
                          <span
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ background: ch.color }}
                          />
                          <span className="pv-label flex-1">{ch.label}</span>
                          <span className="pv-value text-[11px]">{state.intensity}</span>
                        </div>

                        {/* Intensity slider */}
                        <div className="relative">
                          <input
                            type="range"
                            min={0}
                            max={255}
                            value={state.intensity}
                            onChange={(e) =>
                              setChannel(ch.key, { intensity: Number(e.target.value) })
                            }
                            className="w-full h-1 appearance-none rounded-full outline-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, ${ch.color} ${(state.intensity / 255) * 100}%, #1e293b ${(state.intensity / 255) * 100}%)`,
                              opacity: state.visible ? 1 : 0.35,
                            }}
                          />
                        </div>

                        {/* Gamma row */}
                        <div className="flex items-center gap-2">
                          <span className="pv-label text-[10px] w-10">γ</span>
                          <input
                            type="range"
                            min={0.2}
                            max={3.0}
                            step={0.05}
                            value={state.gamma}
                            onChange={(e) =>
                              setChannel(ch.key, { gamma: Number(e.target.value) })
                            }
                            className="flex-1 h-1 appearance-none rounded-full outline-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, #475569 ${((state.gamma - 0.2) / 2.8) * 100}%, #1e293b ${((state.gamma - 0.2) / 2.8) * 100}%)`,
                              opacity: state.visible ? 1 : 0.35,
                            }}
                          />
                          <span className="pv-value text-[11px] w-8 text-right">
                            {state.gamma.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
}
