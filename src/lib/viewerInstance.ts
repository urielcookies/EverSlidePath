import type OpenSeadragon from 'openseadragon'

let _viewer: OpenSeadragon.Viewer | null = null

export const setViewerInstance = (v: OpenSeadragon.Viewer | null): void => {
  _viewer = v
}

export const getViewerInstance = (): OpenSeadragon.Viewer | null => _viewer
