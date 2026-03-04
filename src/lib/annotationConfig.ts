import type { AnnotationLabel } from '../store/pathologyStore'

export const ANNOTATION_LABELS: { label: AnnotationLabel; color: string }[] = [
  { label: 'Tumor',    color: '#f87171' },
  { label: 'Stroma',   color: '#94a3b8' },
  { label: 'Immune',   color: '#4ade80' },
  { label: 'Vessel',   color: '#f59e0b' },
  { label: 'Necrosis', color: '#a78bfa' },
]

export const LABEL_COLOR_MAP: Record<AnnotationLabel, string> = Object.fromEntries(
  ANNOTATION_LABELS.map(({ label, color }) => [label, color])
) as Record<AnnotationLabel, string>
