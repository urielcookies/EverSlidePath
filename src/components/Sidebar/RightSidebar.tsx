import { motion, AnimatePresence } from 'framer-motion'
import type { SlideMetadata } from '../../server/slideMetadata'
import { usePathologyStore, removeAnnotation, setHoveredAnnotation } from '../../store/pathologyStore'
import { getViewerInstance } from '../../lib/viewerInstance'
import { ANNOTATION_LABELS } from '../../lib/annotationConfig'

const REGION_STATS = {
  x1: 18_240,
  y1: 12_880,
  x2: 26_400,
  y2: 19_620,
  areaMicrons: 43_218,
  perimeter: 29_840,
  cellDensity: 1_840,
}

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

export default function RightSidebar({ metadata }: Props) {
  const annotations = usePathologyStore((s) => s.annotations)
  const hoveredAnnotationId = usePathologyStore((s) => s.hoveredAnnotationId)

  const total = annotations.length || 1 // avoid div/0
  const liveCellData = ANNOTATION_LABELS.map(({ label, color }) => {
    const count = annotations.filter((a) => a.label === label).length
    return {
      type: label,
      count,
      areaPercent: Math.round((count / total) * 1000) / 10,
      color,
    }
  })

  const recentAnnotations = [...annotations]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8)

  const flyTo = async (x: number, y: number) => {
    const viewer = getViewerInstance()
    if (!viewer) return
    const OSD = (await import('openseadragon')).default
    const viewportPoint = viewer.viewport.imageToViewportCoordinates(new OSD.Point(x, y))
    viewer.viewport.panTo(viewportPoint, false)
    viewer.viewport.zoomTo(4, viewportPoint, false)
  }

  return (
    <aside
      className="flex w-[320px] flex-shrink-0 flex-col overflow-y-auto border-l border-slate-800/60"
      style={{ background: 'rgba(15, 23, 42, 0.95)' }}
    >
      {/* — SLIDE METADATA — */}
      <div className="border-b border-slate-800/60">
        <SectionHeader label="Slide Metadata" />
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
          {/* Table header */}
          <div className="grid grid-cols-[80px_1fr_44px_52px] gap-x-1 px-1 pb-1">
            <span className="pv-label text-[10px]">Cell Type</span>
            <span className="pv-label text-[10px]">Distribution</span>
            <span className="pv-label text-[10px] text-right">Count</span>
            <span className="pv-label text-[10px] text-right">Int.</span>
          </div>

          {/* Table rows — live from store */}
          {liveCellData.map((row) => (
            <div
              key={row.type}
              className="grid grid-cols-[80px_1fr_44px_52px] items-center gap-x-1 rounded px-1 py-1 hover:bg-slate-800/30"
            >
              {/* Cell type + color dot */}
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 flex-shrink-0 rounded-sm" style={{ background: row.color }} />
                <span className="pv-value text-[11px] text-slate-300">{row.type}</span>
              </div>

              {/* Mini bar */}
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

              {/* Count */}
              <span className="pv-value text-right text-[10px]">
                {row.count.toLocaleString()}
              </span>

              {/* Mean intensity — no real data at this stage */}
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
            <span className="font-mono text-[10px] text-slate-500">
              {annotations.length} total
            </span>
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
                    style={{
                      background: isHovered ? 'rgba(30,41,59,0.8)' : 'transparent',
                    }}
                    onClick={() => flyTo(ann.imageCoords.x, ann.imageCoords.y)}
                    onMouseEnter={() => setHoveredAnnotation(ann.id)}
                    onMouseLeave={() => setHoveredAnnotation(null)}
                  >
                    {/* Color dot */}
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{
                        background: ann.color,
                        boxShadow: isHovered ? `0 0 6px ${ann.color}` : 'none',
                      }}
                    />

                    {/* Label chip */}
                    <span
                      className="rounded px-1.5 py-px text-[9px] font-medium font-mono flex-shrink-0"
                      style={{
                        background: `${ann.color}22`,
                        color: ann.color,
                        border: `1px solid ${ann.color}44`,
                      }}
                    >
                      {ann.label}
                    </span>

                    {/* Coordinates */}
                    <span className="font-mono text-[10px] text-slate-500 flex-1 truncate">
                      {Math.round(ann.imageCoords.x).toLocaleString()},{' '}
                      {Math.round(ann.imageCoords.y).toLocaleString()}
                    </span>

                    {/* Delete button */}
                    <button
                      className="flex-shrink-0 text-slate-700 opacity-0 transition-opacity group-hover:opacity-100 hover:!text-red-400"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeAnnotation(ann.id)
                      }}
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
          {/* Bounding box */}
          <div>
            <span className="pv-label text-[10px]">Bounding Box (px)</span>
            <div className="mt-0.5 grid grid-cols-2 gap-x-4">
              <div className="flex gap-2">
                <span className="pv-label text-[10px]">X₁</span>
                <span className="pv-value text-[11px]">{REGION_STATS.x1.toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <span className="pv-label text-[10px]">Y₁</span>
                <span className="pv-value text-[11px]">{REGION_STATS.y1.toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <span className="pv-label text-[10px]">X₂</span>
                <span className="pv-value text-[11px]">{REGION_STATS.x2.toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <span className="pv-label text-[10px]">Y₂</span>
                <span className="pv-value text-[11px]">{REGION_STATS.y2.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/40 pt-1.5 space-y-1">
            <div className="flex justify-between">
              <span className="pv-label">Area</span>
              <span className="pv-value">{REGION_STATS.areaMicrons.toLocaleString()} µm²</span>
            </div>
            <div className="flex justify-between">
              <span className="pv-label">Perimeter</span>
              <span className="pv-value">{REGION_STATS.perimeter.toLocaleString()} µm</span>
            </div>
            <div className="flex justify-between">
              <span className="pv-label">Cell Density</span>
              <span className="pv-value">{REGION_STATS.cellDensity.toLocaleString()} cells/mm²</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
