import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SlideMetadata } from '../../server/slideMetadata'
import { usePathologyStore, removeAnnotation, setHoveredAnnotation } from '../../store/pathologyStore'
import { getViewerInstance } from '../../lib/viewerInstance'
import { ANNOTATION_LABELS } from '../../lib/annotationConfig'
import CaseContextPanel from '../Viewer/CaseContextPanel'


interface Props {
  metadata: SlideMetadata | null
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="border-b border-slate-800/60 px-3 py-2">
      <span className="pv-label tracking-widest">{label}</span>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-2 gap-x-2 py-1">
      <span className="pv-label">{label}</span>
      <span className="pv-value truncate">{value}</span>
    </div>
  )
}

function TrashIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M1 3h10M4 3V2h4v1M5 6v3M7 6v3M2 3l1 7h6l1-7" />
    </svg>
  )
}

type Tab = 'analysis' | 'report' | 'case'

export default function RightSidebar({ metadata }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('analysis')
  const activeCase = usePathologyStore((s) => s.activeCase)

  // Auto-switch to Case tab when a case loads; revert when it clears
  useEffect(() => {
    if (activeCase) {
      setActiveTab('case')
    } else {
      setActiveTab((prev) => (prev === 'case' ? 'analysis' : prev))
    }
  }, [activeCase])

  const annotations = usePathologyStore((s) => s.annotations)
  const hoveredAnnotationId = usePathologyStore((s) => s.hoveredAnnotationId)
  const lastSavedAt = usePathologyStore((s) => s.lastSavedAt)
  const aiInferenceTime = usePathologyStore((s) => s.aiInferenceTime)
  const aiThreshold = usePathologyStore((s) => s.aiThreshold)

  const total = annotations.length || 1 // avoid div/0
  const liveCellData = ANNOTATION_LABELS.map(({ label, color }) => {
    const count = annotations.filter((a) => a.label === label).length
    return { type: label, count, areaPercent: Math.round((count / total) * 1000) / 10, color }
  })

  const recentAnnotations = [...annotations]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8)

  const regionStats = useMemo(() => {
    if (annotations.length === 0) return null
    const xs = annotations.map((a) => a.imageCoords.x)
    const ys = annotations.map((a) => a.imageCoords.y)
    const x1 = Math.min(...xs)
    const y1 = Math.min(...ys)
    const x2 = Math.max(...xs)
    const y2 = Math.max(...ys)
    const mpp = metadata?.micronsPerPixel ?? 0
    const widthPx = x2 - x1
    const heightPx = y2 - y1
    const areaMicrons = mpp > 0 ? Math.round(widthPx * heightPx * mpp * mpp) : null
    const perimeterMicrons = mpp > 0 ? Math.round(2 * (widthPx + heightPx) * mpp) : null
    const cellDensity = areaMicrons && areaMicrons > 0
      ? Math.round(annotations.length / (areaMicrons / 1_000_000))
      : null
    return { x1, y1, x2, y2, areaMicrons, perimeterMicrons, cellDensity }
  }, [annotations, metadata?.micronsPerPixel])

  const flyTo = async (x: number, y: number) => {
    const viewer = getViewerInstance()
    if (!viewer) return
    const OSD = (await import('openseadragon')).default
    const viewportPoint = viewer.viewport.imageToViewportCoordinates(new OSD.Point(x, y))
    viewer.viewport.panTo(viewportPoint, false)
    viewer.viewport.zoomTo(4, viewportPoint, false)
  }

  // CSV export — all clinical coordinates and labels, fully client-side
  const exportCSV = () => {
    const header = 'id,slide_id,label,x,y,created_at_iso\n'
    const rows = annotations
      .map((ann) => [
        ann.id,
        'slide-001',
        ann.label,
        ann.imageCoords.x.toFixed(2),
        ann.imageCoords.y.toFixed(2),
        new Date(ann.createdAt).toISOString(),
      ].join(','))
      .join('\n')

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pathshare_annotations_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const lastSavedLabel = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  return (
    <aside
      className="flex w-[320px] flex-shrink-0 flex-col overflow-hidden border-l border-slate-800/60"
      style={{ background: 'rgba(15, 23, 42, 0.95)' }}
    >
      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 border-b border-slate-800/60">
        {(['analysis', 'report'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-[11px] font-medium tracking-widest uppercase transition-colors relative ${
              activeTab === tab ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab === 'analysis' ? 'Analysis' : 'Report'}
            {activeTab === tab && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-px bg-cyan-400"
              />
            )}
          </button>
        ))}
        {activeCase && (
          <button
            onClick={() => setActiveTab('case')}
            className={`flex-1 py-2 text-[11px] font-medium tracking-widest uppercase transition-colors relative ${
              activeTab === 'case' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Case
            {activeTab === 'case' && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-px bg-cyan-400"
              />
            )}
          </button>
        )}
      </div>

      {/* ── Analysis Tab ───────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === 'analysis' && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col overflow-y-auto flex-1"
          >
            {/* — SLIDE METADATA — */}
            <div className="border-b border-slate-800/60">
              <div className="flex items-center justify-between border-b border-slate-800/60 px-3 py-2">
                <span className="pv-label tracking-widest">Slide Metadata</span>
                {lastSavedLabel && (
                  <span className="font-mono text-[9px] text-slate-600">
                    saved {lastSavedLabel}
                  </span>
                )}
              </div>
              <div className="px-3 py-2 space-y-px">
                {metadata ? (
                  <>
                    <MetaRow label="ID" value={metadata.name} />
                    <MetaRow label="Tissue" value={metadata.tissueType} />
                    <MetaRow label="Stain" value={metadata.stainProtocol} />
                    <MetaRow label="Objective" value={metadata.objectiveLens} />
                    <MetaRow label="MPP" value={`${metadata.micronsPerPixel} µm/px`} />
                    <MetaRow
                      label="Dimensions"
                      value={`${metadata.dimensions.width.toLocaleString()} × ${metadata.dimensions.height.toLocaleString()}`}
                    />
                    <MetaRow label="Scan Date" value={metadata.scanDate} />
                    <MetaRow label="Scanner" value={metadata.scanner} />
                    <MetaRow label="File Size" value={metadata.fileSize} />
                  </>
                ) : (
                  <p className="py-2 text-xs text-slate-500">Loading metadata…</p>
                )}
              </div>
            </div>

            {/* — QUANTITATIVE ANALYSIS — */}
            <div className="border-b border-slate-800/60">
              <SectionHeader label="Quantitative Analysis" />
              <div className="px-2 py-2">
                <div className="grid grid-cols-[80px_1fr_44px_52px] gap-x-1 px-1 pb-1">
                  <span className="pv-label text-[10px]">Cell Type</span>
                  <span className="pv-label text-[10px]">Distribution</span>
                  <span className="pv-label text-[10px] text-right">Count</span>
                  <span className="pv-label text-[10px] text-right">Int.</span>
                </div>
                {liveCellData.map((row) => (
                  <div
                    key={row.type}
                    className="grid grid-cols-[80px_1fr_44px_52px] items-center gap-x-1 rounded px-1 py-1 hover:bg-slate-800/30"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: row.color }} />
                      <span className="pv-value text-[11px] text-slate-300">{row.type}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="relative h-1.5 flex-1 rounded-full bg-slate-800">
                        <motion.div
                          className="absolute left-0 top-0 h-full rounded-full"
                          animate={{ width: `${Math.min(row.areaPercent, 100)}%` }}
                          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                          style={{ background: row.color, opacity: 0.7 }}
                        />
                      </div>
                      <span className="pv-value w-7 text-right text-[10px] text-slate-400">
                        {row.areaPercent}%
                      </span>
                    </div>
                    <span className="pv-value text-right text-[10px]">{row.count.toLocaleString()}</span>
                    <span className="pv-value text-right text-[10px] text-slate-600">—</span>
                  </div>
                ))}
              </div>
            </div>

            {/* — RECENT ANNOTATIONS — */}
            <div className="border-b border-slate-800/60">
              <div className="flex items-center justify-between border-b border-slate-800/60 px-3 py-2">
                <span className="pv-label tracking-widest">Recent Annotations</span>
                {annotations.length > 0 && (
                  <span className="font-mono text-[10px] text-slate-500">{annotations.length} total</span>
                )}
              </div>
              {annotations.length === 0 ? (
                <p className="px-3 py-4 text-[11px] text-slate-600 text-center">
                  No annotations placed yet.
                  <br />
                  Enable Annotation Mode to begin.
                </p>
              ) : (
                <ul className="py-1">
                  <AnimatePresence initial={false}>
                    {recentAnnotations.map((ann) => {
                      const isHovered = hoveredAnnotationId === ann.id
                      return (
                        <motion.li
                          key={ann.id}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                          className="group mx-1 mb-0.5 flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition-colors"
                          style={{ background: isHovered ? 'rgba(30,41,59,0.8)' : 'transparent' }}
                          onClick={() => flyTo(ann.imageCoords.x, ann.imageCoords.y)}
                          onMouseEnter={() => setHoveredAnnotation(ann.id)}
                          onMouseLeave={() => setHoveredAnnotation(null)}
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: ann.color, boxShadow: isHovered ? `0 0 6px ${ann.color}` : 'none' }}
                          />
                          <span
                            className="rounded px-1.5 py-px text-[9px] font-medium font-mono shrink-0"
                            style={{ background: `${ann.color}22`, color: ann.color, border: `1px solid ${ann.color}44` }}
                          >
                            {ann.label}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 flex-1 truncate">
                            {Math.round(ann.imageCoords.x).toLocaleString()},{' '}
                            {Math.round(ann.imageCoords.y).toLocaleString()}
                          </span>
                          <button
                            className="shrink-0 text-slate-700 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                            onClick={(e) => { e.stopPropagation(); removeAnnotation(ann.id) }}
                            title="Remove annotation"
                          >
                            <TrashIcon />
                          </button>
                        </motion.li>
                      )
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* — REGION STATISTICS — */}
            <div>
              <SectionHeader label="Region Statistics" />
              <div className="px-3 py-2 space-y-1.5">
                {!regionStats ? (
                  <p className="pv-label text-[10px] italic">Place annotations to compute statistics.</p>
                ) : (
                  <>
                    <div>
                      <span className="pv-label text-[10px]">Bounding Box (px)</span>
                      <div className="mt-0.5 grid grid-cols-2 gap-x-4">
                        {([['X₁', regionStats.x1], ['Y₁', regionStats.y1], ['X₂', regionStats.x2], ['Y₂', regionStats.y2]] as const).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="pv-label text-[10px]">{k}</span>
                            <span className="pv-value text-[11px]">{Math.round(v).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-slate-800/40 pt-1.5 space-y-1">
                      <div className="flex justify-between">
                        <span className="pv-label">Area</span>
                        <span className="pv-value">
                          {regionStats.areaMicrons !== null ? `${regionStats.areaMicrons.toLocaleString()} µm²` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="pv-label">Perimeter</span>
                        <span className="pv-value">
                          {regionStats.perimeterMicrons !== null ? `${regionStats.perimeterMicrons.toLocaleString()} µm` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="pv-label">Cell Density</span>
                        <span className="pv-value">
                          {regionStats.cellDensity !== null ? `${regionStats.cellDensity.toLocaleString()} cells/mm²` : '—'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Report Tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'report' && (
          <motion.div
            key="report"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col overflow-y-auto flex-1 px-3 py-4 space-y-4"
          >
            {/* Session summary */}
            <div className="space-y-2">
              <span className="pv-label tracking-widest">Session Summary</span>
              <div className="rounded bg-slate-800/40 border border-slate-700/40 px-3 py-2 space-y-1.5">
                <div className="flex justify-between">
                  <span className="pv-label">Total annotations</span>
                  <span className="font-mono text-[11px] text-slate-200">{annotations.length}</span>
                </div>
                {lastSavedLabel && (
                  <div className="flex justify-between">
                    <span className="pv-label">Last saved</span>
                    <span className="font-mono text-[11px] text-emerald-400">{lastSavedLabel}</span>
                  </div>
                )}
                {aiInferenceTime != null && (
                  <>
                    <div className="flex justify-between">
                      <span className="pv-label">AI inference time</span>
                      <span className="font-mono text-[11px] text-cyan-400">{aiInferenceTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="pv-label">Detection threshold</span>
                      <span className="font-mono text-[11px] text-slate-300">{aiThreshold.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Per-label breakdown */}
            <div className="space-y-2">
              <span className="pv-label tracking-widest">Label Breakdown</span>
              <div className="rounded bg-slate-800/40 border border-slate-700/40 divide-y divide-slate-800/60">
                {ANNOTATION_LABELS.map(({ label, color }) => {
                  const count = annotations.filter((a) => a.label === label).length
                  return (
                    <div key={label} className="flex items-center justify-between px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
                        <span className="pv-value text-[11px]">{label}</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-300">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Export CSV */}
            <div className="space-y-2">
              <span className="pv-label tracking-widest">Export</span>
              <button
                onClick={exportCSV}
                disabled={annotations.length === 0}
                className="w-full flex items-center justify-center gap-2 rounded px-3 py-2 text-[12px] font-semibold transition-all border bg-slate-800/60 border-slate-700/50 text-slate-300 hover:border-slate-600 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M6.5 1v7M3.5 5.5l3 3 3-3M1.5 10h10" />
                </svg>
                Export CSV ({annotations.length} annotations)
              </button>
              <p className="text-[10px] text-slate-600 leading-snug">
                Exports all annotation coordinates, labels, and timestamps as a
                clinical-grade CSV file.
              </p>
            </div>

            {/* Metadata JSON preview */}
            {metadata && (
              <div className="space-y-2">
                <span className="pv-label tracking-widest">Slide Metadata JSON</span>
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${metadata.name}_metadata.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded px-3 py-2 text-[12px] font-semibold transition-all border bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <rect x="2" y="1" width="9" height="11" rx="1" />
                    <path d="M4 4h5M4 6.5h5M4 9h3" />
                  </svg>
                  Export Slide Metadata
                </button>
              </div>
            )}
          </motion.div>
        )}
        {/* ── Case Tab ───────────────────────────────────────────────────────── */}
        {activeTab === 'case' && activeCase && (
          <motion.div
            key="case"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col overflow-y-auto flex-1"
          >
            <CaseContextPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  )
}
