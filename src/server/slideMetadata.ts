import { createServerFn } from '@tanstack/react-start'

export interface SlideMetadata {
  id: string
  name: string
  scanDate: string
  objectiveLens: string
  micronsPerPixel: number
  dimensions: { width: number; height: number }
  stainProtocol: string
  tissueType: string
  scanner: string
  fileSize: string
  tilesUrl: string
}

const MOCK_SLIDES: Record<string, SlideMetadata> = {
  'slide-001': {
    id: 'slide-001',
    name: 'BRCA-2024-0042-A',
    scanDate: '2024-11-14',
    objectiveLens: '40x',
    micronsPerPixel: 0.2499,
    dimensions: { width: 46000, height: 32914 },
    stainProtocol: 'IF-DAPI-HER2-KI67',
    tissueType: 'Breast Carcinoma',
    scanner: 'Aperio GT 450',
    fileSize: '4.2 GB',
    tilesUrl: 'https://lib-test.library.ucla.edu/iiif/2/test%2Fbiopsy.jp2/info.json',
  },
  'slide-002': {
    id: 'slide-002',
    name: 'LUNG-2024-0118-B',
    scanDate: '2024-11-20',
    objectiveLens: '20x',
    micronsPerPixel: 0.4998,
    dimensions: { width: 38400, height: 27650 },
    stainProtocol: 'H&E',
    tissueType: 'Lung Adenocarcinoma',
    scanner: 'Leica Aperio CS2',
    fileSize: '2.8 GB',
    tilesUrl: 'https://lib-test.library.ucla.edu/iiif/2/test%2Fbiopsy.jp2/info.json',
  },
  'slide-003': {
    id: 'slide-003',
    name: 'COLON-2024-0207-C',
    scanDate: '2024-12-01',
    objectiveLens: '40x',
    micronsPerPixel: 0.2499,
    dimensions: { width: 52100, height: 41200 },
    stainProtocol: 'IHC-CDX2-CK20',
    tissueType: 'Colorectal Adenocarcinoma',
    scanner: 'Hamamatsu NanoZoomer S360',
    fileSize: '5.7 GB',
    tilesUrl: 'https://lib-test.library.ucla.edu/iiif/2/test%2Fbiopsy.jp2/info.json',
  },
}

// Raw function — called directly in loaders (no HTTP round-trip)
export function getSlideMetadata(id: string): SlideMetadata {
  return MOCK_SLIDES[id] ?? MOCK_SLIDES['slide-001']
}

// Server function — for client-side RPC calls using correct v1.x API
export const fetchSlideMetadata = createServerFn({ method: 'GET' })
  .inputValidator((id: unknown) => {
    if (typeof id !== 'string') throw new Error('Slide ID must be a string')
    return id
  })
  .handler(async ({ data: id }) => getSlideMetadata(id))
