import { Store } from '@tanstack/store'
import { useStore } from '@tanstack/react-store'
import { getViewerInstance } from '../lib/viewerInstance'

export interface ChannelState {
  visible: boolean
  intensity: number
  gamma: number
}

export type AnnotationLabel = 'Tumor' | 'Stroma' | 'Immune' | 'Vessel' | 'Necrosis'

export interface Annotation {
  id: string
  type: 'point'
  imageCoords: { x: number; y: number }
  label: AnnotationLabel
  color: string
  createdAt: number
}

export interface PathologyState {
  activeSlideId: string
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
  annotations: Annotation[]
  hoveredAnnotationId: string | null
}

const defaultChannel = (intensity: number): ChannelState => ({
  visible: true,
  intensity,
  gamma: 1.0,
})

export const pathologyStore = new Store<PathologyState>({
  activeSlideId: 'slide-001',
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
  annotations: [],
  hoveredAnnotationId: null,
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
  const viewer = getViewerInstance()
  if (viewer) {
    viewer.setMouseNavEnabled(!active)
  }
  pathologyStore.setState((prev) => ({ ...prev, annotationMode: active }))
}

export function setAnnotationLabel(label: AnnotationLabel): void {
  pathologyStore.setState((prev) => ({ ...prev, annotationLabel: label }))
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
