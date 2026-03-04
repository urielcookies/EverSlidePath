import { useEffect, useRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  usePathologyStore,
  setZoomLevel,
  setViewportCenter,
  addAnnotation,
  type AnnotationLabel,
} from '../../store/pathologyStore'

const RING_R = 28
const RING_CIRC = 2 * Math.PI * RING_R
import { setViewerInstance } from '../../lib/viewerInstance'
import { LABEL_COLOR_MAP } from '../../lib/annotationConfig'

export default function PathologyViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const annotationModeRef = useRef(false)
  const annotationLabelRef = useRef<AnnotationLabel>('Tumor')

  // scale=0 on init so SVG stays hidden until OSD fires update-viewport
  const [svgTransform, setSvgTransform] = useState({ tx: 0, ty: 0, scale: 0 })

  const zoomLevel = usePathologyStore((s) => s.zoomLevel)
  const center = usePathologyStore((s) => s.viewportCenter)
  const channels = usePathologyStore((s) => s.channels)
  const annotationMode = usePathologyStore((s) => s.annotationMode)
  const annotationLabel = usePathologyStore((s) => s.annotationLabel)
  const annotations = usePathologyStore((s) => s.annotations)
  const hoveredAnnotationId = usePathologyStore((s) => s.hoveredAnnotationId)
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
        tileSources: 'https://openseadragon.github.io/example-images/highsmith/highsmith.dzi',
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
        // @ts-expect-error — backgroundColor is valid OSD option, missing from @types/openseadragon
        backgroundColor: '#020617',
      })

      viewerRef.current = viewer
      setViewerInstance(viewer)

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
      viewer.addHandler('update-viewport', () => {
        const origin = viewer.viewport.imageToViewerElementCoordinates(new OSD.Point(0, 0))
        const scalePoint = viewer.viewport.imageToViewerElementCoordinates(new OSD.Point(1, 0))
        const s = scalePoint.x - origin.x
        setSvgTransform({ tx: origin.x, ty: origin.y, scale: s > 0 ? s : 1 })
      })

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

  const pxX = Math.round(center.x * 46000)
  const pxY = Math.round(center.y * 32914)

  // Scale-compensated sizes keep markers visually constant across zoom levels
  const markerR = 6 / Math.max(svgTransform.scale, 0.001)
  const markerSW = 1.5 / Math.max(svgTransform.scale, 0.001)
  const markerSWHovered = 3 / Math.max(svgTransform.scale, 0.001)

  return (
    <div className="relative flex-1 overflow-hidden bg-[#020617]">
      {/* OSD container */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{
          filter: channelFilter,
          cursor: annotationMode ? 'crosshair' : undefined,
        }}
      />

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
                return (
                  <motion.circle
                    key={ann.id}
                    cx={ann.imageCoords.x}
                    cy={ann.imageCoords.y}
                    r={isHovered ? markerR * 1.35 : markerR}
                    fill={ann.color}
                    fillOpacity={isHovered ? 0.6 : 0.45}
                    stroke={ann.color}
                    strokeWidth={isHovered ? markerSWHovered : markerSW}
                    filter={isHovered ? 'url(#marker-glow-pulse)' : 'url(#marker-glow)'}
                    style={{
                      pointerEvents: 'all',
                      cursor: 'pointer',
                      transformBox: 'fill-box',
                      transformOrigin: 'center',
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 22 }}
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

            {/* Frosted-glass vignette — dims tile during analysis */}
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
                  {/* Track */}
                  <circle
                    cx="36" cy="36" r={RING_R}
                    fill="none"
                    stroke="rgba(34,211,238,0.12)"
                    strokeWidth="3"
                  />
                  {/* Progress arc */}
                  <motion.circle
                    cx="36" cy="36" r={RING_R}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="3"
                    strokeLinecap="round"
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

      {/* Zoom badge — bottom left above controls */}
      <div className="absolute bottom-32 left-4 z-10">
        <span className="font-mono text-xs bg-slate-900/80 border border-slate-700/50 text-cyan-400 px-2 py-0.5 rounded">
          {zoomLevel.toFixed(1)}×
        </span>
      </div>

      {/* Annotation mode indicator — top center */}
      <AnimatePresence>
        {annotationMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-3 left-1/2 z-10 -translate-x-1/2"
          >
            <div className="flex items-center gap-2 rounded-full bg-slate-900/90 border border-cyan-500/40 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-mono text-[11px] text-cyan-400 tracking-widest uppercase">
                Annotation Mode
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
