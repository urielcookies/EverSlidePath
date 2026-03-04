import type { SlideMetadata } from '../../server/slideMetadata'

const CELL_DATA = [
  { type: 'Tumor',   count: 14_820, areaPercent: 42.3, meanIntensity: 187, color: '#f87171' },
  { type: 'Stroma',  count:  9_340, areaPercent: 26.6, meanIntensity: 112, color: '#94a3b8' },
  { type: 'Immune',  count:  6_210, areaPercent: 17.7, meanIntensity: 203, color: '#4ade80' },
  { type: 'Vessel',  count:  2_980, areaPercent:  8.5, meanIntensity:  98, color: '#f59e0b' },
  { type: 'Necrosis',count:  1_760, areaPercent:  5.0, meanIntensity:  44, color: '#a78bfa' },
]

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

export default function RightSidebar({ metadata }: Props) {
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

          {/* Table rows */}
          {CELL_DATA.map((row) => (
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
                  <div
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{
                      width: `${row.areaPercent}%`,
                      background: row.color,
                      opacity: 0.7,
                    }}
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

              {/* Mean intensity */}
              <span className="pv-value text-right text-[10px] text-slate-400">
                {row.meanIntensity}
              </span>
            </div>
          ))}
        </div>
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
