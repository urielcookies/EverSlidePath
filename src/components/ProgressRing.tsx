interface ProgressRingProps {
  /** Progress value between 0 and 1 */
  value: number
  size?: number
  stroke?: number
  color?: string
  trackColor?: string
  /** Short label rendered at the center (e.g. "3/5") */
  label?: string
  labelStyle?: React.CSSProperties
}

/**
 * Reusable SVG progress ring.
 * Renders a circular track with a filled arc proportional to `value`.
 */
export default function ProgressRing({
  value,
  size = 40,
  stroke = 3,
  color = '#22d3ee',
  trackColor = 'rgba(71,85,105,0.3)',
  label,
  labelStyle,
}: ProgressRingProps) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.max(0, Math.min(1, value)) * circ

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        {/* Filled arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
      </svg>

      {label !== undefined && (
        <span
          className="absolute text-[9px] font-mono font-semibold leading-none"
          style={{ color, ...labelStyle }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
