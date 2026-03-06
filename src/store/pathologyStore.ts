import { Store } from '@tanstack/store'
import { useStore } from '@tanstack/react-store'
import type { SlideMetadata } from '../server/slideMetadata'
import type { Case, CaseForStudent } from '../server/caseFunctions'

export interface ChannelState {
  visible: boolean
  intensity: number
  gamma: number
}

export type AnnotationLabel = 'Tumor' | 'Stroma' | 'Immune' | 'Vessel' | 'Necrosis'
export type AnnotationShape = 'circle' | 'square' | 'pin' | 'freehand' | 'polygon'

export interface Annotation {
  id: string
  type: 'point'
  shape: AnnotationShape
  imageCoords: { x: number; y: number }
  radius: number
  points?: { x: number; y: number }[]
  label: AnnotationLabel
  name?: string
  color: string
  createdAt: number
}

export interface PathologyState {
  activeSlideId: string
  uploadedSlideMetadata: Record<string, SlideMetadata>
  zoomLevel: number
  viewportCenter: { x: number; y: number }
  channels: {
    dapi: ChannelState
    fitc: ChannelState
    tritc: ChannelState
  }
  leftSidebarOpen: boolean
  annotationMode: boolean
  annotationLabel: AnnotationLabel
  annotationShape: AnnotationShape
  activeColor: string
  annotations: Annotation[]
  hoveredAnnotationId: string | null
  aiRunning: boolean
  aiProgress: number
  aiThreshold: number
  aiInferenceTime: number | null
  aiError: string | null
  annotationCustomName: string
  syncStatus: 'idle' | 'saving' | 'saved' | 'error'
  lastSavedAt: number | null
  deleteMode: boolean
  layerVisibility: { annotations: boolean; cells: boolean; tissue: boolean }
  // Case context (Phase 2+)
  activeCaseId: string | null
  activeCase: Case | CaseForStudent | null
  groundTruthAnnotations: Annotation[]
  showGroundTruth: boolean
  // Submission state (Phase 4)
  isSubmitted: boolean
  submittedAt: number | null
  revealedDiagnosis: string | null
}

const defaultChannel = (intensity: number): ChannelState => ({
  visible: true,
  intensity,
  gamma: 1.0,
})

export const pathologyStore = new Store<PathologyState>({
  activeSlideId: 'slide-001',
  uploadedSlideMetadata: {},
  zoomLevel: 1,
  viewportCenter: { x: 0.5, y: 0.5 },
  channels: {
    dapi: defaultChannel(200),
    fitc: defaultChannel(180),
    tritc: defaultChannel(160),
  },
  leftSidebarOpen: true,
  annotationMode: false,
  annotationLabel: 'Tumor',
  annotationShape: 'circle',
  activeColor: '#f87171',
  annotations: [],
  hoveredAnnotationId: null,
  aiRunning: false,
  aiProgress: 0,
  aiThreshold: 0.45,
  aiInferenceTime: null,
  aiError: null,
  annotationCustomName: '',
  syncStatus: 'idle',
  lastSavedAt: null,
  deleteMode: false,
  layerVisibility: { annotations: true, cells: true, tissue: true },
  activeCaseId: null,
  activeCase: null,
  groundTruthAnnotations: [],
  showGroundTruth: false,
  isSubmitted: false,
  submittedAt: null,
  revealedDiagnosis: null,
})

export function usePathologyStore<T>(selector: (state: PathologyState) => T): T {
  return useStore(pathologyStore, selector)
}

type ChannelName = keyof PathologyState['channels']

export function setChannel(name: ChannelName, partial: Partial<ChannelState>): void {
  pathologyStore.setState((prev) => ({
    ...prev,
    channels: {
      ...prev.channels,
      [name]: { ...prev.channels[name], ...partial },
    },
  }))
}

export function setActiveSlide(id: string): void {
  pathologyStore.setState((prev) => ({ ...prev, activeSlideId: id }))
}

export function setZoomLevel(zoom: number): void {
  pathologyStore.setState((prev) => ({ ...prev, zoomLevel: zoom }))
}

export function setViewportCenter(x: number, y: number): void {
  pathologyStore.setState((prev) => ({ ...prev, viewportCenter: { x, y } }))
}

export function toggleLeftSidebar(): void {
  pathologyStore.setState((prev) => ({ ...prev, leftSidebarOpen: !prev.leftSidebarOpen }))
}

export function setAnnotationMode(active: boolean): void {
  pathologyStore.setState((prev) => ({ ...prev, annotationMode: active }))
}

export function setAnnotationLabel(label: AnnotationLabel): void {
  pathologyStore.setState((prev) => ({ ...prev, annotationLabel: label }))
}

