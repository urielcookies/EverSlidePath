import { useEffect, useRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  usePathologyStore,
  setZoomLevel,
  setViewportCenter,
  addAnnotation,
  removeAnnotation,
  updateAnnotationCoords,
  type AnnotationLabel,
  type Annotation,
} from '../../store/pathologyStore'
import { setViewerInstance } from '../../lib/viewerInstance'
import { LABEL_COLOR_MAP } from '../../lib/annotationConfig'
import { deleteAnnotationFn } from '../../server/annotationFunctions'

const RING_R = 28
const RING_CIRC = 2 * Math.PI * RING_R

interface DragState {
  id: string
  imgX: number
  imgY: number
}

interface PathologyViewerProps {
  tilesUrl: string | { type: string; url: string }
  imageWidth: number
  imageHeight: number
}

export default function PathologyViewer({ tilesUrl, imageWidth, imageHeight }: PathologyViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const annotationModeRef = useRef(false)
  const annotationLabelRef = useRef<AnnotationLabel>('Tumor')

  // scale=0 on init so SVG stays hidden until OSD fires update-viewport
  const [svgTransform, setSvgTransform] = useState({ tx: 0, ty: 0, scale: 0 })
  // Drag state — tracks the annotation being moved and its live image coords
  const [dragState, setDragState] = useState<DragState | null>(null)
  // True once OSD fires the `open` event (tiles loaded, black box gone)
  const [tilesLoaded, setTilesLoaded] = useState(false)

  const zoomLevel = usePathologyStore((s) => s.zoomLevel)
  const center = usePathologyStore((s) => s.viewportCenter)
  const channels = usePathologyStore((s) => s.channels)
  const annotationMode = usePathologyStore((s) => s.annotationMode)
  const annotationLabel = usePathologyStore((s) => s.annotationLabel)
  const annotations = usePathologyStore((s) => s.annotations)
  const hoveredAnnotationId = usePathologyStore((s) => s.hoveredAnnotationId)
  const deleteMode = usePathologyStore((s) => s.deleteMode)
  const aiRunning = usePathologyStore((s) => s.aiRunning)
  const aiProgress = usePathologyStore((s) => s.aiProgress)

  // Sync refs into OSD event handlers — avoids stale closure
  useEffect(() => { annotationModeRef.current = annotationMode }, [annotationMode])
  useEffect(() => { annotationLabelRef.current = annotationLabel }, [annotationLabel])

  // Build CSS filter from channel states (cosmetic approximation)
  const channelFilter = (() => {
    const dapi = channels.dapi
    const fitc = channels.fitc
    const tritc = channels.tritc

    const brightness = (
      ((dapi.visible ? dapi.intensity : 0) +
        (fitc.visible ? fitc.intensity : 0) +
        (tritc.visible ? tritc.intensity : 0)) /
      (3 * 255)
    ) * 1.4 + 0.3

    const hue = fitc.visible && !dapi.visible ? 120 : tritc.visible && !fitc.visible ? 20 : 0
    const saturation = (dapi.visible || fitc.visible || tritc.visible) ? 120 : 0

    return `brightness(${brightness.toFixed(2)}) saturate(${saturation}%) hue-rotate(${hue}deg)`
  })()

  const handleZoomIn = useCallback(() => {
    viewerRef.current?.viewport.zoomBy(1.5)
    viewerRef.current?.viewport.applyConstraints()
  }, [])

  const handleZoomOut = useCallback(() => {
    viewerRef.current?.viewport.zoomBy(0.67)
    viewerRef.current?.viewport.applyConstraints()
  }, [])

  const handleHome = useCallback(() => {
    viewerRef.current?.viewport.goHome(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!containerRef.current) return

    let destroyed = false

    const initViewer = async () => {
      const OSD = (await import('openseadragon')).default

      if (destroyed || !containerRef.current) return

      const viewer = OSD({
        element: containerRef.current,
        tileSources: tilesUrl,
        showNavigator: true,
        navigatorPosition: 'BOTTOM_RIGHT',
        navigatorSizeRatio: 0.15,
        showNavigationControl: false,
        animationTime: 0.4,
        blendTime: 0.1,
        constrainDuringPan: true,
        maxZoomPixelRatio: 4,
        minZoomImageRatio: 0.8,
        visibilityRatio: 0.5,
        springStiffness: 6.5,
        zoomPerClick: 1.4,
        gestureSettingsMouse: { flickEnabled: true, flickMinSpeed: 20, flickMomentum: 0.4 },
        crossOriginPolicy: 'Anonymous',
        loadTilesWithAjax: true,
        // @ts-expect-error — backgroundColor is valid OSD option, missing from @types/openseadragon
        backgroundColor: '#020617',
      })

      viewerRef.current = viewer
      setViewerInstance(viewer)

      // Shared helper — keeps markers pinned to tissue coords (O(1) per call)
      const syncViewportTransform = () => {
        const origin = viewer.viewport.imageToViewerElementCoordinates(new OSD.Point(0, 0))
        const scalePoint = viewer.viewport.imageToViewerElementCoordinates(new OSD.Point(1, 0))
        const s = scalePoint.x - origin.x
        setSvgTransform({ tx: origin.x, ty: origin.y, scale: s > 0 ? s : 1 })
      }

      // `open` fires once the tile source is parsed — force-init coords immediately
      // so Annotation Mode works before any pan/zoom event fires.
      viewer.addHandler('open', () => {
        console.log('OSD Viewer Initialized')
        setTilesLoaded(true)
        syncViewportTransform()
      })

      viewer.addHandler('zoom', ({ zoom }: { zoom: number }) => {
        setZoomLevel(Math.round(zoom * 10) / 10)
      })

      viewer.addHandler('pan', ({ center: c }: { center: { x: number; y: number } }) => {
        setViewportCenter(
          Math.round(c.x * 10000) / 10000,
          Math.round(c.y * 10000) / 10000,
        )
      })

      // O(1) per frame: single <g> transform keeps all markers pinned to tissue
      viewer.addHandler('update-viewport', syncViewportTransform)

      // Click-to-annotate: preventDefaultAction suppresses OSD zoom-on-click
      viewer.addHandler('canvas-click', (event: any) => {
        if (!annotationModeRef.current) return
        event.preventDefaultAction = true
        const pt = viewer.viewport.viewerElementToImageCoordinates(event.position)
        addAnnotation({
          id: crypto.randomUUID(),
          type: 'point',
          imageCoords: { x: pt.x, y: pt.y },
          label: annotationLabelRef.current,
          color: LABEL_COLOR_MAP[annotationLabelRef.current],
          createdAt: Date.now(),
        })
      })
    }

    initViewer()

    return () => {
      destroyed = true
      setViewerInstance(null)
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [])

  // Re-open viewer when the tile source changes (slide navigation)
  const tilesUrlKey = typeof tilesUrl === 'string' ? tilesUrl : `${tilesUrl.type}::${tilesUrl.url}`
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (!viewerRef.current) return
    setTilesLoaded(false)
    viewerRef.current.open(tilesUrl)
  }, [tilesUrlKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Marker drag handlers ────────────────────────────────────────────────────
  // Uses setPointerCapture so move/up events fire on the circle even if pointer
  // leaves it. Converts SVG pointer coords → image coords via inverse of <g> transform.
  const svgTransformRef = useRef(svgTransform)
  useEffect(() => { svgTransformRef.current = svgTransform }, [svgTransform])

  const handleMarkerPointerDown = useCallback((
    ann: Annotation,
    e: React.PointerEvent<SVGCircleElement>,
  ) => {
    if (deleteMode || annotationMode) return
    e.stopPropagation()
    ;(e.target as SVGCircleElement).setPointerCapture(e.pointerId)
    setDragState({ id: ann.id, imgX: ann.imageCoords.x, imgY: ann.imageCoords.y })
    // Disable OSD pan while dragging
    viewerRef.current?.setMouseNavEnabled(false)
  }, [deleteMode, annotationMode])

  const handleMarkerPointerMove = useCallback((
    id: string,
    e: React.PointerEvent<SVGCircleElement>,
  ) => {
    if (!dragState || dragState.id !== id) return
    const svg = (e.target as SVGCircleElement).ownerSVGElement!
    const rect = svg.getBoundingClientRect()
    const svgX = e.clientX - rect.left
    const svgY = e.clientY - rect.top
    const { tx, ty, scale } = svgTransformRef.current
    setDragState({ id, imgX: (svgX - tx) / scale, imgY: (svgY - ty) / scale })
  }, [dragState])

  const handleMarkerPointerUp = useCallback((
    e: React.PointerEvent<SVGCircleElement>,
  ) => {
    if (!dragState) return
    ;(e.target as SVGCircleElement).releasePointerCapture(e.pointerId)
    updateAnnotationCoords(dragState.id, dragState.imgX, dragState.imgY)
    setDragState(null)
    viewerRef.current?.setMouseNavEnabled(!annotationMode)
  }, [dragState, annotationMode])

  const handleMarkerClick = useCallback((ann: Annotation) => {
    if (!deleteMode) return
    removeAnnotation(ann.id)
    deleteAnnotationFn({ data: { id: ann.id } }).catch(console.error)
  }, [deleteMode])

  const pxX = Math.round(center.x * imageWidth)
  const pxY = Math.round(center.y * imageHeight)

  // Scale-compensated sizes keep markers visually constant across zoom levels
  const scale = Math.max(svgTransform.scale, 0.001)
  const markerR = 6 / scale
  const markerSW = 1.5 / scale
  const markerSWHovered = 3 / scale

  // Active mode for top indicator
  const activeModeLabel = deleteMode ? 'Delete Mode' : annotationMode ? 'Annotation Mode' : null
  const activeModeColor = deleteMode ? '#f87171' : '#22d3ee'
  const activeModeRingColor = deleteMode ? 'rgba(248,113,113,0.4)' : 'rgba(34,211,238,0.4)'

  return (
    <div className="relative flex-1 overflow-hidden bg-[#020617]">
      {/* OSD container */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{
          filter: channelFilter,
          cursor: deleteMode ? 'not-allowed' : annotationMode ? 'crosshair' : undefined,
        }}
      />

      {/* Loading overlay — fades out once OSD fires `open` (tiles fetched) */}
      <AnimatePresence>
        {!tilesLoaded && (
          <motion.div
            key="tiles-loading"
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#020617] pointer-events-none"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mb-3">
              <circle cx="20" cy="20" r="16" stroke="rgba(34,211,238,0.12)" strokeWidth="2.5" />
              <motion.circle
                cx="20" cy="20" r="16"
                stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 16 * 0.25} ${2 * Math.PI * 16 * 0.75}`}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, ease: 'linear', repeat: Infinity }}
                style={{ transformOrigin: '20px 20px' }}
              />
            </svg>
            <span className="font-mono text-[11px] text-slate-500 tracking-widest uppercase">
              Loading tiles…
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SVG annotation overlay — hidden until first update-viewport fires */}
      {svgTransform.scale > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 5 }}
        >
          <defs>
            <filter id="marker-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="marker-glow-pulse" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Single <g> transform: O(1) DOM update per viewport event */}
          <g transform={`translate(${svgTransform.tx}, ${svgTransform.ty}) scale(${svgTransform.scale})`}>
            <AnimatePresence>
              {annotations.map((ann) => {
                const isHovered = hoveredAnnotationId === ann.id
                const isDragging = dragState?.id === ann.id
                const cx = isDragging ? dragState.imgX : ann.imageCoords.x
                const cy = isDragging ? dragState.imgY : ann.imageCoords.y
                const r = (isHovered || isDragging) ? markerR * 1.35 : markerR
                const sw = (isHovered || isDragging) ? markerSWHovered : markerSW
                return (
                  <motion.circle
                    key={ann.id}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={ann.color}
                    fillOpacity={isDragging ? 0.8 : isHovered ? 0.6 : 0.45}
                    stroke={deleteMode ? '#f87171' : ann.color}
                    strokeWidth={sw}
                    strokeDasharray={deleteMode ? `${4 / scale} ${4 / scale}` : undefined}
                    filter={(isHovered || isDragging) ? 'url(#marker-glow-pulse)' : 'url(#marker-glow)'}
                    style={{
                      pointerEvents: 'all',
                      cursor: deleteMode ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
                      transformBox: 'fill-box',
                      transformOrigin: 'center',
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                    onPointerDown={(e) => handleMarkerPointerDown(ann, e)}
                    onPointerMove={(e) => handleMarkerPointerMove(ann.id, e)}
                    onPointerUp={handleMarkerPointerUp}
                    onClick={() => handleMarkerClick(ann)}
                  />
                )
              })}
            </AnimatePresence>
          </g>
        </svg>
      )}

      {/* AI scanning laser + progress ring */}
      <AnimatePresence>
        {aiRunning && (
          <>
            {/* Scanning laser line — sweeps top→bottom, loops */}
            <motion.div
              key="laser"
              className="absolute inset-x-0 z-20 h-[2px] pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, #22d3ee 30%, #a78bfa 70%, transparent 100%)',
                boxShadow: '0 0 12px #22d3ee, 0 0 30px #22d3ee66',
              }}
              initial={{ top: '0%' }}
              animate={{ top: '100%' }}
              transition={{ duration: 1.6, ease: 'linear', repeat: Infinity }}
            />

            {/* Frosted-glass vignette */}
            <motion.div
              key="vignette"
              className="absolute inset-0 z-20 pointer-events-none"
              style={{ background: 'rgba(2,6,23,0.45)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />

            {/* Progress ring — center of viewer */}
            <motion.div
              key="ring"
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative flex items-center justify-center">
                <svg width="72" height="72" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r={RING_R} fill="none" stroke="rgba(34,211,238,0.12)" strokeWidth="3" />
                  <motion.circle
                    cx="36" cy="36" r={RING_R}
                    fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={RING_CIRC}
                    animate={{ strokeDashoffset: RING_CIRC * (1 - aiProgress / 100) }}
                    initial={{ strokeDashoffset: RING_CIRC }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    style={{ rotate: -90, transformOrigin: '36px 36px' }}
                  />
                </svg>
                <span className="absolute font-mono text-[12px] font-semibold text-cyan-400">
                  {aiProgress}%
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Zoom controls — bottom left */}
      <div className="absolute bottom-12 left-4 z-10 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="flex h-8 w-8 items-center justify-center rounded bg-slate-800/90 text-slate-200 text-lg font-light hover:bg-slate-700 transition-colors border border-slate-700/60 select-none"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="flex h-8 w-8 items-center justify-center rounded bg-slate-800/90 text-slate-200 text-lg font-light hover:bg-slate-700 transition-colors border border-slate-700/60 select-none"
          title="Zoom out"
        >
          −
        </button>
        <button
          onClick={handleHome}
          className="flex h-8 w-8 items-center justify-center rounded bg-slate-800/90 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700/60 select-none"
          title="Reset view"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M7 1L1 6h2v6h8V6h2L7 1z" />
          </svg>
        </button>
      </div>

      {/* Zoom badge */}
      <div className="absolute bottom-32 left-4 z-10">
        <span className="font-mono text-xs bg-slate-900/80 border border-slate-700/50 text-cyan-400 px-2 py-0.5 rounded">
          {zoomLevel.toFixed(1)}×
        </span>
      </div>

      {/* Active mode indicator — top center */}
      <AnimatePresence>
        {activeModeLabel && (
          <motion.div
            key={activeModeLabel}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-3 left-1/2 z-10 -translate-x-1/2"
          >
            <div
              className="flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-1"
              style={{ border: `1px solid ${activeModeRingColor}` }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse flex-shrink-0"
                style={{ background: activeModeColor }}
              />
              <span
                className="font-mono text-[11px] tracking-widest uppercase"
                style={{ color: activeModeColor }}
              >
                {activeModeLabel}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coordinates readout — bottom center */}
      <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
        <span className="font-mono text-xs bg-slate-900/80 border border-slate-700/50 text-slate-400 px-3 py-1 rounded">
          X: {pxX.toLocaleString()} | Y: {pxY.toLocaleString()} px
        </span>
      </div>
    </div>
  )
}
