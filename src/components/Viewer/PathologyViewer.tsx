import { useEffect, useRef, useCallback } from 'react'
import {
  usePathologyStore,
  setZoomLevel,
  setViewportCenter,
} from '../../store/pathologyStore'

export default function PathologyViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<ReturnType<typeof import('openseadragon')['default']> | null>(null)

  const zoomLevel = usePathologyStore((s) => s.zoomLevel)
  const center = usePathologyStore((s) => s.viewportCenter)
  const channels = usePathologyStore((s) => s.channels)

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
        backgroundColor: '#020617',
      })

      viewerRef.current = viewer

      viewer.addHandler('zoom', ({ zoom }: { zoom: number }) => {
        setZoomLevel(Math.round(zoom * 10) / 10)
      })

      viewer.addHandler('pan', ({ center: c }: { center: { x: number; y: number } }) => {
        setViewportCenter(
          Math.round(c.x * 10000) / 10000,
          Math.round(c.y * 10000) / 10000,
        )
      })
    }

    initViewer()

    return () => {
      destroyed = true
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [])

  const pxX = Math.round(center.x * 46000)
  const pxY = Math.round(center.y * 32914)

  return (
    <div className="relative flex-1 overflow-hidden bg-[#020617]">
      {/* OSD container */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ filter: channelFilter }}
      />

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

      {/* Coordinates readout — bottom center */}
      <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
        <span className="font-mono text-xs bg-slate-900/80 border border-slate-700/50 text-slate-400 px-3 py-1 rounded">
          X: {pxX.toLocaleString()} | Y: {pxY.toLocaleString()} px
        </span>
      </div>
    </div>
  )
}
