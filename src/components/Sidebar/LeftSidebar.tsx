import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathologyStore, setChannel, toggleLeftSidebar } from '../../store/pathologyStore'

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

export default function LeftSidebar() {
  const isOpen = usePathologyStore((s) => s.leftSidebarOpen)
  const activeSlideId = usePathologyStore((s) => s.activeSlideId)
  const channels = usePathologyStore((s) => s.channels)

  const [studyOpen, setStudyOpen] = useState(true)
  const [layerOpen, setLayerOpen] = useState(true)
  const [channelOpen, setChannelOpen] = useState(true)
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({
    annotations: true,
    cells: true,
    tissue: true,
  })

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
                </ul>
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
                        setLayerVisibility((prev) => ({ ...prev, [layer.id]: !prev[layer.id] }))
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