export function setAnnotationShape(shape: AnnotationShape): void {
  pathologyStore.setState((prev) => ({ ...prev, annotationShape: shape }))
}

export function setActiveColor(color: string): void {
  pathologyStore.setState((prev) => ({ ...prev, activeColor: color }))
}

export function addAnnotation(ann: Annotation): void {
  pathologyStore.setState((prev) => ({ ...prev, annotations: [...prev.annotations, ann] }))
}

export function removeAnnotation(id: string): void {
  pathologyStore.setState((prev) => ({
    ...prev,
    annotations: prev.annotations.filter((a) => a.id !== id),
  }))
}

export function clearAnnotations(): void {
  pathologyStore.setState((prev) => ({ ...prev, annotations: [] }))
}

export function setHoveredAnnotation(id: string | null): void {
  pathologyStore.setState((prev) => ({ ...prev, hoveredAnnotationId: id }))
}

export function setAiRunning(v: boolean): void {
  pathologyStore.setState((prev) => ({ ...prev, aiRunning: v }))
}

export function setAiProgress(v: number): void {
  pathologyStore.setState((prev) => ({ ...prev, aiProgress: v }))
}

export function setAiThreshold(v: number): void {
  pathologyStore.setState((prev) => ({ ...prev, aiThreshold: v }))
}

export function setAiInferenceTime(v: number | null): void {
  pathologyStore.setState((prev) => ({ ...prev, aiInferenceTime: v }))
}

export function setAiError(v: string | null): void {
  pathologyStore.setState((prev) => ({ ...prev, aiError: v }))
}

export function setSyncStatus(v: PathologyState['syncStatus']): void {
  pathologyStore.setState((prev) => ({ ...prev, syncStatus: v }))
}

export function setLastSavedAt(v: number | null): void {
  pathologyStore.setState((prev) => ({ ...prev, lastSavedAt: v }))
}

export function setDeleteMode(v: boolean): void {
  pathologyStore.setState((prev) => ({ ...prev, deleteMode: v }))
}

export function setAnnotationCustomName(name: string): void {
  pathologyStore.setState((prev) => ({ ...prev, annotationCustomName: name }))
}

export function removeUploadedSlide(id: string): void {
  pathologyStore.setState((prev) => {
    const next = { ...prev.uploadedSlideMetadata }
    delete next[id]
    return { ...prev, uploadedSlideMetadata: next }
  })
}

export function updateAnnotationCoords(id: string, x: number, y: number): void {
  pathologyStore.setState((prev) => ({
    ...prev,
    annotations: prev.annotations.map((a) =>
      a.id === id ? { ...a, imageCoords: { x, y } } : a
    ),
  }))
}

export function loadAnnotations(anns: Annotation[]): void {
  pathologyStore.setState((prev) => ({ ...prev, annotations: anns }))
}

export function addUploadedSlide(meta: SlideMetadata): void {
  pathologyStore.setState((prev) => ({
    ...prev,
    uploadedSlideMetadata: { ...prev.uploadedSlideMetadata, [meta.id]: meta },
  }))
}

export function setLayerVisibility(layer: keyof PathologyState['layerVisibility'], visible: boolean): void {
  pathologyStore.setState((prev) => ({
    ...prev,
    layerVisibility: { ...prev.layerVisibility, [layer]: visible },
  }))
}

export function setUploadedSlides(slides: SlideMetadata[]): void {
  const map: Record<string, SlideMetadata> = {}
  for (const s of slides) map[s.id] = s
  pathologyStore.setState((prev) => ({ ...prev, uploadedSlideMetadata: map }))
}

export function setActiveCase(c: Case | CaseForStudent | null): void {
  pathologyStore.setState((prev) => ({
    ...prev,
    activeCase: c,
    activeCaseId: c?.id ?? null,
  }))
}

export function setGroundTruthAnnotations(anns: Annotation[]): void {
  pathologyStore.setState((prev) => ({ ...prev, groundTruthAnnotations: anns }))
}

export function setShowGroundTruth(v: boolean): void {
  pathologyStore.setState((prev) => ({ ...prev, showGroundTruth: v }))
}

export function setSubmissionState(isSubmitted: boolean, submittedAt: number | null, diagnosis: string | null): void {
  pathologyStore.setState((prev) => ({
    ...prev,
    isSubmitted,
    submittedAt,
    revealedDiagnosis: diagnosis,
  }))
}

export function clearSubmissionState(): void {
  pathologyStore.setState((prev) => ({
    ...prev,
    isSubmitted: false,
    submittedAt: null,
    revealedDiagnosis: null,
  }))
}
